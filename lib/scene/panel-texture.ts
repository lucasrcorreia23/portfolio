import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from "three";
import { readPalette } from "@/lib/palette";
import {
  PLATE_HEIGHT as H,
  PLATE_SCRIM,
  PLATE_WIDTH as W,
  plateHud,
  type PlateHud,
} from "@/lib/plate";

/**
 * A placa desenhada em canvas, para virar textura do painel na cena: a
 * montagem do case com o HUD por cima. É a mesma especificação do SVG do DOM
 * (`components/work/PlateHud.tsx`) sobre a mesma imagem, e precisa continuar
 * igual a ele: é o que faz o painel e a capa do case serem a mesma imagem na
 * travessia.
 */

/** Pixels de canvas por unidade da caixa de 320 × 200. */
const SCALE = 4;

/** Desenha a placa na caixa de 320 × 200. Sem a imagem, só o HUD. */
function paint(
  canvas: HTMLCanvasElement,
  hud: PlateHud,
  family: string,
  image: HTMLImageElement | null,
): void {
  const g = canvas.getContext("2d");
  if (g === null) return;
  const palette = readPalette();
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.fillStyle = palette.deep;
  g.fillRect(0, 0, W, H);
  if (image !== null) g.drawImage(image, 0, 0, W, H);

  // As faixas escuras que seguram o texto sobre a imagem.
  const top = g.createLinearGradient(0, 0, 0, PLATE_SCRIM);
  top.addColorStop(0, palette.deep);
  top.addColorStop(1, "transparent");
  g.fillStyle = top;
  g.fillRect(0, 0, W, PLATE_SCRIM);
  const bottom = g.createLinearGradient(0, H - PLATE_SCRIM, 0, H);
  bottom.addColorStop(0, "transparent");
  bottom.addColorStop(1, palette.deep);
  g.fillStyle = bottom;
  g.fillRect(0, H - PLATE_SCRIM, W, PLATE_SCRIM);

  g.strokeStyle = palette.teal;
  g.lineWidth = 0.75;
  g.strokeRect(8, 8, W - 16, H - 16);

  // As cruzes de registro.
  g.strokeStyle = palette.mist;
  g.globalAlpha = 0.55;
  g.lineWidth = 0.5;
  for (const [cx, cy] of [
    [16, 16],
    [W - 16, 16],
    [16, H - 16],
    [W - 16, H - 16],
  ] as const) {
    g.beginPath();
    g.moveTo(cx - 3, cy);
    g.lineTo(cx + 3, cy);
    g.moveTo(cx, cy - 3);
    g.lineTo(cx, cy + 3);
    g.stroke();
  }
  g.globalAlpha = 1;

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    spacing: number,
    alpha = 1,
  ) => {
    g.font = `500 ${size}px ${family}`;
    g.letterSpacing = `${spacing}px`;
    g.textAlign = "left";
    g.globalAlpha = alpha;
    g.fillStyle = palette.mist;
    g.fillText(value, x, y);
    g.globalAlpha = 1;
  };
  text(hud.index, 24, 30, 7, 1.2);
  text(hud.client.toUpperCase(), 40, 30, 7, 1.2, 0.7);
  text(hud.name.toUpperCase(), 24, H - 16, 8, 1.4);
}

function monoFamily(): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-geist-mono")
      .trim() || "ui-monospace, monospace"
  );
}

export function createPanelTexture(
  name: string,
  index: number,
  client: string,
  src: string,
): CanvasTexture {
  const hud = plateHud(name, index, client);
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const family = monoFamily();
  let image: HTMLImageElement | null = null;

  paint(canvas, hud, family, image);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Telas com texto miúdo: sem mipmaps elas cintilam com a câmera andando.
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;

  const repaint = () => {
    paint(canvas, hud, family, image);
    texture.needsUpdate = true;
  };

  // A fonte e a imagem chegam depois do primeiro desenho.
  void document.fonts.load(`500 28px ${family}`).then(repaint);
  const loading = new Image();
  loading.decoding = "async";
  loading.src = src;
  loading
    .decode()
    .then(() => {
      image = loading;
      repaint();
    })
    .catch(() => {
      // Sem a imagem, a placa fica só com o HUD.
    });

  return texture;
}
