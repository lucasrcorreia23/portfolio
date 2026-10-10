import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
  type Texture,
} from "three";
import { PANEL_HEIGHT, PANEL_WIDTH } from "./case-pose";
import { FRAME_BORDER, FRAME_FRONT } from "./frame";
import type { PbrExtension } from "./pbr";
import { STOP_COUNT } from "./stops";
import type { SharedUniforms } from "./uniforms";
import { panelPlacement } from "./world";

/**
 * A porta de enrolar na frente de uma placa: fechada de longe, ela sobe quando
 * a câmera chega e desce quando a câmera sai (`doorOpen`, em `world.ts`).
 *
 * O modelo (`public/models/industria/porta.glb`) é uma porta de 1 × 2,1 m numa
 * malha só, sem animação. Aqui ela é separada pelas ilhas da malha: a cortina
 * e a caixa do rolo esticam até a largura da placa (as lâminas são
 * horizontais, o esticão não aparece), as guias vão para as pontas sem
 * deformar. A cortina sobe no vertex shader e some ao entrar na caixa.
 */

/** As paradas que têm porta. Vazio desliga, e o modelo nem é buscado. */
export const DOOR_STOPS: readonly number[] = Array.from({ length: STOP_COUNT }, (_, index) => index);

const HALF_W = PANEL_WIDTH / 2;
const HALF_H = PANEL_HEIGHT / 2;
/** As guias correm no meio da borda da moldura. */
const GUIDE_X = HALF_W + FRAME_BORDER / 2;
/** De onde a onde a cortina vai, no espaço da placa. */
const BOTTOM = -(HALF_H + FRAME_BORDER / 2);
const TOP = HALF_H + FRAME_BORDER / 2;
const TRAVEL = TOP - BOTTOM;
/** A porta encosta na face da chapa, por cima dos parafusos. */
const BACK = FRAME_FRONT + 0.02;

type Island = {
  vertices: number[];
  min: Vector3;
  max: Vector3;
};

/** As ilhas da malha: grupos de triângulos que se tocam. */
function islands(position: Vector3[], index: ArrayLike<number>): Island[] {
  const parent = position.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root] ?? root;
    while (parent[i] !== root) {
      const next = parent[i] ?? root;
      parent[i] = root;
      i = next;
    }
    return root;
  };
  const join = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  // Vértices no mesmo ponto são o mesmo: a costura de UV os duplica.
  const seen = new Map<string, number>();
  position.forEach((p, i) => {
    const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
    const first = seen.get(key);
    if (first === undefined) seen.set(key, i);
    else join(i, first);
  });
  for (let i = 0; i < index.length; i += 3) {
    join(index[i] ?? 0, index[i + 1] ?? 0);
    join(index[i] ?? 0, index[i + 2] ?? 0);
  }
  const byRoot = new Map<number, Island>();
  position.forEach((p, i) => {
    const root = find(i);
    let island = byRoot.get(root);
    if (island === undefined) {
      island = { vertices: [], min: p.clone(), max: p.clone() };
      byRoot.set(root, island);
    }
    island.vertices.push(i);
    island.min.min(p);
    island.max.max(p);
  });
  return [...byRoot.values()];
}

export type Door = {
  geometry: BufferGeometry;
  maps: { color: Texture; normal: Texture; arm: Texture; ao: Texture };
};

