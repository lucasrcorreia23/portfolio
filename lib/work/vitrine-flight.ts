/**
 * O voo até a vitrine: quando a pessoa escolhe o desvio, a câmera vai até a
 * parede antes de a página trocar. Fora do React e sem imports: a cena o lê
 * por quadro, e quem o dispara é o link da bifurcação.
 */

/** Quanto dura o voo antes da troca de página, em milissegundos. */
export const VITRINE_FLIGHT_MS = 1700;

let flying = false;

export function startVitrineFlight(): void {
  flying = true;
}

export function endVitrineFlight(): void {
  flying = false;
}

export function isFlyingToVitrine(): boolean {
  return flying;
}
