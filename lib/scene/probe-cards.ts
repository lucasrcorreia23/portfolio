import { Matrix4, Vector3, type Vector4 } from "three";
import {
  CARD_CORNER,
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
  CARD_WIDTH,
  resolveRiver,
  riverClearance,
  WAKE_CARD_INDEX,
  WAKE_CARD_PROGRESS,
  type Card,
} from "./cards";

/**
 * As medições de aceite do rio — **só em desenvolvimento**, como o resto da
 * sonda.
 *
 * Duas perguntas, e as duas com controle, porque um número sozinho nunca separa
 * "o efeito aconteceu" de "a cena mudou de outro jeito" (PROJECT.md §7):
 *
 * 1. **Os cards leem como camadas distintas em profundidade, ou como uma
 *    parede?** Medida no quadro composto, por diferença de médias: a peça sai do
 *    quadro e a pegada é o conjunto de pixels que mudou. Dela saem a largura
 *    projetada entregue, a maciez da borda e a fração ocluída — a largura é a
 *    profundidade que a perspectiva entrega, a maciez é a que a profundidade de
 *    campo entrega, e a oclusão é a que uma parede não teria. O controle é
 *    `?span=3`, que colapsa a corrente em três unidades de Z: uma parede,
 *    literalmente, em que as razões têm que voltar para ~1.00.
 * 2. **Cada card tem esteira própria?** Mesmo método do descolamento: densidade
 *    na sombra da tinta a uma, duas e quatro larguras de card a jusante, subindo
 *    monotonicamente rumo ao escoamento não perturbado. O controle é o modo
 *    `off` — a corrente inteira estacionada —, e o sinal é o modo `solo`, com a
 *    peça medida sozinha no escoamento. Os dois rodam no **mesmo carregamento**,
 *    e a razão é medida na mesma laje: é o estimador que o AGENTS.md registra
 *    como o honesto, e não a razão contra o fluxo livre a montante, que o viés de
 *    contração do bando envenena.
 *
 * ## Por que a pegada é uma diferença de médias, e não de dois quadros
 *
 * A tentação é congelar a simulação: `advance()` com o mesmo timestamp entrega
 * `dt = 0`, nada anda, e a diferença entre os dois quadros é a peça e só ela. Foi
 * a primeira versão, e ela falha por um motivo que só aparece medindo.
 *
 * Um quadro de `dt = 0` **não** é idêntico ao anterior. A energia dos corpos é
 * `|Δv| / (dt·9 + 1e-5)`, e o arrasto de `boids.ts` é por chamada e não por
 * segundo: com `dt = 0` a velocidade ainda encolhe 1.5% e a energia satura em 1
 * para a população inteira. Aquecer até convergir resolve a igualdade dos dois
 * quadros e cria um problema maior — o bando fica na rampa emissiva máxima,
 * esticado e florescendo, e **cobre os cards**. Medido: 85% do quadro acima de
 * L = 0.01, e a pegada de uma peça caindo de 68 mil pixels para 7.
 *
 * Então as duas condições se alternam em quadros **reais**, cada uma acumulando
 * a própria média, e a pegada sai da diferença das médias. O card está parado na
 * tela e entra igual nas duas; o bando anda e vira um brilho difuso que aparece
 * nas duas e se cancela. É a construção da prova de oclusão do corpo de prova,
 * aplicada a uma máscara em vez de a uma contagem.
 *
 * O véu de legibilidade sai da conta: ele reage à luminância sob as caixas de
 * texto, então tirar um card claro mudaria o véu da HUD e um punhado de pixels a
 * duzentos do card entraria na pegada dele. As caixas são desmarcadas durante a
 * medição e devolvidas no fim.
 */

export type CardFootprint = {
  index: number;
  /** Distância do centro do card à câmera, em unidades de mundo. */
  distance: number;
  /** Quanto ele está fora do plano de foco, em unidades de mundo. */
  defocus: number;
  /**
   * Largura projetada **entregue**, em pixels do buffer, medida com os cards da
   * frente fora do quadro — ou seja a peça inteira, e não o pedaço dela que
   * sobrou entre os vizinhos.
   */
  widthPx: number;
  heightPx: number;
  /** Massa da pegada sem oclusão, em pixels acima do piso. */
  corePixels: number;
  /**
   * Quanto da peça os cards mais próximos escondem, 0 a 1.
   *
   * **É a evidência direta de que a corrente não é uma parede**: uma parede é
   * coplanar e não oclui nada. Sai da razão entre a pegada entregue no quadro
   * normal e a pegada com os cards da frente retirados.
   */
  occludedShare: number;
  /** Caixa da pegada no buffer: x0, y0, x1, y1, origem embaixo à esquerda. */
  box: [number, number, number, number];
  /**
   * Largura da transição de 20% a 80% na borda vertical da pegada, em pixels.
   *
   * É o círculo de confusão **entregue**: um card no plano de foco tem borda de
   * um ou dois pixels, um card fora dele tem uma rampa. Medida na própria
   * imagem de diferença, que isola o card contra nada — a borda contra a névoa
   * teria contraste variável e mediria o fundo junto.
   */
  edgeSoftnessPx: number;
  /** Largura projetada calculada, como conferência do instrumento. */
  widthPxComputed: number;
};

