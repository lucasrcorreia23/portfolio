import { isDiscipline, type Discipline } from "@/lib/disciplines";

/**
 * O filtro do rio, fora do React — mesmo desenho do `scroll-store`.
 *
 * **Um eixo por vez, e `null` é um estado legítimo.** O DIRECTION.md §4 diz que
 * o filtro nunca remove: ele **promove** — as peças que casam vêm para o eixo da
 * câmara e as outras recuam para a periferia, ainda montadas. Promover duas
 * disciplinas ao mesmo tempo não é uma rota, é duas; por isso a seleção é única
 * e clicar no eixo aceso o apaga.
 *
 * **Ele já faz alguma coisa hoje, e isso foi deliberado.** O rio ainda não
 * existe (o beat de Trabalho está vazio até os sete cases entrarem), então um
 * controle que só publicasse estado seria um botão morto na tela. A entrada de
 * acervo da HUD carrega a seleção como `?d=` para `/work`, que filtra a lista —
 * mesmo eixo, mesmo vocabulário, efeito visível. Quando o rio existir, ele
 * passa a ler daqui também, e o acervo continua filtrando.
 *
 * O `data-river-filter` no `<html>` é o mesmo contrato de `data-gate` e
 * `data-scene-mode`: um atributo para CSS e para teste, escrito por quem sabe.
 */

export type RiverFilter = Discipline | null;

let current: RiverFilter = null;
const listeners = new Set<(filter: RiverFilter) => void>();

export function getRiverFilter(): RiverFilter {
  return current;
}

/**
 * O que o servidor renderiza: nenhum eixo aceso.
 *
 * Existe porque `useSyncExternalStore` pede um snapshot de servidor separado, e
 * porque ele é a verdade — o HTML sai antes de qualquer clique, e a HUD do
 * primeiro paint mostra o rio inteiro.
 */
export function noRiverFilter(): RiverFilter {
  return null;
}

export function setRiverFilter(next: RiverFilter): void {
  if (next === current) return;
  current = next;

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (next === null) root.removeAttribute("data-river-filter");
    else root.setAttribute("data-river-filter", next);
  }

  for (const listener of listeners) listener(current);
}

/** Clicar no eixo já aceso o apaga: é o jeito de voltar ao rio inteiro. */
export function toggleRiverFilter(value: string): void {
  if (!isDiscipline(value)) return;
  setRiverFilter(current === value ? null : value);
}

export function subscribeToRiverFilter(
  listener: (filter: RiverFilter) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
