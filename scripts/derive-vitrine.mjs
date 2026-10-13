#!/usr/bin/env node
// @ts-check
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { edgeOf, roundedMask, shadowOf } from "./shadow.mjs";

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
/** O quadro das montagens, 16:10. */
const MONTAGE = { width: 1920, height: 1200 };

/**
 * `out`: destino sem extensão. `video` ou `image`: a fonte; uma lista de vídeos
 * vira um só, um depois do outro, e `speed` acelera. `cover`: uma foto por cima
 * de `image`, no retângulo dela, que some aos poucos e revela a tela (`hold`
 * segundos parada, `fade` sumindo, o vídeo dura `length`). `stack`: telas em pé,
 * lado a lado, numa tela só (os vídeos curtos repetem até `to`).
 * `from`/`to`: o trecho do vídeo, em segundos. `poster`: o instante do quadro
 * parado, a partir de `from`. `crop`: o recorte de uma imagem, em px da fonte.
 * `montage`: telas paradas sobrepostas num quadro 16:10 (`MONTAGE`), de trás
 * para a frente, em px dele; `dim` escurece a de trás. `reel`: o mesmo com
 * vídeos (os curtos repetem até `length`).
 * @typedef {{ src: string; x: number; y: number; width: number; height: number; hold: number; fade: number; length: number }} Cover
 * @typedef {{ video?: string | string[]; speed?: number; image?: string; cover?: Cover; crop?: Crop }} Part
 * @typedef {{ left: number; top: number; width: number; height: number }} Crop
 * @typedef {{ src: string; crop?: Crop; x: number; y: number; width: number; dim?: number }} Layer
 * @typedef {{ video: string; from?: number; x: number; y: number; width: number }} ReelLayer
 * @type {(Part & { out: string; stack?: Part[]; montage?: Layer[]; reel?: { layers: ReelLayer[]; length: number }; from?: number; to?: number; poster?: number; crop?: Crop })[]}
 */
