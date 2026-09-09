import { Matrix4, Vector3, type Camera, type WebGLRenderer } from "three";
import { getCaseState } from "@/lib/work/case-transition";
import { CARD_COVER_UV, CARD_HEIGHT, CARD_WIDTH } from "./card-layout";
import type { CameraPose } from "./curve";
import type { SharedUniforms } from "./uniforms";

/**
 * A sonda da travessia — **só em desenvolvimento**.
 *
 * Ela existe porque as três afirmações desta rodada são todas sobre o **quadro
 * entregue**, e nenhuma delas pode ser conferida lendo o que o código calculou
 * (PROJECT.md §7):
 *
 * - "não pode existir tela branca" é sobre a luminância de cada quadro entre o
 *   clique e o repouso;
 * - "o card vira a capa" é sobre o retângulo projetado da peça coincidir com o
 *   retângulo que o `<img>` ocupa;
 * - "a câmera volta para a posição do rio de onde saiu" é sobre onde a câmera
 *   está depois da volta, não sobre o número que o store guardou.
 *
 * ## Por que ela pode ler pixel, e a cena não
 *
 * O DIRECTION.md §5 proíbe `readPixels` **no caminho de render** — é uma regra
 * de desempenho: a leitura síncrona obriga a GPU a terminar antes de a CPU
 * receber, e o quadro morre. Aqui isso não vale, pela mesma isenção que a sonda
 * de contraste já toma: isto é medição, roda sob demanda, não existe em
 * produção (`process.env.NODE_ENV` vira literal e o módulo inteiro cai), e o
 * que ela perturba é o **tempo**, não a cor. Os números que ela produz são de
 * luminância e de geometria, e os dois são idênticos com ou sem a leitura.
 *
 * ## O quadro é amostrado em linhas, e não inteiro
 *
 * Ler o buffer inteiro são ~12 MB por quadro, e uma travessia tem cerca de cem.
 * O que a medição procura — um quadro branco, ou um degrau de luminância — é um
 * evento de **área grande** por definição: uma tela em branco não é um pixel
 * claro, é a tela. Então a amostra são 24 varreduras horizontais igualmente
 * espaçadas, subamostradas de oito em oito em x. São ~6.500 pontos por quadro,
 * cobrindo a altura inteira, a um custo que não muda a ordem de grandeza do
 * quadro.
 *
 * O que isso **não** pega é um brilho pequeno e isolado. Se um dia a pergunta
 * for essa, a ferramenta certa é a redução por máximo do compositor, não esta.
 */

/** Quantas varreduras horizontais por quadro. */
const ROWS = 24;
/** Passo em x dentro de cada varredura, em pixels do buffer. */
const STRIDE = 8;

