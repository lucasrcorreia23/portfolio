import { BufferAttribute, BufferGeometry, CircleGeometry, CylinderGeometry } from "three";
import { PANEL_HEIGHT, PANEL_WIDTH } from "./case-pose";
import { merge, place, projectUv, type Part } from "./parts";
import { STOP_COUNT } from "./stops";
import { panelPlacement } from "./world";

/**
 * O corpo das placas dos cases: a moldura de chapa, o verso e o vidro.
 *
 * A imagem do case não sai do lugar (`panelPlacement`): é o plano que o link,
 * o encaixe na capa e os esporos leem. A moldura cresce em volta e para a
 * frente dele, então a imagem fica recuada dentro da chapa.
 *
 * As medidas estão no espaço da placa: X para a direita, Y para cima, Z para
 * a câmera, com a imagem em Z = 0.
 */

/** A largura da borda de chapa em volta da imagem. */
export const FRAME_BORDER = 0.18;
/** A face da chapa, à frente da imagem: é o recuo dela. */
export const FRAME_FRONT = 0.03;
/** O verso, atrás da imagem. A espessura é a soma dos dois. */
export const FRAME_BACK = 0.05;
/** O chanfro das arestas da frente. */
const CHAMFER = 0.02;
/** O vidro, entre a imagem e a face da chapa. */
const GLASS_FRONT = 0.025;

/** Quantos metros uma volta de textura cobre. */
const FRAME_TILE = 2.4;
/**
 * Onde o perfil começa na altura da textura. A chapa do mapa é feita de
 * fileiras de painéis: com isto a borda inteira cai dentro de uma fileira, e
 * as emendas que a cruzam são só as verticais, como numa moldura montada.
 */
const FRAME_ROW = 0.14;
const BACK_TILE = 1.4;

const HALF_W = PANEL_WIDTH / 2;
const HALF_H = PANEL_HEIGHT / 2;

/**
 * O perfil da moldura, de fora para dentro: quanto cada anel passa da imagem
 * e em que profundidade está. Entre dois anéis vai uma faixa de quatro faces.
 */
const PROFILE: readonly (readonly [number, number])[] = [
  [FRAME_BORDER, -FRAME_BACK],
  [FRAME_BORDER, FRAME_FRONT - CHAMFER],
  [FRAME_BORDER - CHAMFER, FRAME_FRONT],
  [CHAMFER, FRAME_FRONT],
  [0, FRAME_FRONT - CHAMFER],
  [0, 0],
];

/** Os cantos de um anel, no sentido anti-horário visto de frente. */
const CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

type Vec3 = readonly [number, number, number];

