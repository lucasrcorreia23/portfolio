#!/usr/bin/env node
// @ts-check
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * A flor do loading: `styles/loading-flower.css`.
 *
 * É a cabeça da gazânia aberta, a mesma espécie da cena, tirada da textura de
 * 4k do Poly Haven (CC0; a do GLB tem 1024 px e a cabeça ficaria com 320).
 * O arquivo não leva cor: é branco, e o alfa é a silhueta da flor vezes o
 * relevo da foto. O CSS o usa como máscara (`.loading-flower-head`) e pinta
 * por baixo com os tokens.
 *
 * Sai embutida no CSS, e não como arquivo: a flor é o maior elemento do
 * primeiro quadro (o LCP), e num pedido à parte ela disputava a rede com tudo
 * o que o loading baixa. Por isso também é pequena: 320 px é o tamanho dela
 * num celular. Vai numa variável, e não direto em `mask-image`: o prefixo
 * `-webkit-` que o build acrescenta duplicaria a imagem inteira.
 *
 *   node scripts/derive-loading-flower.mjs
 */

const SOURCE = "https://dl.polyhaven.org/file/ph-assets/Models";
const DIFFUSE = `${SOURCE}/jpg/4k/flower_gazania/flower_gazania_diff_4k.jpg`;
const ALPHA = `${SOURCE}/png/4k/flower_gazania/flower_gazania_alpha_4k.png`;

/** A cabeça grande do atlas, num quadrado centrado no miolo. */
const BOX = { left: 60, top: 2650, width: 1440, height: 1440 };
/** Além deste raio o atlas tem uma folha e dois estames soltos. */
const HEAD_RADIUS = 740 / BOX.width;
/** O miolo e as manchas da base das pétalas são quase pretos: sem piso, somem. */
const FLOOR = 0.4;
const SIZE = 320;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "styles", "loading-flower.css");

/** @param {string} url */
async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** @param {Buffer} image @param {boolean} stretch */
function crop(image, stretch) {
  const cut = sharp(image).extract(BOX).resize(SIZE, SIZE).greyscale();
  return (stretch ? cut.normalise() : cut).raw().toBuffer();
}

const [relief, silhouette] = await Promise.all([
  download(DIFFUSE).then((image) => crop(image, true)),
  download(ALPHA).then((image) => crop(image, false)),
]);

const pixels = Buffer.alloc(SIZE * SIZE * 4, 255);
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    const at = y * SIZE + x;
    const radius = Math.hypot(x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2) / SIZE;
    const inside = radius < HEAD_RADIUS ? 1 : 0;
    const shade = FLOOR + (1 - FLOOR) * ((relief[at] ?? 0) / 255);
    pixels[at * 4 + 3] = Math.round((silhouette[at] ?? 0) * shade * inside);
  }
}

const mask = await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .webp({ quality: 50, alphaQuality: 80, effort: 6 })
  .toBuffer();
writeFileSync(
  OUT,
  `/* Gerado por scripts/derive-loading-flower.mjs: não edite à mão. */
.loading-flower-head {
  --loading-flower: url("data:image/webp;base64,${mask.toString("base64")}");
}
`,
);
console.log(`loading-flower.css: ${SIZE} px, ${(mask.length / 1024).toFixed(1)} kB`);
