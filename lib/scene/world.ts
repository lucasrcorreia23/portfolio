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
  maxZ: 90,
  cols: 96,
  rows: 185,
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
const Z_START = 50;
const Z_INTRO = 2;
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

/** Onde os cases acabam, e o trecho da bifurcação antes do CTA. */
const Z_FORK = Z_CASES - STOP_COUNT * STOP_SPACING;
const FORK_LENGTH = 30;
const Z_CTA = Z_FORK - FORK_LENGTH;
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
  const fork = beatOf("vitrine");
  if (progress < fork.to) {
    const t = (progress - fork.from) / (fork.to - fork.from);
    return Z_FORK - FORK_LENGTH * t;
  }
  const t = (progress - fork.to) / (1 - fork.to);
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

/**
 * Quanto a porta de enrolar da parada `index` está aberta, 0 a 1: sobe
 * enquanto a câmera chega, fica aberta durante a leitura e desce quando o
 * olhar volta para a trilha. Sem estado: é função do progresso.
 */
export function doorOpen(progress: number, index: number): number {
  const cases = beatOf("cases");
  const t = ((progress - cases.from) / (cases.to - cases.from)) * STOP_COUNT - index;
  if (t <= 0 || t >= 1) return 0;
  return smooth((t - 0.08) / 0.26) * (1 - smooth((t - 0.54) / 0.2));
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

/* --------------------------------------------------------------- bifurcação */

/**
 * A parede da vitrine: um desvio à esquerda da trilha, depois do último case.
 * A câmera chega perto dela com o scroll e volta para a trilha.
 */
export function vitrineWall(): Placement {
  const z = Z_FORK - FORK_LENGTH * 0.72;
  const x = pathX(z) - 27;
  const camZ = Z_FORK - FORK_LENGTH * 0.35;
  const camX = pathX(camZ);
  return {
    x,
    y: heightAt(x, z) + 5.2,
    z,
    yaw: Math.atan2(camX - x, camZ - z),
  };
}

/**
 * As telas da parede: colunas × linhas. São telas, não itens — um projeto
 * ocupa várias (ver `wallScreens`). A parede é uma faixa comprida: a câmera
 * enquadra a altura inteira e percorre as colunas.
 */
export const WALL_COLUMNS = 9;
export const WALL_ROWS = 3;
export const WALL_CELL = { width: 1.76, height: 1.1, gap: 0.28 };
export const WALL_SPAN = WALL_COLUMNS * WALL_CELL.width + (WALL_COLUMNS - 1) * WALL_CELL.gap;
export const WALL_TALL = WALL_ROWS * WALL_CELL.height + (WALL_ROWS - 1) * WALL_CELL.gap;

/** Em que fração do trecho a câmera chega à parede e em qual a solta. */
const FORK_ARRIVE = 0.2;
const FORK_LEAVE = 0.84;

/** Quanto a câmera está no desvio: chega logo, fica e solta no fim. */
export function forkWeight(progress: number): number {
  const fork = beatOf("vitrine");
  if (progress <= fork.from || progress >= fork.to) return 0;
  const t = (progress - fork.from) / (fork.to - fork.from);
  return smooth(t / FORK_ARRIVE) * (1 - smooth((t - FORK_LEAVE) / (1 - FORK_LEAVE)));
}

/** Quanto da parede a câmera já percorreu, 0 a 1: o scroll a arrasta, linear. */
export function wallPan(progress: number): number {
  const fork = beatOf("vitrine");
  const t = (progress - fork.from) / (fork.to - fork.from);
  return Math.min(1, Math.max(0, (t - FORK_ARRIVE) / (FORK_LEAVE - FORK_ARRIVE)));
}

/* -------------------------------------------------------------------- flora */

/** As espécies de planta. Os modelos e o desenho de cada uma estão em `plants.ts`. */
export type SpeciesId =
  | "empodium"
  | "gazania"
  | "celandine"
  | "rooibos"
  | "boulder"
  | "stone";

/** A receita de uma mancha: que fração das posições dela cada espécie ocupa. */
type Mix = Partial<Record<SpeciesId, number>>;

/** A flor alta e fria. */
const TALL: Mix = { empodium: 0.62, celandine: 0.14 };
/** A margarida baixa, onde o rosa aparece. */
const LOW: Mix = { gazania: 0.4, empodium: 0.3, celandine: 0.1 };

/**
 * As três zonas da trilha, pelos limites em Z: Impacto e Introdução, Cases, e
 * a Bifurcação com o CTA. A flora de uma zona longe da câmera não é desenhada.
 */
export const ZONE_EDGES: readonly number[] = [1e4, Z_CASES - 8, Z_FORK + 6, -1e4];

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
  /** Quanto da mancha é rosa, 0 a 1. */
  warm: number;
  /** Que plantas crescem ali. Cada trecho da trilha tem a flora dele. */
  mix: Mix;
};

/**
 * As manchas de flora: o campo do Impacto, uma mancha densa em cada case, a
 * do CTA, a da vitrine e a do começo. A ordem é a dos emissores no shader.
 */
export function floraPatches(): readonly Patch[] {
  const patches: Patch[] = [
    { x: pathX(-22) + 6, z: -22, rx: 32, rz: 24, count: 1500, light: 1.6, stop: -1, warm: 0.14, mix: { empodium: 0.52, gazania: 0.03, celandine: 0.05 } },
    // O primeiro plano do Impacto: a câmera abre de cima, e sem isto a metade
    // de baixo do quadro é relva vazia.
    { x: pathX(10) + 3, z: 9, rx: 30, rz: 13, count: 800, light: 1.2, stop: -1, warm: 0.3, mix: { empodium: 0.34, gazania: 0.12, celandine: 0.08 } },
    { x: pathX(0) - 19, z: 2, rx: 10, rz: 10, count: 300, light: 0.95, stop: -1, warm: 0.85, mix: LOW },
    { x: pathX(-54) + 13, z: -54, rx: 11, rz: 10, count: 320, light: 0.95, stop: -1, warm: 0.55, mix: { celandine: 0.42, empodium: 0.2 } },
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
      // Alternadas: uma parada fria, uma com o rosa junto.
      warm: index % 2 === 0 ? 0.12 : 0.5,
      // Cada case tem a flora dele: as paradas alternam a alta e a baixa.
      mix: index % 2 === 0 ? TALL : LOW,
    });
  }
  patches.push({
    // À direita da trilha: o texto do CTA fica à esquerda, sobre o campo escuro.
    x: pathX(Z_END - 16) + 11,
    z: Z_END - 16,
    rx: 9,
    rz: 12,
    count: 520,
    light: 1.3,
    stop: -1,
    warm: 0.55,
    mix: { empodium: 0.3, gazania: 0.4, celandine: 0.2 },
  });
  // O desvio da vitrine: um rastro rosa que sai da trilha até a parede.
  const wall = vitrineWall();
  patches.push({
    x: wall.x + 7,
    z: wall.z + 3,
    rx: 11,
    rz: 6,
    count: 360,
    light: 1.3,
    stop: -1,
    warm: 0.72,
    mix: { gazania: 0.55, empodium: 0.1 },
  });
  // O começo da trilha: o campo já está lá quando a câmera sai da névoa. Por
  // último na lista, para as outras manchas não mudarem de lugar.
  patches.push({
    x: pathX(34) + 2,
    z: 34,
    rx: 28,
    rz: 14,
    count: 700,
    light: 1.2,
    stop: -1,
    warm: 0.2,
    mix: { empodium: 0.36, gazania: 0.1, celandine: 0.08 },
  });
  return patches;
}