/** sRGB de 8 bits para linear, tabelado — a mesma tabela da sonda de contraste. */
const toLinear = new Float32Array(256);
for (let i = 0; i < 256; i += 1) {
  const c = i / 255;
  toLinear[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export type CaseSample = {
  /** Milissegundos desde o início do traço. */
  t: number;
  phase: string;
  docked: boolean;
  /** Quanto do voo já aconteceu, 0 a 1. */
  amount: number;
  /** A peça escondida do quadro porque o DOM assumiu a capa, ou −1. */
  handed: number;
  camera: [number, number, number];
  target: [number, number, number];
  aperture: number;
  /** Luminância relativa média e máxima do quadro amostrado. */
  meanL: number;
  maxL: number;
  /** Caixa envolvente da região de capa projetada, em px de CSS, ou `null`. */
  cover: [number, number, number, number] | null;
  /** A caixa que o `<img>` da capa ocupa, em px de CSS, ou `null`. */
  dom: [number, number, number, number] | null;
  /**
   * A opacidade **computada** do `<img>` da capa, 0 a 1.
   *
   * É a metade que falta da prova de que não existe buraco. A leitura de pixel
   * daqui enxerga só o canvas — o `<img>` é DOM e não está no buffer do WebGL —,
   * então "o quadro não apagou" não pode sair dela sozinha. O que sai é o
   * invariante: **nunca existe um quadro em que a peça já saiu (`handed >= 0`) e
   * a capa em DOM ainda não está opaca**. Enquanto isso valer, sempre há uma das
   * duas desenhando, e é isso que "sem tela branca" quer dizer aqui.
   *
   * Computada, e não a regra de CSS: é o valor que o compositor usa.
   */
  coverOpacity: number;
};

export type LineReading = {
  /** As primeiras palavras da linha, para achá-la de novo. */
  id: string;
  /** Luminância relativa máxima sob a linha, no quadro composto. */
  luminance: number;
  /** Razão de contraste contra `--mist` cheio. */
  ratio: number;
};

export type CaseTraceHook = {
  start: () => string;
  stop: () => CaseSample[];
  /** O desencontro entre a peça projetada e o `<img>`, aresta a aresta. */
  seam: () => { edges: number[]; worst: number } | null;
  /**
   * O contraste de cada linha de texto desenhada, no quadro que está na tela.
   *
   * As caixas saem de `Range.getClientRects()` sobre os **nós de texto**, e não
   * da caixa do elemento: um parágrafo de seis linhas tem uma caixa que cobre
   * seis linhas e os cinco vãos entre elas, e o vão não tem texto para proteger.
   * É a mesma escolha que o DIRECTION.md §5 fixa para a varredura de contraste
   * da descida, e pelo mesmo motivo.
   */
  lines: () => LineReading[];
  /** Mapa grosseiro de luminância máxima do quadro — onde está o brilho. */
  map: (cols?: number, rows?: number) => number[][];
};

/** `--mist` (#DCE9EC) em luminância relativa. A mesma de `probe-contrast`. */
const MIST_LUMINANCE = 0.796;

type Deps = {
  gl: WebGLRenderer;
  camera: Camera;
  pose: CameraPose;
  shared: SharedUniforms;
  apertureRef: { readonly current: number };
  /** Quanto do voo já aconteceu, escrito pelo laço mestre. */
  amountRef: { readonly current: number };
};

export type CaseTrace = {
  /** Chamado depois do composite, e só ele lê pixel. */
  tick: () => void;
  dispose: () => void;
};

const COVER_MID_Y =
  ((CARD_COVER_UV[1] + CARD_COVER_UV[3]) / 2 - 0.5) * CARD_HEIGHT;

export function installCaseTrace(deps: Deps): CaseTrace {
  const { gl, camera, pose, shared, apertureRef, amountRef } = deps;
  const context = gl.getContext();
  const matrix = new Matrix4();
  const point = new Vector3();

  let recording = false;
  let startedAt = 0;
  let samples: CaseSample[] = [];
  let row: Uint8Array | null = null;

  /**
   * A caixa envolvente da **região de capa** da peça atracada, projetada.
   *
   * Não é a caixa do card: a capa vai de `v = 0.2` a `v = 0.975`, porque a faixa
   * de baixo é a placa de cota. Comparar a caixa do card com o `<img>` mediria
   * um desencontro que não existe.
   */
  const coverBox = (): [number, number, number, number] | null => {
    const index = shared.dockCard.value;
    if (index < 0) return null;
    const card = shared.cards.value[index];
    if (card === undefined) return null;

    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const c = Math.cos(card.w);
    const s = Math.sin(card.w);
    const halfW = ((CARD_COVER_UV[2] - CARD_COVER_UV[0]) * CARD_WIDTH) / 2;
    const halfH = ((CARD_COVER_UV[3] - CARD_COVER_UV[1]) * CARD_HEIGHT) / 2;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let k = 0; k < 4; k += 1) {
      const sx = k === 0 || k === 3 ? -1 : 1;
      const sy = k < 2 ? -1 : 1;
      point
        .set(
          card.x + c * sx * halfW,
          card.y + COVER_MID_Y + sy * halfH,
          card.z - s * sx * halfW,
        )
        .applyMatrix4(matrix);
      if (point.z > 1) return null;
      const px = (point.x * 0.5 + 0.5) * window.innerWidth;
      const py = (0.5 - point.y * 0.5) * window.innerHeight;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return [minX, minY, maxX, maxY];
  };

  const domBox = (): [number, number, number, number] | null => {
    const image = document.querySelector<HTMLImageElement>(
      "[data-case-cover] img",
    );
    if (image === null) return null;
    const r = image.getBoundingClientRect();
    return [r.left, r.top, r.right, r.bottom];
  };

  const coverOpacity = (): number => {
    const figure = document.querySelector<HTMLElement>("[data-case-cover]");
    if (figure === null) return 0;
    return Number.parseFloat(getComputedStyle(figure).opacity) || 0;
  };

  /**
   * Lê o quadro composto.
   *
   * **O alvo é religado no nulo antes de ler**, pela mesma razão que a sonda já
   * documenta: o `blit()` restaura o alvo anterior, então o composite termina
   * com um FBO de meio-float ligado. Ler dali devolve zeros — o quadro está na
   * tela, e a medição sai toda preta.
   */
  const sampleFrame = (): { meanL: number; maxL: number } => {
    const width = gl.domElement.width;
    const height = gl.domElement.height;
    if (width === 0 || height === 0) return { meanL: 0, maxL: 0 };
    if (row === null || row.length < width * 4) row = new Uint8Array(width * 4);

    gl.setRenderTarget(null);

    let sum = 0;
    let count = 0;
    let max = 0;
    for (let r = 0; r < ROWS; r += 1) {
      const y = Math.min(height - 1, Math.floor(((r + 0.5) / ROWS) * height));
      context.readPixels(
        0,
        y,
        width,
        1,
        context.RGBA,
        context.UNSIGNED_BYTE,
        row,
      );
      for (let x = 0; x < width; x += STRIDE) {
        const at = x * 4;
        const l =
          0.2126 * (toLinear[row[at] ?? 0] ?? 0) +
          0.7152 * (toLinear[row[at + 1] ?? 0] ?? 0) +
          0.0722 * (toLinear[row[at + 2] ?? 0] ?? 0);
        sum += l;
        count += 1;
        if (l > max) max = l;
      }
    }
    return { meanL: count === 0 ? 0 : sum / count, maxL: max };
  };

  const capture = () => {
    if (!recording) return;
    const state = getCaseState();
    const { meanL, maxL } = sampleFrame();
    samples.push({
      t: Math.round(performance.now() - startedAt),
      phase: state.phase,
      docked: state.docked,
      amount: Number(amountRef.current.toFixed(3)),
      handed: shared.dockHandoff.value > 0.5 ? shared.dockCard.value : -1,
      camera: [
        Number(pose.position.x.toFixed(3)),
        Number(pose.position.y.toFixed(3)),
        Number(pose.position.z.toFixed(3)),
      ],
      target: [
        Number(pose.target.x.toFixed(3)),
        Number(pose.target.y.toFixed(3)),
        Number(pose.target.z.toFixed(3)),
      ],
      aperture: Number(apertureRef.current.toFixed(4)),
      meanL: Number(meanL.toFixed(5)),
      maxL: Number(maxL.toFixed(5)),
      cover: coverBox(),
      dom: domBox(),
      coverOpacity: Number(coverOpacity().toFixed(3)),
    });
    if (samples.length > 900) recording = false;
  };

  /**
   * As caixas de cada linha de texto visível, em pixels de CSS.
   *
   * Percorre os nós de texto do documento e usa `Range.getClientRects()`, que
   * devolve **uma caixa por linha desenhada** — a quebra de linha é do
   * navegador, e é ela que decide o que uma linha é. Nós invisíveis, vazios ou
   * fora da tela são descartados: medir contraste de texto que ninguém vê
   * baixaria a média com uma leitura que não existe.
   */
  const textRects = (): { id: string; rect: DOMRect }[] => {
    const out: { id: string; rect: DOMRect }[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const range = document.createRange();
    let node = walker.nextNode();
    while (node !== null) {
      const text = node.textContent ?? "";
      if (text.trim().length > 0) {
        const parent = node.parentElement;
        // **E o que está escondido por recorte também não conta.** O `h1` do
        // corpo de prova continua no DOM para ser lido, indexado e selecionado,
        // mas some da vista quando existe cena desenhando-o — numa caixa de
        // 1×1 px com `clip-path: inset(50%)`. Os retângulos do nó de texto dele
        // continuam existindo e continuam medindo o brilho da peça atrás, e sem
        // esta linha a varredura da descida reprovava em **2.27:1** numa caixa
        // que ninguém vê. É a mesma exclusão que a sonda de contraste faz.
        const host = parent === null ? null : parent.getBoundingClientRect();
        const visible =
          parent !== null &&
          host !== null &&
          host.width > 2 &&
          host.height > 2 &&
          getComputedStyle(parent).visibility !== "hidden" &&
          Number.parseFloat(getComputedStyle(parent).opacity) > 0.01;
        if (visible) {
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.width < 2 || rect.height < 2) continue;
            if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
            if (rect.right < 0 || rect.left > window.innerWidth) continue;
            out.push({ id: text.trim().slice(0, 28), rect });
          }
        }
      }
      node = walker.nextNode();
    }
    return out;
  };

  /** O quadro inteiro, uma leitura só — depois as caixas são varridas na CPU. */
  let full: Uint8Array | null = null;

  const lines = (): LineReading[] => {
    const width = gl.domElement.width;
    const height = gl.domElement.height;
    if (width === 0 || height === 0) return [];
    const need = width * height * 4;
    if (full === null || full.length < need) full = new Uint8Array(need);

    gl.setRenderTarget(null);
    context.readPixels(
      0,
      0,
      width,
      height,
      context.RGBA,
      context.UNSIGNED_BYTE,
      full,
    );

    // O buffer do WebGL não é o da tela em CSS quando o DPR não é 1.
    const scale = width / window.innerWidth;
    const rects = textRects();
    const out: LineReading[] = [];

    for (const { id, rect } of rects) {
      // Duas coisas de uma vez: `readPixels` conta de baixo para cima, e o
      // antisserrilhado do texto sangra um pixel para fora da caixa.
      const pad = 2;
      const x0 = Math.max(0, Math.floor((rect.left - pad) * scale));
      const x1 = Math.min(width, Math.ceil((rect.right + pad) * scale));
      const yTop = Math.max(0, Math.floor((rect.top - pad) * scale));
      const yBottom = Math.min(height, Math.ceil((rect.bottom + pad) * scale));
      if (x1 <= x0 || yBottom <= yTop) continue;

      let worst = 0;
      for (let y = height - yBottom; y < height - yTop; y += 1) {
        const row0 = y * width * 4;
        for (let x = x0; x < x1; x += 1) {
          const at = row0 + x * 4;
          const l =
            0.2126 * (toLinear[full[at] ?? 0] ?? 0) +
            0.7152 * (toLinear[full[at + 1] ?? 0] ?? 0) +
            0.0722 * (toLinear[full[at + 2] ?? 0] ?? 0);
          if (l > worst) worst = l;
        }
      }
      out.push({
        id,
        luminance: Number(worst.toFixed(5)),
        ratio: Number(((MIST_LUMINANCE + 0.05) / (worst + 0.05)).toFixed(3)),
      });
    }
    return out;
  };

  /**
   * Um mapa grosseiro de luminância máxima do quadro, em células.
   *
   * Existe para responder "**onde** está o brilho", que é a pergunta que separa
   * um defeito do véu de um defeito do instrumento — e as duas já foram
   * confundidas uma vez nesta rodada.
   */
  const map = (cols = 6, rows = 12): number[][] => {
    const width = gl.domElement.width;
    const height = gl.domElement.height;
    const need = width * height * 4;
    if (full === null || full.length < need) full = new Uint8Array(need);
    gl.setRenderTarget(null);
    context.readPixels(
      0,
      0,
      width,
      height,
      context.RGBA,
      context.UNSIGNED_BYTE,
      full,
    );
    const grid: number[][] = [];
    for (let r = 0; r < rows; r += 1) {
      const line: number[] = [];
      // De cima para baixo na tela, ao contrário do buffer.
      const y0 = Math.floor(((rows - 1 - r) / rows) * height);
      const y1 = Math.floor(((rows - r) / rows) * height);
      for (let c = 0; c < cols; c += 1) {
        const x0 = Math.floor((c / cols) * width);
        const x1 = Math.floor(((c + 1) / cols) * width);
        let worst = 0;
        for (let y = y0; y < y1; y += 2) {
          const row0 = y * width * 4;
          for (let x = x0; x < x1; x += 2) {
            const at = row0 + x * 4;
            const l =
              0.2126 * (toLinear[full[at] ?? 0] ?? 0) +
              0.7152 * (toLinear[full[at + 1] ?? 0] ?? 0) +
              0.0722 * (toLinear[full[at + 2] ?? 0] ?? 0);
            if (l > worst) worst = l;
          }
        }
        line.push(Number(worst.toFixed(3)));
      }
      grid.push(line);
    }
    return grid;
  };

  const hook: CaseTraceHook = {
    lines,
    map,
    start: () => {
      samples = [];
      startedAt = performance.now();
      recording = true;
      return "recording";
    },
    stop: () => {
      recording = false;
      return samples;
    },
    seam: () => {
      const cover = coverBox();
      const dom = domBox();
      if (cover === null || dom === null) return null;
      const edges = cover.map((value, i) =>
        Number(Math.abs(value - (dom[i] ?? 0)).toFixed(2)),
      );
      return { edges, worst: Math.max(...edges) };
    },
  };

  type Host = { __caseTrace?: CaseTraceHook };
  (window as unknown as Host).__caseTrace = hook;

  return {
    tick: capture,
    dispose: () => {
      recording = false;
      const host = window as unknown as Host;
      // Comparação de identidade, e não `delete` direto: em desenvolvimento o
      // efeito monta e desmonta várias vezes e as ordens se cruzam. É a mesma
      // armadilha que `installCardPick` e `installProbe` já documentam.
      if (host.__caseTrace === hook) delete host.__caseTrace;
    },
  };
}
