import { clamp01, damp, easeStrong } from "@/lib/motion";
import type { Palette } from "@/lib/palette";

/**
 * O organismo em estado dormente — o que já está vivo na tela enquanto o
 * portão carrega.
 *
 * **Por que não é a cena.** O preloader existe justamente para a cena ainda
 * não estar aqui: three, R3F e os shaders são o chunk de 350 kB que só começa
 * a baixar depois do primeiro quadro útil (PROJECT.md §5). Então este é um
 * canvas 2D de algumas centenas de bytes, sem dependência nenhuma, com o
 * mínimo que faz o organismo ser organismo:
 *
 * - corpos lenticulares, não pássaros (DIRECTION.md §2);
 * - deriva por campo de corrente amortecido a cada quadro, e respiração —
 *   nunca keyframe (PROJECT.md §2 e §3.3);
 * - névoa com três paradas e grão animado por quadro, nunca gradiente linear
 *   de duas paradas nem PNG de ruído (PROJECT.md §3.1);
 * - abertura escancarada, porque no portão ainda não existe escala
 *   (DIRECTION.md §3) — e o desfoque é o desenho do corpo, nunca um
 *   `filter: blur()` no DOM.
 *
 * Dormente quer dizer *antes do bando*: DIRECTION.md §4 descreve a Emergência
 * como "uns poucos corpos isolados, suspensos, quase sem deriva", e o portão
 * é um degrau antes disso. Não há coesão, não há alinhamento, não há boids.
 * O que existe é matéria à deriva numa corrente lenta, respirando.
 *
 * O módulo não é um componente e não sabe do React: quem tem o relógio é o
 * `GateOverlay`, e é um relógio só para o contador, a veneziana e este campo.
 */

export type DormantField = {
  resize: () => void;
  /**
   * @param elapsedMs tempo desde a criação, para a corrente e a respiração.
   * @param dolly 0 no portão fechado, 1 no fim da abertura — é a câmera
   *   saindo de dentro do escuro, e é ele que esvazia o quadro.
   */
  render: (elapsedMs: number, dolly: number) => void;
  destroy: () => void;
};

type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Brilho de repouso. Varia por corpo para a massa não ler como grade. */
  energy: number;
  /** Meia-corda do corpo lenticular, em pixels de canvas. */
  size: number;
  /** Fase da respiração. Aleatória, senão o campo inteiro pulsa junto. */
  phase: number;
};

/**
 * A resolução do buffer é travada em 1 pixel de CSS, e não no DPR do
 * dispositivo. Duas razões, nesta ordem: o quadro é feito de coisas macias
 * — névoa e corpos fora de foco — que não ganham nada com mais amostras, e o
 * portão é o momento em que a CPU está mais ocupada, porque é ela que está
 * baixando o que vem depois. O grão, a única coisa fina aqui, fica com um
 * pixel de CSS de lado, que é como grão de filme lê numa tela retina de todo
 * jeito.
 */
const BACKING_SCALE = 1;

/** Um corpo a cada ~26 000 px². Numa viewport de 1440×900 dá ~50. */
const AREA_PER_BODY = 26_000;
const MIN_BODIES = 26;
const MAX_BODIES = 90;

/** Lado do ladrilho de grão, em pixels. Regenerado a cada quadro. */
const GRAIN_TILE = 96;
/** DIRECTION.md §5: intensidade entre 0.03 e 0.06. */
const GRAIN_ALPHA = 0.042;

/** Quase parados: a corrente é lenta e o amortecimento é longo. */
const DRIFT_SPEED = 22;
const DRIFT_LAMBDA = 1.4;
/** Respiração: um ciclo a cada ~9 s, com metade da amplitude do repouso. */
const BREATH_RATE = 0.7;
const BREATH_DEPTH = 0.3;

/**
 * O quanto o mundo se afasta do eixo e incha enquanto a câmera avança.
 *
 * Números modestos de propósito. A curva de saída forte é muito adiantada —
 * ela gasta dois terços do percurso no primeiro terço do tempo —, então
 * multiplicadores grandes fazem os corpos evaporarem antes de a veneziana
 * terminar de abrir, e sobra um segundo de névoa vazia. Quem esvazia o quadro
 * no fim é a saída do bolsão de névoa, não o inchaço dos corpos.
 */
const DOLLY_SPREAD = 2.6;
const DOLLY_SWELL = 2.4;
const DOLLY_FALLOFF = 1.6;
/** Quando a câmera já saiu do bolsão de névoa, em progresso cru da abertura. */
const FOG_EXIT_FROM = 0.6;

/** A onda de densidade que atravessa o quadro no clique (DIRECTION.md §4). */
const WAVE_SPAN = 0.55;
const WAVE_WIDTH = 0.34;
const WAVE_GAIN = 2.4;

