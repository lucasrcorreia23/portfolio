// Extrai do GLB da flor só o que a cena usa: a geometria de duas variantes e a
// textura de cor com alfa. O GLB inteiro pesa 1,2 MB (normal e ARM incluídos);
// o que sai daqui pesa algumas dezenas de kB e dispensa um loader de glTF.
//
//   node scripts/extract-flower.mjs
//
// Saída: public/models/flor-a.bin e flor-c.bin (cabeçalho: vértices e índices
// em uint32 e a altura em float32; depois posições, normais e UVs em float32,
// e os índices em uint16) e public/models/flor.png.
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "public/models/flower_empodium.glb";
/** As variantes com flor aberta: uma com uma haste, outra com três. */
const VARIANTS = [
  { node: "flower_empodium_a_LOD0", out: "public/models/flor-a.bin" },
  { node: "flower_empodium_c_LOD0", out: "public/models/flor-c.bin" },
  // Só folhagem, e leve: é o volume em volta das que têm flor.
  { node: "flower_empodium_e_LOD0", out: "public/models/flor-e.bin" },
];

const glb = readFileSync(SOURCE);
const jsonLength = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
const bin = glb.subarray(20 + jsonLength + 8);

const view = (index) => {
  const accessor = json.accessors[index];
  const bufferView = json.bufferViews[accessor.bufferView];
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3 }[accessor.type];
  const bytes = { 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  return {
    accessor,
    data: bin.subarray(start, start + accessor.count * size * bytes),
  };
};

let primitive;
for (const variant of VARIANTS) {
  const node = json.nodes.find((entry) => entry.name === variant.node);
  primitive = json.meshes[node.mesh].primitives[0];
  const position = view(primitive.attributes.POSITION);
  const normal = view(primitive.attributes.NORMAL);
  const uv = view(primitive.attributes.TEXCOORD_0);
  const index = view(primitive.indices);

  // Os índices saem em uint16: cada variante tem menos de 65 mil vértices.
  const count = index.accessor.count;
  const indices = Buffer.alloc(count * 2);
  for (let i = 0; i < count; i += 1) {
    const value =
      index.accessor.componentType === 5125
        ? index.data.readUInt32LE(i * 4)
        : index.data.readUInt16LE(i * 2);
    indices.writeUInt16LE(value, i * 2);
  }

  // Cabeçalho: vértices, índices e a altura da planta em float32.
  const header = Buffer.alloc(12);
  header.writeUInt32LE(position.accessor.count, 0);
  header.writeUInt32LE(count, 4);
  header.writeFloatLE(position.accessor.max[1], 8);
  writeFileSync(
    variant.out,
    Buffer.concat([header, position.data, normal.data, uv.data, indices]),
  );
  console.log(
    `${variant.node}: ${position.accessor.count} vértices, ${count / 3} triângulos, ${position.accessor.max[1].toFixed(3)} m`,
  );
}

const material = json.materials[primitive.material];
const texture = json.textures[material.pbrMetallicRoughness.baseColorTexture.index];
const image = json.images[texture.source];
const imageView = json.bufferViews[image.bufferView];
const start = imageView.byteOffset ?? 0;
writeFileSync("public/models/flor.png", bin.subarray(start, start + imageView.byteLength));
