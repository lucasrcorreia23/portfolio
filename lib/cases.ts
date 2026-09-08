import { readdir } from "node:fs/promises";
import path from "node:path";
import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";
import { DISCIPLINES, type Discipline } from "./disciplines";
import type { PaletteToken } from "./palette";

/**
 * Os cases moram em `content/cases/*.mdx`, sem CMS externo (PROJECT.md §5).
 *
 * **Frontmatter sem YAML.** Cada arquivo declara `export const frontmatter`,
 * que é ESM nativo do MDX e o caminho que o próprio doc do Next 16 documenta.
 * O ganho não é evitar duas dependências: é que os valores chegam como JS de
 * verdade — arrays continuam arrays, `year` continua número — em vez de
 * passarem por coerção de YAML. Uma via de parse só, a mesma que renderiza.
 *
 * A validação abaixo roda em tempo de build (as rotas são estáticas), então
 * um frontmatter errado quebra `next build`, não a página em produção.
 *
 * Este módulo usa `node:fs` — só servidor.
 */

const CASES_DIR = path.join(process.cwd(), "content", "cases");

/** `accent` é um token da paleta (PROJECT.md §6) — e só um dos quentes/frios
 *  de realce faz sentido: `void`, `abyss` e `deep` são fundo, `mist` é texto. */
export const ACCENT_TOKENS = [
  "teal",
  "cyan",
  "rose",
  "coral",
  "peach",
] as const satisfies readonly PaletteToken[];

export type AccentToken = (typeof ACCENT_TOKENS)[number];

/**
 * Os filtros do rio são por disciplina, não por categoria — DIRECTION.md §4.
 * Cada case aparece em mais de uma, e nenhum filtro devolve menos de dois.
 *
 * A lista vive em `lib/disciplines.ts`, que não importa `node:fs`: o controle
 * de filtro da HUD é de cliente e precisa dos mesmos três nomes. Aqui só é
 * reexportada, para quem valida frontmatter continuar importando de um lugar
 * só.
 */
export { DISCIPLINES, type Discipline };

export type CaseMedia = {
  src: string;
  /** Alternativo nos dois idiomas: o conteúdo textual todo é bilíngue. */
  alt_pt: string;
  alt_en: string;
  /** Imagem gerada, a trocar por material real depois (PROJECT.md §6). */
  generated: boolean;
};

/** O que se escreve no `.mdx`. */
export type CaseFrontmatterInput = {
  title: string;
  client: string;
  year: number;
  role: string;
  stack: string[];
  summary_pt: string;
  summary_en: string;
  accent: AccentToken;
  cover: string;
  media: Array<Omit<CaseMedia, "generated"> & { generated?: boolean }>;
  disciplines: Discipline[];
  /**
   * A curadoria do rio — DIRECTION.md §4. **Uma lista ordenada única, não um
   * booleano.** Todo case do acervo carrega um posto nesse ranking, e cada
   * aparelho corta a mesma lista pela capacidade que couber (hoje ~8 no
   * desktop, ~4 no mobile — DIRECTION.md, "Capacidade do rio"): não existem
   * duas listas de curadoria, uma por aparelho, existe uma ordem e um corte
   * diferente por tela.
   *
   * **Obrigatório e único de propósito:** um padrão implícito decidiria a
   * curadoria em silêncio, e dois cases no mesmo posto não formam uma ordem.
   * `getAllCases()` falha a build se dois arquivos colidirem no mesmo
   * `river_rank`.
   *
   * Ficar fora do corte de um aparelho **não apaga** o case: ele continua em
   * `content/cases/`, com rota própria, indexável e linkável — só não entra
   * na câmara daquele aparelho.
   */
  river_rank: number;
  generated?: boolean;
};

/** O que o loader devolve: o mesmo, com os opcionais já resolvidos. */
export type CaseFrontmatter = {
  title: string;
  client: string;
  year: number;
  role: string;
  stack: readonly string[];
  summary_pt: string;
  summary_en: string;
  accent: AccentToken;
  cover: string;
  media: readonly CaseMedia[];
  disciplines: readonly Discipline[];
  river_rank: number;
  generated: boolean;
};

export type CaseEntry = {
  slug: string;
  frontmatter: CaseFrontmatter;
};

export type LoadedCase = CaseEntry & {
  Content: ComponentType<MDXProps>;
};

