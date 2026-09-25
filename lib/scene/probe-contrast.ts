/**
 * A varredura de contraste — DIRECTION.md §5, PROJECT.md §7.
 *
 * ## O que se mede, e o que não vale
 *
 * O bando é a única luz prática até 0.85, então a luminância atrás de todo texto
 * em DOM muda a cada quadro. **Contraste médio não vale nada aqui; o que vale é
 * o pior quadro** — e "pior" é sobre todos os quadros, todas as caixas e todas
 * as linhas, não a pior média de alguma coisa.
 *
 * Três decisões de método, e as três são a mesma regra do PROJECT.md §7 ("toda
 * medição é feita no ponto de entrega"):
 *
 * 1. **Pixel composto, nunca conta analítica.** A luminância sai de
 *    `readPixels` do quadro que foi para a tela, depois de névoa, véu, bloom,
 *    DOF e grão. A conta de `lib/scene/veil.ts` é o que o código *acha* que vai
 *    entregar; é justamente ela que está sob teste.
 * 2. **As caixas são as linhas de texto desenhadas**, tiradas de
 *    `Range.getClientRects()` de cada nó de texto — não a caixa do elemento, que
 *    é maior que os glifos, e muito menos uma constante de layout. Um parágrafo
 *    de quatro linhas são quatro caixas.
 * 3. **A página rola de verdade.** As caixas moram em painéis `sticky`: a
 *    posição delas na tela é função do scroll, e o progresso da cena é função do
 *    mesmo scroll. Varrer o progresso sem rolar mediria a cena de um beat com o
 *    texto de outro.
 *
 * ## E a caixa do véu se confere antes, não depois
 *
 * A caixa do véu do portão passou por duas verificações reportando 248 px
 * enquanto entregava 820, porque as duas leram a caixa calculada. Aqui a
 * conferência é por diferença de quadro: o mesmo estado de simulação é
 * renderizado com e sem o véu, e a **pegada entregue** é o conjunto de pixels
 * que mudaram. Se ela não bater com a caixa que o shader recebeu, o resto da
 * medição não vale nada — por isso `veilFootprint()` roda antes de `contrast()`.
 */

/** L de `--mist` (#DCE9EC) em luz relativa — o texto de leitura do site. */
export const MIST_LUMINANCE = 0.796;

/** O piso do PROJECT.md §5. */
export const CONTRAST_FLOOR = 4.5;

import { VEIL_FALLOFF } from "./veil";

/** Diferença mínima, em nível de 8 bits, para um pixel contar como mudado. */
const FOOTPRINT_EPSILON = 2;

export type TextRect = {
  /** De quem é a caixa: beat ou HUD, elemento, e as primeiras palavras. */
  id: string;
  /** Em pixels de CSS, origem no topo à esquerda. */
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Toda linha de texto desenhada na tela, agora.
 *
 * Um elemento entra se tiver **nó de texto direto** — o que exclui contêineres,
 * a régua (que é feita de `span` sem texto) e o `h1` do corpo de prova, que é
 * geometria dentro da cena e no DOM tem um pixel. As linhas saem de um `Range`
 * sobre o conteúdo, então um parágrafo de quatro linhas devolve quatro caixas,
 * cada uma do tamanho dos glifos e não da coluna.
 */
/** O elemento chega a pintar pixel? Opacidade, visibilidade e `display`. */
function isPainted(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number.parseFloat(style.opacity) < 0.02) return false;
    // O padrão "só para leitor de tela" (`.sr-only`, `.beat-specimen` com a
    // cena viva): caixa de um pixel recortada. O `Range` devolve os retângulos
    // do texto **sem** o recorte, então sem este teste o corpo de prova em DOM
    // entrava na varredura com 2.46:1 — medido, a primeira vez que ela desceu
    // desde 0.02.
    if (style.clipPath.includes("inset(50%)")) return false;
  }
  return true;
}

