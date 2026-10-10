import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RedFormat,
} from "three";
import {
  heightfield,
  TERRAIN,
  TERRAIN_DEPTH,
  TERRAIN_WIDTH,
} from "./world";

/**
 * O terreno em três formas, todas do mesmo campo de alturas: a malha, a
 * textura que a flora lê no vertex shader, e o GLSL que a amostra.
 */

export function createTerrainGeometry(): BufferGeometry {
  const { cols, rows, minX, minZ } = TERRAIN;
  const data = heightfield();
  const row = cols + 1;
  const positions = new Float32Array(row * (rows + 1) * 3);
  const dx = TERRAIN_WIDTH / cols;
  const dz = TERRAIN_DEPTH / rows;
  for (let iz = 0; iz <= rows; iz += 1) {
    for (let ix = 0; ix <= cols; ix += 1) {
      const i = (iz * row + ix) * 3;
      positions[i] = minX + ix * dx;
      positions[i + 1] = data[iz * row + ix] ?? 0;
      positions[i + 2] = minZ + iz * dz;
    }
  }
  const indices = new Uint32Array(cols * rows * 6);
  let k = 0;
  for (let iz = 0; iz < rows; iz += 1) {
    for (let ix = 0; ix < cols; ix += 1) {
      const a = iz * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** O campo de alturas como textura de meio-float, com filtro linear. */
export function createHeightTexture(): DataTexture {
  const { cols, rows } = TERRAIN;
  const data = heightfield();
  const half = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    half[i] = DataUtils.toHalfFloat(data[i] ?? 0);
  }
  const texture = new DataTexture(half, cols + 1, rows + 1, RedFormat, HalfFloatType);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const f = (value: number) => value.toFixed(6);

/**
 * A altura do terreno no vertex shader. O centro de cada texel coincide com um
 * vértice da malha, então a flora pousa onde o chão está.
 */
export const HEIGHT_GLSL = /* glsl */ `
uniform sampler2D uHeight;

float terrainHeight(vec2 xz) {
  vec2 uv = (xz - vec2(${f(TERRAIN.minX)}, ${f(TERRAIN.minZ)}))
    * vec2(${f(1 / TERRAIN_WIDTH)}, ${f(1 / TERRAIN_DEPTH)});
  uv = uv * vec2(${f(TERRAIN.cols / (TERRAIN.cols + 1))}, ${f(TERRAIN.rows / (TERRAIN.rows + 1))})
    + vec2(${f(0.5 / (TERRAIN.cols + 1))}, ${f(0.5 / (TERRAIN.rows + 1))});
  return textureLod(uHeight, uv, 0.0).r;
}
`;
