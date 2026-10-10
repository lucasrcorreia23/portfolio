import {
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Sphere,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Texture,
} from "three";
import { floraPatches, pathX } from "./world";

/**
 * A flor de perto: um modelo fotogramétrico (Flower Empodium, Poly Haven,
 * CC0 — ver `public/models/CREDITS.md`), instanciado em volta da trilha, que é
 * onde a câmera passa rente. Longe dela ficam as flores geradas em código.
 *
 * O arquivo é o que `scripts/extract-flower.mjs` tira do GLB: uma variante da
 * planta e a textura de cor com alfa.
 */

/** Quantas flores de perto existem no nível alto de qualidade. */
export const HERO_MAX = 300;
/** A faixa em volta da trilha em que elas crescem, em metros. */
export const HERO_NEAR = 1.9;
export const HERO_FAR = 6.5;
/** A planta tem 14 cm: aqui ela é flora de outro planeta. */
const HERO_SCALE = 10;

export type HeroFlower = {
  geometry: InstancedBufferGeometry;
  texture: Texture;
  count: number;
};

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

export async function loadHeroFlower(): Promise<HeroFlower> {
  const [buffer, texture] = await Promise.all([
    fetch("/models/flor.bin").then((response) => {
      if (!response.ok) throw new Error("flor.bin");
      return response.arrayBuffer();
    }),
    new TextureLoader().loadAsync("/models/flor.png"),
  ]);

  const [vertices = 0, indices = 0] = new Uint32Array(buffer, 0, 2);
  let offset = 8;
  const take = (size: number) => {
    const array = new Float32Array(buffer, offset, vertices * size);
    offset += vertices * size * 4;
    return array;
  };
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(take(3), 3));
  geometry.setAttribute("normal", new BufferAttribute(take(3), 3));
  geometry.setAttribute("uv", new BufferAttribute(take(2), 2));
  geometry.setIndex(new BufferAttribute(new Uint16Array(buffer, offset, indices), 1));

  // O glTF tem a origem do UV em cima: a textura não é virada.
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;

  // Em volta da trilha, dentro das manchas: perto das paradas e do Impacto.
  const patches = floraPatches();
  const random = mulberry(211);
  const items: number[][] = [];
  let guard = 0;
  while (items.length < HERO_MAX && guard < HERO_MAX * 60) {
    guard += 1;
    const index = Math.floor(random() * patches.length);
    const patch = patches[index];
    if (patch === undefined) continue;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const x = patch.x + Math.cos(angle) * radius * patch.rx;
    const z = patch.z + Math.sin(angle) * radius * patch.rz;
    const off = Math.abs(x - pathX(z));
    if (off < HERO_NEAR || off > HERO_FAR) continue;
    items.push([
      x,
      index,
      z,
      HERO_SCALE * (0.75 + random() * 0.6),
      random() * Math.PI * 2,
      random(),
      random(),
      random() < patch.warm ? 1 : 0,
    ]);
  }

  const offsets = new Float32Array(items.length * 3);
  const seeds = new Float32Array(items.length * 4);
  const warm = new Float32Array(items.length);
  items.forEach((item, i) => {
    offsets.set(item.slice(0, 3), i * 3);
    seeds.set(item.slice(3, 7), i * 4);
    warm[i] = item[7] ?? 0;
  });
  geometry.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 4));
  geometry.setAttribute("aWarm", new InstancedBufferAttribute(warm, 1));
  geometry.instanceCount = items.length;
  geometry.boundingSphere = new Sphere(new Vector3(), 1e5);

  return { geometry, texture, count: items.length };
}
