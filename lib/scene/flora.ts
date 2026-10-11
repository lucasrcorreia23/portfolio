import {
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Sphere,
  Vector3,
} from "three";
import { GRASS_MAX } from "./quality";
import { GRASS_TILE } from "./shaders/flora";

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