export function readTextRects(): TextRect[] {
  const rects: TextRect[] = [];
  const range = document.createRange();
  const width = window.innerWidth;
  const height = window.innerHeight;

  const roots = document.querySelectorAll<HTMLElement>("aside[data-hud], main");
  for (const root of roots) {
    const scope = root.tagName === "ASIDE" ? "hud" : "main";
    for (const element of root.querySelectorAll<HTMLElement>("*")) {
      const hasText = Array.from(element.childNodes).some(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          (node.textContent ?? "").trim() !== "",
      );
      if (!hasText) continue;
      // Texto que não é pintado não tem contraste para medir: os links dos
      // cards (`StationList`) ficam no DOM com opacidade zero, e o foco deles é
      // mostrado pela peça na cena. Medi-los pôs o pior quadro da descida em
      // 1.35:1 numa caixa que ninguém vê.
      if (!isPainted(element)) continue;

      const beat = element.closest("[data-beat]")?.getAttribute("data-beat");
      const label = (element.textContent ?? "").trim().slice(0, 20);
      const id = `${beat ?? scope}/${element.tagName.toLowerCase()} "${label}"`;

      range.selectNodeContents(element);
      for (const rect of range.getClientRects()) {
        // Fora da tela não tem pixel para medir; caixas de um pixel são o
        // texto que o CSS esconde por baixo da cena (ver `.beat-specimen`).
        if (rect.width < 4 || rect.height < 4) continue;
        if (rect.bottom <= 0 || rect.top >= height) continue;
        if (rect.right <= 0 || rect.left >= width) continue;
        rects.push({
          id,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  }

  return rects;
}

export type ContrastWorst = {
  ratio: number;
  luminance: number;
  progress: number;
  box: string;
};

export type BoxRange = {
  box: string;
  /** Pior contraste da caixa e o progresso em que ele acontece. */
  worstRatio: number;
  atProgress: number;
  /**
   * A **faixa medida** da luminância atrás desta caixa, ao longo da varredura.
   *
   * É o que o PROJECT.md §7 exige ao lado de qualquer limiar: o teto do véu
   * (`VEIL_CEILING`) só quer dizer alguma coisa comparado com a faixa que a
   * entrada de fato produz. `max` é a luminância que gerou o pior contraste.
   */
  min: number;
  p50: number;
  p95: number;
  max: number;
  samples: number;
};

export type ContrastReport = {
  /** O pior quadro de todos: é este o resultado do teste. */
  worst: ContrastWorst;
  /** O pior de cada caixa, com a faixa medida atrás dela. Pior primeiro. */
  perBox: BoxRange[];
  /**
   * Percentis do **pior contraste de cada quadro**, do pior para o melhor.
   *
   * O portão é o mínimo, e continua sendo. Isto responde a outra pergunta, que
   * decide o conserto: se o mínimo é um cacho que passa uma vez, o véu subindo
   * resolve; se a mediana também está no chão, não há véu que resolva — o que
   * está errado é a composição, e o bando está atravessando a coluna de texto o
   * beat inteiro.
   */
  quantiles: { p0: number; p5: number; p25: number; p50: number; p95: number };
  floor: number;
  passes: boolean;
  from: number;
  to: number;
  /** Taxa de rolagem simulada, em alturas de viewport por segundo. */
  rate: number;
  /** Quadros de 60 Hz que a descida levou nesse trecho, nessa taxa. */
  frames: number;
  /** Quantas leituras de retângulo entraram na conta. */
  samples: number;
  locale: string;
  viewport: [number, number];
  buffer: [number, number];
  dpr: number;
};

export type FootprintReport = {
  index: number;
  /** A caixa que o shader recebeu, em UV — o que o código diz entregar. */
  claimed: [number, number, number, number];
  /** A caixa que a queda do véu prevê a partir dela. */
  expected: [number, number, number, number];
  /** A caixa de **todo** pixel que mudou, em UV. Inclui o halo do bloom. */
  delivered: [number, number, number, number] | null;
  /**
   * A caixa do **núcleo** da mudança: só os pixels que mudaram mais de um
   * quarto do máximo. É esta que se compara com a prevista — a outra é inflada
   * pelo bloom, que espalha a diferença muito além do véu.
   */
  deliveredCore: [number, number, number, number] | null;
  /** Fração da tela que mudou. */
  coverage: number;
  /**
   * Quanto da mudança total cai **dentro** da caixa prevista.
   *
   * É o número que decide se a caixa observada é a real. Uma pegada deslocada
   * ou maior que o previsto derruba esta fração; o halo do bloom, não — ele é
   * fraco e largo, e pesa pouco na soma.
   */
  insideShare: number;
  /** Maior erro de borda entre o núcleo entregue e o previsto, em pixels. */
  edgeErrorPx: number;
  /** Maior diferença de 8 bits encontrada — se for baixa, não há sinal. */
  peakDelta: number;
};

export type ContrastDeps = {
  canvas: HTMLCanvasElement;
  /** O contexto cru. A união porque é o que o `getContext()` do three devolve. */
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** Liga o alvo padrão e lê. Ver o docblock de `composedInto` na sonda. */
  bindDefault: () => void;
  /** Avança N quadros de 1/60 s. */
  step: (frames?: number) => void;
  /** Avança **com o mesmo timestamp**: nada se move, tudo é redesenhado. */
  hold: (frames?: number) => void;
  settle: (progress: number, steps: number) => void;
  progressRef: { current: number };
  /** Os uniforms do véu, como o shader os recebeu neste quadro. */
  veil: {
    box: readonly { x: number; y: number; z: number; w: number }[];
    f: readonly number[];
  };
  /** A tabela sRGB → linear da sonda. */
  toLinear: Float32Array;
};

export function installContrast(deps: ContrastDeps) {
  const { canvas, gl, bindDefault, step, hold, settle, progressRef, veil, toLinear } =
    deps;

  const bufferWidth = () => canvas.width;
  const bufferHeight = () => canvas.height;

  /**
   * Escala entre pixel de CSS e pixel do buffer, **medida no canvas entregue**.
   *
   * Não é `devicePixelRatio`: o teto de 1.5 do PROJECT.md §5 já pode ter
   * cortado, e numa tela de DPR 3 os dois números diferem pelo dobro.
   */
  const scale = () => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? canvas.width / rect.width : 1;
  };

  /**
   * A cena tem que cobrir exatamente a janela para os dois sistemas de
   * coordenadas serem o mesmo. Se alguém tiver forçado o tamanho do canvas com
   * `__probe.viewport()`, a medição compararia o DOM de uma janela com os
   * pixels de outra — e passaria, dizendo nada.
   */
  const assertAligned = () => {
    const rect = canvas.getBoundingClientRect();
    const offBy = Math.max(
      Math.abs(rect.left),
      Math.abs(rect.top),
      Math.abs(rect.width - window.innerWidth),
      Math.abs(rect.height - window.innerHeight),
    );
    if (offBy > 1) {
      throw new Error(
        `o canvas não cobre a janela (erro de ${offBy.toFixed(1)} px). ` +
          "Redimensione a janela em vez de usar __probe.viewport().",
      );
    }
  };

  const luminanceOf = (pixels: Uint8Array, at: number) =>
    0.2126 * (toLinear[pixels[at] ?? 0] ?? 0) +
    0.7152 * (toLinear[pixels[at + 1] ?? 0] ?? 0) +
    0.0722 * (toLinear[pixels[at + 2] ?? 0] ?? 0);

  /** Maior luminância dentro de um retângulo de tela, lida do quadro composto. */
  const maxLuminanceIn = (rect: TextRect, buffer: Uint8Array): number => {
    const k = scale();
    const height = bufferHeight();
    // Duas coisas de uma vez: `readPixels` conta de baixo para cima, e o
    // antisserrilhado do texto sangra um pixel para fora da caixa.
    const pad = 2;
    const x0 = Math.max(0, Math.floor((rect.left - pad) * k));
    const x1 = Math.min(bufferWidth(), Math.ceil((rect.left + rect.width + pad) * k));
    const yTop = Math.max(0, Math.floor((rect.top - pad) * k));
    const yBottom = Math.min(height, Math.ceil((rect.top + rect.height + pad) * k));
    const w = x1 - x0;
    const h = yBottom - yTop;
    if (w <= 0 || h <= 0) return 0;

    const y0 = height - yBottom;
    gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

    let worst = 0;
    for (let i = 0; i < w * h; i += 1) {
      const l = luminanceOf(buffer, i * 4);
      if (l > worst) worst = l;
    }
    return worst;
  };

  const ratioOf = (luminance: number) =>
    (MIST_LUMINANCE + 0.05) / (luminance + 0.05);

  /**
   * Pega o controle do scroll para uma medição, e **manda o Lenis remedir
   * antes de qualquer coisa**.
   *
   * O portão tranca a descida com `overflow: hidden` no `html` até o clique de
   * entrada, e a sonda entra sem clicar. O Lenis nasce nesse estado, e com o
   * documento travado o limite que ele calcula é **zero** — todo `scrollTo`
   * vai para o topo e fica lá. O sintoma é traiçoeiro porque não é um erro:
   * a varredura roda inteira, mede quadros de verdade, e o pior contraste sai
   * de uma caixa do beat errado, com a HUD marcando `EST. 0000`. Foi o que
   * aconteceu na primeira rodada limpa desta medição.
   *
   * Destravar e mandar remedir, nesta ordem, é o conserto — e é por isso que a
   * função devolve o `scrollTo` em vez de exportar as duas coisas soltas.
   */
  const takeScroll = () => {
    const root = document.documentElement;
    const lenis = (
      window as unknown as {
        __lenis?: {
          scrollTo: (to: number, options: Record<string, unknown>) => void;
          resize: () => void;
        };
      }
    ).__lenis;
    lenis?.resize();

    return (progress: number) => {
      const limit = root.scrollHeight - window.innerHeight;
      const y = limit * progress;
      if (lenis !== undefined) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    };
  };

  /**
   * A conferência da caixa do véu, por diferença de quadro.
   *
   * O truque é o `hold()`: avançar com o mesmo timestamp roda a simulação com
   * `dt = 0`, então nada se move entre um quadro e o próximo. Os dois quadros
   * comparados têm a mesma posição, a mesma velocidade e a mesma energia — a
   * única diferença entre eles é o véu, que sai porque as caixas do DOM saem.
   *
   * (O quadro de `dt = 0` tem a rampa emissiva toda saturada, e isso é
   * **bom** aqui: quanto mais claro o fundo, mais visível fica o que o véu
   * escurece. Ele não serve para medir cor, e não é isso que se mede.)
   */
  const veilFootprint = (): FootprintReport[] => {
    assertAligned();
    const width = bufferWidth();
    const height = bufferHeight();
    const pixels = new Uint8Array(width * height * 4);

    // Um quadro parado, com véu, e a caixa que o shader recebeu nele.
    hold(1);
    bindDefault();
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const withVeil = pixels.slice();
    const claimed = veil.box.map(
      (box) => [box.x, box.y, box.z, box.w] as [number, number, number, number],
    );
    const strength = veil.f.map((f) => f);

    // Mesma simulação, sem véu: as caixas somem do DOM e o laço mestre relê a
    // lista (a cada quatro quadros — daí os seis).
    const marked = Array.from(document.querySelectorAll<HTMLElement>("[data-veil]"));
    for (const node of marked) node.removeAttribute("data-veil");
    hold(6);
    bindDefault();
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    for (const node of marked) node.setAttribute("data-veil", "");

    const reports: FootprintReport[] = [];
    for (let i = 0; i < claimed.length; i += 1) {
      const box = claimed[i];
      if (box === undefined || (strength[i] ?? 0) <= 0) continue;

      const expected: [number, number, number, number] = [
        Math.max(0, box[0] - VEIL_FALLOFF),
        Math.max(0, box[1] - VEIL_FALLOFF),
        Math.min(1, box[2] + VEIL_FALLOFF),
        Math.min(1, box[3] + VEIL_FALLOFF),
      ];

      // A pegada é global: com mais de uma caixa acesa não dá para separar qual
      // mudou qual pixel, então a comparação é da união. Com uma caixa só — que
      // é o caso deste beat — união e caixa são a mesma coisa.
      //
      // Duas caixas saem daqui, e a diferença entre elas é o bloom. Qualquer
      // pixel que mude um nível de oito bits entra na primeira; só os que mudam
      // mais de um quarto do máximo entram na segunda. O véu escurece uma
      // região, o bloom espalha essa mudança de brilho por dezenas de pixels em
      // volta com amplitude baixa, e é a segunda caixa que descreve o véu.
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let coreMinX = Infinity;
      let coreMinY = Infinity;
      let coreMaxX = -Infinity;
      let coreMaxY = -Infinity;
      let changed = 0;
      let peak = 0;
      let total = 0;
      let inside = 0;

      // Duas passadas: o pico só é conhecido no fim da primeira.
      const deltas = new Uint8Array(width * height);
      for (let index = 0; index < width * height; index += 1) {
        const at = index * 4;
        const delta = Math.max(
          Math.abs((withVeil[at] ?? 0) - (pixels[at] ?? 0)),
          Math.abs((withVeil[at + 1] ?? 0) - (pixels[at + 1] ?? 0)),
          Math.abs((withVeil[at + 2] ?? 0) - (pixels[at + 2] ?? 0)),
        );
        deltas[index] = delta;
        if (delta > peak) peak = delta;
      }

      const coreEpsilon = Math.max(FOOTPRINT_EPSILON, peak * 0.25);
      for (let index = 0; index < width * height; index += 1) {
        const delta = deltas[index] ?? 0;
        if (delta < FOOTPRINT_EPSILON) continue;
        changed += 1;
        total += delta;
        const px = index % width;
        const py = Math.floor(index / width);
        const u = px / width;
        const v = py / height;
        if (u >= expected[0] && u <= expected[2] && v >= expected[1] && v <= expected[3]) {
          inside += delta;
        }
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        if (delta >= coreEpsilon) {
          if (px < coreMinX) coreMinX = px;
          if (px > coreMaxX) coreMaxX = px;
          if (py < coreMinY) coreMinY = py;
          if (py > coreMaxY) coreMaxY = py;
        }
      }

      const boxOf = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
      ): [number, number, number, number] | null =>
        Number.isFinite(x0)
          ? [x0 / width, y0 / height, (x1 + 1) / width, (y1 + 1) / height]
          : null;

      const delivered = boxOf(minX, minY, maxX, maxY);
      const deliveredCore = boxOf(coreMinX, coreMinY, coreMaxX, coreMaxY);

      const edgeErrorPx =
        deliveredCore === null
          ? Infinity
          : Math.max(
              Math.abs(deliveredCore[0] - expected[0]) * window.innerWidth,
              Math.abs(deliveredCore[2] - expected[2]) * window.innerWidth,
              Math.abs(deliveredCore[1] - expected[1]) * window.innerHeight,
              Math.abs(deliveredCore[3] - expected[3]) * window.innerHeight,
            );

      reports.push({
        index: i,
        claimed: box,
        expected,
        delivered,
        deliveredCore,
        coverage: changed / (width * height),
        insideShare: total > 0 ? inside / total : 0,
        edgeErrorPx,
        peakDelta: peak,
      });
      // Uma pegada por rodada: a diferença é a união de todas as caixas.
      break;
    }

    return reports;
  };

  /**
   * O teto de calor do PROJECT.md §3.1: "coral e rosa são **eventos**, não
   * fundo. Ocupam menos de 15 dos 100 por cento de qualquer tela."
   *
   * **Quente é uma definição, e ela está aqui.** Um pixel conta se for visível
   * (`L > τ`, o mesmo limiar de corpo da sonda) **e** tiver mais vermelho que
   * verde com folga — `r > 1.15 · g` em luz linear. `--rose` e `--coral` passam
   * com sobra (0.90 contra 0.26, e 1.00 contra 0.15); `--teal` e `--cyan` são o
   * contrário (0.008 contra 0.38), e a névoa e a estrutura também. Sem a
   * condição de luminância, o grão e o fundo entrariam na conta e o número
   * mediria o tamanho da tela.
   */
  const warmth = (frames = 24, threshold = 0.07) => {
    assertAligned();
    const width = bufferWidth();
    const height = bufferHeight();
    const pixels = new Uint8Array(width * height * 4);
    let warm = 0;
    let lit = 0;
    let scanned = 0;

    for (let f = 0; f < frames; f += 1) {
      step(1);
      bindDefault();
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      for (let index = 0; index < width * height; index += 1) {
        const at = index * 4;
        scanned += 1;
        const l = luminanceOf(pixels, at);
        if (l <= threshold) continue;
        lit += 1;
        const r = toLinear[pixels[at] ?? 0] ?? 0;
        const g = toLinear[pixels[at + 1] ?? 0] ?? 0;
        if (r > 1.15 * g) warm += 1;
      }
    }

    return {
      frames,
      threshold,
      /** Fração da tela em pixels quentes. Teto do PROJECT.md §3.1: 0.15. */
      warmShareOfFrame: scanned > 0 ? warm / scanned : 0,
      /** Fração da tela acima do limiar de corpo, quente ou fria. */
      litShareOfFrame: scanned > 0 ? lit / scanned : 0,
      warmShareOfLit: lit > 0 ? warm / lit : 0,
    };
  };

  /**
   * Rola até um progresso **do jeito que uma pessoa rolaria**, e para lá.
   *
   * É o que o screenshot de revisão precisa. `settle(p, 700)` põe o bando numa
   * pose de equilíbrio para aquele progresso — o que é certo para o quadro do
   * descolamento, que é um regime estacionário, e **errado** para Quem sou: o
   * poleiro é um transiente que a pessoa atravessa em segundos, e assentado por
   * onze ele acumula uma população que ninguém vê. Aqui a cena chega ao ponto
   * pelo mesmo caminho que a pessoa faz.
   */
  const descend = (
    options: {
      to?: number;
      from?: number;
      rate?: number;
      scrollVh?: number;
      settleSteps?: number;
    } = {},
  ) => {
    const {
      to = 0.36,
      from = 0.2,
      rate = 1,
      scrollVh = 21.05,
      settleSteps = 700,
    } = options;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "visible";

    const scrollTo = takeScroll();
    scrollTo(from);
    settle(from, settleSteps);

    const frames = Math.max(
      1,
      Math.round(((to - from) * scrollVh * 60) / Math.max(rate, 1e-3)),
    );
    for (let f = 1; f <= frames; f += 1) {
      const progress = from + ((to - from) * f) / frames;
      scrollTo(progress);
      progressRef.current = progress;
      step(1);
    }

    root.style.overflow = previousOverflow;
    return { from, to, rate, frames };
  };

  /**
   * A varredura, e ela é uma **descida**, não uma série de poses.
   *
   * A primeira versão travava o progresso, rodava alguns quadros, media, e
   * pulava para o progresso seguinte. Isso mede uma cena que não existe: com o
   * progresso parado, o poleiro de Quem sou fica acumulando corpos que na
   * descida real já teriam passado — dez segundos de simulação num ponto que a
   * pessoa atravessa em meio segundo. O bando fica mais denso, mais claro e mais
   * parado do que ele jamais é.
   *
   * Então o progresso avança **um quadro de cada vez**, na taxa de rolagem que o
   * DIRECTION.md §4 usa para o visitante lento (0.6 vh/s), e cada quadro é
   * medido. Um quadro de varredura é um quadro de site. O assentamento inicial
   * roda em `from`, onde o poleiro ainda não existe, então ele não herda
   * acumulação nenhuma.
   */
  const contrast = (
    options: {
      from?: number;
      to?: number;
      /** Alturas de viewport por segundo. 0.6 é o visitante lento do §4. */
      rate?: number;
      /** Faixa rolável total, em alturas de viewport (`SCROLL_VH`). */
      scrollVh?: number;
      settleSteps?: number;
    } = {},
  ): ContrastReport => {
    const {
      from = 0.28,
      to = 0.45,
      rate = 0.6,
      scrollVh = 21.05,
      settleSteps = 700,
    } = options;

    // Quantos quadros a 60 Hz a pessoa leva para atravessar este trecho.
    const frames = Math.max(
      2,
      Math.round(((to - from) * scrollVh * 60) / Math.max(rate, 1e-3)),
    );

    assertAligned();
    settle(from, settleSteps);

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    // A sonda tranca o scroll para um polegar apoiado não mover o progresso no
    // meio de uma medição. Aqui ele precisa voltar: as caixas são `sticky`.
    // Inline vence a regra de `:has()` que o portão instala no CSS.
    root.style.overflow = "visible";

    const scrollTo = takeScroll();

    const buffer = new Uint8Array(bufferWidth() * bufferHeight() * 4);
    const perBox = new Map<string, number[]>();
    const perFrame: number[] = [];
    const worstOfBox = new Map<string, ContrastWorst>();
    let worst: ContrastWorst = {
      ratio: Infinity,
      luminance: 0,
      progress: from,
      box: "",
    };
    let samples = 0;

    try {
      for (let f = 0; f < frames; f += 1) {
        const progress = from + ((to - from) * f) / (frames - 1);
        scrollTo(progress);
        progressRef.current = progress;
        step(1);
        bindDefault();

        let frameWorst = Infinity;
        // As caixas são relidas por quadro: o texto está sendo revelado, o
        // painel é `sticky`, e a caixa que importa é a deste quadro.
        for (const rect of readTextRects()) {
          const luminance = maxLuminanceIn(rect, buffer);
          const ratio = ratioOf(luminance);
          samples += 1;

          // A faixa inteira, não só o pior: é ela que valida o teto do véu.
          const seen = perBox.get(rect.id);
          if (seen === undefined) perBox.set(rect.id, [luminance]);
          else seen.push(luminance);
          const previous = worstOfBox.get(rect.id);
          if (previous === undefined || ratio < previous.ratio) {
            worstOfBox.set(rect.id, { ratio, luminance, progress, box: rect.id });
          }
          if (ratio < worst.ratio) {
            worst = { ratio, luminance, progress, box: rect.id };
          }
          if (ratio < frameWorst) frameWorst = ratio;
        }
        if (Number.isFinite(frameWorst)) perFrame.push(frameWorst);
      }
    } finally {
      root.style.overflow = previousOverflow;
    }

    perFrame.sort((a, b) => a - b);
    const quantile = (q: number) =>
      perFrame.length === 0
        ? 0
        : (perFrame[
            Math.min(perFrame.length - 1, Math.floor(q * perFrame.length))
          ] ?? 0);

    return {
      worst,
      quantiles: {
        p0: quantile(0),
        p5: quantile(0.05),
        p25: quantile(0.25),
        p50: quantile(0.5),
        p95: quantile(0.95),
      },
      perBox: Array.from(perBox.entries())
        .map(([box, values]) => {
          values.sort((a, b) => a - b);
          const at = (q: number) =>
            values[Math.min(values.length - 1, Math.floor(q * values.length))] ?? 0;
          const worstHere = worstOfBox.get(box);
          return {
            box,
            worstRatio: worstHere?.ratio ?? 0,
            atProgress: worstHere?.progress ?? 0,
            min: values[0] ?? 0,
            p50: at(0.5),
            p95: at(0.95),
            max: values[values.length - 1] ?? 0,
            samples: values.length,
          };
        })
        .sort((a, b) => a.worstRatio - b.worstRatio),
      floor: CONTRAST_FLOOR,
      passes: worst.ratio >= CONTRAST_FLOOR,
      from,
      to,
      rate,
      frames,
      samples,
      locale: document.documentElement.lang,
      viewport: [window.innerWidth, window.innerHeight],
      buffer: [bufferWidth(), bufferHeight()],
      dpr: scale(),
    };
  };

  return { contrast, descend, veilFootprint, warmth, readTextRects };
}
