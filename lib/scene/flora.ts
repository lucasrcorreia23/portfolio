import {
  BufferAttribute,
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Sphere,
  Vector3,
} from "three";
import { GRASS_MAX, SPORES_MAX } from "./quality";
import { HERO_FAR } from "./hero-flower";
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
  // A pétala é curva nos dois sentidos: em concha na largura e arqueada no
  // comprimento, com a ponta virando para cima. As normais são suavizadas
  // entre as faces, para ela ler como superfície e não como chapa.
  const petal = (angle: number, open: number, length: number, width: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const lean = Math.cos(open);
    const rise = Math.sin(open);
    // Ao longo da pétala: onde está, quão larga é e quanto o meio afunda.
    const rows = [
      { t: 0, half: 0, dip: 0 },
      { t: 0.4, half: 1, dip: 0.2 },
      { t: 0.78, half: 0.72, dip: 0.13 },
      { t: 1, half: 0, dip: 0 },
    ];
    const points: [number, number, number][] = [];
    const at = (t: number, side: number, dip: number) => {
      // O arco: sai quase deitada e a ponta sobe.
      const out = 0.12 + length * lean * t * (1 - 0.22 * t);
      const up = length * (rise * t * 0.75 + 0.42 * t * t) - dip * length;
      points.push([c * out - s * side, up, s * out + c * side]);
      return points.length - 1;
    };
    const base = at(0, 0, 0);
    const l1 = at(rows[1]!.t, -width * rows[1]!.half, 0);
    const m1 = at(rows[1]!.t, 0, rows[1]!.dip);
    const r1 = at(rows[1]!.t, width * rows[1]!.half, 0);
    const l2 = at(rows[2]!.t, -width * rows[2]!.half, 0);
    const m2 = at(rows[2]!.t, 0, rows[2]!.dip);
    const r2 = at(rows[2]!.t, width * rows[2]!.half, 0);
    const tip = at(1, 0, 0);
    const faces = [
      [base, l1, m1], [base, m1, r1],
      [l1, l2, m2], [l1, m2, m1], [m1, m2, r2], [m1, r2, r1],
      [l2, tip, m2], [m2, tip, r2],
    ];
    const sums = points.map(() => [0, 0, 0]);
    for (const [a, b, d] of faces as [number, number, number][]) {
      const pa = points[a]!;
      const pb = points[b]!;
      const pd = points[d]!;
      const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2];
      const vx = pd[0] - pa[0], vy = pd[1] - pa[1], vz = pd[2] - pa[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      // Todas para o lado de cima da pétala.
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      for (const index of [a, b, d]) {
        const sum = sums[index]!;
        sum[0] = (sum[0] ?? 0) + nx;
        sum[1] = (sum[1] ?? 0) + ny;
        sum[2] = (sum[2] ?? 0) + nz;
      }
    }
    for (const face of faces) {
      for (const index of face) {
        head.push(...points[index!]!);
        const sum = sums[index!]!;
        const size = Math.hypot(sum[0] ?? 0, sum[1] ?? 0, sum[2] ?? 0) || 1;
        headNormals.push((sum[0] ?? 0) / size, (sum[1] ?? 0) / size, (sum[2] ?? 0) / size);
      }
    }
  };
  for (let k = 0; k < 5; k += 1) petal((k / 5) * Math.PI * 2, 0.35, 1.15, 0.46);
  for (let k = 0; k < 3; k += 1) petal((k / 3) * Math.PI * 2 + 0.6, 0.95, 0.8, 0.36);
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
      // Perto da trilha crescem as flores do modelo (`hero-flower.ts`); as
      // geradas ficam dali para fora, onde são vistas de longe.
      if (Math.abs(x - pathX(z)) < HERO_FAR - 2.5) continue;
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
