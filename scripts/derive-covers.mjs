#!/usr/bin/env node
// @ts-check
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * A versão de **entrega** de cada capa: `public/covers/<slug>.webp`.
 *
 * O frontmatter diz **qual** é a capa (`cover`) — isso é curadoria, e continua
 * autorado. O que viaja pela rede é esta versão: medido em 4G simulado, a capa
 * do Prime8 (PNG de 3840 px, 698 kB) punha o LCP do case em **10.8 s** e a da
 * Nestlé em 3.6 s, contra o teto de 2.5 s do PROJECT.md §5. A capa não pode
 * passar por `next/image` porque ela é a superfície de entrega da travessia (a
 * cena desenha os mesmos bytes no card; ver `work/[slug]/page.tsx`), então a
 * compressão acontece aqui, uma vez, e o case, a cena e o Open Graph leem o
 * mesmo arquivo.
 *
 * `lib/cases.ts` derruba a build se a versão de um case faltar: rode isto
 * sempre que trocar a capa de alguém (`npm run covers:derive`).
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CASES = join(ROOT, "content", "cases");
const OUT = join(ROOT, "public", "covers");
/** Duas vezes a largura em que a capa aparece no case a 1440 px. */
const MAX_WIDTH = 1600;

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(CASES).filter((name) => name.endsWith(".mdx"))) {
  const slug = file.slice(0, -".mdx".length);
  const source = readFileSync(join(CASES, file), "utf8");
  const match = source.match(/cover:\s*"([^"]+)"/);
  if (match === null) throw new Error(`${slug}: frontmatter sem cover`);
  const input = join(ROOT, "public", match[1] ?? "");
  const output = join(OUT, `${slug}.webp`);
  const info = await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 74, effort: 6 })
    .toFile(output);
  const before = statSync(input).size;
  console.log(
    `  ${slug.padEnd(18)} ${String(Math.round(before / 1024)).padStart(4)} kB → ${String(Math.round(info.size / 1024)).padStart(3)} kB  ${info.width}×${info.height}`,
  );
}
