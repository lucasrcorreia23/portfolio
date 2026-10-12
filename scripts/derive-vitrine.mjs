#!/usr/bin/env node
// @ts-check
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * As telas da parede da vitrine, a partir das gravações e das telas originais:
 * `public/assets/img/vitrine/<case>/<tela>.*`. Cada tela sai no formato dela
 * (16:9, 9:16, a página inteira), sem corte — o quadro da parede é que põe a
 * margem em volta.
 *
 * Para cada tela:
 * - `<tela>.mp4` (vídeo): até ~15 s, H.264, maior lado 1600, 30 fps, faixa limitada e
 *   marcação bt709 iguais em todos, para os vídeos terem o mesmo brilho.
 * - `<tela>.webp` (imagem): maior lado 1920. É a versão do foco, carregada só
 *   quando a câmera chega nela.
 * - `<tela>.sm.webp` (as duas): o quadro dentro de 1280 × 800, a célula do
 *   atlas da parede. É o que a parede carrega de saída.
 *
 * As fontes ficam fora do repositório (`~/Desktop/Atomsix/cases`, …); rode
 * isto ao trocar uma tela (`npm run vitrine:derive`) e copie o `aspect` que
 * ele imprime para `content/vitrine.ts`.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "assets", "img", "vitrine");
const CASES = join(homedir(), "Desktop", "Atomsix", "cases");
/** As telas atuais da Perfecting são as do case. */
const PERFECTING = join(ROOT, "public", "assets", "img", "perfecting");

const VIDEO_SIDE = 1600;
const IMAGE_SIDE = 1920;
const TILE = { width: 1280, height: 800 };
/** Os celulares lado a lado: a altura de cada um e o vão entre eles. */
const STACK = { height: 1400, gap: 56 };
/**
 * O fundo entre os celulares: a chapa do quadro (`--deep` clareado como no
 * shader da parede), para o vão se ler como margem.
 */
const PLATE = "0x1f3037";

/**
 * `out`: destino sem extensão. `video` ou `image`: a fonte. `stack`: telas em
 * pé, lado a lado, numa tela só (os vídeos curtos repetem até `to`).
 * `from`/`to`: o trecho do vídeo, em segundos. `poster`: o instante do quadro
 * parado, a partir de `from`.
 * @typedef {{ video?: string; image?: string }} Part
 * @type {(Part & { out: string; stack?: Part[]; from?: number; to?: number; poster?: number })[]}
 */
const SCREENS = [
  // TiL: o checklist de pré-operação, três celulares num quadro; a triagem do
  // checklist e o editor de contratos, no desktop.
  {
    out: "til-group/checklist-mobile",
    stack: [
      { video: `${CASES}/portonave/motion/01-scanner-qr-9x16.mp4` },
      { video: `${CASES}/portonave/motion/02-falha-foto-ia-9x16.mp4` },
      { image: `${CASES}/portonave/retrato/m05-checklist-secao-1.png` },
    ],
    to: 8.8,
    poster: 4,
  },
  { out: "til-group/triagem-ia", video: `${CASES}/portonave/motion/03-triagem-ia.mp4`, poster: 4 },
  { out: "til-group/editor-fluxo", video: `${CASES}/til-group/motion/03-editor-fluxo.mp4`, poster: 4 },
  // netLex: a gestão de contrato e o dashboard.
  { out: "netlex/contrato-detalhe", image: `${CASES}/netlex/figma/06-contrato-detalhe-v1-2.png` },
  { out: "netlex/dashboard-juridico", image: `${CASES}/netlex/figma/02-home-juridico.png` },
  { out: "netlex/home-rh", video: `${CASES}/netlex/motion/02-home-rh-scroll.mp4`, poster: 0.5 },
  // Perfecting: o analytics do gestor, o antes e o durante da ligação, o resultado.
  { out: "perfecting/analytics", video: `${PERFECTING}/analytics.mp4`, poster: 1 },
  { out: "perfecting/antes-e-durante", image: `${PERFECTING}/antes-e-durante.webp` },
  { out: "perfecting/resultado", image: `${PERFECTING}/resultado.webp` },
  // iFood
  { out: "ifood/webapp-e-rede", video: `${CASES}/ifood/motion/02-webapp-e-rede.mp4`, to: 15, poster: 1 },
  { out: "ifood/totens-portal-mobile", video: `${CASES}/ifood/motion/03-totens-portal-mobile.mp4`, to: 15, poster: 2 },
  { out: "ifood/webapp-pratos", image: `${CASES}/ifood/figma/09-webapp-pratos.png` },
  // Itaú: o conceito da home do Cubo e a auditoria de UX.
  { out: "itau/conceito-home-scroll", video: `${CASES}/cubo-workspace/motion/03-conceito-home-scroll.mp4`, poster: 0.5 },
  { out: "itau/auditoria-ux", video: `${CASES}/cubo-workspace/motion/01-deck-auditoria-ux.mp4`, from: 10, to: 22, poster: 4 },
  { out: "itau/conceito-home", image: `${CASES}/cubo-workspace/figma/11-conceito-home.png` },
  // Atlas Gov: só as telas.
  { out: "atlas-gov/glass-desktop", video: `${CASES}/atlas-gov/motion/02-glass-desktop.mp4`, to: 15, poster: 1 },
  { out: "atlas-gov/glass-mobile", video: `${CASES}/atlas-gov/motion/03-glass-mobile.mp4`, poster: 2 },
  { out: "atlas-gov/home-dashboard", image: `${CASES}/atlas-gov/figma/01-home-dashboard.png` },
  // Agentes de IA (WeCann Care)
  { out: "wecann-care/conversa", video: `${CASES}/wecann-atena/motion/02-conversa-agente.mp4`, from: 3, to: 18, poster: 9 },
  { out: "wecann-care/discutir-caso", video: `${CASES}/wecann-atena/motion/04-discutir-caso.mp4`, to: 15, poster: 10 },
  { out: "wecann-care/intro", video: `${CASES}/wecann-atena/motion/01-intro.mp4`, poster: 4 },
  // Natal Mágico, o totem em pé. Fora as fotos de resultado: são pessoas reais.
  { out: "natal-magico/home-neve", video: `${CASES}/natal-magico/motion/01-home-neve-9x16.mp4`, poster: 2 },
  { out: "natal-magico/formulario", video: `${CASES}/natal-magico/motion/02-formulario-teclado-9x16.mp4`, poster: 3 },
  { out: "natal-magico/contagem-flash", video: `${CASES}/natal-magico/motion/03-contagem-flash-9x16.mp4`, poster: 2 },
  // Solan Group: exportadas em 2× e 3× do arquivo do Figma (maZhN17n2AZxNL3mfrSiWt).
  { out: "solan-group/relatorios-problemas", image: `${CASES}/solan-group/figma/01-relatorios-problemas.png` },
  { out: "solan-group/relatorios-personalizado", image: `${CASES}/solan-group/figma/02-relatorios-personalizado.png` },
  { out: "solan-group/mobile-home", image: `${CASES}/solan-group/figma/03-mobile-home.png` },
];

