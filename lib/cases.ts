import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";
import { DISCIPLINES, type Discipline } from "./disciplines";
import { imageSize, type MediaSize } from "./media-size";
import type { PaletteToken } from "./palette";

/**
 * Os cases moram em `content/cases/*.mdx`, sem CMS. O frontmatter é
 * `export const frontmatter = { … }`, ESM nativo do MDX: os valores chegam
 * como JS de verdade e há uma via de parse só, a mesma que renderiza.
 *
 * Como as rotas são estáticas, um frontmatter errado quebra `next build`, não
 * a página em produção.
 */

/**
 * Os cases publicados, **nesta ordem**: é a ordem das paradas da trilha e do
 * "próximo case". Um `.mdx` fora desta lista continua no
 * repositório e não tem rota (hoje: `nestle`, `zoomtecnologia` e
 * `unifique-energia`, que ficou só com uma tela na vitrine).
 *
 * `title` sobrepõe o do frontmatter sem tocar no arquivo.
 */
const PUBLISHED: readonly { slug: string; title?: string }[] = [
  { slug: "decision-suite" },
  { slug: "prime8" },
  { slug: "perfecting" },
  { slug: "netlex" },
  { slug: "wecann-atena" },
  { slug: "portonave" },
];

export const ACCENT_TOKENS = [
  "teal",
  "cyan",
  "rose",
  "coral",
  "peach",
] as const satisfies readonly PaletteToken[];

export type AccentToken = (typeof ACCENT_TOKENS)[number];

export { DISCIPLINES, type Discipline };

export type CaseMedia = {
  src: string;
  alt_pt: string;
  alt_en: string;
  generated: boolean;
  /**
   * O quadro parado de um vídeo (`.mp4`). É dele que saem as dimensões, porque
   * `lib/media-size.ts` não lê vídeo, e é ele que aparece antes de tocar.
   */
  poster?: string;
};

/** O que um `.mdx` escreve. `river_rank` é da direção antiga e é ignorado. */
export type CaseFrontmatterInput = {
  title: string;
  client: string;
  year: number;
  role: string;
  stack: string[];
  summary_pt: string;
  summary_en: string;
  /** O mercado do projeto, na legenda da home: "Salestech", "Energia". */
  market_pt: string;
  market_en: string;
  accent: AccentToken;
  cover: string;
  media: Array<Omit<CaseMedia, "generated"> & { generated?: boolean }>;
  disciplines: Discipline[];
  river_rank?: number;
  generated?: boolean;
};

export type CaseFrontmatter = {
  title: string;
  client: string;
  year: number;
  role: string;
  stack: readonly string[];
  summary_pt: string;
  summary_en: string;
  market_pt: string;
  market_en: string;
  accent: AccentToken;
  /** A capa real, quando existir. Hoje a capa exibida é o placeholder. */
  cover: string;
  media: readonly CaseMedia[];
  disciplines: readonly Discipline[];
  generated: boolean;
};

export type CaseEntry = {
  slug: string;
  frontmatter: CaseFrontmatter;
};

export type LoadedCase = CaseEntry & {
  Content: ComponentType<MDXProps>;
  /** Dimensões da mídia do corpo, por `src`, lidas do cabeçalho do arquivo. */
  sizes: Readonly<Record<string, MediaSize>>;
};

type CaseModule = {
  default: ComponentType<MDXProps>;
  frontmatter?: unknown;
};

/** Os slugs publicados, na ordem fixa. É o que gera as rotas e o sitemap. */
export async function getCaseSlugs(): Promise<string[]> {
  return PUBLISHED.map((entry) => entry.slug);
}

export async function loadCase(slug: string): Promise<LoadedCase> {
  const mod = (await import(`@/content/cases/${slug}.mdx`)) as CaseModule;
  const parsed = parseFrontmatter(slug, mod.frontmatter);
  const title = PUBLISHED.find((entry) => entry.slug === slug)?.title;
  const frontmatter = title === undefined ? parsed : { ...parsed, title };

  const sizes: Record<string, MediaSize> = {};
  await Promise.all(
    frontmatter.media.map(async (item) => {
      const size = await imageSize(item.poster ?? item.src);
      if (size !== null) sizes[item.src] = size;
    }),
  );
  return { slug, frontmatter, Content: mod.default, sizes };
}

