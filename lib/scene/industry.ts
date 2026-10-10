import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
} from "three";
import { PANEL_HEIGHT, PANEL_WIDTH } from "./case-pose";
import type { PbrExtension } from "./pbr";
import { merge, place, projectUv, type Part } from "./parts";
import { STOP_COUNT } from "./stops";
import { MAX_EMITTERS } from "./uniforms";
import {
  heightAt,
  panelPlacement,
  pathX,
  STOP_Z,
  vitrineWall,
  WALL_CELL,
  WALL_COLUMNS,
  WALL_ROWS,
  WALL_SPAN,
  WALL_TALL,
  Z_END,
} from "./world";

/**
 * A indústria de fundo. Os tanques (modelos) e a tubulação (primitivas) são
 * uma geometria com chapa enferrujada; as chaminés, outra, com a textura do
 * modelo; a estrutura da parede da vitrine é silhueta, sem textura. Os pórticos que sustentam os painéis
 * saem daqui com textura.
 */

/** Um ponto no chão. */
function ground(x: number, z: number): number {
  return heightAt(x, z);
}

/** Quantos metros uma volta de textura cobre no pórtico. */
const GANTRY_TILE = 1.2;
/** E nos tanques e na tubulação, que são grandes e ficam longe. */
const HULL_TILE = 3;

/** Os dois montantes do pórtico de uma parada: onde pisam e até onde sobem. */
function gantryPosts(index: number) {
  const panel = panelPlacement(index);
  const half = PANEL_WIDTH / 2 + 0.34;
  const top = panel.y + PANEL_HEIGHT / 2 + 0.5;
  return [-1, 1].map((side) => {
    const x = panel.x + Math.cos(panel.yaw) * half * side;
    const z = panel.z - Math.sin(panel.yaw) * half * side;
    const base = ground(x, z) - 0.4;
    return { x, z, base, height: top - base + 1.1 };
  });
}

/**
 * O pórtico de uma parada: dois montantes e duas travessas em perfil I, a
 * caixa de equipamento e o duto. A estrutura é de aço e as sapatas, de
 * concreto: vão em listas separadas porque cada uma tem o material dela.
 */
function gantry(index: number, steel: Part[], concrete: Part[]): void {
  const panel = panelPlacement(index);
  const yaw = panel.yaw;
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const half = PANEL_WIDTH / 2 + 0.34;
  const top = panel.y + PANEL_HEIGHT / 2 + 0.5;
  const box = (width: number, height: number, depth: number) =>
    projectUv(new BoxGeometry(width, height, depth), GANTRY_TILE);

  // Um perfil em I de pé, com a alma virada para a câmera: duas abas e a alma.
  const post = (x: number, z: number, y: number, height: number) => {
    for (const side of [-1, 1]) {
      steel.push(
        place(box(0.03, height, 0.2), x + rightX * 0.085 * side, y, z + rightZ * 0.085 * side, 0, yaw, 0),
      );
    }
    steel.push(place(box(0.14, height, 0.024), x, y, z, 0, yaw, 0));
  };
  // E um deitado, de montante a montante: as abas em cima e embaixo.
  const beam = (y: number, length: number, tall: number, deep: number) => {
    for (const side of [-1, 1]) {
      steel.push(place(box(length, 0.03, deep), panel.x, y + (tall / 2 - 0.015) * side, panel.z, 0, yaw, 0));
    }
    steel.push(place(box(length, tall - 0.06, 0.024), panel.x, y, panel.z, 0, yaw, 0));
  };

  for (const { x, z, base, height } of gantryPosts(index)) {
    post(x, z, base + height / 2, height);
    concrete.push(place(box(0.9, 0.16, 0.9), x, base + 0.48, z, 0, yaw, 0));
    // A chapa de base do montante, sobre a sapata.
    steel.push(place(box(0.42, 0.03, 0.42), x, base + 0.575, z, 0, yaw, 0));
    // A mão-francesa, para trás.
    const backX = x - Math.sin(yaw) * 1.5;
    const backZ = z - Math.cos(yaw) * 1.5;
    steel.push(place(box(0.1, 4.6, 0.1), (x + backX) / 2, base + 2.1, (z + backZ) / 2, -0.66, yaw, 0));
  }
  // As travessas: uma em cima, outra embaixo do painel.
  beam(top, half * 2 + 0.6, 0.2, 0.18);
  beam(panel.y - PANEL_HEIGHT / 2 - 0.3, half * 2 + 0.2, 0.12, 0.1);
  // Uma caixa de equipamento e o duto que sai dela para o chão.
  const boxX = panel.x + rightX * (half + 1.1);
  const boxZ = panel.z + rightZ * (half + 1.1);
  const boxY = ground(boxX, boxZ);
  steel.push(place(box(0.8, 1.3, 0.6), boxX, boxY + 0.65, boxZ, 0, yaw, 0));
  steel.push(
    place(
      projectUv(new CylinderGeometry(0.07, 0.07, 6, 6), GANTRY_TILE),
      boxX - Math.sin(yaw) * 3,
      boxY + 0.5,
      boxZ - Math.cos(yaw) * 3,
      Math.PI / 2,
      yaw,
      0,
    ),
  );
}

