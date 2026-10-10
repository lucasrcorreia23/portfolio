import {
  BufferAttribute,
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Sphere,
  Vector3,
} from "three";
import { GRASS_MAX, SPORES_MAX } from "./quality";
import { GRASS_TILE } from "./shaders/flora";
import { floraPatches, pathX, type Patch } from "./world";

/**
 * As geometrias instanciadas da flora: um draw call por tipo de planta.
 *
 * A CPU não sabe onde as instâncias estão (a altura sai da textura do terreno
 * e a relva acompanha a câmera), então toda geometria ganha uma esfera
 * envolvente enorme e o `frustumCulled` das malhas fica desligado.
 */

const EVERYWHERE = new Sphere(new Vector3(), 1e5);

/** Aleatório determinista: a cena é a mesma a cada carga. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A relva: uma lâmina de três triângulos, instanciada num ladrilho. */
export function createGrassGeometry(): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  // x é a meia largura, y é a posição ao longo da lâmina (0 na base, 1 na ponta).
  geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([-1, 0, 0, 1, 0, 0, -0.7, 0.5, 0, 0.7, 0.5, 0, 0, 1, 0]),
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);

  const random = mulberry(7);
  const offsets = new Float32Array(GRASS_MAX * 3);
  const seeds = new Float32Array(GRASS_MAX * 4);
  for (let i = 0; i < GRASS_MAX; i += 1) {
    offsets[i * 3] = random() * GRASS_TILE;
    offsets[i * 3 + 1] = 0;
    offsets[i * 3 + 2] = random() * GRASS_TILE;
    seeds[i * 4] = 0.3 + random() * random() * 1.1; // altura
    seeds[i * 4 + 1] = random() * Math.PI * 2; // giro
    seeds[i * 4 + 2] = random(); // inclinação e fase
    seeds[i * 4 + 3] = random(); // tom
  }
  geometry.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = GRASS_MAX;
  geometry.boundingSphere = EVERYWHERE;
  return geometry;
}

/** Um ponto dentro da elipse da mancha, mais denso no centro. */
function scatter(patch: Patch, random: () => number): [number, number] {
  const angle = random() * Math.PI * 2;
  const radius = Math.pow(random(), 0.7);
  return [
    patch.x + Math.cos(angle) * radius * patch.rx,
    patch.z + Math.sin(angle) * radius * patch.rz,
  ];
}

/**
 * As flores: haste e cabeça numa geometria só, com `aPart` separando as duas.
 * As instâncias são intercaladas entre as manchas, para que cortar a contagem
 * (níveis de qualidade) rareie todas por igual em vez de apagar as últimas.
 */
