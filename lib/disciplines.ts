/**
 * Os três eixos do filtro do rio — DIRECTION.md §4.
 *
 * **Disciplinas, não categorias**, e por isso a lista não cresce com o acervo:
 * um case aparece em mais de uma, e nenhum filtro devolve menos de dois cases.
 *
 * Isto mora fora de `lib/cases.ts` porque aquele módulo importa `node:fs` e só
 * roda no servidor, enquanto o controle de filtro da HUD é de cliente. Um
 * `import { DISCIPLINES } from "@/lib/cases"` num componente de cliente
 * arrastaria o carregador de MDX inteiro para o navegador — quando o que ele
 * precisa são três strings.
 */

export const DISCIPLINES = ["produto", "marca"] as const;

export type Discipline = (typeof DISCIPLINES)[number];

export function isDiscipline(value: string | undefined): value is Discipline {
  return (
    value !== undefined && (DISCIPLINES as readonly string[]).includes(value)
  );
}
