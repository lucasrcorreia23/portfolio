import { beatOf } from "@/components/beats/beats";
import { STOP_COUNT } from "./stops";

/**
 * A planta do mundo: o terreno, a trilha, as paradas e as manchas de flora.
 * Tudo que tem lugar lê daqui, para a câmera, os painéis, a indústria e a
 * flora concordarem sobre onde as coisas estão. Uma unidade ≈ um metro.
 *
 * Sem three: é só conta.
 */

/* ------------------------------------------------------------------ terreno */

export const TERRAIN = {
  minX: -120,
  maxX: 120,
  minZ: -350,
  maxZ: 50,
  cols: 96,
  rows: 168,
} as const;

export const TERRAIN_WIDTH = TERRAIN.maxX - TERRAIN.minX;
export const TERRAIN_DEPTH = TERRAIN.maxZ - TERRAIN.minZ;

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** O eixo da trilha: um meandro suave em X ao longo de Z. */
export function pathX(z: number): number {
  return 5 * Math.sin(z * 0.021 + 0.6);
}

function rawHeight(x: number, z: number): number {
  const dunes =
    (valueNoise(x * 0.017 + 3.1, z * 0.017) - 0.5) * 9 +
    (valueNoise(x * 0.047, z * 0.047 + 7.7) - 0.5) * 2.4 +
    (valueNoise(x * 0.13 + 1.3, z * 0.13) - 0.5) * 0.5;
  // Um corredor mais plano em volta da trilha, e dunas maiores para as bordas:
  // é o que dá horizonte em silhueta sem a câmera subir e descer morro.
  const off = Math.abs(x - pathX(z));
  const corridor = 0.3 + 0.7 * Math.min(1, Math.max(0, (off - 6) / 26));
  const rim = 1 + Math.max(0, off - 40) / 45;
  return dunes * corridor * rim;
}

let field: Float32Array | null = null;

/** O campo de alturas, gerado uma vez. A malha e a flora leem o mesmo array. */
export function heightfield(): Float32Array {
  if (field !== null) return field;
  const { cols, rows, minX, minZ } = TERRAIN;
  const out = new Float32Array((cols + 1) * (rows + 1));
  const dx = TERRAIN_WIDTH / cols;
  const dz = TERRAIN_DEPTH / rows;
  for (let iz = 0; iz <= rows; iz += 1) {
    for (let ix = 0; ix <= cols; ix += 1) {
      out[iz * (cols + 1) + ix] = rawHeight(minX + ix * dx, minZ + iz * dz);
    }
  }
  field = out;
  return out;
}

