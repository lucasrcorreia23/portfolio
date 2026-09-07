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
 */

export type ScrollSnapshot = {
  /** Progresso normalizado da descida, 0 a 1. É isto que dirige tudo. */
  progress: number;
  /**
   * Velocidade instantânea do scroll, em pixels por frame. Leitura de HUD
   * apenas — não dirige câmera, uniform nem revelação. A regra da variável
   * única continua valendo.
   */
  velocity: number;
};

type Listener = (snapshot: Readonly<ScrollSnapshot>) => void;

/**
 * Mutado no lugar a cada frame, para não alocar um objeto por quadro. Quem
 * recebe no callback não deve guardar a referência — copie os números.
 */
const snapshot: ScrollSnapshot = { progress: 0, velocity: 0 };
const listeners = new Set<Listener>();

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function publishScroll(next: ScrollSnapshot): void {
  snapshot.progress = clamp01(next.progress);
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

/** Chamado quando o driver de scroll é desmontado ou trocado. */
export function resetScroll(): void {
  snapshot.progress = 0;
  snapshot.velocity = 0;
}
