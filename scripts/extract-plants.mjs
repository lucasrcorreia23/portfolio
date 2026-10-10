// Extrai dos GLB das plantas só o que a cena usa: a geometria das variantes
// leves e a textura de cor de cada espécie. Os GLB inteiros somam dezenas de
// MB (normal e rugosidade incluídos); o que sai daqui pesa algumas centenas de
// kB e dispensa um loader de glTF.
//
//   node scripts/extract-plants.mjs
//
// Saída em public/models/plantas/:
//   <especie>-<variante>.bin  cabeçalho (vértices e índices em uint32; altura
//                             e envergadura em float32), depois posições,
//                             normais e UVs em float32 e os índices em uint16
//   <especie>.webp            a textura de cor, 512 px, com alfa quando há
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT = "public/models/plantas";

/** As variantes em uso. Só as leves: cada uma é instanciada centenas de vezes. */
const SPECIES = [
  {
    id: "empodium",
    glb: "public/models/flower_empodium.glb",
    variants: { a: "flower_empodium_a_LOD0", c: "flower_empodium_c_LOD0", e: "flower_empodium_e_LOD0" },
  },
  {
    id: "gazania",
    glb: "public/models/flower_gazania.glb",
    // `a` e `b` são só a roseta de folhas; a flor aberta está na `e`.
    variants: { a: "flower_gazania_a_LOD0", b: "flower_gazania_b_LOD0", e: "flower_gazania_e_LOD0" },
  },
  {
    id: "celandine",
    glb: "public/models/celandine_01.glb",
    variants: { b: "celandine_01_b_LOD0", e: "celandine_01_e_LOD0" },
  },
  // As pedras vêm dos GLB decimados (59 mil e 109 mil triângulos nos originais):
  //   npx @gltf-transform/cli simplify <original>.glb <saida>_low.glb --ratio 0.012 --error 0.05
  {
    id: "boulder",
    glb: "public/models/namaqualand_boulder_04_low.glb",
    variants: { a: "boulder_04" },
  },
  {
    id: "stone",
    glb: "public/models/namaqualand_boulder_06_low.glb",
    variants: { a: "namaqualand_boulder_06" },
  },
  {
    id: "rooibos",
    glb: "public/models/wild_rooibos_bush.glb",
    variants: { e: "wild_rooibos_bush_e" },
  },
];

mkdirSync(OUT, { recursive: true });

for (const species of SPECIES) {
  const glb = readFileSync(species.glb);
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
  const bin = glb.subarray(20 + jsonLength + 8);

  const read = (index) => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3 }[accessor.type];
    const out = new Array(accessor.count * size);
    const stride = view.byteStride ?? 0;
    for (let i = 0; i < accessor.count; i += 1) {
      for (let k = 0; k < size; k += 1) {
        const at =
          start + (stride > 0 ? i * stride + k * (accessor.componentType === 5123 ? 2 : 4) : (i * size + k) * (accessor.componentType === 5123 ? 2 : 4));
        out[i * size + k] =
          accessor.componentType === 5126
            ? bin.readFloatLE(at)
            : accessor.componentType === 5125
              ? bin.readUInt32LE(at)
              : bin.readUInt16LE(at);
      }
    }
    return out;
  };

  let imageIndex = -1;
  for (const [variant, nodeName] of Object.entries(species.variants)) {
    const node = json.nodes.find((entry) => entry.name === nodeName);
    const scale = node.scale ?? [1, 1, 1];
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    // Um nó pode ter vários primitivos (o arbusto tem três): todos entram
    // numa geometria só, com a mesma textura.
    for (const primitive of json.meshes[node.mesh].primitives) {
      const base = positions.length / 3;
      const position = read(primitive.attributes.POSITION);
      for (let i = 0; i < position.length; i += 3) {
        positions.push(position[i] * scale[0], position[i + 1] * scale[1], position[i + 2] * scale[2]);
      }
      normals.push(...read(primitive.attributes.NORMAL));
      uvs.push(...read(primitive.attributes.TEXCOORD_0));
      for (const index of read(primitive.indices)) indices.push(base + index);
      const color = json.materials[primitive.material].pbrMetallicRoughness.baseColorTexture;
      const source = json.textures[color.index].source;
      // A textura com alfa, quando o nó mistura materiais com e sem ele.
      if (imageIndex < 0 || json.images[source].mimeType === "image/png") imageIndex = source;
    }
    const count = positions.length / 3;
    if (count > 65535) throw new Error(`${nodeName}: vértices demais para uint16`);

    let tall = 0;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      tall = Math.max(tall, positions[i + 1]);
      minX = Math.min(minX, positions[i]);
      maxX = Math.max(maxX, positions[i]);
      minZ = Math.min(minZ, positions[i + 2]);
      maxZ = Math.max(maxZ, positions[i + 2]);
    }
    const span = Math.max(maxX - minX, maxZ - minZ);

    const header = Buffer.alloc(16);
    header.writeUInt32LE(count, 0);
    header.writeUInt32LE(indices.length, 4);
    header.writeFloatLE(tall, 8);
    header.writeFloatLE(span, 12);
    writeFileSync(
      `${OUT}/${species.id}-${variant}.bin`,
      Buffer.concat([
        header,
        Buffer.from(new Float32Array(positions).buffer),
        Buffer.from(new Float32Array(normals).buffer),
        Buffer.from(new Float32Array(uvs).buffer),
        Buffer.from(new Uint16Array(indices).buffer),
      ]),
    );
    console.log(
      `${species.id}-${variant}: ${indices.length / 3} triângulos, ${tall.toFixed(3)} m de altura, ${span.toFixed(3)} m de envergadura`,
    );
  }

  const image = json.images[imageIndex];
  const view = json.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  await sharp(bin.subarray(start, start + view.byteLength))
    .resize(512, 512)
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(`${OUT}/${species.id}.webp`);
}