const SCREENS = [
  // TiL: o checklist de pré-operação em três quadros de três celulares. Em
  // cima, a busca de item, o uso negado por habilitação e as liberações do
  // supervisor (capturadas do protótipo em 390 × 844, @3x).
  {
    out: "til-group/busca-e-liberacoes",
    stack: [
      { image: `${CASES}/portonave/retrato/m10-buscar-item.png` },
      { image: `${CASES}/portonave/retrato/m11-rs02-sem-habilitacao.png` },
      { image: `${CASES}/portonave/retrato/m12-supervisor-liberacoes.png` },
    ],
  },
  // No meio, a home do operador, a jornada inteira acelerada (QR,
  // equipamento, falha com foto e IA) e o equipamento liberado; embaixo, os
  // estados que os outros quadros não mostram.
  {
    out: "til-group/checklist-mobile",
    stack: [
      { image: `${CASES}/portonave/retrato/m03-operador-home.png` },
      {
        video: [
          `${CASES}/portonave/motion/01-scanner-qr-9x16.mp4`,
          `${CASES}/portonave/motion/02-falha-foto-ia-9x16.mp4`,
        ],
        speed: 1.6,
      },
      { image: `${CASES}/portonave/retrato/m07-resultado-liberado.png` },
    ],
    to: 8.5,
    poster: 5,
  },
  {
    out: "til-group/estados-mobile",
    stack: [
      { image: `${CASES}/portonave/retrato/m02-bem-vindo.png` },
      { image: `${CASES}/portonave/retrato/m08-emp03-uso-negado.png` },
      { image: `${CASES}/portonave/retrato/m09-rs01-aguardando.png` },
    ],
  },
  // netLex: a gestão de contrato e o dashboard.
  { out: "netlex/contrato-detalhe", image: `${CASES}/netlex/figma/06-contrato-detalhe-v1-2.png` },
  { out: "netlex/dashboard-juridico", image: `${CASES}/netlex/figma/02-home-juridico.png` },
  { out: "netlex/home-rh", video: `${CASES}/netlex/motion/02-home-rh-scroll.mp4`, poster: 0.5 },
  // Perfecting: o analytics do gestor, o antes e o durante da ligação, o resultado.
  // O analytics e o resultado de uma sessão, regravados na homologação em 1920
  // (sem o painel admin), para o cabeçalho caber numa linha.
  { out: "perfecting/analytics", video: `${CASES}/perfecting/motion/01-analytics-1920.mp4`, poster: 1.5 },
  { out: "perfecting/antes-e-durante", image: `${PERFECTING}/antes-e-durante.webp` },
  { out: "perfecting/resultado", image: `${CASES}/perfecting/figma/02-resultado-1920.png` },
  // iFood
  { out: "ifood/webapp-e-rede", video: `${CASES}/ifood/motion/02-webapp-e-rede.mp4`, to: 15, poster: 1 },
  { out: "ifood/totens-portal-mobile", video: `${CASES}/ifood/motion/03-totens-portal-mobile.mp4`, to: 15, poster: 2 },
  { out: "ifood/webapp-pratos", image: `${CASES}/ifood/figma/09-webapp-pratos.png` },
  // Itaú: o conceito da home do Cubo (rolando e, parado, só a parte de cima)
  // e a auditoria de UX.
  { out: "itau/conceito-home-scroll", video: `${CASES}/cubo-workspace/motion/03-conceito-home-scroll.mp4`, poster: 0.5 },
  { out: "itau/auditoria-ux", video: `${CASES}/cubo-workspace/motion/01-deck-auditoria-ux.mp4`, from: 10, to: 22, poster: 4 },
  {
    out: "itau/conceito-home",
    image: `${CASES}/cubo-workspace/figma/11-conceito-home.png`,
    crop: { left: 0, top: 0, width: 2880, height: 2016 },
  },
  // Atlas Gov: só as telas.
  { out: "atlas-gov/glass-desktop", video: `${CASES}/atlas-gov/motion/02-glass-desktop.mp4`, to: 15, poster: 1 },
  {
    // O app mobile em quatro celulares, sem os rótulos dos boards do Figma:
    // a home, a reunião, o resumo do Atlas AI e o tempo de fala.
    out: "atlas-gov/mobile",
    stack: [
      { image: `${CASES}/atlas-gov/figma/glass-09-mobile-home.png` },
      { image: `${CASES}/atlas-gov/figma/glass-10-mobile-meeting.png` },
      { image: `${CASES}/atlas-gov/figma/glass-11-mobile-ai-summary.png` },
      { image: `${CASES}/atlas-gov/figma/glass-12-mobile-speaking-time.png` },
    ],
  },
  { out: "atlas-gov/home-dashboard", image: `${CASES}/atlas-gov/figma/01-home-dashboard.png` },
  // Agentes de IA (WeCann Care): a conversa com a Athena e, em montagens de
  // duas, as telas de dentro que a placa e o vídeo não mostram.
  {
    // A intro por cima, grande; da conversa atrás aparece só a ponta.
    out: "wecann-care/conversa-e-intro",
    reel: {
      layers: [
        { video: `${CASES}/wecann-atena/motion/02-conversa-agente.mp4`, from: 3, x: 40, y: 40, width: 1200 },
        { video: `${CASES}/wecann-atena/motion/01-intro.mp4`, x: 300, y: 250, width: 1580 },
      ],
      length: 17.6,
    },
    poster: 9,
  },
  {
    out: "wecann-care/agenda-e-pacientes",
    montage: [
      { src: `${CASES}/wecann-atena/figma/03-agenda-semana.png`, crop: { left: 0, top: 0, width: 2880, height: 1800 }, x: 50, y: 60, width: 1200, dim: 0.8 },
      { src: `${CASES}/wecann-atena/figma/04-paciente-360-lista.png`, crop: { left: 0, top: 0, width: 2880, height: 1800 }, x: 640, y: 370, width: 1240 },
    ],
  },
  {
    out: "wecann-care/acompanhamento-e-casuistica",
    montage: [
      { src: `${CASES}/wecann-atena/figma/10-acompanhamento.png`, crop: { left: 0, top: 0, width: 2880, height: 1800 }, x: 50, y: 60, width: 1200, dim: 0.8 },
      { src: `${CASES}/wecann-atena/figma/11-casuistica.png`, crop: { left: 0, top: 0, width: 2880, height: 1800 }, x: 640, y: 370, width: 1240 },
    ],
  },
  // Natal Mágico, o totem em pé, dois por quadro. Fora as fotos de resultado:
  // são pessoas reais.
  {
    out: "natal-magico/home-e-formulario",
    stack: [
      { video: `${CASES}/natal-magico/motion/01-home-neve-9x16.mp4` },
      { video: `${CASES}/natal-magico/motion/02-formulario-teclado-9x16.mp4` },
    ],
    to: 10,
    poster: 2,
  },
  {
    out: "natal-magico/contagem-e-processando",
    stack: [
      // A contagem com uma pessoa de verdade diante do totem, se ajeitando
      // para a foto: um vídeo do Pexels (pexels.com/video/8628513, licença
      // Pexels) na moldura, com o texto e os números refeitos por cima nas
      // fontes do totem.
      { video: `${CASES}/natal-magico/motion/03-contagem-pessoa-9x16.mp4` },
      { video: `${CASES}/natal-magico/motion/04-processando-9x16.mp4` },
    ],
    to: 7.6,
    poster: 2,
  },
  {
    // A foto real vira desenho: um quadro do mesmo vídeo da contagem por cima
    // da foto mágica, que some.
    out: "natal-magico/foto-e-avaliacao",
    stack: [
      {
        image: `${CASES}/natal-magico/retrato/06-resultado.png`,
        cover: {
          src: `${CASES}/natal-magico/placeholder/pexels-8628513-joinha.jpg`,
          x: 242, y: 394, width: 602, height: 938,
          hold: 2, fade: 1.5, length: 6,
        },
      },
      { video: `${CASES}/natal-magico/motion/05-resultado-avaliacao-9x16.mp4` },
    ],
    to: 11.6,
    poster: 1,
  },
  // Solan Group: exportadas em 2× e 3× do arquivo do Figma (maZhN17n2AZxNL3mfrSiWt).
  { out: "solan-group/relatorios-problemas", image: `${CASES}/solan-group/figma/01-relatorios-problemas.png` },
  { out: "solan-group/relatorios-personalizado", image: `${CASES}/solan-group/figma/02-relatorios-personalizado.png` },
  {
    // O app do cliente em quatro celulares, um por módulo da barra de baixo:
    // visão geral, tickets, financeiro e perfil (os três últimos do arquivo
    // D3jdlLxDMXIIONUoSLnS3O).
    out: "solan-group/mobile",
    stack: [
      { image: `${CASES}/solan-group/figma/03-mobile-home.png` },
      { image: `${CASES}/solan-group/figma/10-mobile-tickets.png` },
      { image: `${CASES}/solan-group/figma/11-mobile-financeiro.png` },
      { image: `${CASES}/solan-group/figma/12-mobile-perfil.png` },
    ],
  },
];

