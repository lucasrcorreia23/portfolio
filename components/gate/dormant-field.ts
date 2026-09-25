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

/**
 * O estado de uma lâmina da veneziana num quadro. Quem tem a geometria e o
 * amortecimento é o `GateOverlay`; aqui só se desenha.
 */
export type SlatState = {
  /** Borda superior da faixa da lâmina, em fração da altura. */
  top: number;
  /** Borda inferior da faixa, em fração da altura. */
  bottom: number;
  /** Quanto da própria faixa a lâmina cobre agora: 0.86 fechada, 0 aberta. */
  shut: number;
  /** Intensidade do realce na quina, 0 a 1. */
  light: number;
  /** Onde o realce está, em fração da largura. */
  glowX: number;
  /** Meia-largura do realce, em fração da largura. */
  glowSpread: number;
};

export type DormantField = {
  resize: () => void;
  /**
   * @param elapsedMs tempo desde a criação, para a corrente e a respiração.
   * @param dolly 0 no portão fechado, 1 no fim da abertura — é a câmera
   *   saindo de dentro do escuro, e é ele que esvazia o quadro.
   * @param slats as lâminas da veneziana, desenhadas **dentro** do canvas.
   *
   * A ordem das passadas é o que faz o quadro obedecer duas regras que ele
   * não obedecia quando as lâminas eram DOM por cima do canvas:
   *
   *   névoa → corpos → lâminas → véu → grão
   *
   * O grão é a última, e é a única posição em que ele é o que o PROJECT.md
   * §3.1 pede — "pós-processamento", no quadro composto. Com as lâminas em
   * DOM opaco por cima, o grão não encostava em 79% da tela, e aquilo era um
   * chapado de um valor só por construção, não por calibragem.
   *
   * O véu vem depois das lâminas pelo mesmo motivo: o que mais ameaça a
   * legibilidade do contador é o realce da quina que cruza a caixa dele, e
   * uma guarda abaixo do que ela guarda não guarda nada (DIRECTION.md §5).
   */
  render: (
    elapsedMs: number,
    dolly: number,
    slats: readonly SlatState[],
  ) => void;
  /**
   * Para cada altura dada, quanta luz o corpo mais próximo joga na gravação
   * (0 a 1) e **onde**, na largura, esse corpo está (0 a 1).
   *
   * É o que faz a gravação da veneziana acender quando um corpo raspa por
   * ela — "uma marca gravada pegando luz de raspão quando um corpo isolado
   * passa perto dela, e some" (DIRECTION.md §4). Sem isto a quina fica num
   * valor fixo, e nove linhas idênticas e imóveis atravessando a tela leem
   * como grade desenhada, não como estrutura.
   *
   * A posição importa tanto quanto a intensidade: uma quina de 1440px que
   * acende inteira, por igual, é um indicador; uma que acende só no trecho
   * onde a coisa está passando é luz. Sem `outX` o realce não viaja, e uma
   * grade que pulsa continua sendo uma grade.
   *
   * Lê a simulação da CPU, nunca o canvas: é a mesma escolha que o
   * DIRECTION.md §5 faz para o rig de luz da cena ("nada de `readPixels` no
   * caminho de render"), e aqui sai de graça porque a simulação já é da CPU.
   *
   * `outLight` e `outX` são mutados no lugar, para não alocar por quadro.
   */
  sampleSeams: (
    ys: readonly number[],
    outLight: number[],
    outX: number[],
  ) => void;
  /**
   * Ancora o véu de legibilidade na faixa vertical ocupada pela leitura, em
   * pixels de canvas. `null` desliga.
   *
   * DIRECTION.md §5: nenhum pixel sob um texto de leitura pode passar de
   * L = 0.138, e o que vale é o **pior quadro**, não a média. Sem isto o
   * portão passava por sorte — um corpo brilhante cruzando atrás do contador
   * derruba o contraste para ~2.5:1, bem abaixo do mínimo de 4.5:1 do
   * PROJECT.md §5.
   *
   * O mecanismo é o que o DIRECTION.md §5 escolhe: **densidade de névoa
   * ancorada à caixa do texto**, dentro da cena, com queda suave — não um
   * scrim preto no DOM, que o mesmo parágrafo veta explicitamente.
   */
  setVeil: (
    left: number,
    top: number,
    right: number,
    bottom: number,
  ) => void;
  /**
   * Liga o modo janela: as frestas deixam de mostrar o campo dormente e passam
   * a mostrar **o que está atrás do canvas** — a câmara de verdade, que já está
   * montada e rodando embaixo do portão quando a tarefa `scene` do preload
   * resolve e ela pinta o primeiro quadro.
   *
   * Nesse modo o canvas limpa as frestas para transparente e só desenha as
   * lâminas, a sombra delas, o véu e o grão das faces. Não há fade: a troca é
   * de um quadro para o outro. O campo dormente continua sendo o que se vê
   * antes disso, e o caminho inteiro quando não há WebGL.
   */
  setWindow: (on: boolean) => void;
  /** A linha de horizonte das lâminas, em fração da altura (perspectiva). */
  setHorizon: (fraction: number) => void;
  destroy: () => void;
};

