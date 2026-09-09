import type { Discipline } from "@/lib/disciplines";
import { CARD_HALF_WIDTH, CARD_TOE_IN, type Card } from "./cards";
import { CHAMBER_HALF_WIDTH } from "./world";
import type { RiverCard } from "./river-content";

/**
 * O que o filtro do rio faz com a corrente — DIRECTION.md §4.
 *
 * > "E o filtro nunca remove. Ele **promove**: as peças que casam vêm para o
 * > eixo da câmara, as outras recuam para a periferia e continuam montadas,
 * > ainda visíveis de raspão. O rio nunca encolhe — ele muda de rota, e o bando
 * > muda junto. A reorganização é legível como mudança de escoamento, não como
 * > cards sumindo. Sem recarregar a página."
 *
 * Este módulo é a tradução literal disso em três decisões, e cada uma tem um
 * motivo que não é gosto.
 *
 * ## Só `x` se move, nunca `z`
 *
 * O espaçamento em Z é a única coisa da corrente que tem um **piso medido** —
 * 4.5 unidades entre centros, abaixo do qual dois cards se atropelam na
 * perspectiva (DIRECTION.md §4, e a reconferência em `cards.ts`). Um filtro que
 * mexesse em Z reordenaria a fila e quebraria esse piso no primeiro clique, e
 * com ele todos os números de aceite do beat: largura projetada entregue,
 * fração ocluída, esteira por card. Mudar de rota é lateral; mudar de fila
 * seria outra coisa, e seria justamente "cards trocando de lugar", que é o que
 * o documento veta pelo nome.
 *
 * ## A promoção aperta a pista, mas não colapsa no eixo
 *
 * A tentação é levar todo card que casa para `x = 0`. Isso empilha: as estações
 * alternam de lado exatamente para a câmera passar **por entre** as peças
 * (`CARD_STATIONS`), e com três matches no eixo o segundo esconde o terceiro e
 * a travessia vira um card só, ocluído duas vezes. Cada peça promovida encolhe
 * o próprio afastamento para 42% dele e mantém **o lado**: a pista aperta, a
 * alternância sobrevive, e a paralaxe continua trocando de sinal na passagem.
 *
 * ## Quem recua continua dentro da câmara
 *
 * "Ainda visíveis de raspão" é um requisito, não uma licença para jogar a peça
 * fora do quadro: o teto é a parede do duto menos a meia-largura do card
 * (`CHAMBER_HALF_WIDTH − CARD_HALF_WIDTH`), então a peça encosta no concreto e
 * para. Ela sai do tubo do bando — que é o ponto, porque é isso que faz a
 * esteira dela morrer e o escoamento se concentrar na pista nova.
 */

/** Fração do afastamento que uma peça promovida guarda. */
const PROMOTE = 0.42;
/** Piso do afastamento promovido: abaixo disto as peças se empilham no eixo. */
const PROMOTE_MIN = 1.6;
/** Ganho e degrau do recuo. */
const RECEDE_GAIN = 1.7;
const RECEDE_STEP = 2.2;
/** Aproximação de `y` ao eixo do olhar para quem é promovido. */
const PROMOTE_LIFT = 0.4;

/** Nenhuma peça atravessa o concreto. */
const X_LIMIT = CHAMBER_HALF_WIDTH - CARD_HALF_WIDTH;

export type FlowTarget = {
  x: number;
  y: number;
  yaw: number;
  /** `1` quando a peça casa com o filtro; `0` quando recua. `1` sem filtro. */
  promoted: number;
};

/**
 * Para onde cada card vai, dado o filtro.
 *
 * `filter === null` devolve **exatamente** a corrente de repouso: é o que
 * garante que, sem interação, `shared.cards` continue idêntico ao que
 * `resolveRiver()` resolveu — e portanto que a sonda (`probe-cards.ts`, que
 * estaciona cards escrevendo `uCards` direto) meça a geometria que o
 * MEASUREMENTS.md registra.
 */
export function flowTarget(
  card: Card,
  content: RiverCard | undefined,
  filter: Discipline | null,
): FlowTarget {
  if (filter === null) {
    return { x: card.x, y: card.y, yaw: card.yaw, promoted: 1 };
  }

  const matches = content !== undefined && content.disciplines.includes(filter);

  // Uma peça na estação central não tem lado; o índice decide, para o resultado
  // ser estável entre quadros e entre carregamentos.
  const side = card.x === 0 ? (card.index % 2 === 0 ? 1 : -1) : Math.sign(card.x);
  const reach = Math.abs(card.x);

  const x = matches
    ? side * Math.max(PROMOTE_MIN, reach * PROMOTE)
    : side * Math.min(X_LIMIT, reach * RECEDE_GAIN + RECEDE_STEP);

  const y = matches ? card.y * (1 - PROMOTE_LIFT) : card.y;

  return {
    x,
    y,
    // O mesmo `toe-in` da corrente de repouso: a peça continua virada para o
    // corredor onde ela estiver, senão uma peça recuada ficaria de face para a
    // parede.
    yaw: -Math.atan2(x, CARD_TOE_IN),
    promoted: matches ? 1 : 0,
  };
}

/**
 * Quantos cards cada eixo promove, dentro de um corte.
 *
 * A garantia do DIRECTION.md §4 é "nenhum filtro devolve menos de dois cases, e
 * nenhum esvazia o rio". Ela é conferida na build (`assertFilterFloor`, em
 * `lib/cases.ts`) contra o corte **mais apertado** — o do mobile —, porque um
 * corte maior só pode aumentar as contagens.
 */
export function promotedCounts(
  cards: readonly RiverCard[],
  disciplines: readonly Discipline[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const discipline of disciplines) {
    counts[discipline] = cards.filter((card) =>
      card.disciplines.includes(discipline),
    ).length;
  }
  return counts;
}