/** A altura do terreno num ponto: bilinear no campo, igual à malha. */
export function heightAt(x: number, z: number): number {
  const data = heightfield();
  const { cols, rows, minX, minZ } = TERRAIN;
  const gx = Math.min(cols - 1e-4, Math.max(0, ((x - minX) / TERRAIN_WIDTH) * cols));
  const gz = Math.min(rows - 1e-4, Math.max(0, ((z - minZ) / TERRAIN_DEPTH) * rows));
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;
  const row = cols + 1;
  const a = data[iz * row + ix] ?? 0;
  const b = data[iz * row + ix + 1] ?? 0;
  const c = data[(iz + 1) * row + ix] ?? 0;
  const d = data[(iz + 1) * row + ix + 1] ?? 0;
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/* ------------------------------------------------------------------- trilha */

/** Onde a câmera está em Z no começo e no fim de cada momento. */
const Z_START = 26;
const Z_INTRO = -22;
const Z_CASES = -62;
/** A distância entre duas paradas, e de quão longe a câmera lê o painel. */
export const STOP_SPACING = 32;
export const STOP_DISTANCE = 9.5;
const STOP_LEAD = 25;
const Z_END_EXTRA = 34;

/** O Z de cada painel. */
export const STOP_Z: readonly number[] = Array.from(
  { length: STOP_COUNT },
  (_, index) => Z_CASES - STOP_LEAD - index * STOP_SPACING,
);

const Z_CTA = Z_CASES - STOP_COUNT * STOP_SPACING;
export const Z_END = Z_CTA - Z_END_EXTRA;

/** Quanto a câmera desacelera no meio de uma parada: 0.35× ali, 1.65× entre. */
const STOP_SLOW = 0.65;

/** O Z da câmera para um progresso da descida. */
export function cameraZ(progress: number): number {
  const impact = beatOf("impact");
  const intro = beatOf("intro");
  const cases = beatOf("cases");
  if (progress <= impact.to) {
    return Z_START + (Z_INTRO - Z_START) * (progress / impact.to);
  }
  if (progress <= intro.to) {
    const t = (progress - intro.from) / (intro.to - intro.from);
    return Z_INTRO + (Z_CASES - Z_INTRO) * t;
  }
  if (progress < cases.to) {
    const local = ((progress - cases.from) / (cases.to - cases.from)) * STOP_COUNT;
    const index = Math.min(STOP_COUNT - 1, Math.floor(local));
    const t = local - index;
    // Sem platô: a velocidade cai no meio da parada e nunca chega a zero.
    const eased = t + (STOP_SLOW * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);
    return Z_CASES - index * STOP_SPACING - STOP_SPACING * eased;
  }
  const t = (progress - cases.to) / (1 - cases.to);
  return Z_CTA + (Z_END - Z_CTA) * t;
}

/** Em que parada um progresso está, e quão no centro dela (0 nas bordas, 1 no meio). */
export function stopWeight(progress: number): { index: number; weight: number } {
  const cases = beatOf("cases");
  if (progress <= cases.from || progress >= cases.to) return { index: -1, weight: 0 };
  const local = ((progress - cases.from) / (cases.to - cases.from)) * STOP_COUNT;
  const index = Math.min(STOP_COUNT - 1, Math.floor(local));
  const t = local - index;
  // Assimétrico: a câmera encontra o painel devagar e o solta antes de passar
  // por ele, para nunca olhar para trás.
  const before = 1 - smooth((0.5 - t - 0.1) / 0.36);
  const after = 1 - smooth((t - 0.5) / 0.2);
  return { index, weight: t < 0.5 ? before : after };
}

function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ painéis */

/** A altura do centro do painel acima do chão. */
export const PANEL_LIFT = 3.7;
/** O painel fica um pouco à direita do eixo: a esquerda é da navegação. */
const PANEL_SIDE = 2.2;

export type Placement = { x: number; y: number; z: number; yaw: number };

/** Onde o painel da parada `index` está, virado para a câmera que chega. */
export function panelPlacement(index: number): Placement {
  const z = STOP_Z[index] ?? 0;
  const x = pathX(z) + PANEL_SIDE;
  const camZ = z + STOP_DISTANCE;
  const camX = pathX(camZ);
  return {
    x,
    y: heightAt(x, z) + PANEL_LIFT,
    z,
    yaw: Math.atan2(camX - x, camZ - z),
  };
}

/* -------------------------------------------------------------------- flora */

export type Patch = {
  /** O centro da mancha e os raios dela. */
  x: number;
  z: number;
  rx: number;
  rz: number;
  /** Quantas flores, no nível alto de qualidade. */
  count: number;
  /** A força da luz da mancha: é o `w` do emissor. */
  light: number;
  /** A parada a que a mancha pertence, ou −1. */
  stop: number;
};

/**
 * As manchas de flora: o campo do Impacto, uma mancha densa em cada case e a
 * do CTA. A ordem é a dos emissores no shader.
 */
export function floraPatches(): readonly Patch[] {
  const patches: Patch[] = [
    { x: pathX(-22) + 8, z: -22, rx: 25, rz: 24, count: 1250, light: 1.6, stop: -1 },
    { x: pathX(0) - 19, z: 2, rx: 10, rz: 10, count: 260, light: 0.7, stop: -1 },
    { x: pathX(-54) + 13, z: -54, rx: 11, rz: 10, count: 320, light: 0.95, stop: -1 },
  ];
  for (let index = 0; index < STOP_COUNT; index += 1) {
    const panel = panelPlacement(index);
    patches.push({
      x: panel.x + 0.5,
      z: panel.z - 4.5,
      rx: 9.5,
      rz: 7.5,
      count: 210,
      light: 1,
      stop: index,
    });
  }
  patches.push({
    x: pathX(Z_END - 16) + 1,
    z: Z_END - 16,
    rx: 15,
    rz: 12,
    count: 520,
    light: 1.7,
    stop: -1,
  });
  return patches;
}
