/**
 * Qual card do rio tem o foco do teclado — fora do React e fora da cena, mesmo
 * desenho do `filter-store`.
 *
 * **Por que existe.** O rio não tem lista em DOM visível (ela cobria o beat que
 * descrevia — ver `StationList`). O caminho de teclado são os próprios cards: um
 * link invisível por card, e quem mostra o foco é a **marcação do card na cena**,
 * não uma caixa de contorno. Este store é o fio entre as duas metades: o link
 * publica "tenho o foco", e o laço dos cards lê, acende a peça, leva a câmera até
 * ela e posiciona o link sobre a projeção dela.
 *
 * Guarda também o elemento, e não só o índice: o laço de quadro escreve o
 * `transform` direto nele, sem um render do React por quadro — é a mesma razão
 * pela qual o progresso do scroll fica fora do React.
 */

export type CardFocus = {
  /** Posição do card na corrente (0 = primeiro posto), ou −1 sem foco. */
  index: number;
  /** O link focado. `null` quando nenhum tem o foco. */
  element: HTMLElement | null;
};

const current: CardFocus = { index: -1, element: null };
const listeners = new Set<(focus: Readonly<CardFocus>) => void>();

export function getCardFocus(): Readonly<CardFocus> {
  return current;
}

export function setCardFocus(index: number, element: HTMLElement | null): void {
  if (index === current.index && element === current.element) return;
  current.index = index;
  current.element = element;
  for (const listener of listeners) listener(current);
}

/** O blur só limpa se o elemento que saiu ainda for o dono do foco. */
export function clearCardFocus(element: HTMLElement): void {
  if (current.element !== element) return;
  setCardFocus(-1, null);
}

export function subscribeToCardFocus(
  listener: (focus: Readonly<CardFocus>) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

