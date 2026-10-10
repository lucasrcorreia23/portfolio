import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { readPalette } from "@/lib/palette";
import {
  PLACEHOLDER_HEIGHT as H,
  PLACEHOLDER_WIDTH as W,
  placeholderSpec,
  type PlaceholderSpec,
} from "@/lib/placeholder";

/**
 * O placeholder desenhado em canvas, para virar textura do painel na cena. É
 * a mesma especificação do SVG do DOM (`components/work/Placeholder.tsx`), e
 * precisa continuar igual a ele: é o que faz o painel e a capa do case serem a
 * mesma imagem na travessia.
 */

/** Pixels de canvas por unidade da caixa de 320 × 200. */
const SCALE = 4;

function paint(canvas: HTMLCanvasElement, spec: PlaceholderSpec, family: string): void {
  const g = canvas.getContext("2d");
  if (g === null) return;
  const palette = readPalette();
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.fillStyle = palette.deep;
  g.fillRect(0, 0, W, H);

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

  // A régua de baixo.
  g.strokeStyle = palette.teal;
  g.lineWidth = 0.75;
  const step = (W - 32) / (spec.ticks - 1);
  for (let i = 0; i < spec.ticks; i += 1) {
    g.beginPath();
    g.moveTo(16 + i * step, H - 30);
    g.lineTo(16 + i * step, H - 30 - (i % 4 === 0 ? 5 : 2.5));
    g.stroke();
  }

  // As linhas de cota até o ponto de emissão.
  g.lineWidth = 0.5;
  g.setLineDash([1.5, 2.5]);
  g.beginPath();
  g.moveTo(spec.x, 24);
  g.lineTo(spec.x, spec.y - spec.size - 4);
  g.moveTo(24, spec.y);
  g.lineTo(spec.x - spec.size - 4, spec.y);
  g.stroke();
  g.setLineDash([]);

  // O ponto de emissão.
  g.fillStyle = palette.cyan;
  g.strokeStyle = palette.cyan;
  g.lineWidth = 1.4;
  g.beginPath();
  if (spec.shape === "ring") {
    g.arc(spec.x, spec.y, spec.size, 0, Math.PI * 2);
    g.stroke();
  } else if (spec.shape === "bar") {
    g.fillRect(spec.x - spec.size * 1.6, spec.y - 1, spec.size * 3.2, 2);
  } else if (spec.shape === "cross") {
    g.moveTo(spec.x - spec.size, spec.y);
    g.lineTo(spec.x + spec.size, spec.y);
    g.moveTo(spec.x, spec.y - spec.size);
    g.lineTo(spec.x, spec.y + spec.size);
    g.stroke();
  } else {
    g.arc(spec.x, spec.y, spec.size * 0.6, 0, Math.PI * 2);
    g.fill();
  }

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    spacing: number,
    align: CanvasTextAlign = "left",
    alpha = 1,
  ) => {
    g.font = `500 ${size}px ${family}`;
    g.letterSpacing = `${spacing}px`;
    g.textAlign = align;
    g.globalAlpha = alpha;
    g.fillStyle = palette.mist;
    g.fillText(value, x, y);
    g.globalAlpha = 1;
  };
  text(spec.index, 24, 30, 7, 1.2);
  text(spec.readout, W - 24, 30, 5, 0.9, "right", 0.7);
  text(spec.name.toUpperCase(), 24, H - 16, 8, 1.4);
}

export type PanelTexture = {
  texture: CanvasTexture;
  /** O ponto de emissão em UV (origem embaixo à esquerda) e o raio. */
  dot: [number, number, number];
};

export function createPanelTexture(name: string, index: number): PanelTexture {
  const spec = placeholderSpec(name, index);
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-geist-mono")
      .trim() || "ui-monospace, monospace";

  paint(canvas, spec, family);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;

  // A fonte pode chegar depois do primeiro desenho.
  void document.fonts.load(`500 28px ${family}`).then(() => {
    paint(canvas, spec, family);
    texture.needsUpdate = true;
  });

  return {
    texture,
    dot: [spec.x / W, 1 - spec.y / H, (spec.size * 1.8) / H],
  };
}
