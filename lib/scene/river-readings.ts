/**
 * Onde, em progresso, cada card do rio é lido — sem three.
 *
 * Mora fora de `curve.ts` porque tem dois leitores em caixas de pacote
 * diferentes: a curva da câmera (chunk da cena) e o snap do scroll (chunk do
 * driver). `curve.ts` importa three; o driver não pode, senão a cena inteira
 * entraria no chunk do scroll.
 *
 * As leituras são igualmente espaçadas de 0.50 a 0.80, uma por card da
 * corrente deste aparelho (`resolveRiver()`).
 */
import { resolveRiver } from "./cards";

/** A primeira e a última leitura do rio, em progresso. */
export const RIVER_FIRST_READING = 0.5;
export const RIVER_LAST_READING = 0.8;

export function readingAt(index: number, count: number): number {
  const last = Math.max(count - 1, 1);
  return RIVER_FIRST_READING + (RIVER_LAST_READING - RIVER_FIRST_READING) * (index / last);
}

/** O progresso de leitura de cada card da corrente deste aparelho, em ordem. */
export function riverReadings(): number[] {
  const { count } = resolveRiver();
  return Array.from({ length: count }, (_, index) => readingAt(index, count));
}
