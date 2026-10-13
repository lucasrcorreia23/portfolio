import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";
import { readPalette } from "@/lib/palette";

/** A célula de uma tela no atlas, em pixels: a caixa do `.sm.webp`. */
export const WALL_TILE = { width: 1280, height: 800 };

/**
 * Quanto da célula do atlas a imagem ocupa, na largura e na altura: ela entra
 * inteira, centrada, no formato dela.
 */
export function tileSpan(aspect: number): [number, number] {
  const cell = WALL_TILE.width / WALL_TILE.height;
  return aspect > cell ? [1, cell / aspect] : [aspect / cell, 1];
}

function load(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "low";
  image.src = src;
  return image.decode().then(() => image);
}

/**
 * As telas pequenas da parede numa textura só, `columns` × `rows` células, a
 * primeira em cima à esquerda e descendo por coluna, como na parede. A
 * textura nasce vazia e é pintada uma vez, quando as imagens chegam. `scale`
 * encolhe a célula: no celular o atlas inteiro não cabe na memória do Safari.
 */
export function createWallAtlas(
  tiles: readonly { tile: string; aspect: number }[],
  columns: number,
  rows: number,
  scale = 1,
): CanvasTexture {
  const cellWidth = WALL_TILE.width * scale;
  const cellHeight = WALL_TILE.height * scale;
  const canvas = document.createElement("canvas");
  canvas.width = cellWidth * columns;
  canvas.height = cellHeight * rows;
  const g = canvas.getContext("2d");
  if (g !== null) {
    g.fillStyle = readPalette().deep;
    g.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // De longe cada tela ocupa poucas dezenas de pixels: sem mipmap o texto cintila.
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;

  void Promise.allSettled(tiles.map(({ tile }) => load(tile))).then((loaded) => {
    if (g === null) return;
    loaded.forEach((result, index) => {
      const tile = tiles[index];
      if (result.status !== "fulfilled" || tile === undefined) return;
      const [spanX, spanY] = tileSpan(tile.aspect);
      const width = cellWidth * spanX;
      const height = cellHeight * spanY;
      const left = Math.floor(index / rows) * cellWidth + (cellWidth - width) / 2;
      const top = (index % rows) * cellHeight + (cellHeight - height) / 2;
      g.drawImage(result.value, left, top, width, height);
    });
    texture.needsUpdate = true;
  });
  return texture;
}