/**
 * Os pórticos das paradas, com coordenada de textura: são o único pedaço da
 * indústria que a câmera lê de perto, então têm material próprio e ficam fora
 * da silhueta mesclada (ver `Plates`).
 */
export function createGantries(): { steel: BufferGeometry; concrete: BufferGeometry } {
  const steel: Part[] = [];
  const concrete: Part[] = [];
  for (let index = 0; index < STOP_COUNT; index += 1) gantry(index, steel, concrete);
  return { steel: merge(steel, true), concrete: merge(concrete, true) };
}

/** O topo das chaminés mais altas: de onde as descargas saem. */
const towerTops: number[] = [];

/**
 * Os modelos da silhueta: só a forma, decimada, de pé sobre y = 0 e já em
 * metros (`scripts/extract-industry.mjs`).
 */
const MODEL_FILES = {
  tanks: "tanques",
  oilTank: "tanque-oleo",
  rustTank: "tanque-ferrugem",
  stack: "chamine",
  nearStack: "chamine-perto",
} as const;
type ModelId = keyof typeof MODEL_FILES;
type Model = { geometry: BufferGeometry; tall: number; reach: number };
export type IndustryModels = Partial<Record<ModelId, Model>>;

async function loadModel(file: string): Promise<Model> {
  const response = await fetch(`/models/industria/${file}.bin`);
  if (!response.ok) throw new Error(file);
  const buffer = await response.arrayBuffer();
  const [vertices = 0] = new Uint32Array(buffer, 0, 1);
  const [tall = 1] = new Float32Array(buffer, 4, 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(buffer, 8, vertices * 3), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(buffer, 8 + vertices * 12, vertices * 3), 3));
  if (buffer.byteLength >= 8 + vertices * 32) {
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(buffer, 8 + vertices * 24, vertices * 2), 2));
  }
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const reach = box === null ? 0 : Math.max(box.max.x, box.max.z);
  return { geometry, tall, reach };
}

export async function loadIndustryModels(): Promise<IndustryModels> {
  const ids = Object.keys(MODEL_FILES) as ModelId[];
  const loaded = await Promise.all(ids.map((id) => loadModel(MODEL_FILES[id])));
  return Object.fromEntries(ids.map((id, i) => [id, loaded[i]])) as IndustryModels;
}

/**
 * "A silhueta está montada": ela aparece desde a abertura, então o primeiro
 * quadro espera por ela como espera pelas plantas (ver `SceneWorld`).
 */
let settleIndustry: () => void = () => {};
export const industrySettled: Promise<void> = new Promise((resolve) => {
  settleIndustry = resolve;
});
export function markIndustrySettled(): void {
  settleIndustry();
}

