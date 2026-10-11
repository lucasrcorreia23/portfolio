#!/usr/bin/env node
// @ts-check
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Os ícones do site, todos tirados de `app/icon.svg` (a pérola).
 *
 * - `app/favicon.ico`: 16, 32 e 48 px, fundo transparente.
 * - `app/apple-icon.png`: 180 px. O iOS ignora o alfa e pinta preto por baixo,
 *   então o fundo já sai em `--void`, com a pérola menor que o quadro.
 * - `public/icons/icon-{192,512}.png`: transparentes, para o manifesto
 *   (atalho e barra de tarefas do Windows).
 * - `public/icons/icon-maskable-512.png`: fundo `--void`, pérola dentro da
 *   área segura da máscara.
 *
 *   node scripts/derive-icons.mjs
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = readFileSync(join(ROOT, "app", "icon.svg"));
/** `--void`, de `styles/tokens.css`. */
const VOID = "#06090d";

/** @param {number} size */
function pearl(size) {
  return sharp(SOURCE, { density: (72 * size) / 64 })
    .resize(size, size)
    .png()
    .toBuffer();
}

/**
 * A pérola sobre um quadro cheio de `--void`.
 * @param {number} size
 * @param {number} scale fração do quadro que a pérola ocupa
 */
async function onVoid(size, scale) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: VOID },
  })
    .composite([{ input: await pearl(Math.round(size * scale)) }])
    .flatten({ background: VOID })
    .png()
    .toBuffer();
}

/**
 * Um `.ico` é um cabeçalho, um diretório e os PNGs em seguida.
 * @param {{ size: number; data: Buffer }[]} images
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

mkdirSync(join(ROOT, "public", "icons"), { recursive: true });

const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(pearl));
writeFileSync(
  join(ROOT, "app", "favicon.ico"),
  ico(sizes.map((size, index) => ({ size, data: frames[index] }))),
);
writeFileSync(join(ROOT, "app", "apple-icon.png"), await onVoid(180, 0.68));
writeFileSync(join(ROOT, "public", "icons", "icon-192.png"), await pearl(192));
writeFileSync(join(ROOT, "public", "icons", "icon-512.png"), await pearl(512));
writeFileSync(
  join(ROOT, "public", "icons", "icon-maskable-512.png"),
  await onVoid(512, 0.6),
);
