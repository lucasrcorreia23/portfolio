import { VITRINE } from "@/content/vitrine";
import { WALL_CELL, WALL_COLUMNS, WALL_ROWS } from "@/lib/scene/world";

/**
 * A margem entre a imagem e a borda do quadro, em unidades do mundo. A imagem
 * entra inteira, no formato dela, centrada no que sobra.
 */
export const WALL_PAD = 0.09;

/** Uma tela da parede: a do item, com o tamanho da imagem dentro do quadro. */
export type WallScreen = {
  name: string;
  src: string;
  /** A versão pequena, a que vai para o atlas. */
  tile: string;
  video: boolean;
  aspect: number;
  /** Largura e altura da imagem no plano da parede, em unidades do mundo. */
  width: number;
  height: number;
};

function fitted(aspect: number): { width: number; height: number } {
  const room = { width: WALL_CELL.width - 2 * WALL_PAD, height: WALL_CELL.height - 2 * WALL_PAD };
  return aspect > room.width / room.height
    ? { width: room.width, height: room.width / aspect }
    : { width: room.height * aspect, height: room.height };
}

/** As 27 telas, na ordem das células: coluna a coluna, de cima para baixo. */
export const WALL_SCREENS: readonly WallScreen[] = VITRINE.flatMap((item) =>
  item.screens.map(({ src, aspect }) => ({
    name: item.name,
    src,
    tile: src.replace(/\.(mp4|webp)$/, ".sm.webp"),
    video: src.endsWith(".mp4"),
    aspect,
    ...fitted(aspect),
  })),
).slice(0, WALL_COLUMNS * WALL_ROWS);
