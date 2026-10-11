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
import { STOP_COUNT } from "./stops";
import {
  floraPatches,
  heightAt,
  panelPlacement,
  pathX,
  vitrineWall,
  Z_END,
  ZONE_EDGES,
  type SpeciesId,
} from "./world";

/**
 * As plantas: modelos fotogramétricos do Poly Haven (CC0 — ver
 * `public/models/CREDITS.md`), instanciados nas manchas de flora. A forma é a
 * da planta de verdade; a cor é a da cena (pétala que emite, folha escura).
 *
 * Os arquivos são o que `scripts/extract-plants.mjs` tira dos GLB. Cada
 * variante é um draw call por **zona** da trilha: a zona longe da câmera não
 * é desenhada, que é o que segura a contagem de triângulos.
 */

type Variant = { file: string; share: number };

type Species = {
  /** As variantes e quanto das plantas da espécie cada uma leva. */
  variants: readonly Variant[];
  /** O tamanho no mundo, em metros: a planta de um palmo vira flora de outro planeta. */
  size: readonly [number, number];
  /** Onde a pétala começa e termina na máscara da textura (vermelho menos azul, em luz linear). */
  petal: readonly [number, number];
  /** Quanto a pétala emite: zero no arbusto, que só recebe a luz das flores. */
  emit: number;
  /** Quanto o vento a dobra. */
  sway: number;
  /** Quanto da cor da planta a folha guarda: zero na pedra. */
  leaf: number;
};

export const SPECIES: Readonly<Record<SpeciesId, Species>> = {
  // A flor alta, em estrela; a variante `e` é só folhagem, e dá o volume.
  empodium: {
    variants: [
      { file: "empodium-a", share: 0.2 },
      { file: "empodium-c", share: 0.2 },
      { file: "empodium-e", share: 0.6 },
    ],
    size: [1.4, 2.8],
    petal: [0.1, 0.26],
    emit: 1,
    sway: 1,
    leaf: 1,
  },
  // A margarida baixa de pétala larga: a que mais acende por triângulo.
  gazania: {
    variants: [
      // A flor aberta custa cinco vezes a roseta: é a minoria, e é o que acende.
      { file: "gazania-e", share: 0.26 },
      { file: "gazania-a", share: 0.4 },
      { file: "gazania-b", share: 0.34 },
    ],
    size: [0.7, 1.5],
    petal: [0.22, 0.5],
    emit: 0.8,
    sway: 0.5,
    leaf: 0.9,
  },
  // A roseta rasteira: cobre o chão nas bordas das manchas.
  celandine: {
    variants: [
      { file: "celandine-e", share: 0.6 },
      { file: "celandine-b", share: 0.4 },
    ],
    size: [0.6, 1.2],
    petal: [0.24, 0.44],
    emit: 0.9,
    sway: 0.6,
    leaf: 0.9,
  },
  // O arbusto: volume escuro ao pé das estruturas. Não emite.
  rooibos: {
    variants: [{ file: "rooibos-e", share: 1 }],
    size: [1.3, 2.4],
    petal: [2, 3],
    emit: 0,
    sway: 0.35,
    leaf: 0.7,
  },
  // As pedras: massa neutra ao longo da trilha. Não emitem e não se mexem.
  boulder: {
    variants: [{ file: "boulder-a", share: 1 }],
    size: [2.2, 4.6],
    petal: [2, 3],
    emit: 0,
    sway: 0,
    leaf: 0,
  },
  stone: {
    variants: [{ file: "stone-a", share: 1 }],
    size: [0.9, 2.2],
    petal: [2, 3],
    emit: 0,
    sway: 0,
    leaf: 0,
  },
};

/** As espécies que têm lugar fixo, em vez de crescerem nas manchas. */
const FIXED: readonly SpeciesId[] = ["rooibos", "boulder", "stone"];

export type PlantBatch = {
  geometry: InstancedBufferGeometry;
  count: number;
  species: SpeciesId;
  /** A altura do modelo, em metros: o vento dobra a planta por ela. */
  tall: number;
  /** O trecho da trilha em Z que este lote ocupa. */
  nearZ: number;
  farZ: number;
};

