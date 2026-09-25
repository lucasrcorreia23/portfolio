import { BufferAttribute, BufferGeometry } from "three";
import {
  APERTURE_HALF_HEIGHT,
  APERTURE_HALF_WIDTH,
  APERTURE_Y,
  LOUVER_COUNT,
  LOUVER_SLOPE,
  LOUVER_THICKNESS,
  LOUVER_WIDTH,
  LOUVER_Z,
  louverX,
  PLAN_FAR,
  RIB_CHAMFER,
  SILL_DEPTH,
  SILL_HALF_WIDTH,
  SILL_TOP,
  type ChamberPlan,
} from "./chamber-plan";

/**
 * A malha da câmara, construída da planta (`chamber-plan.ts`).
 *
 * **Não indexada e com normais planas, de propósito.** Uma aresta entre a parede
 * e o chanfro de um quadro é uma quina — é ela que pega a luz de raspão
 * (DIRECTION.md §2) —, e uma normal compartilhada entre as duas faces a
 * arredondaria. Custa vértices repetidos numa malha de poucas centenas de
 * triângulos, o que não pesa em nada.
 *
 * Cada triângulo é emitido **virado para dentro do duto**: a câmara é vista por
 * dentro, e o material desenha só a face da frente. O teste é geométrico (a
 * normal aponta para o eixo, ou para longe da face do quadro), não uma
 * convenção de ordem de vértices que a próxima edição quebraria.
 *
 * `aKind` separa superfície de quadro para o shader: o quadro não recebe as
 * réguas gravadas, que correm pela parede e não pelo anel que a atravessa.
 */

type V3 = readonly [number, number, number];

class Builder {
  positions: number[] = [];
  normals: number[] = [];
  kinds: number[] = [];

  /**
   * Um quad `a b c d` (em volta), virado para `toward` — um ponto do lado de
   * onde a face deve ser vista.
   */
  quad(a: V3, b: V3, c: V3, d: V3, toward: V3, kind: number): void {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = d[0] - a[0];
    const vy = d[1] - a[1];
    const vz = d[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-9) return;
    nx /= length;
    ny /= length;
    nz /= length;

    const cx = (a[0] + b[0] + c[0] + d[0]) / 4;
    const cy = (a[1] + b[1] + c[1] + d[1]) / 4;
    const cz = (a[2] + b[2] + c[2] + d[2]) / 4;
    const facing =
      nx * (toward[0] - cx) + ny * (toward[1] - cy) + nz * (toward[2] - cz);

    const order: readonly V3[] =
      facing >= 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
    const sign = facing >= 0 ? 1 : -1;
    for (const p of order) {
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(nx * sign, ny * sign, nz * sign);
      this.kinds.push(kind);
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(this.positions), 3),
    );
    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(this.normals), 3),
    );
    geometry.setAttribute(
      "aKind",
      new BufferAttribute(new Float32Array(this.kinds), 1),
    );
    geometry.computeBoundingSphere();
    return geometry;
  }
}

export const KIND_SURFACE = 0;
export const KIND_RIB = 1;

