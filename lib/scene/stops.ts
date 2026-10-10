import { beatOf } from "@/components/beats/beats";

/**
 * As paradas da trilha: uma por case, dentro do beat de Cases.
 *
 * Este módulo **não importa three**: o driver de scroll o lê para a
 * viscosidade e o assentamento, e a rota do case lê a proporção do painel.
 */

/** Proporção fixa de todo painel e de toda capa: 16 por 10. */
export const PANEL_ASPECT = 1.6;

/** Quantas paradas a trilha tem. É o número de cases publicados. */
export const STOP_COUNT = 6;

/** O progresso em que a câmera lê o painel `index`. */
export function stopProgress(index: number): number {
  const { from, to } = beatOf("cases");
  const span = (to - from) / STOP_COUNT;
  return from + span * (index + 0.5);
}

const STOPS: readonly number[] = Array.from({ length: STOP_COUNT }, (_, index) =>
  stopProgress(index),
);

export function stops(): readonly number[] {
  return STOPS;
}

/** A parada mais próxima de um progresso, ou −1 fora do beat de Cases. */
export function stopAt(progress: number): number {
  const { from, to } = beatOf("cases");
  if (progress < from || progress > to) return -1;
  const index = Math.floor(((progress - from) / (to - from)) * STOP_COUNT);
  return Math.min(STOP_COUNT - 1, Math.max(0, index));
}
