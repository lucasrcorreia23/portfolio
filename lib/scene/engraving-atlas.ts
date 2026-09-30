import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from "three";
import type { Fossil, FossilMotif } from "./chamber-plan";

/**
 * O atlas dos fósseis gravados — um campo de altura por fóssil (rodada 16).
 *
 * Até a rodada 15 este atlas guardava `EST. 047` e `COTA +03.10` em Geist Mono.
 * A câmara trocou a medida pela natureza (decisão do Lucas, 2026-09-30), e o
 * mecanismo ficou: o que sai daqui é **máscara**, branco onde a vala está, e o
 * shader da placa deriva a normal do gradiente dela. A borda antisserrilhada do
 * traço vira o chanfro, e o fóssil só aparece quando a luz passa rente.
 *
 * Os seis motivos são desenhados à mão em Canvas 2D, com uma semente por
 * fóssil — nenhum arquivo de imagem, e dois fósseis do mesmo motivo nunca são
 * iguais. Traço de ~3 a 5 px num ladrilho de 256: grosso o bastante para a
 * vala ler a cinco unidades, fino o bastante para continuar sendo gravação.
 */

export const TILE = 256;
export const ATLAS_COLUMNS = 4;
export const ATLAS_WIDTH = TILE * ATLAS_COLUMNS;

export type EngravingAtlas = {
  texture: CanvasTexture;
  /** Altura do atlas, em pixels. */
  height: number;
  dispose: () => void;
};

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

function rng(seed: number): Rand {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function stroke(ctx: Ctx, width: number, path: () => void) {
  ctx.lineWidth = width;
  ctx.beginPath();
  path();
  ctx.stroke();
}

/** Samambaia: uma raque curva e pinas alternadas, cada uma com folíolos. */
function fern(ctx: Ctx, r: Rand) {
  const bend = (r() - 0.5) * 50;
  const at = (t: number): [number, number] => [
    128 + bend * Math.sin(t * Math.PI * 0.9),
    238 - 220 * t,
  ];
  stroke(ctx, 5, () => {
    for (let k = 0; k <= 30; k += 1) {
      const [x, y] = at(k / 30);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  });
  const pairs = 11 + Math.floor(r() * 4);
  for (let i = 0; i < pairs; i += 1) {
    const t = 0.1 + (0.85 * i) / pairs;
    const [x, y] = at(t);
    const length = 78 * Math.pow(1 - t, 0.7) + 10;
    for (const side of [-1, 1]) {
      const lift = 0.9 + r() * 0.25;
      const ex = x + side * length;
      const ey = y - length * lift * 0.55;
      stroke(ctx, 3, () => {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + side * length * 0.5, y - 4, ex, ey);
      });
      const leaflets = Math.max(2, Math.round(length / 12));
      for (let j = 1; j < leaflets; j += 1) {
        const u = j / leaflets;
        const px = x + (ex - x) * u;
        const py = y + (ey - y) * u * u;
        const l = 9 * (1 - u) + 3;
        stroke(ctx, 2, () => {
          ctx.moveTo(px, py);
          ctx.lineTo(px + side * l * 0.3, py - l);
          ctx.moveTo(px, py);
          ctx.lineTo(px + side * l * 0.5, py + l * 0.6);
        });
      }
    }
  }
}

/** Folha: contorno, nervura central e as secundárias subindo para a borda. */
function leaf(ctx: Ctx, r: Rand) {
  const width = 58 + r() * 22;
  const lean = (r() - 0.5) * 24;
  stroke(ctx, 4, () => {
    ctx.moveTo(128, 240);
    ctx.bezierCurveTo(128 - width * 1.3, 180, 128 - width + lean, 60, 128 + lean, 18);
    ctx.bezierCurveTo(128 + width + lean, 60, 128 + width * 1.3, 180, 128, 240);
  });
  stroke(ctx, 4, () => {
    ctx.moveTo(128, 252);
    ctx.quadraticCurveTo(128 + lean * 0.4, 130, 128 + lean, 20);
  });
  const veins = 7 + Math.floor(r() * 3);
  for (let i = 1; i <= veins; i += 1) {
    const t = i / (veins + 1);
    const y = 236 - 214 * t;
    const x = 128 + lean * t;
    const span = width * Math.sin(Math.PI * (0.15 + 0.8 * t)) * 0.85;
    for (const side of [-1, 1]) {
      stroke(ctx, 2.5, () => {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + side * span * 0.5, y - 6, x + side * span, y - span * 0.55);
      });
    }
  }
}