function makeSprite(color: string): HTMLCanvasElement {
  // Um corpo é desenhado uma vez e reusado: um `drawImage` por corpo por
  // quadro, em vez de um gradiente novo por corpo por quadro.
  const side = 128;
  const sprite = document.createElement("canvas");
  sprite.width = side;
  sprite.height = side;

  const ctx = sprite.getContext("2d");
  if (ctx === null) return sprite;

  const half = side / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  // Núcleo pequeno, queda longa: é assim que abertura escancarada se parece.
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.12, "rgba(255,255,255,0.62)");
  gradient.addColorStop(0.38, "rgba(255,255,255,0.16)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, side, side);

  // Tinge o sprite branco com a cor do organismo sem precisar interpretar o
  // hexadecimal do token: `source-in` mantém o alfa e troca a cor.
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, side, side);

  return sprite;
}

export function createDormantField(
  canvas: HTMLCanvasElement,
  palette: Palette,
): DormantField {
  const context = canvas.getContext("2d", { alpha: false });
  if (context === null) {
    return { resize: () => {}, render: () => {}, destroy: () => {} };
  }
  const ctx = context;

  const cruise = makeSprite(palette.teal);
  // --cyan é "luz próxima, aceleração" (DIRECTION.md §5). Só a crista da onda
  // chega lá; coral e rosa não aparecem no portão.
  const accelerating = makeSprite(palette.cyan);

  const grain = document.createElement("canvas");
  grain.width = GRAIN_TILE;
  grain.height = GRAIN_TILE;
  const grainCtx = grain.getContext("2d");
  const grainData = grainCtx?.createImageData(GRAIN_TILE, GRAIN_TILE) ?? null;

  let width = 0;
  let height = 0;
  let bodies: Body[] = [];
  let lastMs: number | null = null;

  function seed(): void {
    const wanted = Math.round(
      Math.min(
        MAX_BODIES,
        Math.max(MIN_BODIES, (width * height) / AREA_PER_BODY),
      ),
    );

    const next: Body[] = [];
    for (let i = 0; i < wanted; i += 1) {
      const existing = bodies[i];
      next.push(
        existing ?? {
          x: Math.random() * width,
          y: Math.random() * height,
          // Já em movimento no primeiro quadro: um campo que parte do zero
          // leva um segundo para parecer vivo, e um segundo é o portão
          // inteiro.
          vx: (Math.random() * 2 - 1) * DRIFT_SPEED,
          vy: (Math.random() * 2 - 1) * DRIFT_SPEED * 0.4,
          energy: 0.3 + Math.random() * 0.5,
          size: 16 + Math.random() * 30,
          phase: Math.random() * Math.PI * 2,
        },
      );
    }
    bodies = next;
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width * BACKING_SCALE));
    height = Math.max(1, Math.round(rect.height * BACKING_SCALE));
    canvas.width = width;
    canvas.height = height;
    seed();
  }

  function paintFog(dolly: number): void {
    // Três paradas com a rampa do DIRECTION.md §5 — --deep no bolsão distante
    // a montante, --abyss em volta, --void em tudo o mais. O núcleo fica
    // acima e fora do eixo: uma câmara comprida vista de dentro, não uma
    // vinheta centrada.
    const cx = width * 0.58;
    const cy = height * 0.42;
    // O bolsão **abre** conforme a câmera avança. É o sinal de movimento mais
    // forte do quadro — mais legível que os corpos, que são poucos e fracos —
    // e é literalmente o que a transição diz: sair de dentro do escuro.
    const radius = Math.hypot(width, height) * 0.6 * (1 + easeStrong(dolly) * 1.5);

    const fog = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    fog.addColorStop(0, palette.deep);
    fog.addColorStop(0.07, palette.abyss);
    fog.addColorStop(0.36, palette.void);
    fog.addColorStop(1, palette.void);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, width, height);

    // No fim da abertura a câmera já atravessou o bolsão de névoa e o quadro
    // fica em --void puro — que é exatamente o que existe atrás do portão.
    // Sem isto, desmontar o portão apagaria um brilho de uma vez só. Note que
    // o que perde densidade é a névoa, não o portão: nada aqui esmaece para
    // revelar o que está atrás.
    const exit = clamp01((dolly - FOG_EXIT_FROM) / (1 - FOG_EXIT_FROM));
    if (exit > 0) {
      ctx.globalAlpha = easeStrong(exit);
      ctx.fillStyle = palette.void;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  function paintGrain(): void {
    if (grainCtx === null || grainData === null) return;

    // Ruído novo a cada quadro. Um PNG repetido é o que o PROJECT.md §3.1
    // proíbe pelo nome — grão parado lê como textura, não como filme.
    const pixels = grainData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const value = Math.random() * 26;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
    grainCtx.putImageData(grainData, 0, 0);

    const pattern = ctx.createPattern(grain, "repeat");
    if (pattern === null) return;

    // Aditivo: no escuro o grão só tem para onde subir.
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = GRAIN_ALPHA;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function step(seconds: number, dt: number): void {
    for (const body of bodies) {
      // Campo de corrente: duas senoides desencontradas, período longo. Não é
      // um ruído bonito — é o suficiente para nenhum corpo repetir o caminho
      // do vizinho. Quem transforma isso em deriva é o amortecimento.
      const targetVx =
        (Math.sin(body.y * 0.0032 + seconds * 0.21) * 0.9 +
          Math.sin(body.y * 0.0009 - seconds * 0.13) * 0.5) *
        DRIFT_SPEED;
      const targetVy =
        Math.cos(body.x * 0.0027 - seconds * 0.17) * 0.6 * DRIFT_SPEED;

      body.vx = damp(body.vx, targetVx, DRIFT_LAMBDA, dt);
      body.vy = damp(body.vy, targetVy, DRIFT_LAMBDA, dt);
      body.x += body.vx * dt;
      body.y += body.vy * dt;

      const margin = 120;
      if (body.x < -margin) body.x = width + margin;
      else if (body.x > width + margin) body.x = -margin;
      if (body.y < -margin) body.y = height + margin;
      else if (body.y > height + margin) body.y = -margin;
    }
  }

  function paintBodies(seconds: number, dolly: number): void {
    const eased = easeStrong(dolly);
    const spread = 1 + eased * DOLLY_SPREAD;
    const swell = 1 + eased * DOLLY_SWELL;
    // Um corpo que passa pela câmera fica maior e mais difuso: a mesma
    // energia espalhada por mais área. É por isso que o quadro esvazia, e não
    // por uma opacidade caindo em cima de tudo.
    const falloff = 1 / (1 + eased * DOLLY_FALLOFF);

    // A primeira onda de densidade atravessando o quadro (DIRECTION.md §4).
    // Ela corre pela matéria, não pela tela: a comparação é com a posição do
    // corpo antes do afastamento.
    //
    // Esta é a única coisa do site que avança em taxa constante, e não é uma
    // exceção à regra do PROJECT.md §3.3: uma frente de pressão atravessa o
    // meio na velocidade do meio. Passá-la por uma curva de saída forte a
    // faria cruzar o quadro em cento e cinquenta milissegundos — rápido
    // demais para ser vista, que é o oposto do que ela existe para fazer.
    const waveT = dolly <= 0 ? -1 : clamp01(dolly / WAVE_SPAN);
    const waveX = waveT < 0 ? -1 : (-0.3 + 1.6 * waveT) * width;

    const cx = width * 0.5;
    const cy = height * 0.5;

    ctx.globalCompositeOperation = "lighter";

    for (const body of bodies) {
      const x = cx + (body.x - cx) * spread;
      const y = cy + (body.y - cy) * spread;

      const half = body.size * swell;
      if (x < -half * 3 || x > width + half * 3) continue;
      if (y < -half * 3 || y > height + half * 3) continue;

      // Respiração: o corpo não se move, mas está trocando de estado.
      const breath =
        1 - BREATH_DEPTH + BREATH_DEPTH * Math.sin(seconds * BREATH_RATE + body.phase);
      let energy = body.energy * breath * falloff;
      let sprite = cruise;

      if (waveX >= 0) {
        const distance = Math.abs(body.x - waveX) / (width * WAVE_WIDTH);
        if (distance < 1) {
          const crest = (1 - distance) * (1 - distance);
          energy *= 1 + crest * WAVE_GAIN;
          if (crest > 0.45) sprite = accelerating;
        }
      }

      if (energy <= 0.002) continue;

      // Corpo lenticular: o mesmo sprite achatado no eixo transversal e
      // girado pela direção da velocidade. Sem asa, sem silhueta de pássaro.
      const heading = Math.atan2(body.vy, body.vx);
      const drift = Math.min(Math.hypot(body.vx, body.vy) / DRIFT_SPEED, 1);
      const chord = half * (1.7 + drift * 0.9);
      const thickness = half * 0.72;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading);
      ctx.globalAlpha = Math.min(energy, 1);
      ctx.drawImage(sprite, -chord, -thickness, chord * 2, thickness * 2);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function render(elapsedMs: number, dolly: number): void {
    if (width === 0 || height === 0) resize();

    const dt =
      lastMs === null ? 1 / 60 : Math.min((elapsedMs - lastMs) / 1000, 0.05);
    lastMs = elapsedMs;

    const seconds = elapsedMs * 0.001;

    step(seconds, dt);
    paintFog(dolly);
    paintBodies(seconds, dolly);
    paintGrain();
  }

  resize();

  return {
    resize,
    render,
    destroy: () => {
      bodies = [];
    },
  };
}
