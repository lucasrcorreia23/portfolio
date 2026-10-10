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
 * As flores: um modelo fotogramétrico (Flower Empodium, Poly Haven, CC0 — ver
 * `public/models/CREDITS.md`), instanciado nas manchas de flora. A forma é a
 * da planta de verdade; a cor é a da cena (pétala que emite, folha escura).
 *
 * Os arquivos são o que `scripts/extract-flower.mjs` tira do GLB: duas
 * variantes com flor aberta e a textura de cor com alfa. Um draw call por
 * variante.
 */

/** As duas com flor e a de folhagem, com a fração das posições que cada uma ocupa. */
const VARIANTS = [
  { url: "/models/flor-a.bin", density: 0.12 },
  { url: "/models/flor-c.bin", density: 0.12 },
  { url: "/models/flor-e.bin", density: 0.42 },
] as const;

/** A planta tem um palmo de altura: aqui ela é flora de outro planeta. */
const TALL_MIN = 1.4;
const TALL_MAX = 2.8;

export type FlowerVariant = {
  geometry: InstancedBufferGeometry;
  count: number;
  /** A altura do modelo, em metros: o vento dobra a planta por ela. */
  tall: number;
};

export type Flowers = {
  variants: FlowerVariant[];
  texture: Texture;
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

async function loadVariant(
  url: string,
  density: number,
  seed: number,
): Promise<FlowerVariant> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  const buffer = await response.arrayBuffer();

  const [vertices = 0, indices = 0] = new Uint32Array(buffer, 0, 2);
  const tall = new Float32Array(buffer, 8, 1)[0] ?? 0.2;
  let offset = 12;
  const take = (size: number) => {
    const array = new Float32Array(buffer, offset, vertices * size);
    offset += vertices * size * 4;
    return array;
  };
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(take(3), 3));
  geometry.setAttribute("normal", new BufferAttribute(take(3), 3));
  geometry.setAttribute("uv", new BufferAttribute(take(2), 2));
  geometry.setIndex(
    new BufferAttribute(new Uint16Array(buffer.slice(offset, offset + indices * 2)), 1),
  );

  // As instâncias são intercaladas entre as manchas, para que cortar a
  // contagem (níveis de qualidade) rareie todas por igual.
  const patches = floraPatches();
  const random = mulberry(seed);
  const perPatch = patches.map((patch, index) => {
    const list: number[][] = [];
    const wanted = Math.round(patch.count * density);
    let guard = 0;
    while (list.length < wanted && guard < wanted * 8) {
      guard += 1;
      const angle = random() * Math.PI * 2;
      const radius = Math.pow(random(), 0.7);
      const x = patch.x + Math.cos(angle) * radius * patch.rx;
      const z = patch.z + Math.sin(angle) * radius * patch.rz;
      // Nenhuma flor no meio da trilha: a câmera não atravessa a planta.
      if (Math.abs(x - pathX(z)) < 1.8) continue;
      list.push([
        x,
        index,
        z,
        (TALL_MIN + random() * (TALL_MAX - TALL_MIN)) / tall,
        random() * Math.PI * 2,
        random(),
        random(),
        random() < patch.warm ? 1 : 0,
      ]);
    }
    return list;
  });
  const items: number[][] = [];
  const longest = Math.max(...perPatch.map((list) => list.length));
  for (let k = 0; k < longest; k += 1) {
    for (const list of perPatch) {
      const step = list.length / longest;
      for (let i = Math.floor(k * step); i < Math.floor((k + 1) * step); i += 1) {
        const item = list[i];
        if (item !== undefined) items.push(item);
      }
    }
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

  return { geometry, count: items.length, tall };
}

export async function loadFlowers(): Promise<Flowers> {
  const [texture, ...variants] = await Promise.all([
    new TextureLoader().loadAsync("/models/flor.png"),
    ...VARIANTS.map((variant, index) =>
      loadVariant(variant.url, variant.density, 211 + index * 97),
    ),
  ]);
  // O glTF tem a origem do UV em cima: a textura não é virada.
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  return { variants, texture };
}