export type Plants = {
  batches: PlantBatch[];
  textures: Record<SpeciesId, Texture>;
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

/** x, índice da mancha, z, escala, giro, fase, brilho, rosa. */
type Item = number[];

/** As posições de uma espécie nas manchas, para uma variante. */
function scatter(species: SpeciesId, share: number, size: number, seed: number): Item[][] {
  const config = SPECIES[species];
  const random = mulberry(seed);
  return floraPatches().map((patch, index) => {
    const list: Item[] = [];
    const wanted = Math.round(patch.count * (patch.mix[species] ?? 0) * share);
    let guard = 0;
    while (list.length < wanted && guard < wanted * 8) {
      guard += 1;
      const angle = random() * Math.PI * 2;
      const radius = Math.pow(random(), 0.7);
      const x = patch.x + Math.cos(angle) * radius * patch.rx;
      const z = patch.z + Math.sin(angle) * radius * patch.rz;
      // Nenhuma planta no meio da trilha: a câmera não a atravessa.
      if (Math.abs(x - pathX(z)) < 1.8) continue;
      list.push([
        x,
        index,
        z,
        (config.size[0] + random() * (config.size[1] - config.size[0])) / size,
        random() * Math.PI * 2,
        random(),
        random(),
        random() < patch.warm ? 1 : 0,
      ]);
    }
    return list;
  });
}

/** A semente de uma variante: o mesmo sorteio a cada carga. */
function variantSeed(species: number, variant: number): number {
  return 211 + species * 131 + variant * 17;
}

/**
 * As plantas que emitem, uma por linha: x, y, z em mundo e o rosa dela. É de
 * onde o pólen nasce. Repete o sorteio de `scatter()` com as sementes de
 * `loadPlants`, então não espera os modelos chegarem. Em Z decrescente, que
 * é o sentido da trilha: quem lê recorta um trecho por busca.
 */
export function flowerHeads(): Float32Array {
  const ids = Object.keys(SPECIES) as SpeciesId[];
  const heads: number[][] = [];
  ids.forEach((species, s) => {
    const config = SPECIES[species];
    if (config.emit <= 0 || FIXED.includes(species)) return;
    config.variants.forEach((variant, v) => {
      // Com tamanho 1 a escala do item é a altura da planta, em metros.
      for (const list of scatter(species, variant.share, 1, variantSeed(s, v))) {
        for (const item of list) {
          const x = item[0] ?? 0;
          const z = item[2] ?? 0;
          heads.push([x, heightAt(x, z) + (item[3] ?? 1) * 0.7, z, item[7] ?? 0]);
        }
      }
    });
  });
  heads.sort((a, b) => (b[2] ?? 0) - (a[2] ?? 0));
  return Float32Array.from(heads.flat());
}

/** Os arbustos ficam em lugar fixo: ao pé de cada pórtico e da parede da vitrine. */
function bushes(size: number): Item[][] {
  const config = SPECIES.rooibos;
  const random = mulberry(503);
  const list: Item[] = [];
  const around = (x: number, z: number, yaw: number, spread: number, count: number) => {
    for (let k = 0; k < count; k += 1) {
      const side = (random() - 0.5) * spread;
      const back = 0.8 + random() * 2.4;
      const px = x + Math.cos(yaw) * side - Math.sin(yaw) * back;
      const pz = z - Math.sin(yaw) * side - Math.cos(yaw) * back;
      if (Math.abs(px - pathX(pz)) < 2.2) continue;
      list.push([
        px,
        0,
        pz,
        (config.size[0] + random() * (config.size[1] - config.size[0])) / size,
        random() * Math.PI * 2,
        random(),
        random(),
        0,
      ]);
    }
  };
  for (let index = 0; index < STOP_COUNT; index += 1) {
    const panel = panelPlacement(index);
    around(panel.x, panel.z, panel.yaw, 9, 4);
  }
  const wall = vitrineWall();
  around(wall.x, wall.z, wall.yaw, 15, 7);
  return [list];
}

/**
 * As pedras ficam espalhadas dos dois lados da trilha, do começo ao fim: as
 * grandes mais longe, as pequenas mais perto. Nunca no meio do caminho.
 */
function rocks(species: SpeciesId, size: number, seed: number): Item[][] {
  const config = SPECIES[species];
  const random = mulberry(seed);
  const big = species === "boulder";
  const list: Item[] = [];
  const count = big ? 22 : 44;
  // A pedra do fim da trilha: massa no canto direito do último quadro. Vem
  // primeiro, para os níveis de qualidade não a cortarem.
  if (big) list.push([pathX(Z_END - 10) + 7.5, 0, Z_END - 10, 3.1 / size, 0.9, 0.3, 0.5, 0]);
  for (let k = 0; k < count; k += 1) {
    const z = 30 - (k + random()) * (350 / count);
    const side = random() < 0.5 ? -1 : 1;
    const off = big ? 9 + random() * 26 : 3.2 + random() * 12;
    list.push([
      pathX(z) + side * off,
      0,
      z,
      (config.size[0] + random() * (config.size[1] - config.size[0])) / size,
      random() * Math.PI * 2,
      random(),
      random(),
      0,
    ]);
  }
  return [list];
}

async function loadVariant(
  species: SpeciesId,
  variant: Variant,
  seed: number,
): Promise<PlantBatch[]> {
  const response = await fetch(`/models/plantas/${variant.file}.bin`);
  if (!response.ok) throw new Error(variant.file);
  const buffer = await response.arrayBuffer();

  const [vertices = 0, indices = 0] = new Uint32Array(buffer, 0, 2);
  const [tall = 0.2, span = 0.2] = new Float32Array(buffer, 8, 2);
  let offset = 16;
  const take = (size: number) => {
    const array = new Float32Array(buffer, offset, vertices * size);
    offset += vertices * size * 4;
    return new BufferAttribute(array, size);
  };
  // Os atributos de vértice são os mesmos objetos nas três zonas.
  const position = take(3);
  const normal = take(3);
  const uv = take(2);
  const index = new BufferAttribute(
    new Uint16Array(buffer.slice(offset, offset + indices * 2)),
    1,
  );

  const size = Math.max(tall, span * 0.5);
  const perPatch = FIXED.includes(species)
    ? species === "rooibos"
      ? bushes(size)
      : rocks(species, size, seed)
    : scatter(species, variant.share, size, seed);

  const batches: PlantBatch[] = [];
  for (let zone = 0; zone + 1 < ZONE_EDGES.length; zone += 1) {
    const nearZ = ZONE_EDGES[zone] ?? 0;
    const farZ = ZONE_EDGES[zone + 1] ?? 0;
    const inZone = perPatch.map((list) =>
      list.filter((item) => (item[2] ?? 0) <= nearZ && (item[2] ?? 0) > farZ),
    );
    // Intercaladas entre as manchas, para que cortar a contagem (níveis de
    // qualidade) rareie todas por igual em vez de apagar as últimas.
    const items: Item[] = [];
    const longest = Math.max(0, ...inZone.map((list) => list.length));
    for (let k = 0; k < longest; k += 1) {
      for (const list of inZone) {
        const step = list.length / longest;
        for (let i = Math.floor(k * step); i < Math.floor((k + 1) * step); i += 1) {
          const item = list[i];
          if (item !== undefined) items.push(item);
        }
      }
    }
    if (items.length === 0) continue;

    const offsets = new Float32Array(items.length * 3);
    const seeds = new Float32Array(items.length * 4);
    const warm = new Float32Array(items.length);
    items.forEach((item, i) => {
      offsets.set(item.slice(0, 3), i * 3);
      seeds.set(item.slice(3, 7), i * 4);
      warm[i] = item[7] ?? 0;
    });
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute("position", position);
    geometry.setAttribute("normal", normal);
    geometry.setAttribute("uv", uv);
    geometry.setIndex(index);
    geometry.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
    geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 4));
    geometry.setAttribute("aWarm", new InstancedBufferAttribute(warm, 1));
    geometry.instanceCount = items.length;
    geometry.boundingSphere = new Sphere(new Vector3(), 1e5);
    batches.push({ geometry, count: items.length, species, tall, nearZ, farZ });
  }
  return batches;
}