/** `#rrggbb` + alfa, para os degradês das lâminas. */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex;
}

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

/**
 * Um corpo a cada ~17 000 px². Numa viewport de 1440×900 dá ~76.
 *
 * A densidade é maior do que a de um quadro cheio pediria porque quase nada
 * do quadro é visto: a veneziana só deixa passar uma fresta por lâmina, e um
 * corpo só conta se calhar de estar atravessando uma delas. Poucos corpos num
 * campo quase todo tapado davam cinco ou seis pontos parados na tela — nem
 * mancha, nem corrente.
 */
const AREA_PER_BODY = 17_000;
const MIN_BODIES = 26;
const MAX_BODIES = 90;

/** Lado do ladrilho de grão, em pixels. Regenerado a cada quadro. */
const GRAIN_TILE = 96;
/** DIRECTION.md §5: intensidade entre 0.03 e 0.06. */
const GRAIN_ALPHA = 0.045;

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

/**
 * Piso do alcance vertical, em px, de um corpo sobre a gravação da veneziana.
 * Some 0.9 do tamanho do corpo, que é a ordem da própria altura dele — o
 * corpo acende a quina quando raspa nela, não quando está no mesmo bairro
 * (ver `sampleSeams`).
 */
const SEAM_REACH = 10;

/** Abaixo deste produto de energia e proximidade, a quina fica apagada. */
const SEAM_KNEE = 0.62;

/** Faixa do véu de legibilidade — DIRECTION.md §5 fixa este clamp. */
const VEIL_MIN = 0.15;
const VEIL_MAX = 0.85;
/** Quanto o véu extrapola a caixa do texto, para a queda ser suave. */
const VEIL_PAD = 2.1;

/**
 * A gravação da quina: altura da tira, alfa do fio e das marcas, e os dois
 * períodos primos entre si.
 *
 * Os alfas são baixos, mas não invisíveis. A 5% e 4% a gravação existia no
 * sinal e não no olho — dava de 1 a 2 níveis de 255, abaixo do limiar da
 * maioria das telas. Quem impede a leitura de grade é a perspectiva das
 * lâminas, não o apagamento da gravação, então ela pode ser vista.
 */