/** Os cases publicados, na ordem fixa de `PUBLISHED`. */
export async function getCases(): Promise<CaseEntry[]> {
  const slugs = await getCaseSlugs();
  return Promise.all(
    slugs.map(async (slug) => {
      const { frontmatter } = await loadCase(slug);
      return { slug, frontmatter };
    }),
  );
}

export function caseSummary(
  frontmatter: CaseFrontmatter,
  locale: string,
): string {
  return locale === "pt" ? frontmatter.summary_pt : frontmatter.summary_en;
}

function fail(slug: string, message: string): never {
  throw new Error(`content/cases/${slug}.mdx — frontmatter inválido: ${message}`);
}

function asRecord(slug: string, raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(slug, "falta `export const frontmatter = { ... }` no topo do arquivo.");
  }
  return raw as Record<string, unknown>;
}

function requireString(
  slug: string,
  raw: Record<string, unknown>,
  key: string,
  where = "",
): string {
  const value = raw[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(slug, `\`${where}${where ? "." : ""}${key}\` precisa ser uma string não vazia.`);
  }
  return value;
}

function requireStringArray(
  slug: string,
  raw: Record<string, unknown>,
  key: string,
): string[] {
  const value = raw[key];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    fail(slug, `\`${key}\` precisa ser um array de strings não vazio.`);
  }
  return value as string[];
}

function requireOneOf<T extends string>(
  slug: string,
  raw: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): T {
  const value = raw[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(slug, `\`${key}\` precisa ser um de: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function parseMedia(slug: string, raw: unknown): CaseMedia[] {
  if (!Array.isArray(raw)) {
    fail(slug, "`media` precisa ser um array (pode ser vazio).");
  }
  return raw.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      fail(slug, `media[${index}] precisa ser um objeto.`);
    }
    const entry = item as Record<string, unknown>;
    const where = `media[${index}]`;
    const src = requireString(slug, entry, "src", where);
    const media: CaseMedia = {
      src,
      alt_pt: requireString(slug, entry, "alt_pt", where),
      alt_en: requireString(slug, entry, "alt_en", where),
      generated: entry["generated"] === true,
    };
    if (src.toLowerCase().endsWith(".mp4")) {
      media.poster = requireString(slug, entry, "poster", where);
    }
    return media;
  });
}

export function parseFrontmatter(slug: string, raw: unknown): CaseFrontmatter {
  const record = asRecord(slug, raw);

  const year = record["year"];
  if (typeof year !== "number" || !Number.isInteger(year)) {
    fail(slug, "`year` precisa ser um número inteiro.");
  }

  const disciplines = record["disciplines"];
  if (
    !Array.isArray(disciplines) ||
    disciplines.length === 0 ||
    disciplines.some(
      (item) =>
        typeof item !== "string" || !DISCIPLINES.includes(item as Discipline),
    )
  ) {
    fail(
      slug,
      `\`disciplines\` precisa ser um array não vazio com valores em: ${DISCIPLINES.join(", ")}.`,
    );
  }

  return {
    title: requireString(slug, record, "title"),
    client: requireString(slug, record, "client"),
    year,
    role: requireString(slug, record, "role"),
    stack: requireStringArray(slug, record, "stack"),
    summary_pt: requireString(slug, record, "summary_pt"),
    summary_en: requireString(slug, record, "summary_en"),
    market_pt: requireString(slug, record, "market_pt"),
    market_en: requireString(slug, record, "market_en"),
    accent: requireOneOf(slug, record, "accent", ACCENT_TOKENS),
    cover: requireString(slug, record, "cover"),
    media: parseMedia(slug, record["media"]),
    disciplines: disciplines as Discipline[],
    generated: record["generated"] === true,
  };
}