function quads(build: (push: (a: Vec3, b: Vec3, c: Vec3, d: Vec3, uv: readonly number[]) => void) => void) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  build((a, b, c, d, uv) => {
    // A normal é a da face: a chapa é dobrada, não arredondada.
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    const corners = [a, b, c, d];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      positions.push(...(corners[k] ?? a));
      normals.push(nx, ny, nz);
      uvs.push(uv[k * 2] ?? 0, uv[k * 2 + 1] ?? 0);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  return geometry;
}

/** A moldura de uma placa: o anel chanfrado. */
function frameRing(): BufferGeometry {
  return quads((push) => {
    let along = 0;
    for (let i = 0; i + 1 < PROFILE.length; i += 1) {
      const [e0 = 0, z0 = 0] = PROFILE[i] ?? [];
      const [e1 = 0, z1 = 0] = PROFILE[i + 1] ?? [];
      const next = along + Math.hypot(e1 - e0, z1 - z0);
      for (let k = 0; k < 4; k += 1) {
        const [ax = 0, ay = 0] = CORNERS[k] ?? [];
        const [bx = 0, by = 0] = CORNERS[(k + 1) % 4] ?? [];
        const a: Vec3 = [ax * (HALF_W + e0), ay * (HALF_H + e0), z0];
        const b: Vec3 = [bx * (HALF_W + e0), by * (HALF_H + e0), z0];
        const c: Vec3 = [bx * (HALF_W + e1), by * (HALF_H + e1), z1];
        const d: Vec3 = [ax * (HALF_W + e1), ay * (HALF_H + e1), z1];
        // A textura corre ao longo de cada lado, e o perfil a atravessa.
        const axis = k % 2 === 0 ? 0 : 1;
        push(a, b, c, d, [
          a[axis] / FRAME_TILE, FRAME_ROW + along / FRAME_TILE,
          b[axis] / FRAME_TILE, FRAME_ROW + along / FRAME_TILE,
          c[axis] / FRAME_TILE, FRAME_ROW + next / FRAME_TILE,
          d[axis] / FRAME_TILE, FRAME_ROW + next / FRAME_TILE,
        ]);
      }
      along = next;
    }
  });
}

/** De quanto em quanto a borda é aparafusada, no máximo. */
const BOLT_SPACING = 0.7;

function frameParts(): Part[] {
  const parts: Part[] = [place(frameRing(), 0, 0, 0)];
  // Parafusos sextavados no meio da borda: um em cada canto e uma fila entre eles.
  const w = HALF_W + FRAME_BORDER / 2;
  const h = HALF_H + FRAME_BORDER / 2;
  const bolt = (x: number, y: number) => {
    parts.push(
      place(
        projectUv(new CylinderGeometry(0.03, 0.034, 0.014, 6, 1, true), FRAME_TILE),
        x,
        y,
        FRAME_FRONT + 0.007,
        Math.PI / 2,
        0,
        0,
      ),
      place(projectUv(new CircleGeometry(0.03, 6), FRAME_TILE), x, y, FRAME_FRONT + 0.014),
    );
  };
  const across = Math.ceil((2 * w) / BOLT_SPACING);
  const up = Math.ceil((2 * h) / BOLT_SPACING);
  for (let i = 0; i <= across; i += 1) {
    const x = -w + (2 * w * i) / across;
    bolt(x, -h);
    bolt(x, h);
  }
  for (let i = 1; i < up; i += 1) {
    const y = -h + (2 * h * i) / up;
    bolt(-w, y);
    bolt(w, y);
  }
  return parts;
}

/** O verso: uma chapa só, virada para trás. */
function backPlate(): BufferGeometry {
  const w = HALF_W + FRAME_BORDER;
  const h = HALF_H + FRAME_BORDER;
  return quads((push) => {
    push(
      [w, -h, -FRAME_BACK],
      [-w, -h, -FRAME_BACK],
      [-w, h, -FRAME_BACK],
      [w, h, -FRAME_BACK],
      [0, 0, (2 * w) / BACK_TILE, 0, (2 * w) / BACK_TILE, (2 * h) / BACK_TILE, 0, (2 * h) / BACK_TILE],
    );
  });
}

/** O vidro: do tamanho da imagem, um pouco à frente dela. */
function glassPane(): BufferGeometry {
  return quads((push) => {
    push(
      [-HALF_W, -HALF_H, GLASS_FRONT],
      [HALF_W, -HALF_H, GLASS_FRONT],
      [HALF_W, HALF_H, GLASS_FRONT],
      [-HALF_W, HALF_H, GLASS_FRONT],
      [0, 0, 1, 0, 1, 1, 0, 1],
    );
  });
}

/** Põe uma cópia da peça em cada parada e mescla tudo num draw call. */
function atEveryStop(make: () => readonly Part[]): BufferGeometry {
  const parts: Part[] = [];
  for (let index = 0; index < STOP_COUNT; index += 1) {
    const panel = panelPlacement(index);
    const local = merge(make(), true);
    parts.push(place(local, panel.x, panel.y, panel.z, 0, panel.yaw, 0));
  }
  return merge(parts, true);
}

export type Plates = {
  frame: BufferGeometry;
  back: BufferGeometry;
  glass: BufferGeometry;
};

export function createPlates(): Plates {
  return {
    frame: atEveryStop(frameParts),
    back: atEveryStop(() => [place(backPlate(), 0, 0, 0)]),
    glass: atEveryStop(() => [place(glassPane(), 0, 0, 0)]),
  };
}
