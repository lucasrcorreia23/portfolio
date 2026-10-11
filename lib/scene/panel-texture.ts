import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from "three";
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

/** Desenha uma placa na caixa de 320 × 200 que começa em (`left`, `top`). */
function paint(
  canvas: HTMLCanvasElement,
  spec: PlaceholderSpec,
  family: string,
  scale = SCALE,
  left = 0,
  top = 0,
): void {
  const g = canvas.getContext("2d");
  if (g === null) return;
  const palette = readPalette();
  g.setTransform(scale, 0, 0, scale, left, top);
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
  text(spec.client.toUpperCase(), 40, 30, 7, 1.2, "left", 0.7);
  text(spec.readout, W - 24, 30, 5, 0.9, "right", 0.7);
  text(spec.name.toUpperCase(), 24, H - 16, 8, 1.4);
}

function monoFamily(): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-geist-mono")
      .trim() || "ui-monospace, monospace"
  );
}

/** O ponto de emissão em UV da placa (origem embaixo à esquerda) e o raio. */
function dotOf(spec: PlaceholderSpec): [number, number, number] {
  return [spec.x / W, 1 - spec.y / H, (spec.size * 1.8) / H];
}

export type PanelTexture = {
  texture: CanvasTexture;
  /** O ponto de emissão em UV (origem embaixo à esquerda) e o raio. */
  dot: [number, number, number];
};

export function createPanelTexture(
  name: string,
  index: number,
  client: string,
): PanelTexture {
  const spec = placeholderSpec(name, index, client);
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const family = monoFamily();

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

  return { texture, dot: dotOf(spec) };
}

/** Pixels de canvas por unidade nas telas da parede. */
const WALL_SCALE = 1.5;

/** Uma tela da parede da vitrine: um placeholder do item, ou uma imagem dele. */
export type WallScreen = {
  name: string;
  /** A posição do item na vitrine. */
  index: number;
  /** Qual tela do item é esta, a partir de zero. */
  variant: number;
  /** A imagem da tela, em `public/`. Sem ela, o placeholder. */
  src?: string;
};

type WallSource = { name: string; screens?: readonly string[] };

/**
 * As telas que ocupam a parede, na ordem dos itens. Quem tem telas próprias
 * entra com todas; as vagas que sobram são divididas entre os outros, em
 * placeholders — a parede não é uma tela por projeto.
 */
export function wallScreens(items: readonly WallSource[], slots: number): WallScreen[] {
  const own = items.reduce((sum, item) => sum + (item.screens?.length ?? 0), 0);
  const open = items.filter((item) => item.screens === undefined).length;
  const spare = Math.max(0, slots - own);
  const share = open === 0 ? 0 : Math.floor(spare / open);
  let extra = open === 0 ? 0 : spare % open;

  const out: WallScreen[] = [];
  items.forEach((item, index) => {
    if (item.screens !== undefined) {
      item.screens.forEach((src, variant) => {
        out.push({ name: item.name, index, variant, src });
      });
      return;
    }
    const count = share + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    for (let variant = 0; variant < count; variant += 1) {
      out.push({ name: item.name, index, variant });
    }
  });
  return out.slice(0, slots);
}

export type WallTexture = {
  texture: CanvasTexture;
  /** O ponto de emissão de cada tela, em UV da própria placa. Raio 0: sem ponto. */
  dots: [number, number, number][];
};

/**
 * As telas da parede da vitrine numa textura só: uma grade na ordem das
 * telas, a primeira em cima à esquerda. Os placeholders são os mesmos da página `/vitrine`.
 */
export function createWallTexture(
  screens: readonly WallScreen[],
  columns: number,
  rows: number,
): WallTexture {
  // A primeira tela de um item é o placeholder dele; as outras variam o ponto.
  const specs = screens.map((screen) => ({
    ...placeholderSpec(
      screen.variant === 0 ? screen.name : `${screen.name} ${screen.variant}`,
      screen.index,
    ),
    name: screen.name,
  }));
  const cellWidth = W * WALL_SCALE;
  const cellHeight = H * WALL_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = cellWidth * columns;
  canvas.height = cellHeight * rows;
  const family = monoFamily();
  const images = new Map<number, HTMLImageElement>();

  const paintAll = () => {
    const g = canvas.getContext("2d");
    if (g === null) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = readPalette().deep;
    g.fillRect(0, 0, canvas.width, canvas.height);
    specs.forEach((spec, index) => {
      const left = (index % columns) * cellWidth;
      const top = Math.floor(index / columns) * cellHeight;
      const image = images.get(index);
      if (image === undefined) {
        paint(canvas, spec, family, WALL_SCALE, left, top);
        return;
      }
      // A imagem cobre a placa inteira, cortada no centro.
      const fit = Math.max(cellWidth / image.naturalWidth, cellHeight / image.naturalHeight);
      const width = cellWidth / fit;
      const height = cellHeight / fit;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(
        image,
        (image.naturalWidth - width) / 2,
        (image.naturalHeight - height) / 2,
        width,
        height,
        left,
        top,
        cellWidth,
        cellHeight,
      );
    });
  };
  paintAll();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // De longe cada placa ocupa poucas dezenas de pixels: sem mipmap as linhas
  // finas do desenho cintilam.
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;

  const repaint = () => {
    paintAll();
    texture.needsUpdate = true;
  };
  void document.fonts.load(`500 28px ${family}`).then(repaint);
  screens.forEach((screen, index) => {
    if (screen.src === undefined) return;
    const image = new Image();
    image.onload = () => {
      images.set(index, image);
      repaint();
    };
    image.src = screen.src;
  });

  return {
    texture,
    dots: screens.map((screen, index) => {
      const spec = specs[index];
      return screen.src !== undefined || spec === undefined ? [0.5, 0.5, 0] : dotOf(spec);
    }),
  };
}