export type CorridorReport = {
  progress: number;
  buffer: [number, number];
  /** Distância do plano de foco, em unidades de mundo. */
  focus: number;
  count: number;
  spacing: number;
  clearance: ReturnType<typeof riverClearance>;
  threshold: number;
  cards: CardFootprint[];
  /**
   * Razão da largura projetada entre cards vizinhos em profundidade.
   *
   * O DIRECTION.md §4 deriva o piso de espaçamento exigindo que "o card seguinte
   * projete pelo menos 30% menos largura que o atual" — ou seja razão ≥ 1.3. O
   * piso vale para o par à distância de leitura, que é onde ele foi derivado; os
   * pares mais fundos comprimem por perspectiva e ficam abaixo dele por
   * construção. Uma parede daria 1.00 em todos.
   */
  widthRatios: number[];
  /** Cards visíveis no quadro, dos quais as razões saem. */
  visible: number[];
};

export type WakeSlab = {
  atW: number;
  /** Corpos na sombra da tinta, por mil corpos da laje. */
  shadow: number;
  slabBodies: number;
};

/**
 * Que parte da corrente age no escoamento durante a medição de esteira.
 *
 * - `corridor`: as sete peças, como o site roda. É o que a pessoa vê.
 * - `solo`: só o card medido. É o **sinal** — a esteira daquela peça, sem o
 *   corredor por cima dela.
 * - `off`: nenhuma. É o **controle** — mesma laje, mesma sombra de tinta, mesma
 *   semente, sem efeito nenhum.
 *
 * O par que decide o critério de aceite é `solo` contra `off`, e a razão dos
 * dois é medida **na mesma laje**. `corridor` entra ao lado como a leitura do
 * que existe: a diferença entre ele e `solo` é o corredor, não a peça.
 */
export type WakeMode = "corridor" | "solo" | "off";

export type CardWakeReport = {
  progress: number;
  mode: WakeMode;
  cardIndex: number;
  cardZ: number;
  frames: number;
  bodies: number;
  cameraZ: number;
  /** A jusante do card, em larguras de card. */
  slabs: WakeSlab[];
  /**
   * Perfil radial logo a montante do plano do card: densidade por faixa de
   * distância à silhueta, contra a mesma fatia deslocada para o escoamento não
   * perturbado.
   *
   * **É perfil e não um anel só, e a razão é a mesma que o descolamento
   * aprendeu**: onde a pilha de corpos expulsos se acumula é um resultado, não
   * uma suposição. Um anel escolhido no chute cai do lado errado da pilha e mede
   * o buraco que ela deixou — medido, com o anel de 0.12 alturas de card a
   * aresta parecia **mais vazia** com o efeito ligado do que sem ele.
   */
  edgeProfile: { dH: number; region: number; freeStream: number }[];
  /** Corpos que cruzam o plano de cada card dentro da tinta dele, por quadro. */
  crossingByCard: number[];
};

type Sim = { position: Float32Array; velocity: Float32Array; count: number };

export type CorridorDeps = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  bindDefault: () => void;
  /** Avança **com o mesmo timestamp**: nada se move, tudo é redesenhado. */
  hold: (frames?: number) => void;
  step: (frames?: number) => void;
  settle: (progress: number, steps: number) => void;
  readSim: () => Sim | null;
  /**
   * A corrente como o shader a recebeu — e a sonda **escreve** nela.
   *
   * Tirar um card do quadro é escrevê-lo longe do duto, não ligar um caminho de
   * render só para medir. Ver `park` abaixo.
   */
  cards: Vector4[];
  /**
   * A máscara que esconde cards **do quadro** sem tirá-los do escoamento.
   *
   * É o par de `cards`, e as duas existem porque a pegada e a esteira precisam
   * de coisas opostas: a pegada precisa que o bando siga a **mesma** trajetória
   * nas duas condições, a esteira precisa que ele siga trajetórias diferentes.
   */
  mask: { value: number };
  camera: {
    position: Vector3;
    projectionMatrix: Matrix4;
    matrixWorldInverse: Matrix4;
  };
  /** O alvo da câmera deste quadro — o plano de foco da profundidade de campo. */
  target: Vector3;
  toLinear: Float32Array;
};

