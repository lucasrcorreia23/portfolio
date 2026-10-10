// Extrai dos GLB da indústria só a forma: os tanques e a chaminé entram na
// silhueta mesclada (`lib/scene/industry.ts`), que não tem textura. Cada
// modelo sai numa malha só, decimada, de pé sobre y = 0, centrada em XZ e já
// na altura em metros que a cena usa.
//
//   node scripts/extract-industry.mjs
//
// Saída em public/models/industria/:
//   <nome>.bin  cabeçalho (vértices em uint32, altura em float32), depois
//               posições e normais em float32, três vértices por triângulo
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { MeshoptSimplifier } from "meshoptimizer";
import { Matrix4, Quaternion, Vector3 } from "three";

const OUT = "public/models/industria";

/**
 * `tall` é a altura final em metros e `triangles`, o teto de cada cópia: a
 * silhueta inteira precisa caber no orçamento de triângulos da cena.
 */
const MODELS = [
  { id: "tanques", glb: "public/models/large_industrial_storage_tanks.glb", tall: 11.5, triangles: 1000 },
  { id: "tanque-oleo", glb: "public/models/old_oil_tank.glb", tall: 10, triangles: 450 },
  { id: "tanque-ferrugem", glb: "public/models/rusted_tank_storage.glb", tall: 11, triangles: 300 },
  // O GLB traz a mesma chaminé três vezes: sai uma, a cena coloca o trio.
  { id: "chamine", glb: "public/models/industrial_smoke_stacks.glb", tall: 34.6, triangles: 72, first: true },
  // As duas do fim da trilha a câmera vê de perto: levam mais detalhe.
  { id: "chamine-perto", glb: "public/models/industrial_smoke_stacks.glb", tall: 34.6, triangles: 300, first: true },
];

await MeshoptSimplifier.ready;
mkdirSync(OUT, { recursive: true });

for (const model of MODELS) {
  const glb = readFileSync(model.glb);
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
  const bin = glb.subarray(20 + jsonLength + 8);

  const read = (index) => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3 }[accessor.type];
    const bytes = accessor.componentType === 5123 ? 2 : 4;
    const stride = view.byteStride ?? size * bytes;
    const out = new Array(accessor.count * size);
    for (let i = 0; i < accessor.count; i += 1) {
      for (let k = 0; k < size; k += 1) {
        const at = start + i * stride + k * bytes;
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

  // Os triângulos de todos os nós, já no espaço do modelo: as hierarquias
  // vêm com rotações e escalas aninhadas. Vértices iguais viram um só.
  const positions = [];
  const indices = [];
  const welded = new Map();
  const point = new Vector3();
  let done = false;
  const visit = (index, parent) => {
    const node = json.nodes[index];
    const local = new Matrix4();
    if (node.matrix) local.fromArray(node.matrix);
    else {
      local.compose(
        new Vector3(...(node.translation ?? [0, 0, 0])),
        new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
        new Vector3(...(node.scale ?? [1, 1, 1])),
      );
    }
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined && !done) {
      for (const primitive of json.meshes[node.mesh].primitives) {
        // Fora as arestas soltas (linhas) e o que é transparente.
        if ((primitive.mode ?? 4) !== 4) continue;
        if (json.materials?.[primitive.material]?.alphaMode === "BLEND") continue;
        const position = read(primitive.attributes.POSITION);
        const order =
          primitive.indices === undefined
            ? position.map((_, i) => i).slice(0, position.length / 3)
            : read(primitive.indices);
        for (const i of order) {
          point.set(position[i * 3], position[i * 3 + 1], position[i * 3 + 2]).applyMatrix4(world);
          const key = `${point.x.toFixed(4)},${point.y.toFixed(4)},${point.z.toFixed(4)}`;
          let at = welded.get(key);
          if (at === undefined) {
            at = positions.length / 3;
            welded.set(key, at);
            positions.push(point.x, point.y, point.z);
          }
          indices.push(at);
        }
      }
      if (model.first) done = true;
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, new Matrix4());

  const source = new Float32Array(positions);
  const [simple] = MeshoptSimplifier.simplify(
    new Uint32Array(indices),
    source,
    3,
    model.triangles * 3,
    0.2,
    ["Prune"],
  );

  // De pé sobre y = 0, centrado em XZ, na altura pedida.
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const i of simple) {
    for (let k = 0; k < 3; k += 1) {
      min[k] = Math.min(min[k], source[i * 3 + k]);
      max[k] = Math.max(max[k], source[i * 3 + k]);
    }
  }
  const scale = model.tall / (max[1] - min[1]);
  const center = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
  const at = (i) =>
    new Vector3(
      (source[i * 3] - center[0]) * scale,
      (source[i * 3 + 1] - center[1]) * scale,
      (source[i * 3 + 2] - center[2]) * scale,
    );

  // Normais: a média das faces vizinhas que viram menos de 50 graus, para o
  // costado sair liso e a tampa, com quina.
  const faces = [];
  const around = new Map();
  for (let i = 0; i < simple.length; i += 3) {
    const a = at(simple[i]);
    const b = at(simple[i + 1]);
    const c = at(simple[i + 2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (normal.lengthSq() === 0) continue;
    const face = { corners: [a, b, c], ids: [simple[i], simple[i + 1], simple[i + 2]], normal };
    faces.push(face);
    for (const id of face.ids) around.set(id, [...(around.get(id) ?? []), face]);
  }
  const outPositions = new Float32Array(faces.length * 9);
  const outNormals = new Float32Array(faces.length * 9);
  const limit = Math.cos((50 * Math.PI) / 180);
  faces.forEach((face, f) => {
    const flat = face.normal.clone().normalize();
    face.corners.forEach((corner, k) => {
      const smooth = new Vector3();
      for (const other of around.get(face.ids[k])) {
        // A normal sem normalizar pesa pela área da face.
        if (other.normal.clone().normalize().dot(flat) > limit) smooth.add(other.normal);
      }
      smooth.normalize();
      outPositions.set([corner.x, corner.y, corner.z], f * 9 + k * 3);
      outNormals.set([smooth.x, smooth.y, smooth.z], f * 9 + k * 3);
    });
  });

  const header = Buffer.alloc(8);
  header.writeUInt32LE(faces.length * 3, 0);
  header.writeFloatLE(model.tall, 4);
  writeFileSync(
    `${OUT}/${model.id}.bin`,
    Buffer.concat([header, Buffer.from(outPositions.buffer), Buffer.from(outNormals.buffer)]),
  );
  console.log(
    `${model.id}: ${indices.length / 3} → ${faces.length} triângulos, ` +
      `${((max[0] - min[0]) * scale).toFixed(1)} × ${model.tall} × ${((max[2] - min[2]) * scale).toFixed(1)} m`,
  );
}
