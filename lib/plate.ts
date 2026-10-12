/**
 * A placa de um case: a montagem do projeto (`scripts/derive-placas.mjs`) com
 * o HUD por cima — índice, cliente, nome e as cruzes de registro.
 *
 * Uma especificação, dois desenhistas: o SVG do DOM
 * (`components/work/PlateHud.tsx`), por cima da imagem na capa do case, e o
 * canvas que vira textura do painel na cena (`lib/scene/panel-texture.ts`).
 */

/** Proporção fixa: 16 por 10. As medidas abaixo são nesta caixa. */
export const PLATE_WIDTH = 320;
export const PLATE_HEIGHT = 200;

/** Até onde as faixas escuras do HUD descem e sobem, na caixa de 320 × 200. */
export const PLATE_SCRIM = 56;

export type PlateHud = {
  name: string;
  client: string;
  /** O índice em dois dígitos, "01". */
  index: string;
};

export function plateHud(name: string, index: number, client = ""): PlateHud {
  return { name, client, index: String(index + 1).padStart(2, "0") };
}

/** A montagem do case: 2560 × 1600 na capa, 1280 × 800 (`small`) na placa. */
export function plateImage(slug: string, small = false): string {
  return `/assets/img/placas/${slug}${small ? ".sm" : ""}.webp`;
}