/** SDF do retângulo de cantos arredondados — o mesmo que o shader avalia. */
function cardDistance(lx: number, ly: number): number {
  const qx = Math.abs(lx) - CARD_HALF_WIDTH + CARD_CORNER;
  const qy = Math.abs(ly) - CARD_HALF_HEIGHT + CARD_CORNER;
  const wx = Math.max(qx, 0);
  const wy = Math.max(qy, 0);
  return Math.hypot(wx, wy) + Math.min(Math.max(qx, qy), 0) - CARD_CORNER;
}

export function installCorridor(deps: CorridorDeps) {
  const {
    canvas,
    gl,
    bindDefault,
    hold,
    step,
    settle,
    readSim,
    cards: chain,
    mask,
    camera,
    target,
    toLinear,
  } = deps;

  /**
   * Onde um card estacionado vai parar, em Z.
   *
   * Cinco mil unidades a jusante: fora do duto, fora do quadro, e fora de todas
   * as janelas do shader dos boids — a mais longa alcança 28 unidades. Um card
   * estacionado não desenha e não desvia nada, que é exatamente o que a medição
   * precisa dos dois lados.
   */
  const PARK_Z = 5000;

  /**
   * Estaciona um conjunto de cards e devolve a função que os traz de volta.
   *
   * **É por aqui que as duas medições ganham controle.** Para a pegada, um card
   * estacionado é a condição "sem esta peça" do mesmo instante da simulação; a
   * diferença de pixel é a peça. Para a esteira, é melhor ainda: com todos os
   * outros cards estacionados, o que resta no escoamento é **um card só**, e a
   * sombra medida a jusante dele não tem como estar contaminada pelo corredor.
   */
  const park = (indices: readonly number[]) => {
    const saved = indices.map((index) => {
      const slot = chain[index];
      const z = slot?.z ?? 0;
      if (slot !== undefined) slot.z = PARK_Z;
      return { index, z };
    });
    return () => {
      for (const { index, z } of saved) {
        const slot = chain[index];
        if (slot !== undefined) slot.z = z;
      }
    };
  };

  /**
   * Os quatro cantos do card projetados, em pixels do buffer.
   *
   * Serve a duas coisas, e é importante que sejam duas. A primeira é a
   * **conferência** do instrumento: a largura calculada ao lado da entregue, e
   * as duas têm que bater. A segunda é a **janela de busca** — ver `searchBox`.
   */
  const projectedCorners = (card: Card, width: number, height: number) => {
    const matrix = new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const c = Math.cos(card.yaw);
    const s = Math.sin(card.yaw);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const point = new Vector3();
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      point
        .set(
          card.x + c * sx * CARD_HALF_WIDTH,
          card.y + sy * CARD_HALF_HEIGHT,
          card.z - s * sx * CARD_HALF_WIDTH,
        )
        .applyMatrix4(matrix);
      const px = (point.x * 0.5 + 0.5) * width;
      const py = (point.y * 0.5 + 0.5) * height;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  /**
   * Onde procurar a pegada de um card: a projeção calculada, dobrada de tamanho.
   *
   * **Isto é geometria dizendo onde olhar, não dizendo o que se vê**, e a
   * distinção é a mesma que o `planeMap` da sonda do descolamento já faz: as
   * faixas de medição são definidas pela câmera viva, e o que se conta dentro
   * delas são pixels entregues. A largura continua saindo do perfil de coluna.
   *
   * Sem a janela, os cards do fundo mediam qualquer coisa. Rodando a mesma
   * medição duas vezes seguidas, os quatro últimos devolveram 1255, 1681, 1019 e
   * depois 1467, 1755, 1751 px, para peças cuja projeção calculada vai de 233 a
   * 144: o perfil estava pegando o **halo do bloom**, que muda de lugar a cada
   * assentamento porque o bando muda de lugar, e que num card fraco e distante
   * tem amplitude comparável à da própria peça. Com a janela, o mesmo par de
   * rodadas fica dentro de poucos por cento.
   *
   * O fator dois é generoso de propósito: o borrão de profundidade de campo
   * alarga a pegada entregue em ~44 px de cada lado no pior card, e a janela
   * precisa caber isso com folga para não **cortar** o que ela existe para
   * medir.
   */
  const searchBox = (
    card: Card,
    width: number,
    height: number,
  ): [number, number, number, number] => {
    const box = projectedCorners(card, width, height);
    const padX = Math.max(box.width, 40);
    const padY = Math.max(box.height, 40);
    return [
      Math.max(0, Math.floor(box.minX - padX)),
      Math.max(0, Math.floor(box.minY - padY)),
      Math.min(width - 1, Math.ceil(box.maxX + padX)),
      Math.min(height - 1, Math.ceil(box.maxY + padY)),
    ];
  };

  /**
   * A separação em profundidade, medida no quadro composto.
   *
   * Ver o docblock do módulo para o método: quadros reais **intercalados**, a
   * janela de busca, e o véu desligado durante a medição.
   */
  const corridor = (
    options: {
      progress?: number;
      settleSteps?: number;
      /** Pares de leitura congelada, com o bando movido entre eles. */
      pairs?: number;
      threshold?: number;
    } = {},
  ): CorridorReport => {
    const {
      progress = 0.5,
      settleSteps = 700,
      pairs = 8,
      // Piso absoluto em luminância linear entregue, só para tirar o zero. Um
      // degrau de oito bits perto do preto vale 0.0003; quem separa a peça da
      // saia de desfoque não é o piso, é o corte de 25% do pico do perfil.
      threshold = 0.0004,
    } = options;

    const layout = resolveRiver();
    const width = canvas.width;
    const height = canvas.height;

    const veiled = Array.from(
      document.querySelectorAll<HTMLElement>("[data-veil]"),
    );
    for (const node of veiled) node.removeAttribute("data-veil");

    /**
     * A diferença acumulada entre duas condições, dentro de uma janela.
     *
     * Cada par é lido com a simulação **congelada** — dois `hold()` seguidos,
     * `dt = 0`, ninguém anda —, então a diferença de um par é a peça e nada
     * mais. E vários pares, com o bando **movido entre eles**, porque um par
     * sozinho mede a peça *através do bando daquele instante*: onde um corpo
     * opaco estiver na frente, aquele pedaço da peça não muda. Medido, a mesma
     * medição repetida três vezes devolveu 68 mil, mil e dois mil pixels de
     * pegada para o mesmo card, conforme onde o bando estava.
     *
     * ## Por que congelar exige aquecer, e por que aquecer não estraga
     *
     * Um quadro de `dt = 0` não é igual ao anterior de cara: a energia dos
     * corpos é `|Δv| / (dt·9 + 1e-5)` e o arrasto de `boids.ts` é por chamada,
     * não por segundo — com `dt = 0` a velocidade ainda encolhe 1.5% e a energia
     * satura em 1. Ela converge em ~8 quadros parados, e a partir daí dois
     * `hold()` seguidos são **numericamente idênticos**. O bando fica na rampa
     * emissiva máxima nesses quadros, e isso é aceitável porque o que se mede
     * aqui é geometria de pixel, não cor — mas é também a razão de os pares
     * serem vários: o bando saturado cobre mais, e é a variação entre pares que
     * descobre a peça inteira.
     *
     * **As condições são máscaras, não estacionamentos.** O card escondido
     * continua desviando o escoamento, então as duas leituras de um par veem
     * exatamente o mesmo bando. Estacionando, a força sairia junto e a diferença
     * passaria a incluir a esteira — medido, as pegadas saíam três vezes maiores
     * que a projeção calculada, de forma estável e repetível, porque o que estava
     * sendo medido era peça **mais** esteira.
     *
     * **A leitura é só da janela**, e não do quadro inteiro: são cinco megabytes
     * por `readPixels` contra algumas centenas de kilobytes, vezes centenas de
     * quadros.
     */
    const meanDiff = (
      window: [number, number, number, number],
      condA: number,
      condB: number,
    ): Float32Array => {
      const [x0, y0, x1, y1] = window;
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const buffer = new Uint8Array(w * h * 4);
      const a = new Float32Array(w * h);
      const diff = new Float64Array(w * h);

      const readInto = (into: Float32Array) => {
        bindDefault();
        gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
        for (let i = 0; i < w * h; i += 1) {
          const at = i * 4;
          into[i] =
            0.2126 * (toLinear[buffer[at] ?? 0] ?? 0) +
            0.7152 * (toLinear[buffer[at + 1] ?? 0] ?? 0) +
            0.0722 * (toLinear[buffer[at + 2] ?? 0] ?? 0);
        }
      };

      for (let k = 0; k < pairs; k += 1) {
        // Um novo instante do bando, e o congelamento dele.
        step(k === 0 ? 1 : 20);
        hold(10);

        mask.value = condA;
        hold(1);
        readInto(a);

        mask.value = condB;
        hold(1);
        bindDefault();
        gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
        mask.value = 0;

        for (let i = 0; i < w * h; i += 1) {
          const at = i * 4;
          const b =
            0.2126 * (toLinear[buffer[at] ?? 0] ?? 0) +
            0.7152 * (toLinear[buffer[at + 1] ?? 0] ?? 0) +
            0.0722 * (toLinear[buffer[at + 2] ?? 0] ?? 0);
          diff[i] = (diff[i] ?? 0) + Math.abs((a[i] ?? 0) - b);
        }
      }

      const out = new Float32Array(w * h);
      for (let i = 0; i < w * h; i += 1) out[i] = (diff[i] ?? 0) / pairs;
      return out;
    };

    try {
      settle(progress, settleSteps);

      const focus = camera.position.distanceTo(target);
      // Ordem de profundidade: quem está na frente é quem oclui.
      const byDepth = layout.cards
        .map((card) => ({
          card,
          distance: new Vector3(card.x, card.y, card.z).distanceTo(
            camera.position,
          ),
        }))
        .sort((a, b) => a.distance - b.distance);

      const cards: CardFootprint[] = [];

      for (let rank = 0; rank < byDepth.length; rank += 1) {
        const entry = byDepth[rank];
        if (entry === undefined) continue;
        const self = entry.card.index;
        const window = searchBox(entry.card, width, height);

        // A pegada **entregue**, no quadro como ele sai: só este card some.
        const selfBit = 1 << self;
        const deliveredDiff = meanDiff(window, 0, selfBit);
        const delivered = footprint(deliveredDiff, window, threshold);

        // E a pegada **sem oclusão**: os cards da frente saem dos dois lados da
        // comparação, então o que sobra é a peça inteira. Sem isto, um card
        // eclipsado por outro da mesma estação mede o anel que sobrou em volta
        // dele — foi assim que a primeira rodada devolveu 583 px para uma peça
        // de 155.
        let ahead = 0;
        for (let i = 0; i < rank; i += 1) {
          const nearer = byDepth[i];
          if (nearer !== undefined) ahead |= 1 << nearer.card.index;
        }
        const clearDiff =
          ahead === 0 ? deliveredDiff : meanDiff(window, ahead, ahead | selfBit);
        const clear =
          ahead === 0 ? delivered : footprint(clearDiff, window, threshold);

        const box = clear.found ? clear.box : delivered.box;
        cards.push({
          index: entry.card.index,
          distance: entry.distance,
          defocus: Math.abs(entry.distance - focus),
          widthPx: clear.found ? box[2] - box[0] + 1 : 0,
          heightPx: clear.found ? box[3] - box[1] + 1 : 0,
          corePixels: clear.corePixels,
          occludedShare:
            clear.corePixels > 0
              ? Math.max(0, 1 - delivered.corePixels / clear.corePixels)
              : 0,
          box,
          edgeSoftnessPx: clear.found
            ? edgeSoftness(clearDiff, window, box, threshold)
            : 0,
          widthPxComputed: projectedCorners(entry.card, width, height).width,
        });
      }

      // As razões saem só dos cards que **apareceram**: um card fora do quadro
      // tem largura zero, e uma razão contra zero não é uma leitura, é uma
      // divisão. Quais entraram na conta vai no relatório.
      const visible = cards.filter((card) => card.widthPx > 2);
      const widthRatios: number[] = [];
      for (let i = 0; i + 1 < visible.length; i += 1) {
        const near = visible[i];
        const far = visible[i + 1];
        if (near === undefined || far === undefined) continue;
        widthRatios.push(near.widthPx / far.widthPx);
      }

      return {
        progress,
        buffer: [width, height],
        focus,
        count: layout.count,
        spacing: layout.spacing,
        clearance: riverClearance(layout),
        threshold,
        cards,
        widthRatios,
        visible: visible.map((card) => card.index),
      };
    } finally {
      for (const node of veiled) node.setAttribute("data-veil", "");
    }
  };

  /**
   * A pegada de um card, extraída da imagem de diferença por **perfil de
   * coluna e de linha**, e não pela caixa dos pixels que mudaram.
   *
   * **A caixa ingênua mede a saia, não a peça, e mediu.** A primeira versão
   * pegava o mínimo e o máximo de todo pixel com mudança acima de um piso
   * absoluto, e devolveu larguras de 807 a 1045 px para cards cuja largura
   * projetada calculada ia de 395 a 96 — ou seja, uma régua que dava o mesmo
   * número para tudo. A causa é a profundidade de campo: tirar um card muda a
   * profundidade daquela região, o borrão amostra a setenta pixels de distância,
   * e alguns pixels espalhados pelo quadro inteiro cruzam qualquer piso baixo.
   * O bloom faz o mesmo com amplitude menor e alcance maior.
   *
   * O perfil resolve porque a peça é um **retângulo**: somando |Δ| por coluna, a
   * silhueta é um platô e a saia é uma cauda de amplitude baixa. Cortar em 25%
   * do pico da coluna devolve a largura do platô — que é o que a perspectiva
   * entrega — e joga fora a cauda. O mesmo por linha, para a altura.
   *
   * ## O que sobra depois do perfil, e por que sobra proporcionalmente ao desfoque
   *
   * Mesmo com o perfil, a largura entregue dos cards mais distantes ainda vem
   * **acima** da calculada — 152 contra 142, 138 contra 122, 119 contra 102 na
   * primeira rodada a 1456×817 —, e a diferença cresce com a distância. Duas
   * explicações concorriam: halo de bloom, ou piso de detecção do próprio
   * método. Nenhuma das duas é a causa.
   *
   * **É a profundidade de campo.** Medido a 2160×1254, com `?dof=off` a largura
   * entregue bate com a calculada em todos os sete cards, a 1 px — inclusive
   * nos mais distantes, que são os mais desfocados. A causa é geométrica: um
   * retângulo borrado por um kernel de raio `R` tem uma rampa de `100%` a `0%`
   * ao longo de `2R` centrada na borda real, e o corte de 25% dessa rampa cai em
   * `borda + 0.5R` — para fora da peça, não em cima dela. Card mais longe do
   * plano de foco, `R` maior (o círculo de confusão cresce com o desfoque),
   * excesso maior. Não é um defeito do perfil: é o preço de medir a borda de uma
   * peça desfocada com um limiar único.
   *
   * **E o mesmo desfoque piora uma contaminação diferente, mais grave.** Um card
   * escondido revela o bando que estava atrás dele (é o próprio efeito que a
   * medição existe para provar), e às vezes esse bando disocluído forma um
   * brilho que a mesma janela de busca capta como se fosse parte da peça — visto
   * em rodadas repetidas do mesmo card e do mesmo progresso devolvendo larguras
   * **bimodais** (194–201 px numa metade das amostras, 376–392 na outra, para um
   * card calculado em 188). Isso não é ruído de amostra pequena: é a lâmina
   * viajante do bando (ver AGENTS.md, "Três armadilhas do método") entrando e
   * saindo da janela entre uma repetição e outra, ampliada pelo desfoque porque
   * o borrão espalha o brilho disocluído por uma área maior. `pairs` alto e a
   * mediana de várias chamadas de `corridor()` atenuam isto; não o eliminam.
   */
  function footprint(
    diff: Float32Array,
    window: [number, number, number, number],
    floor: number,
  ): {
    box: [number, number, number, number];
    corePixels: number;
    found: boolean;
  } {
    const [wx0, wy0, wx1, wy1] = window;
    const w = wx1 - wx0 + 1;
    const h = wy1 - wy0 + 1;
    const columns = new Float64Array(w);
    const rows = new Float64Array(h);
    let mass = 0;
    let corePixels = 0;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const delta = diff[y * w + x] ?? 0;
        if (delta <= floor) continue;
        columns[x] = (columns[x] ?? 0) + delta;
        rows[y] = (rows[y] ?? 0) + delta;
        mass += delta;
        corePixels += 1;
      }
    }

    if (mass <= 0) return { box: [0, 0, 0, 0], corePixels: 0, found: false };

    const span = (profile: Float64Array): [number, number] | null => {
      let peak = 0;
      for (const value of profile) if (value > peak) peak = value;
      if (peak <= 0) return null;
      const cut = peak * 0.25;
      let from = -1;
      let to = -1;
      for (let i = 0; i < profile.length; i += 1) {
        if ((profile[i] ?? 0) < cut) continue;
        if (from < 0) from = i;
        to = i;
      }
      return from < 0 ? null : [from, to];
    };

    const x = span(columns);
    const y = span(rows);
    if (x === null || y === null) {
      return { box: [0, 0, 0, 0], corePixels, found: false };
    }
    // A caixa sai em coordenadas do buffer, não da janela: quem a lê depois
    // compara com a projeção calculada, que é do buffer.
    return {
      box: [wx0 + x[0], wy0 + y[0], wx0 + x[1], wy0 + y[1]],
      corePixels,
      found: true,
    };
  }

  /**
   * Largura da transição de 20% a 80% na borda esquerda da pegada.
   *
   * Medida na **imagem de diferença**, linha a linha, na faixa central da caixa.
   * A diferença isola o card contra nada: fora dele é zero, dentro é a
   * amplitude do que ele cobre. A borda contra a névoa teria contraste variável
   * e mediria o fundo junto com o desfoque.
   */
  function edgeSoftness(
    diff: Float32Array,
    window: [number, number, number, number],
    box: [number, number, number, number],
    threshold: number,
  ): number {
    const [wx0, wy0, wx1] = window;
    const w = wx1 - wx0 + 1;
    // Da caixa do buffer para a da janela, que é onde a diferença mora.
    const x0 = box[0] - wx0;
    const y0 = box[1] - wy0;
    const x1 = box[2] - wx0;
    const y1 = box[3] - wy0;
    const reach = Math.min(90, Math.max(24, Math.round((x1 - x0) * 0.45)));
    const widths: number[] = [];
    const bandFrom = Math.round(y0 + (y1 - y0) * 0.3);
    const bandTo = Math.round(y0 + (y1 - y0) * 0.7);

    // O pico é o da **peça**, não o da linha: num card distante e fraco uma
    // linha qualquer pode ter pico de ruído, e um degrau de 20% a 80% de ruído é
    // um número inventado. Aqui a linha só entra se ela própria alcançar 40% do
    // que a peça alcança em algum lugar.
    let cardPeak = 0;
    for (let y = bandFrom; y <= bandTo; y += 1) {
      for (let x = Math.max(0, x0 - 24); x <= Math.min(w - 1, x1 + 24); x += 1) {
        const delta = diff[y * w + x] ?? 0;
        if (delta > cardPeak) cardPeak = delta;
      }
    }
    const floor = Math.max(threshold * 4, cardPeak * 0.4);

    // As duas bordas verticais, e a mediana de todas as travessias. Uma borda
    // só é refém do que estiver passando na frente dela: um corpo do bando
    // cruzando o limite mata o degrau daquela linha, e com uma amostra de um
    // lado só isso vira o número. Com as duas e a mediana, ele vira ruído.
    const scan = (
      from: number,
      to: number,
      stepBy: number,
      row: number,
    ): number | null => {
      let peak = 0;
      for (let x = from; x !== to; x += stepBy) {
        const delta = diff[row * w + x] ?? 0;
        if (delta > peak) peak = delta;
      }
      if (peak < floor) return null;
      let at20 = -1;
      for (let x = from; x !== to; x += stepBy) {
        const delta = diff[row * w + x] ?? 0;
        if (at20 < 0 && delta >= 0.2 * peak) at20 = x;
        if (at20 >= 0 && delta >= 0.8 * peak) return Math.abs(x - at20) + 1;
      }
      return null;
    };

    for (let y = bandFrom; y <= bandTo; y += 1) {
      const left = scan(Math.max(0, x0 - 24), Math.min(w - 1, x0 + reach), 1, y);
      const right = scan(Math.min(w - 1, x1 + 24), Math.max(0, x1 - reach), -1, y);
      if (left !== null) widths.push(left);
      if (right !== null) widths.push(right);
    }

    if (widths.length === 0) return 0;
    widths.sort((a, b) => a - b);
    return widths[Math.floor(widths.length / 2)] ?? 0;
  }

  /**
   * A esteira de um card, no estado da simulação.
   *
   * Mesmo método do descolamento: a sombra da tinta a uma, duas e quatro
   * larguras de peça a jusante, contada como **fração da própria laje** e não
   * como número absoluto — é o que cancela a lâmina viajante que a reciclagem
   * produz com o progresso travado (ver o docblock de `measure` em `probe.ts`).
   *
   * O `crossingByCard` responde a outra pergunta, e ela precede a primeira: um
   * card que não recebe escoamento não tem esteira, tem cenário. É o mesmo
   * cheque que descobriu que as letras das pontas do título não recebiam um
   * único corpo.
   */
  const cardWake = (
    options: {
      progress?: number;
      cardIndex?: number;
      settleSteps?: number;
      frames?: number;
      mode?: WakeMode;
    } = {},
  ): CardWakeReport => {
    const {
      progress = WAKE_CARD_PROGRESS,
      cardIndex = WAKE_CARD_INDEX,
      settleSteps = 700,
      frames = 1300,
      mode = "solo",
    } = options;

    const layout = resolveRiver();
    const card = layout.cards[Math.min(cardIndex, layout.cards.length - 1)];
    if (card === undefined) throw new Error("corrente vazia");

    const parked =
      mode === "corridor"
        ? []
        : layout.cards
            .map((other) => other.index)
            .filter((index) => mode === "off" || index !== card.index);
    const restore = park(parked);
    try {
      return measureWake(card, progress, settleSteps, frames, mode, layout);
    } finally {
      restore();
    }
  };

  function measureWake(
    card: Card,
    progress: number,
    settleSteps: number,
    frames: number,
    mode: WakeMode,
    layout: ReturnType<typeof resolveRiver>,
  ): CardWakeReport {
    settle(progress, settleSteps);

    const c = Math.cos(-card.yaw);
    const s = Math.sin(-card.yaw);
    const distances = [1, 2, 4];
    const half = 0.25 * CARD_WIDTH;
    const shadow = [0, 0, 0];
    const slabTotal = [0, 0, 0];
    const crossing = new Array<number>(layout.count).fill(0);
    /** Faixas do perfil da aresta: de 0 a 0.8 altura de card fora da silhueta. */
    const EDGE_BINS = 8;
    const EDGE_TO = 0.8 * (CARD_HALF_HEIGHT * 2);
    const edgeRegion = new Float64Array(EDGE_BINS);
    const edgeFree = new Float64Array(EDGE_BINS);
    let planeTotal = 0;
    let freeTotal = 0;
    // O controle a montante fica a três alturas de card antes do plano — fora
    // da rampa de aproximação, que alcança 1.5 alturas.
    const upstream = 3 * (CARD_HALF_HEIGHT * 2);
    const planeHalf = 0.5 * (CARD_HALF_HEIGHT * 2);

    let counted = 0;
    let bodies = 0;

    for (let frame = 0; frame < frames; frame += 1) {
      step(1);
      const snapshot = readSim();
      if (snapshot === null) break;
      counted += 1;
      bodies = snapshot.count;

      for (let i = 0; i < snapshot.count; i += 1) {
        const at = i * 4;
        const x = snapshot.position[at] ?? 0;
        const y = snapshot.position[at + 1] ?? 0;
        const z = snapshot.position[at + 2] ?? 0;

        // A esteira do card medido.
        const rx = x - card.x;
        const rz = z - card.z;
        const lx = c * rx + s * rz;
        const ly = y - card.y;
        const lz = -s * rx + c * rz;
        const d = cardDistance(lx, ly);

        for (let k = 0; k < distances.length; k += 1) {
          const away = (distances[k] ?? 1) * CARD_WIDTH;
          if (Math.abs(lz - away) > half) continue;
          slabTotal[k] = (slabTotal[k] ?? 0) + 1;
          if (d <= 0) shadow[k] = (shadow[k] ?? 0) + 1;
        }

        const atPlane = lz > -planeHalf && lz <= 0;
        const atFree = lz > -planeHalf - upstream && lz <= -upstream;
        if (atPlane) planeTotal += 1;
        if (atFree) freeTotal += 1;
        if ((atPlane || atFree) && d > 0 && d < EDGE_TO) {
          const slot = Math.min(EDGE_BINS - 1, Math.floor((d / EDGE_TO) * EDGE_BINS));
          if (atPlane) edgeRegion[slot] = (edgeRegion[slot] ?? 0) + 1;
          else edgeFree[slot] = (edgeFree[slot] ?? 0) + 1;
        }

        // E a travessia de **todos** os cards, cada um no seu referencial.
        for (const other of layout.cards) {
          const oc = Math.cos(-other.yaw);
          const os = Math.sin(-other.yaw);
          const ox = x - other.x;
          const oz = z - other.z;
          const olz = -os * ox + oc * oz;
          if (Math.abs(olz) > planeHalf) continue;
          const olx = oc * ox + os * oz;
          if (cardDistance(olx, y - other.y) <= 0) {
            crossing[other.index] = (crossing[other.index] ?? 0) + 1;
          }
        }
      }
    }

    const divisor = Math.max(1, counted);
    return {
      progress,
      mode,
      cardIndex: card.index,
      cardZ: card.z,
      frames: counted,
      bodies,
      cameraZ: camera.position.z,
      slabs: distances.map((away, k) => {
        const total = slabTotal[k] ?? 0;
        return {
          atW: away,
          shadow: total > 0 ? ((shadow[k] ?? 0) / total) * 1000 : 0,
          slabBodies: total / divisor,
        };
      }),
      edgeProfile: Array.from({ length: EDGE_BINS }, (_, slot) => ({
        dH: ((slot + 0.5) / EDGE_BINS) * (EDGE_TO / (CARD_HALF_HEIGHT * 2)),
        region:
          planeTotal > 0 ? ((edgeRegion[slot] ?? 0) / planeTotal) * 1000 : 0,
        freeStream:
          freeTotal > 0 ? ((edgeFree[slot] ?? 0) / freeTotal) * 1000 : 0,
      })),
      crossingByCard: crossing.map((value) => value / divisor),
    };
  }

  return { corridor, cardWake };
}