const SCRATCH = mkdtempSync(join(tmpdir(), "vitrine-"));

/**
 * O vídeo de uma parte: a fonte, ou, com lista ou `speed`, um arquivo
 * provisório com os vídeos em sequência e acelerados.
 * @param {Part} part
 */
function partVideo(part) {
  if (part.cover !== undefined) return coverVideo(part.image ?? "", part.cover);
  const list = Array.isArray(part.video) ? part.video : [part.video ?? ""];
  if (list.length === 1 && part.speed === undefined) return list[0];
  const out = join(SCRATCH, `part-${Math.random().toString(36).slice(2)}.mp4`);
  const chain = list.map((_, i) => `[${i}:v]fps=30,setsar=1[v${i}]`).join(";");
  const joined = list.map((_, i) => `[v${i}]`).join("");
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    ...list.flatMap((file) => ["-i", file]),
    "-filter_complex",
    `${chain};${joined}concat=n=${list.length}:v=1:a=0,setpts=PTS/${part.speed ?? 1}[out]`,
    "-map", "[out]", "-an", "-c:v", "libx264", "-crf", "16", out,
  ]);
  return out;
}

/**
 * A tela parada com a foto por cima, que some e revela o que está embaixo.
 * @param {string} image
 * @param {Cover} cover
 */