/** Monta a porta de cada parada de `DOOR_STOPS` a partir da malha do modelo. */
function buildDoor(source: Mesh): BufferGeometry {
  const from = source.geometry;
  const count = from.getAttribute("position").count;
  const index = from.getIndex()?.array ?? Array.from({ length: count }, (_, i) => i);
  const points = Array.from({ length: count }, (_, i) =>
    new Vector3().fromBufferAttribute(from.getAttribute("position"), i).applyMatrix4(source.matrixWorld),
  );

  // Para onde cada vértice vai, no espaço da placa, e se ele é da cortina.
  const local = points.map((p) => p.clone());
  const stretch = points.map(() => new Vector3(1, 1, 1));
  const curtain = new Uint8Array(count);
  const found = islands(points, index);
  const sheet = found.find((island) => island.max.y - island.min.y > 1.5 && island.max.x - island.min.x > 0.8);
  if (sheet === undefined) throw new Error("porta: a cortina não foi encontrada.");
  const sheetTall = sheet.max.y - sheet.min.y;
  const sheetWide = (GUIDE_X - 0.02) / sheet.max.x;
  const grow = TRAVEL / sheetTall;
  const reach = Math.max(...points.map((point) => Math.abs(point.x)));
  const place = (i: number, x: number, y: number, z: number, scale: Vector3, isCurtain: boolean) => {
    local[i]?.set(x, y, z);
    stretch[i]?.copy(scale);
    curtain[i] = isCurtain ? 1 : 0;
  };

  // A cortina e os puxadores da base dela são ilhas à parte.
  const inSheet = new Uint8Array(count);
  for (const island of found) {
    const centerX = (island.min.x + island.max.x) / 2;
    if (island !== sheet && !(island.max.y < 0.1 && Math.abs(centerX) < 0.4)) continue;
    const scale = new Vector3(sheetWide, grow, 1);
    for (const i of island.vertices) {
      const p = points[i];
      if (p === undefined) continue;
      inSheet[i] = 1;
      place(i, p.x * sheetWide, BOTTOM + (p.y - sheet.min.y) * grow, BACK + 0.012 + (p.z - sheet.min.z), scale, true);
    }
  }

  // A caixa do rolo e as guias se tocam, então são separadas por triângulo: o
  // que passa da altura da cortina, ou fica no meio da largura, é da caixa.
  const boxScale = new Vector3((HALF_W + FRAME_BORDER) / reach, 1.3, 1.1);
  const railScale = new Vector3(grow, grow, grow);
  for (let t = 0; t < index.length; t += 3) {
    const corners = [index[t] ?? 0, index[t + 1] ?? 0, index[t + 2] ?? 0];
    if (corners.some((i) => inSheet[i] === 1)) continue;
    const at = corners.map((i) => points[i] ?? new Vector3());
    const middle = (at[0]!.x + at[1]!.x + at[2]!.x) / 3;
    const isBox = at.some((p) => p.y > sheet.max.y + 1e-3) || Math.abs(middle) < reach * 0.8;
    for (const i of corners) {
      const p = points[i];
      if (p === undefined) continue;
      if (isBox) {
        place(i, p.x * boxScale.x, TOP + (p.y - sheet.max.y) * boxScale.y, BACK + Math.max(p.z, 0) * boxScale.z, boxScale, false);
      } else {
        // As guias e os parafusos delas crescem por igual e vão para as pontas.
        const side = Math.sign(middle) || 1;
        const railX = side * (sheet.max.x + reach) / 2;
        place(i, side * GUIDE_X + (p.x - railX) * grow, BOTTOM + (p.y - sheet.min.y) * grow, BACK + Math.max(p.z, 0) * grow, railScale, false);
      }
    }
  }

  const stops = DOOR_STOPS.filter((stop) => stop >= 0 && stop < STOP_COUNT);
  const position = new Float32Array(stops.length * count * 3);
  const normal = new Float32Array(stops.length * count * 3);
  const uv = new Float32Array(stops.length * count * 2);
  const door = new Float32Array(stops.length * count * 3);
  const indices = new Uint16Array(stops.length * index.length);
  const n = new Vector3();
  const p = new Vector3();
  const up = new Vector3(0, 1, 0);
  stops.forEach((stop, s) => {
    const panel = panelPlacement(stop);
    for (let i = 0; i < count; i += 1) {
      const at = s * count + i;
      p.copy(local[i] ?? p).applyAxisAngle(up, panel.yaw);
      position.set([p.x + panel.x, p.y + panel.y, p.z + panel.z], at * 3);
      // A normal de uma malha esticada divide pela escala, não multiplica.
      n.fromBufferAttribute(from.getAttribute("normal"), i).transformDirection(source.matrixWorld);
      n.divide(stretch[i] ?? n).normalize().applyAxisAngle(up, panel.yaw);
      normal.set([n.x, n.y, n.z], at * 3);
      uv.set([from.getAttribute("uv").getX(i), from.getAttribute("uv").getY(i)], at * 2);
      // Cortina ou não, de que parada, e a altura em que ela entra na caixa.
      door.set([curtain[i] ?? 0, stop, panel.y + TOP], at * 3);
    }
    for (let i = 0; i < index.length; i += 1) indices[s * index.length + i] = (index[i] ?? 0) + s * count;
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("normal", new BufferAttribute(normal, 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setAttribute("aDoor", new BufferAttribute(door, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Busca o modelo e monta a porta. O loader de glTF e o decodificador de
 * meshopt vêm por `import()`: ficam num chunk próprio, fora do da cena, e só
 * existem para quem chega a ver uma porta.
 */
export async function loadDoor(): Promise<Door> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js"),
  ]);
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync("/models/industria/porta.glb");
  gltf.scene.updateMatrixWorld(true);
  let source: Mesh | null = null;
  gltf.scene.traverse((object) => {
    if ("isMesh" in object && source === null) source = object as Mesh;
  });
  const mesh = source as Mesh | null;
  const material = mesh?.material as MeshStandardMaterial | undefined;
  if (
    mesh === null ||
    material === undefined ||
    material.map === null ||
    material.normalMap === null ||
    material.roughnessMap === null
  ) {
    throw new Error("porta: o modelo não tem a malha ou os mapas esperados.");
  }
  const geometry = buildDoor(mesh);
  mesh.geometry.dispose();
  material.dispose();
  // O mapa do modelo tem rugosidade e metal, sem oclusão: ela entra inteira.
  const ao = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  ao.needsUpdate = true;
  for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
    texture.anisotropy = 8;
  }
  return {
    geometry,
    maps: { color: material.map, normal: material.normalMap, arm: material.roughnessMap, ao },
  };
}

/**
 * O que a porta acrescenta ao material das chapas: a cortina que sobe.
 *
 * A altura da boca da caixa (`aDoor.z`) é de mundo, e a geometria já vem
 * posicionada em cada parada: a malha tem de ficar na origem, sem giro.
 */
export function doorExtension(shared: SharedUniforms): PbrExtension {
  return {
    key: "porta",
    uniforms: { uDoorOpen: shared.doors },
    vertexPars: /* glsl */ `
attribute vec3 aDoor;
uniform float uDoorOpen[${STOP_COUNT}];
varying float vDoorOver;
`,
    vertexMove: /* glsl */ `
transformed.y += aDoor.x * uDoorOpen[int(aDoor.y + 0.5)] * ${TRAVEL.toFixed(3)};
vDoorOver = aDoor.x * (transformed.y - aDoor.z);
`,
    fragmentPars: /* glsl */ `
varying float vDoorOver;
`,
    // O que passou da boca da caixa do rolo já está enrolado: não se desenha.
    fragmentStart: /* glsl */ `
if (vDoorOver > 0.001) discard;
`,
  };
}
