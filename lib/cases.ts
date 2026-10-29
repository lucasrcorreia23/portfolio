import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";
import { DISCIPLINES, type Discipline } from "./disciplines";
import type { Locale } from "./i18n/config";
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
 * ## Dois idiomas, dois arquivos
 *
 * `{slug}.mdx` é o português e carrega o frontmatter, com os campos de texto
 * em par (`title` / `title_en`, `summary_pt` / `summary_en`…). `{slug}.en.mdx`
 * é só o corpo em inglês. A rota em inglês importa o segundo; se ele não
 * existir, ou faltar um campo `_en`, o `next build` quebra — é assim que uma
 * mudança no português não vai ao ar sem a contraparte.
 */
const PUBLISHED: readonly string[] = [
  "netlex",
  "perfecting",
  "wecann-atena",
  "portonave",
  "decision-suite",
  "prime8",
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

type CaseMediaInput = {
  src: string;
  alt_pt: string;
  alt_en: string;
  generated?: boolean;
  poster?: string;
};

/** A mídia já no idioma da rota. */
export type CaseMedia = {
  src: string;
  alt: string;
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
  title_en: string;
  client: string;
  /** Só quando o cliente não é nome próprio ("Agentes de IA"). */
  client_en?: string;
  year: number;
  role: string;
  role_en: string;
  stack: string[];
  stack_en: string[];
  summary_pt: string;
  summary_en: string;
  /** O mercado do projeto, na legenda da home: "Salestech", "Energia". */
  market_pt: string;
  market_en: string;
  accent: AccentToken;
  cover: string;
  media: CaseMediaInput[];
  disciplines: Discipline[];
  river_rank?: number;
  generated?: boolean;
};

/** O frontmatter já no idioma da rota: um texto por campo. */
export type CaseFrontmatter = {
  title: string;
  client: string;
  year: number;
  role: string;
  stack: readonly string[];
  summary: string;
  market: string;
  accent: AccentToken;
  /** A capa do frontmatter. A capa exibida é a montagem da placa (`lib/plate.ts`). */
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
  return [...PUBLISHED];
}

export async function loadCase(
  slug: string,
  locale: Locale,
): Promise<LoadedCase> {
  const pt = (await import(`@/content/cases/${slug}.mdx`)) as CaseModule;
  const frontmatter = parseFrontmatter(slug, pt.frontmatter, locale);
  const Content =
    locale === "pt"
      ? pt.default
      : ((await import(`@/content/cases/${slug}.en.mdx`)) as CaseModule).default;

  const sizes: Record<string, MediaSize> = {};
  await Promise.all(
    frontmatter.media.map(async (item) => {
      const size = await imageSize(item.poster ?? item.src);
      if (size !== null) sizes[item.src] = size;
    }),
  );
  return { slug, frontmatter, Content, sizes };
}

/** Os cases publicados, na ordem fixa de `PUBLISHED`, no idioma pedido. */
export async function getCases(locale: Locale): Promise<CaseEntry[]> {
  const slugs = await getCaseSlugs();
  return Promise.all(
    slugs.map(async (slug) => {
      const { frontmatter } = await loadCase(slug, locale);
      return { slug, frontmatter };
    }),
  );
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

function parseMedia(slug: string, raw: unknown, locale: Locale): CaseMedia[] {
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
    const alt_pt = requireString(slug, entry, "alt_pt", where);
    const alt_en = requireString(slug, entry, "alt_en", where);
    const media: CaseMedia = {
      src,
      alt: locale === "pt" ? alt_pt : alt_en,
      generated: entry["generated"] === true,
    };
    if (src.toLowerCase().endsWith(".mp4")) {
      media.poster = requireString(slug, entry, "poster", where);
    }
    return media;
  });
}

export function parseFrontmatter(
  slug: string,
  raw: unknown,
  locale: Locale,
): CaseFrontmatter {
  const record = asRecord(slug, raw);
  const pick = <T,>(pt: T, en: T): T => (locale === "pt" ? pt : en);

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

  const client = requireString(slug, record, "client");
  return {
    title: pick(
      requireString(slug, record, "title"),
      requireString(slug, record, "title_en"),
    ),
    client: pick(
      client,
      typeof record["client_en"] === "string" ? record["client_en"] : client,
    ),
    year,
    role: pick(
      requireString(slug, record, "role"),
      requireString(slug, record, "role_en"),
    ),
    stack: pick(
      requireStringArray(slug, record, "stack"),
      requireStringArray(slug, record, "stack_en"),
    ),
    summary: pick(
      requireString(slug, record, "summary_pt"),
      requireString(slug, record, "summary_en"),
    ),
    market: pick(
      requireString(slug, record, "market_pt"),
      requireString(slug, record, "market_en"),
    ),
    accent: requireOneOf(slug, record, "accent", ACCENT_TOKENS),
    cover: requireString(slug, record, "cover"),
    media: parseMedia(slug, record["media"], locale),
    disciplines: disciplines as Discipline[],
    generated: record["generated"] === true,
  };
}