function coverVideo(image, cover) {
  const out = join(SCRATCH, `cover-${Math.random().toString(36).slice(2)}.mp4`);
  const { x, y, width, height, hold, fade, length } = cover;
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-loop", "1", "-framerate", "30", "-t", String(length), "-i", image,
    "-loop", "1", "-framerate", "30", "-t", String(length), "-i", cover.src,
    "-filter_complex",
    `[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=rgba,` +
      `fade=t=out:st=${hold}:d=${fade}:alpha=1[photo];[0:v][photo]overlay=${x}:${y},format=yuv420p[out]`,
    "-map", "[out]", "-c:v", "libx264", "-crf", "16", out,
  ]);
  return out;
}

/**
 * Uma montagem, em PNG na memória: as camadas com canto e sombra no quadro.
 * @param {Layer[]} layers
 */
async function montage(layers) {
  /** @type {import("sharp").OverlayOptions[]} */
  const overlays = [];
  const radius = 10;
  for (const layer of layers) {
    let image = sharp(layer.src);
    if (layer.crop !== undefined) image = image.extract(layer.crop);
    const buffer = await image
      .resize({ width: layer.width })
      .modulate({ brightness: layer.dim ?? 1 })
      .png()
      .toBuffer();
    const { height = 0 } = await sharp(buffer).metadata();
    const shaped = await sharp(buffer)
      .composite([{ input: roundedMask(layer.width, height, radius), blend: "dest-in" }])
      .png()
      .toBuffer();
    const shadow = shadowOf(layer.width, height, radius);
    overlays.push({ input: shadow.input, left: layer.x - shadow.pad, top: layer.y - shadow.pad });
    overlays.push({ input: shaped, left: layer.x, top: layer.y });
    overlays.push({ input: edgeOf(layer.width, height, radius), left: layer.x, top: layer.y });
  }
  return sharp({
    create: { ...MONTAGE, channels: 3, background: `#${PLATE.slice(2)}` },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

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
  if (screen.reel !== undefined) {
    const { layers, length } = screen.reel;
    const radius = 10;
    const extras = [];
    const chain = [`color=c=${PLATE}:s=${MONTAGE.width}x${MONTAGE.height}:r=30:d=${length}[base]`];
    let last = "base";
    for (const [i, layer] of layers.entries()) {
      const height = Math.round((layer.width * 9) / 16);
      const shadow = shadowOf(layer.width, height, radius);
      const shadowFile = join(SCRATCH, `shadow-${i}.png`);
      const maskFile = join(SCRATCH, `mask-${i}.png`);
      const edgeFile = join(SCRATCH, `edge-${i}.png`);
      await sharp(shadow.input).png().toFile(shadowFile);
      await sharp(roundedMask(layer.width, height, radius)).png().toFile(maskFile);
      await sharp(edgeOf(layer.width, height, radius)).png().toFile(edgeFile);
      extras.push(
        "-stream_loop", "-1", "-ss", String(layer.from ?? 0), "-i", layer.video,
        "-loop", "1", "-i", shadowFile,
        "-loop", "1", "-i", maskFile,
        "-loop", "1", "-i", edgeFile,
      );
      const v = i * 4, sh = v + 1, m = v + 2, e = v + 3;
      chain.push(
        `[${v}:v]fps=30,scale=${layer.width}:${height}:flags=lanczos,format=rgba[v${i}]`,
        `[${m}:v]format=gray[m${i}]`,
        `[v${i}][m${i}]alphamerge[r${i}]`,
        `[${last}][${sh}:v]overlay=${layer.x - shadow.pad}:${layer.y - shadow.pad}[s${i}]`,
        `[s${i}][r${i}]overlay=${layer.x}:${layer.y}[t${i}]`,
        `[t${i}][${e}:v]overlay=${layer.x}:${layer.y}[o${i}]`,
      );
      last = `o${i}`;
    }
    encode(
      [...extras, "-t", String(length)],
      ["-filter_complex", `${chain.join(";")};[${last}]scale=${VIDEO_SIDE}:-2:flags=lanczos,${TAGS}[out]`, "-map", "[out]"],
      `${base}.mp4`,
    );
    size = statSync(`${base}.mp4`).size;
    still = frameAt(`${base}.mp4`, screen.poster ?? 0);
  } else if (screen.stack !== undefined) {
    const inputs = screen.stack.flatMap((part) =>
      part.video !== undefined || part.cover !== undefined
        ? ["-stream_loop", "-1", "-i", partVideo(part)]
        : ["-loop", "1", "-framerate", "30", "-i", part.image ?? ""],
    );
    const pads = screen.stack
      .map(
        (part, i) =>
          `[${i}:v]${part.crop === undefined ? "" : `crop=${part.crop.width}:${part.crop.height}:${part.crop.left}:${part.crop.top},`}fps=30,scale=-2:${STACK.height}:flags=lanczos,pad=iw+${STACK.gap}:ih:${STACK.gap / 2}:0:color=${PLATE},setsar=1[p${i}]`,
      )
      .join(";");
    const row = screen.stack.map((_, i) => `[p${i}]`).join("");
    if (screen.stack.every((part) => part.image !== undefined && part.cover === undefined)) {
      // Só telas paradas: sai uma imagem, não um vídeo.
      still = execFileSync(
        "ffmpeg",
        ["-v", "error", ...inputs, "-filter_complex", `${pads};${row}hstack=inputs=${screen.stack.length}[out]`,
          "-map", "[out]", "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"],
        { maxBuffer: 256 * 1024 * 1024 },
      );
      const info = await sharp(still)
        .resize({ width: IMAGE_SIDE, height: IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toFile(`${base}.webp`);
      size = info.size;
    } else {
      encode(
        [...inputs, "-t", String(screen.to ?? 10)],
        ["-filter_complex", `${pads};${row}hstack=inputs=${screen.stack.length},${TAGS}[out]`, "-map", "[out]"],
        `${base}.mp4`,
      );
      size = statSync(`${base}.mp4`).size;
      still = frameAt(`${base}.mp4`, screen.poster ?? 0);
    }
  } else if (screen.video !== undefined) {
    const from = screen.from ?? 0;
    encode(
      ["-ss", String(from), ...(screen.to !== undefined ? ["-to", String(screen.to)] : []), "-i", partVideo(screen)],
      [
        "-vf",
        // Reduz até 1600 no maior lado; nunca amplia.
        `fps=30,scale=w=min(${VIDEO_SIDE}\\,iw):h=min(${VIDEO_SIDE}\\,ih):force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,${TAGS}`,
      ],
      `${base}.mp4`,
    );
    size = statSync(`${base}.mp4`).size;
    still = frameAt(`${base}.mp4`, screen.poster ?? 0);
  } else if (screen.image !== undefined || screen.montage !== undefined) {
    let image = sharp(
      screen.montage !== undefined ? await montage(screen.montage) : screen.image,
    );
    if (screen.crop !== undefined) {
      image = sharp(await image.extract(screen.crop).png().toBuffer());
    }
    still = await image.clone().png().toBuffer();
    const info = await image
      .resize({ width: IMAGE_SIDE, height: IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(`${base}.webp`);
    size = info.size;
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
rmSync(SCRATCH, { recursive: true, force: true });
console.log(`  total ${kB(total)}`);