export function buildChamberGeometry(plan: ChamberPlan): BufferGeometry {
  const b = new Builder();
  const breaks = plan.breaks;

  // --- o loft: parede, piso e teto entre cada par de quebras ---------------
  for (let i = 1; i < breaks.length; i += 1) {
    const z0 = breaks[i - 1];
    const z1 = breaks[i];
    if (z0 === undefined || z1 === undefined) continue;
    const s0 = plan.section(z0);
    const s1 = plan.section(z1);
    const mid: V3 = [0, 0, (z0 + z1) / 2];

    // estibordo
    b.quad(
      [s0.right, -s0.floor, z0],
      [s1.right, -s1.floor, z1],
      [s1.right, s1.ceiling, z1],
      [s0.right, s0.ceiling, z0],
      mid,
      KIND_SURFACE,
    );
    // bombordo
    b.quad(
      [-s0.left, -s0.floor, z0],
      [-s1.left, -s1.floor, z1],
      [-s1.left, s1.ceiling, z1],
      [-s0.left, s0.ceiling, z0],
      mid,
      KIND_SURFACE,
    );
    // piso
    b.quad(
      [-s0.left, -s0.floor, z0],
      [s0.right, -s0.floor, z0],
      [s1.right, -s1.floor, z1],
      [-s1.left, -s1.floor, z1],
      mid,
      KIND_SURFACE,
    );
    // teto
    b.quad(
      [-s0.left, s0.ceiling, z0],
      [s0.right, s0.ceiling, z0],
      [s1.right, s1.ceiling, z1],
      [-s1.left, s1.ceiling, z1],
      mid,
      KIND_SURFACE,
    );
  }

  // --- os quadros ----------------------------------------------------------
  const ch = RIB_CHAMFER;

  for (const rib of plan.ribs) {
    const zr = rib.z;
    const half = rib.depth / 2;
    const inset = rib.inset;
    const s = plan.section(zr);
    const zf = zr + half;
    const zb = zr - half;
    const front: V3 = [0, 0, zr + 50];
    const back: V3 = [0, 0, zr - 50];
    const center: V3 = [0, 0, zr];

    // Os quatro lados como perfis 2D no plano da seção: `o` é a borda externa
    // (a parede), `n` a interna; `t` é o eixo ao longo do lado. Cada lado vira
    // face da frente, face de trás, face interna e dois chanfros.
    const sides: {
      outer: (t: number) => [number, number];
      inner: (t: number, k: number) => [number, number];
      span: readonly [number, number];
    }[] = [
      {
        // estibordo: x = right, t = y
        outer: (t) => [s.right, t],
        inner: (t, k) => [s.right - k, t],
        span: [-s.floor, s.ceiling],
      },
      {
        outer: (t) => [-s.left, t],
        inner: (t, k) => [-s.left + k, t],
        span: [-s.floor, s.ceiling],
      },
      {
        // teto: y = ceiling, t = x
        outer: (t) => [t, s.ceiling],
        inner: (t, k) => [t, s.ceiling - k],
        span: [-s.left, s.right],
      },
      {
        outer: (t) => [t, -s.floor],
        inner: (t, k) => [t, -s.floor + k],
        span: [-s.left, s.right],
      },
    ];

    for (const side of sides) {
      const [t0, t1] = side.span;
      const o0 = side.outer(t0);
      const o1 = side.outer(t1);
      const c0 = side.inner(t0, inset - ch);
      const c1 = side.inner(t1, inset - ch);
      const n0 = side.inner(t0, inset);
      const n1 = side.inner(t1, inset);

      // frente e trás: da parede até o começo do chanfro
      b.quad([o0[0], o0[1], zf], [o1[0], o1[1], zf], [c1[0], c1[1], zf], [c0[0], c0[1], zf], front, KIND_RIB);
      b.quad([o0[0], o0[1], zb], [o1[0], o1[1], zb], [c1[0], c1[1], zb], [c0[0], c0[1], zb], back, KIND_RIB);
      // chanfros: da face até a face interna, a 45°
      b.quad([c0[0], c0[1], zf], [c1[0], c1[1], zf], [n1[0], n1[1], zf - ch], [n0[0], n0[1], zf - ch], [center[0], center[1], zf + 10], KIND_RIB);
      b.quad([c0[0], c0[1], zb], [c1[0], c1[1], zb], [n1[0], n1[1], zb + ch], [n0[0], n0[1], zb + ch], [center[0], center[1], zb - 10], KIND_RIB);
      // face interna, virada para o eixo
      b.quad([n0[0], n0[1], zf - ch], [n1[0], n1[1], zf - ch], [n1[0], n1[1], zb + ch], [n0[0], n0[1], zb + ch], center, KIND_RIB);
    }
  }

  // --- o fundo: parede com a abertura da fonte ---------------------------
  // Quatro placas em volta da abertura, viradas para a câmera, e o requadro
  // da abertura com uma unidade de espessura — é a espessura que faz a
  // abertura ler como furo numa parede, e não como um retângulo aceso.
  {
    const s = plan.section(PLAN_FAR);
    const z = PLAN_FAR;
    const x0 = -APERTURE_HALF_WIDTH;
    const x1 = APERTURE_HALF_WIDTH;
    const y0 = APERTURE_Y - APERTURE_HALF_HEIGHT;
    const y1 = APERTURE_Y + APERTURE_HALF_HEIGHT;
    const eye: V3 = [0, 0, z + 50];
    b.quad([-s.left, y1, z], [s.right, y1, z], [s.right, s.ceiling, z], [-s.left, s.ceiling, z], eye, KIND_SURFACE);
    b.quad([-s.left, -s.floor, z], [s.right, -s.floor, z], [s.right, y0, z], [-s.left, y0, z], eye, KIND_SURFACE);
    b.quad([-s.left, y0, z], [x0, y0, z], [x0, y1, z], [-s.left, y1, z], eye, KIND_SURFACE);
    b.quad([x1, y0, z], [s.right, y0, z], [s.right, y1, z], [x1, y1, z], eye, KIND_SURFACE);
    const depth = 1;
    const mid: V3 = [0, APERTURE_Y, z - depth / 2];
    b.quad([x0, y1, z], [x1, y1, z], [x1, y1, z - depth], [x0, y1, z - depth], mid, KIND_RIB);
    b.quad([x0, y0, z], [x1, y0, z], [x1, y0, z - depth], [x0, y0, z - depth], mid, KIND_RIB);
    b.quad([x0, y0, z], [x0, y1, z], [x0, y1, z - depth], [x0, y0, z - depth], mid, KIND_RIB);
    b.quad([x1, y0, z], [x1, y1, z], [x1, y1, z - depth], [x1, y0, z - depth], mid, KIND_RIB);

    // As venezianas: aletas verticais de cima a baixo do requadro, giradas
    // em torno do próprio eixo (ver `LOUVER_SLOPE`). Quatro faces cada — as
    // pontas encostam no requadro e ninguém as vê.
    const dLength = Math.hypot(LOUVER_SLOPE, 1);
    const dx = LOUVER_SLOPE / dLength;
    const dz = 1 / dLength;
    // A normal da aleta, no plano xz.
    const nx = dz;
    const nz = -dx;
    const hw = LOUVER_WIDTH / 2;
    const ht = LOUVER_THICKNESS / 2;
    for (let k = 0; k < LOUVER_COUNT; k += 1) {
      const cx = louverX(k);
      const corner = (along: number, across: number, y: number): V3 => [
        cx + dx * along + nx * across,
        y,
        LOUVER_Z + dz * along + nz * across,
      ];
      const plus: V3 = [cx + nx * 10, APERTURE_Y, LOUVER_Z + nz * 10];
      const minus: V3 = [cx - nx * 10, APERTURE_Y, LOUVER_Z - nz * 10];
      const inward: V3 = [cx + dx * 10, APERTURE_Y, LOUVER_Z + dz * 10];
      const outward: V3 = [cx - dx * 10, APERTURE_Y, LOUVER_Z - dz * 10];
      b.quad(corner(-hw, ht, y0), corner(hw, ht, y0), corner(hw, ht, y1), corner(-hw, ht, y1), plus, KIND_RIB);
      b.quad(corner(-hw, -ht, y0), corner(hw, -ht, y0), corner(hw, -ht, y1), corner(-hw, -ht, y1), minus, KIND_RIB);
      b.quad(corner(hw, -ht, y0), corner(hw, ht, y0), corner(hw, ht, y1), corner(hw, -ht, y1), inward, KIND_RIB);
      b.quad(corner(-hw, -ht, y0), corner(-hw, ht, y0), corner(-hw, ht, y1), corner(-hw, -ht, y1), outward, KIND_RIB);
    }

    // A soleira: do piso até a borda de baixo da abertura, avançando
    // `SILL_DEPTH` para dentro. Topo, frente e os dois lados.
    const sx = SILL_HALF_WIDTH;
    const sf = z + SILL_DEPTH;
    const bottom = -s.floor;
    const inside: V3 = [0, 0, z + 50];
    b.quad([-sx, SILL_TOP, z], [sx, SILL_TOP, z], [sx, SILL_TOP, sf], [-sx, SILL_TOP, sf], [0, SILL_TOP + 10, sf], KIND_SURFACE);
    b.quad([-sx, bottom, sf], [sx, bottom, sf], [sx, SILL_TOP, sf], [-sx, SILL_TOP, sf], inside, KIND_SURFACE);
    b.quad([-sx, bottom, z], [-sx, bottom, sf], [-sx, SILL_TOP, sf], [-sx, SILL_TOP, z], [-sx - 10, 0, sf], KIND_SURFACE);
    b.quad([sx, bottom, z], [sx, bottom, sf], [sx, SILL_TOP, sf], [sx, SILL_TOP, z], [sx + 10, 0, sf], KIND_SURFACE);
  }

  return b.build();
}