/** O quadro parado de um vídeo, em PNG na memória. */
function frameAt(file, at) {
  return execFileSync(
    "ffmpeg",
    ["-v", "error", "-ss", String(at), "-i", file, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
}

/** A mesma faixa e a mesma marcação de cor em todos os vídeos. */
const TAGS = "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p";

/** O H.264 de todas as telas em vídeo: mudo, 30 fps, pronto para tocar enquanto baixa. */
function encode(input, filter, output) {
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    ...input,
    "-an",
    ...filter,
    "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-tune", "animation",
    "-g", "90",
    "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-movflags", "+faststart",
    output,
  ]);
}

const kB = (bytes) => `${String(Math.round(bytes / 1024)).padStart(5)} kB`;

/** Só as telas cujo destino contém o filtro: `npm run vitrine:derive -- netlex`. */
const only = process.argv[2];
// A pasta inteira é regerada: o que sair da lista sai do disco.
if (only === undefined) rmSync(OUT, { recursive: true, force: true });
let total = 0;
for (const screen of SCREENS) {
  if (only !== undefined && !screen.out.includes(only)) continue;
  const base = join(OUT, screen.out);
  mkdirSync(dirname(base), { recursive: true });
  let still;
  let size = 0;
  if (screen.stack !== undefined) {
    const inputs = screen.stack.flatMap((part) =>
      part.video !== undefined
        ? ["-stream_loop", "-1", "-i", part.video]
        : ["-loop", "1", "-framerate", "30", "-i", part.image ?? ""],
    );
    const pads = screen.stack
      .map(
        (_, i) =>
          `[${i}:v]fps=30,scale=-2:${STACK.height}:flags=lanczos,pad=iw+${STACK.gap}:ih:${STACK.gap / 2}:0:color=${PLATE},setsar=1[p${i}]`,
      )
      .join(";");
    const row = screen.stack.map((_, i) => `[p${i}]`).join("");
    encode(
      [...inputs, "-t", String(screen.to ?? 10)],
      ["-filter_complex", `${pads};${row}hstack=inputs=${screen.stack.length},${TAGS}[out]`, "-map", "[out]"],
      `${base}.mp4`,
    );
    size = statSync(`${base}.mp4`).size;
    still = frameAt(`${base}.mp4`, screen.poster ?? 0);
  } else if (screen.video !== undefined) {
    const from = screen.from ?? 0;
    encode(
      ["-ss", String(from), ...(screen.to !== undefined ? ["-to", String(screen.to)] : []), "-i", screen.video],
      [
        "-vf",
        // Reduz até 1600 no maior lado; nunca amplia.
        `fps=30,scale=w=min(${VIDEO_SIDE}\\,iw):h=min(${VIDEO_SIDE}\\,ih):force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,${TAGS}`,
      ],
      `${base}.mp4`,
    );
    size = statSync(`${base}.mp4`).size;
    still = frameAt(`${base}.mp4`, screen.poster ?? 0);
  } else if (screen.image !== undefined) {
    const info = await sharp(screen.image)
      .resize({ width: IMAGE_SIDE, height: IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(`${base}.webp`);
    size = info.size;
    still = screen.image;
  }
  const tile = await sharp(still)
    .resize({ ...TILE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(`${base}.sm.webp`);
  const meta = await sharp(still).metadata();
  const aspect = (meta.width ?? 1) / (meta.height ?? 1);
  total += size + tile.size;
  console.log(
    `  ${screen.out.padEnd(32)} ${kB(size)} + ${kB(tile.size)}  aspect ${aspect.toFixed(3)}`,
  );
}
console.log(`  total ${kB(total)}`);
