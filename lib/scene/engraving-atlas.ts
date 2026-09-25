import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from "three";
import type { EngravingLabel } from "./chamber-plan";

/**
 * O atlas dos números gravados — um campo de altura por linha de texto.
 *
 * `EST. 047` e `COTA +03.10` na família mono (DIRECTION.md §5: "números
 * gravados na família mono, recessados"). O troika não serve aqui: ele não lê
 * `.woff2` e a Geist Mono só existe nesse formato no projeto. O Canvas 2D lê a
 * mesma fonte que o DOM já carregou — é o caminho que a placa dos cards já usa
 * (`card-atlas.ts`) —, então não entra arquivo de fonte nem terceira família.
 *
 * O que sai é **máscara**, não imagem: branco onde a vala está. Quem transforma
 * isso em gravação é o shader, que deriva a normal do gradiente da máscara — a
 * borda antisserrilhada do texto vira o chanfro.
 */

export const ATLAS_WIDTH = 1024;
export const ROW_HEIGHT = 96;
/** Onde a linha de base fica dentro da linha, e o corpo do texto. */
const BASELINE = 78;
const FONT_PX = 84;

export type EngravingAtlas = {
  texture: CanvasTexture;
  rows: number;
  /** Largura ocupada por linha, em fração do atlas. */
  widths: readonly number[];
  /** Altura de caixa alta medida, em pixels do atlas. */
  capPx: number;
  dispose: () => void;
};

/** A família mono que o `next/font` publicou, resolvida do próprio documento. */
function monoFamily(): string {
  if (typeof document === "undefined") return "monospace";
  const published = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-geist-mono")
    .trim();
  return published.length > 0
    ? `${published}, "Geist Mono", ui-monospace, monospace`
    : `"Geist Mono", ui-monospace, monospace`;
}

export function createEngravingAtlas(
  labels: readonly EngravingLabel[],
): EngravingAtlas {
  const rows = Math.max(1, labels.length);
  const rowsPow2 = 2 ** Math.ceil(Math.log2(rows * ROW_HEIGHT));
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_WIDTH;
  canvas.height = rowsPow2;
  const ctx = canvas.getContext("2d");
  const widths: number[] = [];
  let capPx = FONT_PX * 0.7;

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.flipY = false;

  const paint = () => {
    if (ctx === null) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.font = `500 ${FONT_PX}px ${monoFamily()}`;
    ctx.letterSpacing = `${(FONT_PX * 0.12).toFixed(1)}px`;
    capPx = ctx.measureText("0").actualBoundingBoxAscent || capPx;
    widths.length = 0;
    labels.forEach((label, row) => {
      const width = Math.min(ATLAS_WIDTH - 8, ctx.measureText(label.text).width);
      ctx.fillText(label.text, 4, row * ROW_HEIGHT + BASELINE);
      widths.push((width + 8) / ATLAS_WIDTH);
    });
    texture.needsUpdate = true;
  };

  paint();
  // A mono pode chegar depois da cena montar; redesenhar custa um quadro de
  // canvas e evita números gravados com a métrica da fonte de sistema.
  if (typeof document !== "undefined" && "fonts" in document) {
    const deadline = new Promise((done) => setTimeout(done, 1500));
    Promise.race([
      document.fonts.load(`500 ${FONT_PX}px "Geist Mono"`),
      deadline,
    ]).then(paint, () => {});
  }

  return {
    texture,
    rows,
    get widths() {
      return widths;
    },
    get capPx() {
      return capPx;
    },
    dispose: () => texture.dispose(),
  };
}

export const ATLAS_BASELINE = BASELINE;