type CaseModule = {
  default: ComponentType<MDXProps>;
  frontmatter?: unknown;
};

export async function getCaseSlugs(): Promise<string[]> {
  const entries = await readdir(CASES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name.slice(0, -".mdx".length))
    .sort();
}

export async function loadCase(slug: string): Promise<LoadedCase> {
  // Import dinâmico com caminho de padrão fixo: o bundler resolve o
  // diretório inteiro em tempo de build. Ver o guia de MDX do Next 16.
  const mod = (await import(`@/content/cases/${slug}.mdx`)) as CaseModule;

  return {
    slug,
    frontmatter: parseFrontmatter(slug, mod.frontmatter),
    Content: mod.default,
  };
}

/** Todo o acervo. É isto que gera rotas: um case fora do corte do rio ainda tem página. */
export async function getAllCases(): Promise<CaseEntry[]> {
  const slugs = await getCaseSlugs();
  const cases = await Promise.all(
    slugs.map(async (slug) => {
      const { frontmatter } = await loadCase(slug);
      return { slug, frontmatter };
    }),
  );
  assertUniqueRiverRank(cases);
  return cases;
}

/**
 * O rio inteiro, em ordem de curadoria — DIRECTION.md §4. **Uma lista só,
 * não uma por aparelho:** este módulo devolve todo o acervo ordenado por
 * `river_rank` crescente, e quem monta o beat de Trabalho corta essa mesma
 * lista pela capacidade do aparelho (7 no desktop e 4 no mobile, reconferidos
 * com a corrente montada — ver
 * DIRECTION.md, "Capacidade do rio"). O corte não é responsabilidade deste
 * módulo: um número de capacidade aqui amarraria `lib/cases.ts`, que não
 * sabe de viewport, à composição da câmara, que sabe.
 */
export async function getRiverCases(): Promise<CaseEntry[]> {
  const cases = await getAllCases();
  return cases
    .slice()
    .sort((a, b) => a.frontmatter.river_rank - b.frontmatter.river_rank);
}

export function caseSummary(
  frontmatter: CaseFrontmatter,
  locale: string,
): string {
  return locale === "pt" ? frontmatter.summary_pt : frontmatter.summary_en;
}

/* -------------------------------------------------------------------------
 * Validação
 * ---------------------------------------------------------------------- */

function fail(slug: string, message: string): never {
  throw new Error(`content/cases/${slug}.mdx — frontmatter inválido: ${message}`);
}

function asRecord(slug: string, raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(
      slug,
      "falta `export const frontmatter = { ... }` no topo do arquivo.",
    );
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
    return {
      src: requireString(slug, entry, "src", where),
      alt_pt: requireString(slug, entry, "alt_pt", where),
      alt_en: requireString(slug, entry, "alt_en", where),
      generated: entry["generated"] === true,
    };
  });
}

export function parseFrontmatter(
  slug: string,
  raw: unknown,
): CaseFrontmatter {
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
        typeof item !== "string" ||
        !DISCIPLINES.includes(item as Discipline),
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
    accent: requireOneOf(slug, record, "accent", ACCENT_TOKENS),
    cover: requireString(slug, record, "cover"),
    media: parseMedia(slug, record["media"]),
    disciplines: disciplines as Discipline[],
    river_rank: requirePositiveInteger(slug, record, "river_rank"),
    generated: record["generated"] === true,
  };
}

function requirePositiveInteger(
  slug: string,
  raw: Record<string, unknown>,
  key: string,
): number {
  const value = raw[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    fail(slug, `\`${key}\` precisa ser um número inteiro positivo (a posição do case no ranking único de curadoria).`);
  }
  return value;
}

/**
 * A curadoria é uma lista ordenada única (DIRECTION.md §4): dois cases no
 * mesmo posto não têm como formar uma ordem, e deixar a colisão passar
 * amarraria o desempate à ordem de iteração do sistema de arquivos.
 */
function assertUniqueRiverRank(cases: readonly CaseEntry[]): void {
  const seen = new Map<number, string>();
  for (const { slug, frontmatter } of cases) {
    const rank = frontmatter.river_rank;
    const clashing = seen.get(rank);
    if (clashing !== undefined) {
      fail(
        slug,
        `\`river_rank: ${rank}\` já está em uso por \`${clashing}.mdx\`. A curadoria é um ranking único — cada posto pertence a um só case.`,
      );
    }
    seen.set(rank, slug);
  }
}
