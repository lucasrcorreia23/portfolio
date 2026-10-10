import {
  BufferAttribute,
  BufferGeometry,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";

/**
 * Peças soltas mescladas numa geometria só: é como a indústria e o corpo das
 * placas cabem em um draw call cada.
 */

export type Part = { geometry: BufferGeometry; matrix: Matrix4 };

const POSITION = new Vector3();
const SCALE = new Vector3(1, 1, 1);
const ROTATION = new Quaternion();
const EULER = new Euler();

export function place(
  geometry: BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): Part {
  POSITION.set(x, y, z);
  ROTATION.setFromEuler(EULER.set(rx, ry, rz));
  return { geometry, matrix: new Matrix4().compose(POSITION, ROTATION, SCALE) };
}

/**
 * UV por projeção de caixa, no espaço da própria peça: cada face recebe os
 * dois eixos que não são a normal dela, em escala de mundo (`tile` metros por
 * volta da textura). Serve a caixas e a cilindros finos.
 */
export function projectUv(geometry: BufferGeometry, tile: number): BufferGeometry {
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  if (flat !== geometry) geometry.dispose();
  const position = flat.getAttribute("position");
  const normal = flat.getAttribute("normal");
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const [u, v] = nx >= ny && nx >= nz ? [z, y] : ny >= nz ? [x, z] : [x, y];
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  flat.setAttribute("uv", new BufferAttribute(uv, 2));
  return flat;
}

/** Mescla as peças. Com `uv`, leva também as coordenadas de textura. */
export function merge(parts: readonly Part[], uv = false): BufferGeometry {
  let total = 0;
  const flat = parts.map((part) => {
    const geometry = part.geometry.index === null ? part.geometry.clone() : part.geometry.toNonIndexed();
    geometry.applyMatrix4(part.matrix);
    total += geometry.getAttribute("position").count;
    return geometry;
  });
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = uv ? new Float32Array(total * 2) : null;
  let offset = 0;
  for (const geometry of flat) {
    positions.set(geometry.getAttribute("position").array, offset * 3);
    normals.set(geometry.getAttribute("normal").array, offset * 3);
    uvs?.set(geometry.getAttribute("uv").array, offset * 2);
    offset += geometry.getAttribute("position").count;
    geometry.dispose();
  }
  for (const part of parts) part.geometry.dispose();
  const merged = new BufferGeometry();
  merged.setAttribute("position", new BufferAttribute(positions, 3));
  merged.setAttribute("normal", new BufferAttribute(normals, 3));
  if (uvs !== null) merged.setAttribute("uv", new BufferAttribute(uvs, 2));
  merged.computeBoundingSphere();
  return merged;
}