/**
 * Um modelo pousado no terreno, girado e em escala. Pisa no ponto mais baixo
 * da própria planta, para nada flutuar na encosta. Devolve a altura do topo.
 */
function model(source: Model | undefined, x: number, z: number, yaw: number, parts: Part[], scale = 1, sink = 0.4): number {
  if (source === undefined) return ground(x, z);
  const reach = source.reach * scale * 0.7;
  let base = ground(x, z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    base = Math.min(base, ground(x + dx * reach, z + dz * reach));
  }
  base -= sink;
  const geometry = source.geometry.clone().scale(scale, scale, scale);
  // Quem não traz UV do modelo recebe a projeção de caixa, em metros.
  parts.push(place(geometry.hasAttribute("uv") ? geometry : projectUv(geometry, HULL_TILE), x, base, z, 0, yaw, 0));
  return base + source.tall * scale;
}

/**
 * Até três chaminés em fila, de alturas diferentes (`count`). A mais alta
 * leva a luz do topo e é dela que as descargas saem.
 */
function stacks(source: Model | undefined, x: number, z: number, height: number, yaw: number, parts: Part[], beacons: number[], count = 3): void {
  if (source === undefined) return;
  const scale = height / source.tall;
  const gap = 4.6 * scale;
  [1, 0.86, 0.72].slice(0, count).forEach((share, i) => {
    const sx = x + Math.cos(yaw) * gap * (i - 1);
    const sz = z - Math.sin(yaw) * gap * (i - 1);
    const top = model(source, sx, sz, yaw + i * 2.1, parts, scale * share);
    if (i === 0) {
      towerTops.push(sx, top, sz);
      beacons.push(sx, top, sz, 0.6 + (height % 0.4));
    } else if (i === 1) beacons.push(sx, top, sz, 0.1);
  });
}

/** Um duto elevado, de um lado ao outro do campo, sobre cavaletes. */
function pipeline(z: number, fromX: number, toX: number, lift: number, slant: number, parts: Part[]): void {
  const length = Math.hypot(toX - fromX, slant);
  const midX = (fromX + toX) / 2;
  const yaw = Math.atan2(slant, toX - fromX);
  let low = Infinity;
  for (let x = fromX; x <= toX; x += 6) low = Math.min(low, ground(x, z));
  const y = Math.max(low, ground(pathX(z), z)) + lift;
  parts.push(place(projectUv(new CylinderGeometry(0.42, 0.42, length, 8, 1), HULL_TILE), midX, y, z + slant / 2, 0, -yaw, Math.PI / 2));
  parts.push(place(projectUv(new CylinderGeometry(0.2, 0.2, length, 6, 1), HULL_TILE), midX, y + 0.72, z + slant / 2 + 0.3, 0, -yaw, Math.PI / 2));
  for (let x = fromX + 6; x < toX; x += 13) {
    // Nenhum cavalete no meio da trilha.
    if (Math.abs(x - pathX(z)) < 5) continue;
    const pz = z + (slant * (x - fromX)) / (toX - fromX);
    const foot = ground(x, pz) - 0.5;
    parts.push(place(projectUv(new BoxGeometry(0.22, y - foot, 0.22), HULL_TILE), x, (y + foot) / 2, pz));
    parts.push(place(projectUv(new BoxGeometry(1.6, 0.14, 0.3), HULL_TILE), x, y - 0.5, pz));
  }
}

/**
 * A estrutura da parede da vitrine: os postes e as travessas. As quinze
 * placas, uma por item, são desenhadas pela `Wall` (`components/scene`).
 */
