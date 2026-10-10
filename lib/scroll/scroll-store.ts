/**
 * A variável.
 *
 * PROJECT.md §3.3: "Uma variável só. O progresso normalizado de 0 a 1 do
 * scroll dirige a câmera, os uniforms dos shaders e as revelações de texto.
 * Uma fonte de verdade, muitos consumidores."
 *
 * Este módulo é essa fonte. Quem publica é o `ScrollProvider` — e só ele.
 * Todo o resto lê, via `useScrollProgress`.
 *
 * O store fica fora do React de propósito: o progresso muda a cada frame e
 * quase nenhum consumidor quer um re-render por frame. Quem precisa de
 * estado pede explicitamente (ver `useScrollProgress({ steps })`).
 *
 * ## A variável é da descida, e nem toda rota é a descida
 *
 * Isto foi um defeito, e ele estava dormindo aqui desde que `/work` existiu: o
 * driver publica `lenis.progress` em **qualquer** rota, e `lenis.progress` é
 * `scroll ÷ (altura do documento − viewport)` — a rolagem da rota em que se
 * está, não a da descida. Rolar o artigo de um case varreria o progresso de 0 a
 * 1 e mandaria a câmera atravessar a câmara inteira enquanto alguém lê.
 *
 * O conserto não é um segundo publicador nem uma segunda variável de câmera: é
 * dizer **o que a rolagem significa nesta rota**. Com papel `"descent"` ela é a
 * variável, como sempre foi. Com papel `"page"` ela é `pageProgress` — leitura
 * de instrumento, não dirige nada — e `progress` fica **congelado no último
 * valor**, que por construção é o ponto do rio de onde se saiu. É esse
 * congelamento que faz "a câmera volta para a posição do rio de onde saiu" ser
 * uma consequência em vez de uma restauração.
 */

import { descentFromScroll, scrollFromDescent } from "./descent-map";

export type ScrollSnapshot = {
  /** Progresso normalizado da descida, 0 a 1. É isto que dirige tudo. */
  progress: number;
  /**
   * Velocidade instantânea do scroll, em pixels por frame. Leitura de HUD
   * apenas — não dirige câmera, uniform nem revelação. A regra da variável
   * única continua valendo.
   */
  velocity: number;
  /**
   * Rolagem da rota atual, 0 a 1. Igual a `progress` na descida; dentro de um
   * case é a leitura do artigo, e ali `progress` não anda. Também é leitura, e
   * também não dirige nada.
   */
  pageProgress: number;
};

/**
 * O que a rolagem desta rota significa.
 *
 * `"descent"` — a home: a rolagem **é** a variável.
 * `"page"` — qualquer outra rota: a rolagem é do documento, e a variável fica
 * onde estava.
 */
export type ScrollRole = "descent" | "page";

type Listener = (snapshot: Readonly<ScrollSnapshot>) => void;

/**
 * Mutado no lugar a cada frame, para não alocar um objeto por quadro. Quem
 * recebe no callback não deve guardar a referência — copie os números.
 */
const snapshot: ScrollSnapshot = {
  progress: 0,
  velocity: 0,
  pageProgress: 0,
};
const listeners = new Set<Listener>();

let role: ScrollRole = "descent";

/**
 * Um pedido de rolagem pendente, em progresso normalizado da descida.
 *
 * Quem é dono do Lenis é o driver, e ele continua sendo o único: este campo é
 * um recado, não uma segunda mão no volante. Existe para a volta de uma visita
 * direta a um case, em que não há entrada de histórico para o navegador
 * restaurar e alguém precisa dizer para onde ir.
 */
let pendingScrollTo: number | null = null;

/**
 * Sinaliza que a altura do documento mudou por baixo do driver.
 *
 * Uma navegação de cliente troca 22 alturas de viewport por três sem que o
 * Lenis saiba — e um limite velho faz `progress` sair errado no primeiro quadro
 * depois da troca, que é exatamente o quadro em que a câmera está voltando para
 * a curva.
 */
let pendingResize = false;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function publishScroll(next: {
  progress: number;
  velocity: number;
}): void {
  // `next.progress` é a rolagem do documento; a descida lê o progresso por
  // beat (ver `descent-map.ts`), que só no mobile difere de verdade.
  const value = clamp01(next.progress);
  snapshot.pageProgress = value;
  if (role === "descent") snapshot.progress = descentFromScroll(value);
  snapshot.velocity = Number.isFinite(next.velocity) ? next.velocity : 0;
  for (const listener of listeners) listener(snapshot);
}

export function getScrollProgress(): number {
  return snapshot.progress;
}

export function getScrollSnapshot(): Readonly<ScrollSnapshot> {
  return snapshot;
}

export function subscribeToScroll(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getScrollRole(): ScrollRole {
  return role;
}

/**
 * Troca o papel da rolagem. Quem chama é o `ScrollProvider`, a partir do
 * `pathname` — um lugar só, derivado da rota, sem cada página ter que lembrar.
 *
 * A troca sempre pede uma remedida ao driver: a altura do documento acabou de
 * mudar, e publicar contra o limite antigo daria um progresso inventado.
 */
export function setScrollRole(next: ScrollRole): void {
  if (next === role) return;
  role = next;
  pendingResize = true;
  // A rolagem da rota nova começa do zero até a primeira publicação; deixar o
  // valor antigo faria a régua de leitura do case nascer no meio.
  snapshot.pageProgress = 0;
}

/** Pede ao driver para levar a página a este progresso da descida. */
export function requestScrollTo(progress: number): void {
  pendingScrollTo = clamp01(progress);
}

/** Há um pedido de rolagem esperando? Quem pede por omissão cede a ele. */
export function hasScrollRequest(): boolean {
  return pendingScrollTo !== null;
}

/**
 * Consumido pelo driver, dentro do ticker. Devolve `null` quando não há nada.
 *
 * **Ele espera o papel virar `descent`, e essa espera é o mecanismo.** Quem pede
 * a rolagem é o controle de volta, que roda **antes** da navegação — é o único
 * lugar em que ele ainda sabe para onde ir. Entre o pedido e o commit da rota
 * passam alguns quadros em que o documento ainda é o do case, com três alturas
 * de viewport em vez de vinte e duas: atender ali levaria a página do case para
 * 55% dela mesma e depois a home abriria no topo, que é exatamente o que não
 * pode acontecer.
 *
 * Segurando até o papel mudar, o pedido só é atendido quando a home já está
 * montada e o `pendingResize` da mesma troca já mandou o Lenis remedir.
 */
export function consumeScrollRequest(): number | null {
  if (role !== "descent") return null;
  const value = pendingScrollTo;
  pendingScrollTo = null;
  // O pedido vem em progresso da descida; o driver rola o documento.
  return value === null ? null : scrollFromDescent(value);
}

/** Idem, para a remedida. */
export function consumeScrollResize(): boolean {
  const value = pendingResize;
  pendingResize = false;
  return value;
}

/** Chamado quando o driver de scroll é desmontado ou trocado. */
export function resetScroll(): void {
  snapshot.progress = 0;
  snapshot.velocity = 0;
  snapshot.pageProgress = 0;
}
