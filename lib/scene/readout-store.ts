/**
 * A leitura que a cena manda para a HUD.
 *
 * O DIRECTION.md §4 pede, no beat de Quem sou, que "a densidade do bando seja
 * medida contra [a parede graduada], com a leitura correndo na HUD". A cena
 * sabe esses números; a HUD, que é DOM, não. Este módulo é o fio entre os dois,
 * e é o mesmo desenho do `lib/scroll/scroll-store.ts`: um valor fora do React,
 * um publicador só, muitos leitores.
 *
 * **Este arquivo é importado pela rota inicial.** A HUD está em toda página e
 * lê daqui; a cena vive num chunk dinâmico de 350 kB e escreve daqui. Por isso
 * ele não importa nada — nem `three`, nem R3F, nem os outros módulos de
 * `lib/scene/`. Um import de three aqui não custaria "um import a mais": puxaria
 * a cena inteira para dentro do orçamento de 200 kB da rota inicial.
 *
 * **`live` não é `density === 0`.** Sem WebGL, com o chunk ainda baixando ou com
 * o modo poster, não existe leitura nenhuma — e mostrar `DENS. 0.00` nesse caso
 * seria inventar um instrumento zerado onde não há instrumento. Quem lê mostra
 * a linha só quando `live` é verdadeiro.
 */

export type SceneReadout = {
  /** Profundidade da câmera na câmara, em unidades de mundo (negativa). */
  depth: number;
  /** Densidade do bando no poleiro, 0 a 1 — a leitura de `DENS.`. */
  density: number;
  /** A cena está publicando. Falso no poster, antes do chunk e depois dele. */
  live: boolean;
};

type Listener = () => void;

/**
 * **A leitura é quantizada aqui, e não em quem desenha.**
 *
 * A cena publica a 60 Hz; a HUD mostra `Z −38` e `DENS. 0.62`. Entre um quadro
 * e o seguinte esses dois dígitos quase nunca mudam, então arredondar na fonte
 * e só avisar quando o **dígito** muda troca sessenta notificações por segundo
 * por umas poucas — é a mesma decisão que a régua já toma com
 * `useScrollProgress({ steps: 100 })`, no mesmo lugar da cadeia.
 *
 * E é o que torna o store compatível com `useSyncExternalStore`: cada leitura
 * nova é um objeto novo, e entre elas o mesmo objeto — que é exatamente o
 * contrato que o React pede. O `scroll-store` faz o contrário (muta no lugar,
 * sessenta vezes por segundo, sem passar pelo React) porque quem o consome por
 * quadro é a cena, não o DOM.
 */
const IDLE: Readonly<SceneReadout> = Object.freeze({
  depth: 0,
  density: 0,
  live: false,
});

let readout: Readonly<SceneReadout> = IDLE;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function publishReadout(next: { depth: number; density: number }): void {
  const depth = Math.round(Number.isFinite(next.depth) ? next.depth : 0);
  const density =
    Math.round((Number.isFinite(next.density) ? next.density : 0) * 100) / 100;

  if (readout.live && readout.depth === depth && readout.density === density) {
    return;
  }
  readout = Object.freeze({ depth, density, live: true });
  notify();
}

/** A cena saiu de cena: a HUD volta a não ter leitura, em vez de congelar uma. */
export function clearReadout(): void {
  if (readout === IDLE) return;
  readout = IDLE;
  notify();
}

export function getReadout(): Readonly<SceneReadout> {
  return readout;
}

/** No servidor não há cena, e é isso que a HUD renderiza no HTML. */
export function getIdleReadout(): Readonly<SceneReadout> {
  return IDLE;
}

export function subscribeToReadout(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