function wall(parts: Part[], beacons: number[], arcs: number[]): void {
  const place3 = vitrineWall();
  const yaw = place3.yaw;
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const span = WALL_SPAN;
  const tall = WALL_TALL;
  const top = place3.y + tall / 2 + 0.7;

  for (let column = 0; column <= WALL_COLUMNS; column += 1) {
    const along = -span / 2 - WALL_CELL.gap / 2 + column * (WALL_CELL.width + WALL_CELL.gap);
    const x = place3.x + rightX * along;
    const z = place3.z + rightZ * along;
    const base = ground(x, z) - 0.4;
    const end = column === 0 || column === WALL_COLUMNS;
    const height = top - base + (end ? 2.4 : 0.4);
    parts.push(place(new BoxGeometry(0.16, height, 0.16), x, base + height / 2, z, 0, yaw, 0));
    if (end) {
      beacons.push(x, base + height + 0.06, z, 0.7);
      arcs.push(x, base + height, z);
    }
  }
  for (let row = 0; row <= WALL_ROWS; row += 1) {
    const y = place3.y - tall / 2 - WALL_CELL.gap / 2 + row * (WALL_CELL.height + WALL_CELL.gap);
    parts.push(place(new BoxGeometry(span + 1, 0.1, 0.1), place3.x, y, place3.z, 0, yaw, 0));
  }
}

/**
 * O que a indústria de fundo acrescenta ao material das chapas. Ela fica
 * longe de toda mancha de flora e dentro da névoa: é escura, mas pega o
 * clarão das descargas e, com um alcance maior que o das placas, a cor das
 * plantas. Chaminés, tanques e tubulação recebem a mesma luz.
 */
export const BACKDROP_EXTENSION: PbrExtension = {
  key: "industria",
  fragmentLights: /* glsl */ `
{
  vec3 stackNormal = transformDirectionByInverseViewMatrix(geometryNormal, viewMatrix);
  vec3 stackFlash = mix(uRose, vec3(1.0), 0.45) * uFlash * (0.6 + 0.4 * stackNormal.y) * 0.5;
  irradiance += stackFlash * PI;
  radiance += stackFlash;
  // O ar em volta também ilumina: o lado do planeta sai rosado, o outro, frio.
  vec3 stackAir = fogColorAt(vViewPosition.z, vPbrWorld) * 7.0 + uDeep * 1.5;
  irradiance += stackAir * PI;
  radiance += stackAir * 0.5;
  for (int i = 0; i < ${MAX_EMITTERS}; i++) {
    vec4 e = uEmitters[i];
    if (e.w <= 0.0) continue;
    vec3 toLight = e.xyz - vPbrWorld;
    float reach = length(toLight);
    vec3 light = mix(uCyan, uRose, uEmitterWarm[i]) * uGlow * e.w / (1.0 + reach * reach * 0.004);
    reflectedLight.directDiffuse += light * saturate(dot(stackNormal, toLight / reach)) * 4.0
      * BRDF_Lambert(material.diffuseContribution);
  }
}
`,
  // Sem o escurecimento das placas: quem as apaga ao longe é só a névoa.
  fragmentFog: /* glsl */ `
gl_FragColor.rgb = applyFog(min(gl_FragColor.rgb, vec3(0.9)), vViewPosition.z, vPbrWorld);
`,
};

export type Industry = {
  /** A silhueta sem textura: a estrutura da parede da vitrine. */
  geometry: BufferGeometry;
  /** Os tanques e a tubulação, com UV. */
  hull: BufferGeometry;
  /** As chaminés, com UV: têm material próprio. */
  stacks: BufferGeometry;
  /** Entre que pontos as descargas elétricas saltam: pares de xyz. */
  arcs: Float32Array;
  /** As luzes indicadoras: xyz e a fase de cada uma. */
  beacons: Float32Array;
};