const ENGRAVING_H = 5;
const ENGRAVING_FIO = 0.085;
const ENGRAVING_TICK = 0.075;
const TICK_PERIOD_A = 37;
const TICK_PERIOD_B = 53;

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
  // Com alfa: no modo janela as frestas ficam transparentes e a câmara de
  // verdade aparece por elas. Fora dele o primeiro passe pinta o quadro
  // inteiro, então o alfa não muda nada.
  const context = canvas.getContext("2d", { alpha: true });
  if (context === null) {
    return {
      resize: () => {},
      render: () => {},
      sampleSeams: (_ys: readonly number[], outLight: number[]) =>
        outLight.fill(0),
      setVeil: () => {},
      setWindow: () => {},
      setHorizon: () => {},
      destroy: () => {},
    };
  }
  const ctx = context;

  // O véu: uma faixa de névoa com queda suave nas duas pontas, na cor do
  // fundo. Mesma técnica do sprite (branco tingido por `source-in`), porque
  // assim não é preciso interpretar o hexadecimal do token para ter alfa.
  const veilSprite = document.createElement("canvas");
  veilSprite.width = 128;
  veilSprite.height = 128;
  const veilCtx = veilSprite.getContext("2d");
  if (veilCtx !== null) {
    // Queda nos dois eixos, não só no vertical. Ancorado ao contêiner de
    // largura total, o véu cobria 1440 px para proteger uma coluna de 240 —
    // 83% da largura velada não protegia nada e apagava a gravação de três
    // lâminas de graça. O DIRECTION.md §5 é literal: o véu é ancorado à caixa
    // da **coluna de texto**, não à caixa que a contém.
    const band = veilCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    band.addColorStop(0, "rgba(255,255,255,1)");
    band.addColorStop(0.42, "rgba(255,255,255,1)");
    band.addColorStop(1, "rgba(255,255,255,0)");
    veilCtx.fillStyle = band;
    veilCtx.fillRect(0, 0, 128, 128);
    veilCtx.globalCompositeOperation = "source-in";
    veilCtx.fillStyle = palette.void;
    veilCtx.fillRect(0, 0, 128, 128);
  }

  let windowMode = false;
  let horizon = 0.42;
  let veilLeft = 0;
  let veilTop = 0;
  let veilRight = 0;
  let veilBottom = 0;

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

  /**
   * A gravação de uma quina, pré-composta uma vez por layout: o fio com queda
   * suave mais as marcas de intervalo em dois períodos primos entre si.
   *
   * Desenhar isto direto custaria uns 66 `fillRect` por quina e 18 quinas por
   * quadro; assado numa tira, é um `drawImage` por quina.
   */
  let engraving: HTMLCanvasElement | null = null;

  function bakeEngraving(): void {
    const strip = document.createElement("canvas");
    strip.width = Math.max(1, width);
    strip.height = ENGRAVING_H;
    const g = strip.getContext("2d");
    if (g === null) {
      engraving = null;
      return;
    }

    // O fio da quina: queda suave para os dois lados, nunca borda dura. Um
    // traço de 1px atravessando a tela inteira desenha uma linha; um fio com
    // queda lê como luz raspando um chanfro.
    const fio = g.createLinearGradient(0, 0, 0, ENGRAVING_H);
    fio.addColorStop(0, "rgba(255,255,255,0)");
    fio.addColorStop(0.5, "rgba(255,255,255,1)");
    fio.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = fio;
    g.globalAlpha = ENGRAVING_FIO;
    g.fillRect(0, 0, strip.width, ENGRAVING_H);

    // As marcas de intervalo. Dois períodos que não são múltiplos um do outro
    // batem em fase a cada ~2000px — ou seja, nunca dentro de uma tela. O olho
    // lê gravação irregular, que é o que existe em concreto, e não uma régua
    // impressa (DIRECTION.md §2).
    g.globalAlpha = ENGRAVING_TICK;
    g.fillStyle = "#ffffff";
    for (let x = 0; x < strip.width; x += TICK_PERIOD_A) {
      g.fillRect(x, 0, 1, ENGRAVING_H);
    }
    g.globalAlpha = ENGRAVING_TICK * 0.75;
    for (let x = 0; x < strip.width; x += TICK_PERIOD_B) {
      g.fillRect(x, ENGRAVING_H * 0.25, 1, ENGRAVING_H * 0.75);
    }

    // Tinge tudo de uma vez, sem precisar interpretar o hexadecimal do token.
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-in";
    g.fillStyle = palette.cyan;
    g.fillRect(0, 0, strip.width, ENGRAVING_H);

    engraving = strip;
  }

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
          // As duas distribuições são elevadas a uma potência, não lineares:
          // isso empurra a maioria dos corpos para o extremo baixo e deixa só
          // alguns poucos grandes e brilhantes. Um campo uniforme (tamanho e
          // brilho sorteados linearmente) lê como uma mancha só quando visto
          // de relance pelas frestas da veneziana — o que devia ser "corpos
          // lenticulares à deriva" vira textura. A assimetria é o que separa
          // um corpo do outro no olho.
          //
          // O piso do brilho não é zero, e isso importa: com um piso baixo
          // demais a assimetria vira invisibilidade, e o portão fica sem nada
          // vivo dentro dele. A variação separa os corpos; o piso garante que
          // eles existam.
          energy: 0.3 + Math.random() ** 1.4 * 0.62,
          size: 9 + Math.random() ** 1.7 * 50,
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
    bakeEngraving();
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

    // A rampa precisa de curso. Comprimida em 36% ela chegava a --void puro
    // perto do núcleo e o resto do quadro virava um chapado — 83% dos pixels
    // no mesmo tripleto, medido. Um fundo de um valor só não é névoa
    // volumétrica, é uma cor de fundo, e o PROJECT.md §3.1 pede o oposto.
    //
    // Mas curso demais custa o "preto absoluto" que o DIRECTION.md §4 exige do
    // portão: em 0.78 o --abyss tomava o quadro e a câmara acendia. Em 0.58 a
    // rampa existe e o preto continua preto. Quem tira o chapado do resto é o
    // grão, que agora é grão de verdade — não esta rampa.
    const fog = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    fog.addColorStop(0, palette.deep);
    fog.addColorStop(0.1, palette.abyss);
    fog.addColorStop(0.58, palette.void);
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

  function paintSlats(slats: readonly SlatState[]): void {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.void;

    // 1. As faces. Retângulos de --void que encolhem a partir do próprio
    //    centro; o que sobra entre elas é a fresta.
    //
    //    **E a lâmina tem corpo.** Uma face chapada de um valor só, com a fresta
    //    quase do mesmo valor, lia como scanline sobre um campo uniforme — não
    //    como uma veneziana fechada. Três coisas dão volume a ela, todas em
    //    perspectiva a partir da linha de horizonte das lâminas:
    //    - a **espessura**: acima do horizonte vê-se a face de baixo da lâmina,
    //      abaixo dele a de cima, mais grossa quanto mais longe do horizonte;
    //    - o **chanfro** na aresta dessa espessura, a única coisa clara dela;
    //    - a **sombra** que a lâmina joga na fresta vizinha, que é o que faz a
    //      fresta ser um vão entre dois sólidos e não uma listra.
    for (const slat of slats) {
      const bandTop = slat.top * height;
      const bandHeight = (slat.bottom - slat.top) * height;
      const painted = bandHeight * slat.shut;
      if (painted <= 0) continue;
      const edgeTop = bandTop + (bandHeight - painted) * 0.5;
      const edgeBottom = edgeTop + painted;
      const gap = bandHeight - painted;
      const center = (slat.top + slat.bottom) * 0.5;
      const above = center < horizon;
      const reach = Math.min(1, Math.abs(center - horizon) / 0.5);
      const thick = Math.min(gap * 0.45, painted * 0.2 * reach + 1);

      // sombra na fresta, do lado da espessura, antes de tudo
      if (gap > 0.5) {
        const from = above ? edgeBottom + thick : edgeTop - thick;
        const to = above ? from + gap * 0.5 : from - gap * 0.5;
        const shadow = ctx.createLinearGradient(0, from, 0, to);
        shadow.addColorStop(0, withAlpha(palette.void, 0.72));
        shadow.addColorStop(1, withAlpha(palette.void, 0));
        ctx.fillStyle = shadow;
        ctx.fillRect(0, Math.min(from, to), width, Math.abs(to - from));
      }

      // a face
      ctx.fillStyle = palette.void;
      ctx.fillRect(0, edgeTop, width, painted);

      // a espessura, com o chanfro na aresta de fora
      if (thick > 0.5) {
        const y0 = above ? edgeBottom : edgeTop - thick;
        const body = ctx.createLinearGradient(0, y0, 0, y0 + thick);
        const far = withAlpha(palette.abyss, 1);
        const near = withAlpha(palette.void, 1);
        body.addColorStop(0, above ? near : far);
        body.addColorStop(1, above ? far : near);
        ctx.fillStyle = body;
        ctx.fillRect(0, y0, width, thick);
        const bevel = Math.max(1, Math.min(3, thick * 0.35));
        ctx.fillStyle = withAlpha(palette.deep, 0.85);
        ctx.fillRect(0, above ? y0 + thick - bevel : y0, width, bevel);
      }
    }
    ctx.fillStyle = palette.void;

    // 2. As quinas: a gravação, sempre, e o realce, só onde algo passa.
    ctx.globalCompositeOperation = "lighter";

    for (const slat of slats) {
      const bandTop = slat.top * height;
      const bandHeight = (slat.bottom - slat.top) * height;
      const painted = bandHeight * slat.shut;
      if (painted <= 0) continue;

      const edgeTop = bandTop + (bandHeight - painted) * 0.5;
      const edgeBottom = edgeTop + painted;

      if (engraving !== null) {
        // **A gravação sai junto com a lâmina.** Sem isto, a tira continua em
        // alfa cheio enquanto a face encolhe, e a abertura termina com nove
        // réguas tracejadas de ponta a ponta sobre um campo vazio — a grade de
        // volta, no último quadro antes do site abrir. Medido: aos 800 ms de
        // uma abertura de 1450 sobravam 21 px de lâmina em 900 de tela e a
        // gravação estava mais brilhante que no estado fechado.
        //
        // Mais brilhante porque as duas quinas somam: são dois `drawImage` em
        // `lighter`, e quando a face fica mais fina que a tira eles passam a
        // coincidir. O mesmo fator resolve as duas coisas — a queda começa
        // exatamente quando as tiras começam a se sobrepor, e é quadrática
        // para o resíduo morrer em vez de ficar meio aceso.
        const fade = clamp01(painted / (ENGRAVING_H * 2));
        ctx.globalAlpha = fade * fade;
        ctx.drawImage(engraving, 0, edgeTop - ENGRAVING_H * 0.5);
        ctx.drawImage(engraving, 0, edgeBottom - ENGRAVING_H * 0.5);
      }

      if (slat.light <= 0.002) continue;

      // O realce viaja: fica no trecho onde o corpo está, e não acende a
      // quina inteira por igual. Uma quina de 1440px que acende inteira é um
      // indicador; uma que acende onde a coisa passa é luz.
      const halfW = Math.max(slat.glowSpread * width, 1);
      const halfH = Math.max(ENGRAVING_H * 2.2, 1);
      const cxGlow = slat.glowX * width;
      ctx.globalAlpha = Math.min(slat.light, 1);
      ctx.drawImage(
        accelerating,
        cxGlow - halfW,
        edgeTop - halfH,
        halfW * 2,
        halfH * 2,
      );
      ctx.drawImage(
        accelerating,
        cxGlow - halfW,
        edgeBottom - halfH,
        halfW * 2,
        halfH * 2,
      );
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function paintVeil(): void {
    if (veilBottom <= veilTop || veilRight <= veilLeft) return;

    // Quanto o corpo mais brilhante perto da caixa está ameaçando a leitura.
    // Sai da simulação, como tudo aqui: o véu sobe *antes* de o corpo chegar,
    // que é a diferença entre uma guarda e um quadro ilegível já publicado.
    const midX = (veilLeft + veilRight) * 0.5;
    const midY = (veilTop + veilBottom) * 0.5;
    const halfW = (veilRight - veilLeft) * 0.5;
    const halfH = (veilBottom - veilTop) * 0.5;

    let light = 0;
    for (const body of bodies) {
      const reachY = halfH + body.size * 2;
      const dy = Math.abs(body.y - midY);
      if (dy >= reachY) continue;
      const reachX = halfW + body.size * 3;
      const dx = Math.abs(body.x - midX);
      if (dx >= reachX) continue;
      const near = (1 - dy / reachY) * (1 - dx / reachX);
      const threat = body.energy * near;
      if (threat > light) light = threat;
    }

    // Clamp em [0.15, 0.85], exatamente como o DIRECTION.md §5 especifica: o
    // véu fica baixo quase o tempo todo e só sobe quando precisa, então lê
    // como um banco de névoa passando, não como uma caixa escura acendendo.
    const f = Math.min(VEIL_MIN + light * 0.95, VEIL_MAX);
    const w = (veilRight - veilLeft) * VEIL_PAD;
    const h = (veilBottom - veilTop) * VEIL_PAD;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = f;
    ctx.drawImage(veilSprite, midX - w * 0.5, midY - h * 0.5, w, h);
    ctx.globalAlpha = 1;
  }

  function paintGrain(): void {
    if (grainCtx === null || grainData === null) return;

    // Ruído novo a cada quadro. Um PNG repetido é o que o PROJECT.md §3.1
    // proíbe pelo nome — grão parado lê como textura, não como filme.
    //
    // A amplitude é a faixa inteira, não uma fração dela: quem dosa é o
    // GRAIN_ALPHA da composição. Com ruído de 0 a 26 e alfa 0.042 a soma dava
    // meio nível de 255 e sumia no arredondamento — havia grão no código e
    // nenhum grão na tela. Faixa cheia × 0.045 dá ~6 níveis de média e ~11 de
    // pico, que é a intensidade que o DIRECTION.md §5 pede.
    const pixels = grainData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const value = Math.random() * 255;
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

  function render(
    elapsedMs: number,
    dolly: number,
    slats: readonly SlatState[],
  ): void {
    if (width === 0 || height === 0) resize();

    const dt =
      lastMs === null ? 1 / 60 : Math.min((elapsedMs - lastMs) / 1000, 0.05);
    lastMs = elapsedMs;

    const seconds = elapsedMs * 0.001;

    step(seconds, dt);
    if (windowMode) {
      // A câmara de verdade está atrás: as frestas ficam transparentes, e o grão
      // e a névoa dela são dela — pintar os nossos por cima seria dobrar os dois.
      ctx.clearRect(0, 0, width, height);
      paintSlats(slats);
      paintVeil();
      ctx.save();
      ctx.beginPath();
      for (const slat of slats) {
        const bandTop = slat.top * height;
        const bandHeight = (slat.bottom - slat.top) * height;
        const painted = bandHeight * slat.shut;
        if (painted <= 0) continue;
        ctx.rect(0, bandTop + (bandHeight - painted) * 0.5, width, painted);
      }
      ctx.clip();
      paintGrain();
      ctx.restore();
      return;
    }
    paintFog(dolly);
    paintBodies(seconds, dolly);
    paintSlats(slats);
    // O véu depois das lâminas, porque é o realce da quina que ameaça a
    // leitura; o grão depois do véu, porque grão não conta como fundo para
    // efeito de contraste (DIRECTION.md §5) e porque pós é a última passada.
    paintVeil();
    paintGrain();
  }

  function sampleSeams(
    ys: readonly number[],
    outLight: number[],
    outX: number[],
  ): void {
    for (let i = 0; i < ys.length; i += 1) {
      const y = ys[i];
      if (y === undefined) continue;

      // **Máximo, não soma.** Somar a contribuição de todos os corpos próximos
      // satura: com dezenas de corpos num campo de 900px, toda quina tem
      // sempre alguém por perto, o total estoura 1 em todas elas ao mesmo
      // tempo e as nove lâminas voltam a ter o mesmo brilho — que é
      // exatamente a grade imóvel que isto existe para evitar. O texto do
      // DIRECTION.md §4 é literal: "**um corpo isolado** passa perto dela".
      // Quem acende a gravação é o corpo mais próximo, não a média do campo.
      let light = 0;
      let x = 0.5;

      for (const body of bodies) {
        // O alcance é a própria extensão vertical do corpo, não um raio
        // ambiente: se ele não está raspando a quina, não a acende.
        const reach = SEAM_REACH + body.size * 0.9;
        const distance = Math.abs(body.y - y);
        if (distance >= reach) continue;
        const near = 1 - distance / reach;
        const contribution = body.energy * near * near;
        if (contribution <= light) continue;
        light = contribution;
        x = width > 0 ? body.x / width : 0.5;
      }

      // Joelho: abaixo disto a quina não acende de jeito nenhum.
      //
      // Sem ele, com um corpo a cada ~12px de altura, *toda* quina sempre tem
      // alguém por perto e as nove acendem ao mesmo tempo, o tempo todo — o
      // que devolve exatamente a grade que isto existe para desfazer. Com o
      // joelho, só a passagem realmente rasante acende, e o quadro fica com
      // duas ou três quinas vivas de cada vez. É assim que a estrutura
      // "existe entre os lampejos" (DIRECTION.md §2) em vez de estar toda
      // ligada de uma vez.
      const knee = light <= SEAM_KNEE ? 0 : (light - SEAM_KNEE) / (1 - SEAM_KNEE);
      outLight[i] = knee > 1 ? 1 : knee;
      outX[i] = x;
    }
  }

  resize();

  return {
    resize,
    render,
    sampleSeams,
    setVeil: (left, top, right, bottom) => {
      veilLeft = left;
      veilTop = top;
      veilRight = right;
      veilBottom = bottom;
    },
    setWindow: (on) => {
      windowMode = on;
    },
    setHorizon: (fraction) => {
      horizon = fraction;
    },
    destroy: () => {
      bodies = [];
    },
  };
}
