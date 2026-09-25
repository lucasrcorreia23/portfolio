import type { AccentToken, CaseEntry } from "@/lib/cases";
import type { Discipline } from "@/lib/disciplines";

/**
 * O conteúdo de um card do rio, resolvido no servidor e descido para a cena.
 *
 * **É dado, não código.** O `page.tsx` chama `getRiverCases()` (que lê o
 * `river_rank` do frontmatter e ordena), monta este array e o passa como prop
 * até o material dos cards. As strings são curtas — cliente, título, ano, slug,
 * acento e disciplinas por card — e viajam no payload RSC da rota inicial; as
 * **imagens** de capa não, elas são carregadas dentro do chunk da cena
 * (`lib/scene/card-atlas.ts`), depois do primeiro quadro útil.
 *
 * A ordem do array **é** a curadoria: o índice 0 é o `river_rank` mais baixo, o
 * primeiro card que a câmera encontra. `Cards.tsx` corta em
 * `riverCapacity(viewport)` — 7 no desktop, 4 no mobile (DIRECTION.md §4) —, e
 * quem fica de fora do corte continua com rota `/work/[slug]` e no acervo da
 * HUD. Nenhum case é apagado por aparelho.
 */
export type RiverCard = {
  /** `river_rank`, a posição na curadoria. O índice no array é `rank - 1`. */
  rank: number;
  slug: string;
  /** Placa de cota: cliente. */
  client: string;
  /** Placa de cota: título do case. */
  title: string;
  /** Placa de cota: ano. */
  year: number;
  /** Token da paleta que tinge a gravação da placa e o chanfro do card. */
  accent: AccentToken;
  /** Os eixos do case — o filtro do rio promove por disciplina. */
  disciplines: readonly Discipline[];
  /** URL da capa. Carregada como textura dentro do chunk da cena. */
  cover: string;
  /** Capa gerada, a trocar por material real depois (PROJECT.md §6). */
  generated: boolean;
};

/** `getRiverCases()` (já ordenado por `river_rank`) → o array da cena. */
export function riverCardsFromCases(cases: readonly CaseEntry[]): RiverCard[] {
  return cases.map(({ slug, frontmatter }) => ({
    rank: frontmatter.river_rank,
    slug,
    client: frontmatter.client,
    title: frontmatter.title,
    year: frontmatter.year,
    accent: frontmatter.accent,
    disciplines: frontmatter.disciplines,
    cover: frontmatter.coverSrc,
    generated: frontmatter.generated,
  }));
}