export function createIndustry(models: IndustryModels): Industry {
  const parts: Part[] = [];
  const hullParts: Part[] = [];
  const stackParts: Part[] = [];
  const beacons: number[] = [];
  const tops: number[] = [];
  towerTops.length = 0;

  // Os pórticos são desenhados à parte; daqui saem só as luzes do topo deles.
  for (let index = 0; index < STOP_COUNT; index += 1) {
    for (const post of gantryPosts(index)) {
      // Fase acima de 1: a luz escurece de longe junto com a placa (BEACON_VERT).
      beacons.push(post.x, post.base + post.height + 0.08, post.z, index % 2 === 0 ? 2.2 : 2.8);
    }
  }

  // O complexo do Impacto: o que a câmera vê em silhueta ao sair da névoa.
  stacks(models.stack, -52, -118, 62, 1.9, stackParts, beacons, 2);
  stacks(models.stack, 48, -128, 54, 2.7, stackParts, beacons, 2);
  model(models.tanks, -73, -84, 0.5, hullParts);
  model(models.oilTank, 58, -66, 2.2, hullParts);
  model(models.rustTank, 74, -74, 0, hullParts);

  // Ao longo dos cases, dos dois lados, cada vez mais longe.
  for (let index = 0; index < STOP_COUNT; index += 1) {
    const z = (STOP_Z[index] ?? 0) - 14;
    const left = index % 2 === 0;
    stacks(models.stack, pathX(z) + (left ? -46 : 52) - index * 2, z - 8, 30 + ((index * 17) % 26), index * 0.9, stackParts, beacons, 1);
    // O conjunto grande fica na última parada, atrás da parede da vitrine.
    if (index === STOP_COUNT - 1) model(models.tanks, pathX(z) - 61, z + 6, 2.4, hullParts);
    else if (index % 2 === 1) model(models.oilTank, pathX(z) - 58, z + 6, index * 1.3, hullParts, 0.9 + index * 0.06);
    else model(models.rustTank, pathX(z) + 66, z - 2, index * 1.3, hullParts, 0.9 + index * 0.08);
  }
  // O fim da trilha: um último grupo atrás da mancha do CTA.
  // Depois da borda do terreno não há chão para esconder a base: elas descem.
  for (const [x, z, height, yaw] of [[pathX(Z_END) - 30, Z_END - 44, 58, 0.8], [pathX(Z_END) + 36, Z_END - 52, 42, 2.5]] as const) {
    const scale = (height + 30) / (models.nearStack?.tall ?? 1);
    const top = model(models.nearStack, x, z, yaw, stackParts, scale, 30);
    towerTops.push(x, top, z);
    beacons.push(x, top, z, 0.6 + (height % 0.4));
  }

  // A tubulação que atravessa o campo: a câmera passa por baixo da primeira.
  pipeline(-66, -96, 96, 6.4, 10, hullParts);
  pipeline(STOP_Z[1]! - 16, -100, 100, 7.5, -14, hullParts);
  pipeline(STOP_Z[3]! - 17, -100, 100, 8.2, 12, hullParts);
  // A última passa depois da parede da vitrine, nunca entre ela e a câmera.
  pipeline(STOP_Z[5]! - 52, -100, 100, 7, -8, hullParts);

  wall(parts, beacons, tops);

  // As descargas: entre o topo de cada torre e o da vizinha mais próxima.
  tops.push(...towerTops);
  const arcs: number[] = [];
  for (let i = 0; i < tops.length; i += 3) {
    let best = -1;
    let bestDistance = Infinity;
    for (let j = 0; j < tops.length; j += 3) {
      if (j === i) continue;
      const d = Math.hypot(
        (tops[j] ?? 0) - (tops[i] ?? 0),
        (tops[j + 1] ?? 0) - (tops[i + 1] ?? 0),
        (tops[j + 2] ?? 0) - (tops[i + 2] ?? 0),
      );
      if (d < bestDistance && d > 4) {
        bestDistance = d;
        best = j;
      }
    }
    if (best >= 0 && bestDistance < 70) {
      arcs.push(...tops.slice(i, i + 3), ...tops.slice(best, best + 3));
    }
  }

  return {
    geometry: merge(parts),
    hull: merge(hullParts, true),
    stacks: merge(stackParts, true),
    beacons: new Float32Array(beacons),
    arcs: new Float32Array(arcs),
  };
}