/** Amonite: espiral logarítmica e as costelas entre uma volta e a seguinte. */
function ammonite(ctx: Ctx, r: Rand) {
  const turns = 3.3 + r() * 0.5;
  const b = Math.log(112 / 6) / (turns * Math.PI * 2);
  const radius = (theta: number) => 6 * Math.exp(b * theta);
  const rot = r() * Math.PI * 2;
  const pt = (theta: number, rr: number): [number, number] => [
    128 + Math.cos(theta + rot) * rr,
    128 + Math.sin(theta + rot) * rr,
  ];
  const end = turns * Math.PI * 2;
  stroke(ctx, 4, () => {
    for (let theta = 0; theta <= end; theta += 0.05) {
      const [x, y] = pt(theta, radius(theta));
      if (theta === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  });
  for (let theta = Math.PI * 2; theta <= end; theta += 0.16 + r() * 0.04) {
    const inner = radius(theta - Math.PI * 2);
    const outer = radius(theta);
    const [x0, y0] = pt(theta, inner);
    const [xm, ym] = pt(theta + 0.08, (inner + outer) / 2);
    const [x1, y1] = pt(theta, outer);
    stroke(ctx, 2.2, () => {
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(xm, ym, x1, y1);
    });
  }
}

/** Vieira: costelas em leque a partir da charneira, borda ondulada, orelhas. */
function shell(ctx: Ctx, r: Rand) {
  const hx = 128;
  const hy = 226;
  const ribs = 14 + Math.floor(r() * 5);
  const spread = 1.1 + r() * 0.15;
  const reach = 190;
  const edge: [number, number][] = [];
  for (let i = 0; i <= ribs; i += 1) {
    const a = -Math.PI / 2 - spread + (2 * spread * i) / ribs;
    const x = hx + Math.cos(a) * reach;
    const y = hy + Math.sin(a) * reach * 0.95;
    edge.push([x, y]);
    stroke(ctx, 2.6, () => {
      ctx.moveTo(hx, hy);
      ctx.lineTo(x, y);
    });
  }
  stroke(ctx, 4, () => {
    edge.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else {
        const [px, py] = edge[i - 1] ?? [x, y];
        ctx.quadraticCurveTo((px + x) / 2, (py + y) / 2 - 8, x, y);
      }
    });
  });
  stroke(ctx, 3.5, () => {
    ctx.moveTo(hx - 40, hy + 2);
    ctx.lineTo(hx + 40, hy + 2);
    ctx.lineTo(hx + 30, hy - 22);
    ctx.moveTo(hx - 40, hy + 2);
    ctx.lineTo(hx - 30, hy - 22);
  });
}

/** Sâmara: a semente cheia e a asa, com as nervuras abrindo em leque. */
function seed(ctx: Ctx, r: Rand) {
  const sx = 70;
  const sy = 196;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 26, 18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  const tipX = 222 - r() * 16;
  const tipY = 36 + r() * 16;
  stroke(ctx, 4, () => {
    ctx.moveTo(sx + 10, sy - 18);
    ctx.bezierCurveTo(110, 90, 170, 30, tipX, tipY);
    ctx.bezierCurveTo(230, 110, 170, 170, sx + 22, sy + 4);
  });
  const veins = 9 + Math.floor(r() * 3);
  for (let i = 0; i < veins; i += 1) {
    const t = (i + 0.5) / veins;
    const ex = sx + 30 + (tipX - sx - 30) * (0.55 + 0.4 * Math.sin(t * Math.PI));
    const ey = sy - 10 + (tipY - sy + 10) * t + 30 * (1 - t);
    stroke(ctx, 2, () => {
      ctx.moveTo(sx + 16, sy - 6);
      ctx.quadraticCurveTo((sx + ex) / 2 + 10, (sy + ey) / 2 + 12, ex, ey);
    });
  }
}

/** Peixe fóssil: espinha, costelas, cabeça, nadadeiras e cauda em leque. */
function fish(ctx: Ctx, r: Rand) {
  const wave = 6 + r() * 8;
  const spineY = (x: number) => 128 + Math.sin((x - 40) / 60) * wave;
  stroke(ctx, 4, () => {
    for (let x = 58; x <= 204; x += 4) {
      if (x === 58) ctx.moveTo(x, spineY(x));
      else ctx.lineTo(x, spineY(x));
    }
  });
  for (let x = 66; x <= 196; x += 6.5) {
    const t = (x - 66) / 130;
    const h = 46 * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.9)) + 6;
    const y = spineY(x);
    stroke(ctx, 2, () => {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 5, y - h * 0.6, x + 9, y - h);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 5, y + h * 0.6, x + 9, y + h);
    });
  }
  stroke(ctx, 4, () => {
    ctx.moveTo(62, spineY(62) - 34);
    ctx.quadraticCurveTo(14, spineY(40) - 20, 16, spineY(40));
    ctx.quadraticCurveTo(14, spineY(40) + 22, 62, spineY(62) + 32);
  });
  ctx.beginPath();
  ctx.arc(38, spineY(38) - 6, 6, 0, Math.PI * 2);
  ctx.fill();
  const tx = 206;
  const ty = spineY(tx);
  for (let i = 0; i < 9; i += 1) {
    const a = -0.75 + (1.5 * i) / 8;
    stroke(ctx, 2.2, () => {
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(a) * 44, ty + Math.sin(a) * 50);
    });
  }
}

const DRAW: Record<FossilMotif, (ctx: Ctx, r: Rand) => void> = {
  fern,
  leaf,
  ammonite,
  shell,
  seed,
  fish,
};

/** A coluna e a linha do ladrilho de um fóssil. */
export function tileOf(index: number): [number, number] {
  return [index % ATLAS_COLUMNS, Math.floor(index / ATLAS_COLUMNS)];
}

export function createEngravingAtlas(fossils: readonly Fossil[]): EngravingAtlas {
  const rows = Math.max(1, Math.ceil(fossils.length / ATLAS_COLUMNS));
  const height = 2 ** Math.ceil(Math.log2(rows * TILE));
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.flipY = false;

  if (ctx !== null) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    fossils.forEach((fossil, index) => {
      const [col, row] = tileOf(index);
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * TILE, row * TILE, TILE, TILE);
      ctx.clip();
      // O ladrilho gira em volta do próprio centro; o desenho cabe no círculo
      // inscrito, então nada é cortado pelo giro.
      ctx.translate(col * TILE + TILE / 2, row * TILE + TILE / 2);
      ctx.rotate(fossil.angle);
      ctx.scale(0.86, 0.86);
      ctx.translate(-TILE / 2, -TILE / 2);
      DRAW[fossil.motif](ctx, rng(fossil.seed));
      ctx.restore();
    });
    texture.needsUpdate = true;
  }

  return { texture, height, dispose: () => texture.dispose() };
}
