// Comprime o que a cena carrega da indústria: a porta de enrolar e as texturas
// das placas. As fontes (GLB e JPG do Poly Haven) ficam onde estão; o que sai
// daqui é o que o site busca, depois do loading.
//
//   node scripts/compress-assets.mjs
//
// Saída:
//   public/models/industria/porta.glb   geometria em meshopt, texturas em WebP
//   public/textures/cena/<conjunto>_<mapa>.webp
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const MODELS = "public/models/industria";
const TEXTURES = "public/textures/cena";
const CLI = ["--yes", "@gltf-transform/cli@4.5.1"];

/** Os conjuntos em uso, o lado em pixels e os mapas de cada um. */
const SETS = [
  // A moldura é o que a câmera lê de perto: 1k, e a altura para a paralaxe.
  // A cor da fonte é ferrugem quente, que à noite lê como madeira: ela vira um
  // aço frio e mais claro. As emendas e os rebites da chapa ficam.
  { id: "metal_plate_02", size: 1024, maps: ["diff", "nor_gl", "arm"], extra: { disp: 512 }, steel: true },
  { id: "corrugated_iron_02", size: 512, maps: ["diff", "nor_gl", "arm"] },
  // A tinta verde da estrutura e o amarelado do concreto ficam, com metade da
  // cor: a indústria é neutra.
  { id: "green_metal_rust", size: 512, maps: ["diff", "nor_gl", "arm"], muted: true },
  { id: "concrete_wall_006", size: 512, maps: ["diff", "nor_gl", "arm"], muted: true },
];

const work = mkdtempSync(path.join(tmpdir(), "assets-"));
const transform = (command, input, output, ...options) => {
  execFileSync("npx", [...CLI, command, input, output, ...options], { stdio: "ignore" });
  return output;
};
const kb = (file) => `${(statSync(file).size / 1024).toFixed(0)} kB`;

mkdirSync(MODELS, { recursive: true });
mkdirSync(TEXTURES, { recursive: true });

/* ------------------------------------------------------------------ a porta */
{
  // O GLB traz a porta duas vezes: a segunda só muda a cor (grafite). O nó
  // sai da cena aqui, e o `prune` leva junto a malha e a textura dele.
  const glb = readFileSync("public/models/rollershutter_door.glb");
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
  const scene = json.scenes[json.scene ?? 0];
  scene.nodes = scene.nodes.filter((index) => !json.nodes[index].name.includes("graffiti"));

  let text = Buffer.from(JSON.stringify(json), "utf8");
  if (text.length % 4 !== 0) text = Buffer.concat([text, Buffer.alloc(4 - (text.length % 4), 0x20)]);
  const rest = glb.subarray(20 + jsonLength);
  const header = Buffer.alloc(20);
  glb.copy(header, 0, 0, 12);
  header.writeUInt32LE(20 + text.length + rest.length, 8);
  header.writeUInt32LE(text.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const single = path.join(work, "porta-0.glb");
  writeFileSync(single, Buffer.concat([header, text, rest]));

  // Sem `optimize`: ele liga o `simplify`, e a porta tem 552 triângulos.
  let file = transform("prune", single, path.join(work, "porta-1.glb"));
  file = transform("resize", file, path.join(work, "porta-2.glb"), "--width", "1024", "--height", "1024");
  file = transform("webp", file, path.join(work, "porta-3.glb"), "--slots", "normalTexture", "--quality", "90");
  file = transform("webp", file, path.join(work, "porta-4.glb"), "--formats", "jpeg", "--quality", "80");
  transform("meshopt", file, `${MODELS}/porta.glb`, "--level", "medium");
  console.log(`porta.glb  ${kb(`${MODELS}/porta.glb`)}`);
}

/* ------------------------------------------------------------- as texturas */
for (const set of SETS) {
  const maps = [
    ...set.maps.map((map) => [map, set.size]),
    ...Object.entries(set.extra ?? {}),
  ];
  for (const [map, size] of maps) {
    const out = `${TEXTURES}/${set.id}_${map}.webp`;
    let image = sharp(`public/textures/${set.id}/${set.id}_${map}_1k.jpg`).resize(size, size);
    if (set.steel && map === "diff") {
      image = image.modulate({ saturation: 0.12, brightness: 1.9 }).tint({ r: 150, g: 166, b: 178 });
    }
    if (set.muted && map === "diff") image = image.modulate({ saturation: 0.5 });
    await image
      // A normal não tolera o borrão de croma: qualidade alta e croma inteiro.
      .webp(map === "nor_gl" ? { quality: 90, smartSubsample: true } : { quality: 80 })
      .toFile(out);
    console.log(`${path.basename(out)}  ${kb(out)}`);
  }
}

rmSync(work, { recursive: true, force: true });