export function createFlowerGeometry(): {
  geometry: InstancedBufferGeometry;
  count: number;
} {
  // A cabeça: duas coroas de pétalas e um miolo. Cada pétala é um losango
  // dobrado (4 triângulos), aberto para fora; a coroa de dentro fica em pé.
  const head: number[] = [];
  const headNormals: number[] = [];
  const petal = (angle: number, open: number, length: number, width: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    // No plano da pétala: `out` aponta para fora, `up` para cima.
    const at = (out: number, up: number, side: number): [number, number, number] => [
      c * out - s * side,
      up,
      s * out + c * side,
    ];
    const lean = Math.cos(open);
    const rise = Math.sin(open);
    const base = at(0.12, 0, 0);
    const left = at(0.12 + length * 0.55 * lean, length * 0.55 * rise, -width);
    const right = at(0.12 + length * 0.55 * lean, length * 0.55 * rise, width);
    const mid = at(0.12 + length * 0.5 * lean, length * 0.5 * rise - 0.12, 0);
    const tip = at(0.12 + length * lean * 1.05, length * rise * 0.9, 0);
    const normal: [number, number, number] = [c * rise * -1, lean, s * rise * -1];
    for (const triangle of [
      [base, left, mid],
      [base, mid, right],
      [left, tip, mid],
      [mid, tip, right],
    ]) {
      for (const vertex of triangle) {
        head.push(...vertex);
        headNormals.push(...normal);
      }
    }
  };
  for (let k = 0; k < 5; k += 1) petal((k / 5) * Math.PI * 2, 0.5, 1.15, 0.42);
  for (let k = 0; k < 3; k += 1) petal((k / 3) * Math.PI * 2 + 0.6, 1.15, 0.85, 0.34);
  // O miolo: uma pirâmide pequena, para a flor ter centro vista de cima.
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2;
    const b = ((k + 1) / 4) * Math.PI * 2;
    head.push(Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2, 0, 0.42, 0, Math.cos(b) * 0.2, 0.1, Math.sin(b) * 0.2);
    for (let v = 0; v < 3; v += 1) headNormals.push(0, 1, 0);
  }
  const headPositions = new Float32Array(head);

  // A haste: duas faixas cruzadas, 4 triângulos.
  const stem = [
    [-1, 0, 0], [1, 0, 0], [1, 1, 0], [-1, 0, 0], [1, 1, 0], [-1, 1, 0],
    [0, 0, -1], [0, 0, 1], [0, 1, 1], [0, 0, -1], [0, 1, 1], [0, 1, -1],
  ];
  const vertices = stem.length + headPositions.length / 3;
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const parts = new Float32Array(vertices);
  stem.forEach((v, i) => {
    positions.set(v, i * 3);
    normals.set([0, 1, 0], i * 3);
    parts[i] = 0;
  });
  positions.set(headPositions, stem.length * 3);
  normals.set(headNormals, stem.length * 3);
  parts.fill(1, stem.length);

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("aPart", new BufferAttribute(parts, 1));

  const patches = floraPatches();
  const random = mulberry(41);
  const perPatch = patches.map((patch, index) => {
    const list: number[][] = [];
    let guard = 0;
    while (list.length < patch.count && guard < patch.count * 6) {
      guard += 1;
      const [x, z] = scatter(patch, random);
      // Nenhuma flor no meio da trilha: a câmera não atravessa cabeças.
      if (Math.abs(x - pathX(z)) < 1.7) continue;
      list.push([
        x,
        index,
        z,
        0.55 + random() * 1.25, // altura
        0.2 + random() * 0.2, // raio da cabeça
        random(), // fase e matiz
        random(), // brilho
        random() < patch.warm ? 1 : 0, // rosa
      ]);
    }
    return list;
  });

  const all: number[][] = [];
  const longest = Math.max(...perPatch.map((list) => list.length));
  for (let k = 0; k < longest; k += 1) {
    for (const list of perPatch) {
      // Proporcional: uma mancha de 1150 entra várias vezes por volta.
      const step = list.length / longest;
      const from = Math.floor(k * step);
      const to = Math.floor((k + 1) * step);
      for (let i = from; i < to; i += 1) {
        const item = list[i];
        if (item !== undefined) all.push(item);
      }
    }
  }

  const offsets = new Float32Array(all.length * 3);
  const seeds = new Float32Array(all.length * 4);
  const warm = new Float32Array(all.length);
  all.forEach((item, i) => {
    offsets.set(item.slice(0, 3), i * 3);
    seeds.set(item.slice(3, 7), i * 4);
    warm[i] = item[7] ?? 0;
  });
  geometry.setAttribute("aWarm", new InstancedBufferAttribute(warm, 1));
  geometry.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = all.length;
  geometry.boundingSphere = EVERYWHERE;
  return { geometry, count: all.length };
}

/** Os esporos: pontos num volume que acompanha a câmera. */
export function createSporeGeometry(): BufferGeometry {
  const random = mulberry(97);
  const positions = new Float32Array(SPORES_MAX * 3);
  const seeds = new Float32Array(SPORES_MAX * 4);
  for (let i = 0; i < SPORES_MAX; i += 1) {
    positions[i * 3] = random() * 64;
    positions[i * 3 + 1] = random() * 18;
    positions[i * 3 + 2] = random() * 76;
    seeds.set([random(), random(), random(), random()], i * 4);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 4));
  geometry.boundingSphere = EVERYWHERE;
  return geometry;
}
