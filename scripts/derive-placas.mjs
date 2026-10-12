#!/usr/bin/env node
// @ts-check
import { mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * A imagem de cada placa da trilha: uma montagem 16:10 com a tela que mais
 * mostra o projeto, duas ou três telas reais sobrepostas no fundo `--deep`.
 * Sai em dois tamanhos, `public/assets/img/placas/<slug>.webp` (2560 × 1600,
 * a capa do case) e `<slug>.sm.webp` (1280 × 800, a textura da placa). O HUD
 * da placa (índice, cliente, nome) não entra aqui: ele é desenhado por cima,
 * no canvas e no SVG, porque muda com o idioma.
 *
 * As fontes moram no repositório e no acervo, fora dele (`~/Desktop/Atomsix`).
 * Rode `npm run placas:derive` quando uma receita mudar.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "public", "assets", "img");
const ACERVO = join(homedir(), "Desktop", "Atomsix", "cases");
const OUT = join(IMG, "placas");

const W = 2560;
const H = 1600;
/** `--deep`. */
const DEEP = "#1b2a30";
/** As telas brancas entram abaixo do branco, para não estourar o bloom. */
const BRIGHTNESS = 0.85;

/**
 * @typedef {{ left: number, top: number, width: number, height: number }} Crop
 * @typedef {{
 *   src: string,
 *   crop?: Crop,
 *   x: number,
 *   y: number,
 *   width: number,
 *   radius?: number,
 *   dim?: number,
 *   shadow?: boolean,
 * }} Layer
 */

/** @type {Record<string, Layer[]>} Camadas de trás para a frente, em px de 2560 × 1600. */
const RECIPES = {
  "decision-suite": [
    // A home com o Assistente IA e os agentes por área, a mesma do GIF do case.
    { src: join(IMG, "decision-suite/final-01.png"), x: 110, y: 230, width: 1860 },
    {
      src: join(IMG, "decision-suite/mobile.png"),
      x: 2010,
      y: 330,
      width: 470,
      radius: 0,
      shadow: false,
    },
  ],
  prime8: [
    {
      src: join(IMG, "prime8/prototipo1.png"),
      crop: { left: 0, top: 300, width: 2400, height: 1500 },
      x: 120,
      y: 150,
      width: 1500,
      dim: 0.6,
    },
    {
      src: join(IMG, "prime8/tablet-1.jpg"),
      crop: { left: 960, top: 760, width: 2093, height: 1462 },
      x: 860,
      y: 330,
      width: 1580,
    },
  ],
  perfecting: [
    { src: join(IMG, "perfecting/briefing.webp"), x: 120, y: 150, width: 1400, dim: 0.6 },
    { src: join(IMG, "perfecting/ligacao.webp"), x: 520, y: 420, width: 1500 },
    { src: join(IMG, "perfecting/resultado.webp"), x: 1640, y: 250, width: 800 },
  ],
  netlex: [
    {
      src: join(ACERVO, "netlex/figma/05-documentos.png"),
      x: 760,
      y: 120,
      width: 1680,
      dim: 0.6,
    },
    { src: join(ACERVO, "netlex/figma/02-home-juridico.png"), x: 160, y: 300, width: 1880 },
  ],
  "wecann-atena": [
    {
      src: join(ACERVO, "wecann-atena/figma/05-paciente-360-prontuario.png"),
      crop: { left: 0, top: 180, width: 2880, height: 1900 },
      x: 1100,
      y: 130,
      width: 1340,
      dim: 0.6,
    },
    {
      // A home com a esfera da Athena, a capa do case. Sem o logo
      // "wecann.care": a placa diz "Agentes de IA".
      src: join(ACERVO, "wecann-atena/stills@2x/03-home.png"),
      crop: { left: 0, top: 200, width: 3840, height: 1960 },
      x: 140,
      y: 400,
      width: 1780,
    },
  ],
  portonave: [
    {
      src: join(ACERVO, "portonave-passe-de-servico/figma/11-portal-agendamentos.png"),
      x: 120,
      y: 170,
      width: 1500,
      dim: 0.6,
    },
    {
      src: join(ACERVO, "portonave-passe-de-servico/figma/09-deck-prototipo-totem.png"),
      crop: { left: 2120, top: 0, width: 1720, height: 2160 },
      x: 1300,
      y: 150,
      width: 1080,
    },
    {
      src: join(ACERVO, "portonave-passe-de-servico/figma/14-whatsapp-dia-da-visita.png"),
      crop: { left: 1536, top: 89, width: 1123, height: 2431 },
      x: 780,
      y: 440,
      width: 440,
      radius: 36,
    },
  ],
};

/** @param {number} width @param {number} height @param {number} radius */
function roundedMask(width, height, radius) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  );
}

/** @param {number} width @param {number} height @param {number} radius */
function shadowOf(width, height, radius) {
  const pad = 80;
  const svg = `<svg width="${width + pad * 2}" height="${height + pad * 2}">
    <defs><filter id="s"><feGaussianBlur stdDeviation="28"/></filter></defs>
    <rect x="${pad}" y="${pad + 18}" width="${width}" height="${height}" rx="${radius}"
      fill="#000" opacity="0.55" filter="url(#s)"/></svg>`;
  return { input: Buffer.from(svg), pad };
}

/** @param {Layer} layer */
async function render(layer) {
  let image = sharp(layer.src);
  if (layer.crop !== undefined) image = image.extract(layer.crop);
  image = image.resize({ width: layer.width }).modulate({
    brightness: BRIGHTNESS * (layer.dim ?? 1),
  });
  const buffer = await image.png().toBuffer();
  const { height = 0 } = await sharp(buffer).metadata();
  const radius = layer.radius ?? 12;
  const shaped =
    radius > 0
      ? await sharp(buffer)
          .composite([{ input: roundedMask(layer.width, height, radius), blend: "dest-in" }])
          .png()
          .toBuffer()
      : buffer;
  return { buffer: shaped, height, radius };
}

mkdirSync(OUT, { recursive: true });
for (const [slug, layers] of Object.entries(RECIPES)) {
  /** @type {import("sharp").OverlayOptions[]} */
  const overlays = [];
  for (const layer of layers) {
    const { buffer, height, radius } = await render(layer);
    if (layer.shadow !== false) {
      const shadow = shadowOf(layer.width, height, radius);
      overlays.push({
        input: shadow.input,
        left: layer.x - shadow.pad,
        top: layer.y - shadow.pad,
      });
    }
    overlays.push({ input: buffer, left: layer.x, top: layer.y });
  }

  const base = await sharp({
    create: { width: W, height: H, channels: 3, background: DEEP },
  })
    .composite(overlays)
    .png()
    .toBuffer();

  const large = join(OUT, `${slug}.webp`);
  const small = join(OUT, `${slug}.sm.webp`);
  await sharp(base).webp({ quality: 80, effort: 6 }).toFile(large);
  await sharp(base).resize({ width: W / 2 }).webp({ quality: 80, effort: 6 }).toFile(small);
  const kb = (/** @type {string} */ path) => Math.round(statSync(path).size / 1024);
  console.log(`  ${slug.padEnd(16)} ${String(kb(large)).padStart(4)} kB  ${String(kb(small)).padStart(4)} kB (sm)`);
}
