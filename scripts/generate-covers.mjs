#!/usr/bin/env node
// @ts-check
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Gerador das capas provisórias dos cases sem mídia real — PROJECT.md §6:
 * "Onde faltar, o agente gera imagem em vez de deixar retângulo cinza ou emoji.
 * As imagens geradas seguem a paleta e a metáfora, e são marcadas no frontmatter
 * com `generated: true` para serem trocadas depois."
 *
 * **A metáfora, não um gradiente:** organismo dentro de estrutura. Campo
 * volumétrico escuro (`--void` → `--abyss` → `--deep`, fBm, três paradas e
 * ruído — nunca rampa linear de duas paradas), uma corrente do bando no tom de
 * acento cruzando em diagonal, cotas gravadas de raspão, e grão por cima. É a
 * mesma lógica do `coverField` de `lib/scene/shaders/cards.ts`, resolvida em
 * resolução de capa.
 *
 * Determinístico: a mesma semente devolve a mesma imagem, então refazer é rodar
 * de novo, não achar o arquivo.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "generated");

const W = 1280;
const H = 800; // 16:10, a razão das capas (CARD_WIDTH / CARD_HEIGHT).

/** Paleta — os mesmos hexes de `styles/tokens.css`, a fonte única. */
const PALETTE = {
  void: [0x03, 0x0a, 0x12],
  abyss: [0x07, 0x16, 0x24],
  deep: [0x0c, 0x2b, 0x3e],
  teal: [0x16, 0xa5, 0xb8],
  cyan: [0x5c, 0xe1, 0xe6],
  rose: [0xf5, 0x8b, 0xa8],
  coral: [0xff, 0x7a, 0x4d],
  peach: [0xff, 0xc8, 0xa2],
  mist: [0xdc, 0xe9, 0xec],
};

/** Um case, um acento, uma semente. */
const COVERS = [
  { slug: "perfecting", accent: "cyan", seed: 17 },
  { slug: "unifique-energia", accent: "teal", seed: 41 },
  { slug: "wecann-atena", accent: "rose", seed: 63 },
];

/* --- ruído de valor 2D + fBm, sem dependência ---------------------------- */

function makeNoise(seed) {
  const perm = new Uint8Array(512);
  let s = (seed * 2654435761) >>> 0;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000) / 1000;
  };
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y) => {
    // A rede é girada 27° para o padrão não se alinhar aos eixos da capa —
    // a mesma precaução do `sceneNoise` (AGENTS.md, "Ruído de valor").
    const u = h & 1 ? x : y;
    const v = h & 2 ? y : x;
    return (h & 4 ? -u : u) + (h & 8 ? -v : v);
  };

  const noise2 = (x, y) => {
    const rx = x * 0.891 - y * 0.454;
    const ry = x * 0.454 + y * 0.891;
    const xi = Math.floor(rx) & 255;
    const yi = Math.floor(ry) & 255;
    const xf = rx - Math.floor(rx);
    const yf = ry - Math.floor(ry);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];
    return (
      lerp(
        lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
        lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
        v,
      ) *
        0.5 +
      0.5
    );
  };

  return (x, y, octaves = 4) => {
    let sum = 0;
    let amp = 0.55;
    let freq = 1;
    for (let o = 0; o < octaves; o += 1) {
      sum += amp * noise2(x * freq, y * freq);
      freq *= 2.05;
      amp *= 0.5;
    }
    return sum;
  };
}

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

async function render({ slug, accent, seed }) {
  const tone = PALETTE[accent];
  const fbm = makeNoise(seed);
  const grain = makeNoise(seed ^ 0x9e37);
  const buf = Buffer.alloc(W * H * 3);

  for (let py = 0; py < H; py += 1) {
    for (let px = 0; px < W; px += 1) {
      const u = px / W;
      const v = py / H;

      // Campo volumétrico: três paradas com ruído, nunca rampa de duas.
      const n =
        fbm(u * 3.1 + seed, v * 3.1, 4) * 0.62 + fbm(u * 8.0, v * 8.0, 3) * 0.38;
      // Um horizonte baixo, para o retângulo ler como imagem e não textura.
      const band = 0.18 + 0.7 * Math.pow(v, 1.35);
      let t = Math.min(1, Math.max(0, band * 0.55 + n * 0.6 - 0.12));

      let color = mix(PALETTE.void, PALETTE.abyss, Math.min(1, t * 2.2));
      color = mix(color, PALETTE.deep, Math.max(0, (t - 0.42) / 0.58));

      // A corrente do bando: uma faixa diagonal do tom de acento, com o ruído
      // a modulando — o organismo cruzando a estrutura.
      const flow = Math.abs(v - 0.34 - 0.22 * Math.sin(u * 2.4 + seed * 0.1));
      const currentBase =
        (1 - Math.min(1, flow / 0.26)) *
        (0.4 + 0.6 * fbm(u * 5.0 + 10, v * 5.0, 3));
      const current = Math.pow(Math.max(0, currentBase), 1.5);
      color = mix(color, tone, current * 0.5);
      // Um núcleo mais quente/claro onde a corrente comprime.
      color = mix(color, mix(tone, PALETTE.mist, 0.35), Math.pow(current, 3) * 0.4);

      // Cotas gravadas de raspão: duas réguas finas e marcas de intervalo em
      // dois períodos primos entre si, para nunca baterem em fase.
      const ruleA = Math.exp(-Math.pow((v - 0.9) / 0.0025, 2));
      const tickX = Math.exp(-Math.pow(((px % 47) - 2) / 1.4, 2)) * (v > 0.86 && v < 0.94 ? 1 : 0);
      const tickY = Math.exp(-Math.pow(((py % 83) - 2) / 1.4, 2)) * (u > 0.02 && u < 0.09 ? 1 : 0);
      const engraved = Math.min(1, ruleA * 0.5 + tickX * 0.35 + tickY * 0.3);
      color = mix(color, mix(PALETTE.mist, PALETTE.cyan, 0.4), engraved * 0.22);

      // Vinheta suave para a peça não ter borda chapada.
      const cx = u - 0.5;
      const cy = v - 0.5;
      const vig = 1 - Math.min(0.5, (cx * cx * 1.1 + cy * cy) * 0.9);
      color = color.map((c) => c * (0.82 + 0.18 * vig));

      // Grão de filme, na faixa do PROJECT.md §3.1.
      const g = (grain(px * 0.9, py * 0.9, 2) - 0.5) * 255 * 0.045;

      const at = (py * W + px) * 3;
      buf[at] = clamp(color[0] + g);
      buf[at + 1] = clamp(color[1] + g);
      buf[at + 2] = clamp(color[2] + g);
    }
  }

  const out = join(OUT_DIR, `${slug}.webp`);
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: 82, effort: 5 })
    .toFile(out);
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const cover of COVERS) {
  const out = await render(cover);
  console.log(`gerada  ${out.replace(ROOT + "/", "")}  (${cover.accent})`);
}