async function loadTexture(species: SpeciesId): Promise<Texture> {
  const texture = await new TextureLoader().loadAsync(`/models/plantas/${species}.webp`);
  // O glTF tem a origem do UV em cima: a textura não é virada.
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

/**
 * "As plantas estão na cena": o laço mestre espera por isto antes de compilar
 * os shaders e desenhar o primeiro quadro, e o loading espera pelo primeiro
 * quadro. Assim o campo já abre com flor, em vez de elas brotarem depois.
 * Resolve também se o carregamento falhar: sem plantas ainda há cena.
 */
let settlePlants: () => void = () => {};
export const plantsSettled: Promise<void> = new Promise((resolve) => {
  settlePlants = resolve;
});
export function markPlantsSettled(): void {
  settlePlants();
}

export async function loadPlants(): Promise<Plants> {
  const ids = Object.keys(SPECIES) as SpeciesId[];
  const [textures, batches] = await Promise.all([
    Promise.all(ids.map(loadTexture)),
    Promise.all(
      ids.flatMap((species, s) =>
        SPECIES[species].variants.map((variant, v) =>
          loadVariant(species, variant, variantSeed(s, v)),
        ),
      ),
    ),
  ]);
  return {
    batches: batches.flat(),
    textures: Object.fromEntries(ids.map((id, i) => [id, textures[i]])) as Record<
      SpeciesId,
      Texture
    >,
  };
}
