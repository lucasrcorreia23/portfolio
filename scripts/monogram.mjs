#!/usr/bin/env node
// @ts-check
import { readFileSync, writeFileSync } from "node:fs";

/**
 * A assinatura LRC — o monograma do corpo de prova (rodada 17).
 *
 * Extrai os contornos de L, R e C do mesmo `ArchivoExpanded-ExtraBold.ttf` que
 * o corpo de prova sempre usou (nenhuma terceira família entra no projeto) e
 * os compõe em duas variantes, escritas em `lib/scene/monogram-data.ts`:
 *
 * - `plinth`: o L emoldura os outros dois. A haste sobe a altura inteira e o pé
 *   vira um plinto que corre por baixo do R e do C, que se apoiam nele na
 *   espessura cheia do ExtraBold. É a assinatura: uma peça, não três letras.
 * - `tight`: L R C lado a lado, com tracking negativo. A leitura mais direta.
 *
 * O parser é o Typr que o troika já traz — nenhuma dependência nova. Rode com
 * `node scripts/monogram.mjs` depois de trocar a fonte ou a composição.
 */

// O Typr do troika é um módulo de worker e espera `self`.
globalThis.self = globalThis;
const { default: typrFactory } = await import(
  "../node_modules/troika-three-text/libs/typr.factory.js"
);
const Typr = typrFactory();
const font = Typr.parse(
  readFileSync(new URL("../public/fonts/ArchivoExpanded-ExtraBold.ttf", import.meta.url)).buffer,
)[0];

const CAP = font["OS/2"].sCapHeight;

/** Os comandos de um glifo, transformados: `[x, y] → [x·s + dx, y·s + dy]`. */
function glyph(ch, dx, dy, s = 1) {
  const gid = Typr.U.codeToGlyph(font, ch.charCodeAt(0));
  const { cmds, crds } = Typr.U.glyphToPath(font, gid);
  const out = [];
  let k = 0;
  for (const cmd of cmds) {
    const n = { M: 2, L: 2, Q: 4, C: 6, Z: 0 }[cmd];
    const args = [];
    for (let j = 0; j < n; j += 2) {
      args.push(Math.round((crds[k + j] * s + dx) * 10) / 10);
      args.push(Math.round((crds[k + j + 1] * s + dy) * 10) / 10);
    }
    k += n;
    out.push([cmd, ...args]);
  }
  return out;
}

function bounds(paths) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths) {
    for (const [, ...args] of path) {
      for (let j = 0; j < args.length; j += 2) {
        minX = Math.min(minX, args[j]);
        maxX = Math.max(maxX, args[j]);
        minY = Math.min(minY, args[j + 1]);
        maxY = Math.max(maxY, args[j + 1]);
      }
    }
  }
  return [minX, minY, maxX, maxY];
}

// --- plinth ------------------------------------------------------------------
// O L do ExtraBold: haste de x 85 a 288, pé de y 0 a 164. O R e o C sentam no
// pé com uma folga, e a haste sobe até o topo deles.
const FOOT = 164;
const GAP = 110;
const SEAT = FOOT + GAP;
const rX = 288 + GAP - 85;
const r = glyph("R", rX, SEAT);
const cX = rX + 896 + 22 - 55;
const c = glyph("C", cX, SEAT);
const right = cX + 888;
const top = SEAT + CAP;
const l = [
  ["M", right, 0],
  ["L", 85, 0],
  ["L", 85, top],
  ["L", 288, top],
  ["L", 288, FOOT],
  ["L", right, FOOT],
  ["Z"],
];
const plinth = [l, r, c];

// --- tight -------------------------------------------------------------------
const TRACK = -60;
const tight = [
  glyph("L", 0, 0),
  glyph("R", 754 + TRACK, 0),
  glyph("C", 754 + 933 + 2 * TRACK, 0),
];

const variants = { plinth, tight };
const lines = [
  "// Gerado por `node scripts/monogram.mjs` — não edite à mão.",
  "// Contornos de L, R e C do ArchivoExpanded-ExtraBold, em unidades de em",
  "// (1000), y para cima. Ver o docblock do script para as duas composições.",
  "",
  "export type MonogramCommand = readonly [string, ...number[]];",
  "export type MonogramVariant = {",
  "  /** `[minX, minY, maxX, maxY]` do traço. */",
  "  bounds: readonly [number, number, number, number];",
  "  /** Um caminho por letra; cada caminho pode ter vários contornos. */",
  "  paths: readonly (readonly MonogramCommand[])[];",
  "};",
  "",
  `export const MONOGRAM_CAP = ${CAP};`,
  "",
  "export const MONOGRAM: Readonly<Record<\"plinth\" | \"tight\", MonogramVariant>> = {",
];
for (const [name, paths] of Object.entries(variants)) {
  lines.push(`  ${name}: {`);
  lines.push(`    bounds: ${JSON.stringify(bounds(paths))},`);
  lines.push(`    paths: ${JSON.stringify(paths)},`);
  lines.push("  },");
}
lines.push("};");
lines.push("");
writeFileSync(new URL("../lib/scene/monogram-data.ts", import.meta.url), lines.join("\n"));
console.log(
  Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, bounds(v)])),
);
