import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import { wallX, type ChamberPlan } from "./chamber-plan";

/**
 * **Raízes e trepadeiras** (rodada 16) — a árvore que mora na cidade
 * (PROJECT.md §2, a primeira referência).
 *
 * Geometria real, gerada da planta como a câmara, sem arquivo de modelo: cada
 * raiz nasce na quina entre o teto e uma parede (ou no alto de um portal do rio)
 * e desce rente à parede, serpenteando em z e se ramificando, cada vez mais
 * fina. Os tubos são fundidos numa malha só, e sombreados pelo mesmo
 * `shadeConcrete` da parede com um albedo próprio — elas só aparecem onde a luz
 * do bando ou de uma lanterna passa, como tudo o que é estrutura.
 *
 * Semente fixa: as raízes são as mesmas em toda visita. Mais densas nos portais
 * do rio e na Superfície; poucas em Quem sou; nenhuma na Identidade.
 */

type Rand = () => number;

function rng(seed: number): Rand {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Lados do tubo. Cinco: de perto é redondo o bastante; de longe é um fio. */
const SIDES = 5;
/** Passo ao longo da raiz, em unidades. */
const STEP = 0.22;

type Strand = { points: Vector3[]; radius: number[] };

/**
 * O atributo `aAlong` vai de 0 na base a 1 na ponta de cada raiz: é onde a
 * ponta viva brilha (ver `Roots.tsx`).
 */

export function buildRoots(plan: ChamberPlan): BufferGeometry {
  const random = rng(0x0a7b3e);
  const strands: Strand[] = [];

  /**
   * Uma raiz descendo pela parede `side` a partir de (y0, z0). Ela fica a
   * `lift` da superfície, lida da seção em cada passo — segue os nichos e os
   * alargamentos da câmara.
   */
  const grow = (side: -1 | 1, y0: number, z0: number, length: number, r0: number, depth: number) => {
    const points: Vector3[] = [];
    const radius: number[] = [];
    let y = y0;
    let z = z0;
    let heading = (random() - 0.5) * 0.9;
    const steps = Math.max(4, Math.round(length / STEP));
    for (let k = 0; k <= steps; k += 1) {
      const t = k / steps;
      const r = r0 * (1 - 0.82 * t);
      const section = plan.section(z);
      const floor = -section.floor + 0.3;
      if (y < floor) break;
      const x = wallX(section, side) - side * (r + 0.03);
      points.push(new Vector3(x, y, z));
      radius.push(r);
      heading += (random() - 0.5) * 0.5;
      heading *= 0.92;
      z += Math.sin(heading) * STEP * 0.9;
      y -= Math.cos(heading) * STEP;
      if (depth < 2 && k > 3 && random() < 0.07) {
        grow(side, y, z, length * (0.35 + random() * 0.3), r * 0.75, depth + 1);
      }
    }
    if (points.length > 2) strands.push({ points, radius });
  };

  /** Uma raiz pendurada no ar, do alto de um portal: cai quase reta. */
  const hang = (x: number, y0: number, z: number, length: number, r0: number) => {
    const points: Vector3[] = [];
    const radius: number[] = [];
    const sway = (random() - 0.5) * 0.6;
    const steps = Math.round(length / STEP);
    for (let k = 0; k <= steps; k += 1) {
      const t = k / steps;
      points.push(new Vector3(x + sway * t * t, y0 - length * t, z + Math.sin(t * 3 + x) * 0.08));
      radius.push(r0 * (1 - 0.85 * t));
    }
    strands.push({ points, radius });
  };

  // Quem sou: poucas, e na parede de bombordo — a de estibordo é a do poleiro.
  for (const z of [-34.5, -39, -44]) {
    const s = plan.section(z);
    grow(-1, s.ceiling - 0.1, z, 4 + random() * 3, 0.07, 0);
  }
  // O rio: dos dois lados, em cadência irregular.
  for (let z = -52; z > -88; z -= 2.6 + random() * 3.4) {
    const side: -1 | 1 = random() < 0.5 ? -1 : 1;
    const s = plan.section(z);
    grow(side, s.ceiling - 0.1, z, 5 + random() * 5, 0.08, 0);
  }
  // Os portais: cortinas curtas penduradas nos cantos de cima, longe do eixo.
  for (const rib of plan.ribs) {
    if (rib.inset < 1.5) continue;
    const s = plan.section(rib.z);
    for (const side of [-1, 1] as const) {
      const inner = wallX(s, side) - side * rib.inset;
      const top = s.ceiling - rib.inset;
      for (let k = 0; k < 5; k += 1) {
        const x = inner - side * (0.3 + k * 0.45 + random() * 0.3);
        hang(x, top, rib.z + (random() - 0.5) * 0.3, 1.2 + random() * 2.6, 0.045);
      }
    }
  }
  // A Superfície: a planta mais densa, perto da luz de fora.
  for (let z = -88; z > -95; z -= 0.9 + random() * 0.8) {
    for (const side of [-1, 1] as const) {
      const s = plan.section(z);
      grow(side, s.ceiling - 0.1, z, 4 + random() * 5, 0.09, 0);
    }
  }

  // --- os tubos, fundidos ----------------------------------------------------
  let vertexCount = 0;
  let indexCount = 0;
  for (const strand of strands) {
    vertexCount += strand.points.length * SIDES;
    indexCount += (strand.points.length - 1) * SIDES * 6;
  }
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const along = new Float32Array(vertexCount);
  const indices = new Uint32Array(indexCount);
  let v = 0;
  let i = 0;
  const tangent = new Vector3();
  const normal = new Vector3();
  const binormal = new Vector3();
  const up = new Vector3(0, 0, 1);
  for (const { points, radius } of strands) {
    const base = v;
    points.forEach((p, k) => {
      const next = points[Math.min(k + 1, points.length - 1)] ?? p;
      const prev = points[Math.max(k - 1, 0)] ?? p;
      tangent.subVectors(next, prev).normalize();
      normal.crossVectors(tangent, up);
      if (normal.lengthSq() < 1e-6) normal.set(1, 0, 0);
      normal.normalize();
      binormal.crossVectors(tangent, normal).normalize();
      const r = radius[k] ?? 0.01;
      for (let j = 0; j < SIDES; j += 1) {
        const a = (j / SIDES) * Math.PI * 2;
        const nx = normal.x * Math.cos(a) + binormal.x * Math.sin(a);
        const ny = normal.y * Math.cos(a) + binormal.y * Math.sin(a);
        const nz = normal.z * Math.cos(a) + binormal.z * Math.sin(a);
        positions.set([p.x + nx * r, p.y + ny * r, p.z + nz * r], v * 3);
        normals.set([nx, ny, nz], v * 3);
        along[v] = k / Math.max(points.length - 1, 1);
        v += 1;
      }
    });
    for (let k = 0; k < points.length - 1; k += 1) {
      for (let j = 0; j < SIDES; j += 1) {
        const a = base + k * SIDES + j;
        const b = base + k * SIDES + ((j + 1) % SIDES);
        const c = a + SIDES;
        const d = b + SIDES;
        indices.set([a, c, b, b, c, d], i);
        i += 6;
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("aAlong", new BufferAttribute(along, 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
