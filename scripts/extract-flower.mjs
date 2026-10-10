// Extrai do GLB da flor só o que a cena usa: a geometria de uma variante e a
// textura de cor com alfa. O GLB inteiro pesa 1,2 MB (normal e ARM incluídos);
// o que sai daqui pesa algumas dezenas de kB e dispensa um loader de glTF.
//
//   node scripts/extract-flower.mjs
//
// Saída: public/models/flor.bin (cabeçalho de dois uint32: vértices e índices;
// depois posições, normais e UVs em float32, e os índices em uint16) e
// public/models/flor.png.
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "public/models/flower_empodium.glb";
/** A variante mais leve: 244 triângulos. */
const NODE = "flower_empodium_e_LOD0";

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

const node = json.nodes.find((entry) => entry.name === NODE);
const primitive = json.meshes[node.mesh].primitives[0];
const position = view(primitive.attributes.POSITION);
const normal = view(primitive.attributes.NORMAL);
const uv = view(primitive.attributes.TEXCOORD_0);
const index = view(primitive.indices);

// Os índices saem em uint16: a variante tem poucas centenas de vértices.
const count = index.accessor.count;
const indices = Buffer.alloc(count * 2);
for (let i = 0; i < count; i += 1) {
  const value =
    index.accessor.componentType === 5125
      ? index.data.readUInt32LE(i * 4)
      : index.data.readUInt16LE(i * 2);
  indices.writeUInt16LE(value, i * 2);
}

const header = Buffer.alloc(8);
header.writeUInt32LE(position.accessor.count, 0);
header.writeUInt32LE(count, 4);
writeFileSync(
  "public/models/flor.bin",
  Buffer.concat([header, position.data, normal.data, uv.data, indices]),
);

const material = json.materials[primitive.material];
const texture = json.textures[material.pbrMetallicRoughness.baseColorTexture.index];
const image = json.images[texture.source];
const imageView = json.bufferViews[image.bufferView];
const start = imageView.byteOffset ?? 0;
writeFileSync("public/models/flor.png", bin.subarray(start, start + imageView.byteLength));

console.log(
  `${NODE}: ${position.accessor.count} vértices, ${count / 3} triângulos; altura ${position.accessor.max[1].toFixed(3)} m`,
);
