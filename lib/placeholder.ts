/**
 * O placeholder de imagem: uma placa técnica gerada em código, sem arquivo.
 *
 * Uma especificação, dois desenhistas: o SVG do DOM
 * (`components/work/Placeholder.tsx`) e o canvas que vira textura do painel
 * na cena (`lib/scene/panel-texture.ts`). O ponto de emissão tem forma e
 * posição derivadas do nome, para cada item ser distinto.
 */

/** Proporção fixa: 16 por 10. As medidas abaixo são nesta caixa. */
export const PLACEHOLDER_WIDTH = 320;
export const PLACEHOLDER_HEIGHT = 200;

export type PlaceholderShape = "disc" | "ring" | "bar" | "cross";

export type PlaceholderSpec = {
  name: string;
  /** O índice em dois dígitos, "01". */
  index: string;
  shape: PlaceholderShape;
  /** O ponto de emissão, na caixa de 320 × 200. */
  x: number;
  y: number;
  size: number;
  /** Quantas marcas a régua de baixo tem. */
  ticks: number;
  /** A leitura em mono do canto: a posição do ponto. */
  readout: string;
};

const SHAPES: readonly PlaceholderShape[] = ["disc", "ring", "bar", "cross"];

/** FNV-1a de 32 bits: estável entre servidor e cliente. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function placeholderSpec(name: string, index: number): PlaceholderSpec {
  const h = hash(name.toLowerCase());
  const u = ((h >>> 3) % 1000) / 1000;
  const v = ((h >>> 13) % 1000) / 1000;
  const x = 70 + u * 200;
  const y = 52 + v * 84;
  return {
    name,
    index: String(index + 1).padStart(2, "0"),
    shape: SHAPES[h % SHAPES.length] as PlaceholderShape,
    x,
    y,
    size: 5 + ((h >>> 23) % 5),
    ticks: 14 + ((h >>> 7) % 9),
    readout: `X ${(x / PLACEHOLDER_WIDTH).toFixed(2)} · Y ${(y / PLACEHOLDER_HEIGHT).toFixed(2)}`,
  };
}
