/**
 * As medições de aceite do descolamento.
 *
 * Vive fora de `probe.ts` só por tamanho; é o mesmo módulo de desenvolvimento e
 * não viaja no chunk de produção.
 *
 * ## As regras que governam o que está aqui
 *
 * **Toda medida tem controle, e o controle vem junto.** PROJECT.md §7: "um
 * número sozinho nunca separa 'o efeito aconteceu' de 'a cena mudou de outro
 * jeito'". Cada grandeza sai três vezes — na região, no controle de fluxo livre
 * e (rodando a página com `?detach=0`) na mesma região sem o efeito.
 *
 * **O controle de fluxo livre é deslocado em Z, não em Y.** Deslocar em Y põe a
 * faixa perto da borda do tubo do bando, onde a densidade já cai por conta da
 * contenção — o "controle" traria o perfil radial junto. Deslocando a mesma
 * pegada de (x, y) para `−3 · H` a montante, o volume é idêntico, as alturas são
 * literalmente as mesmas, e a única diferença é que ali o escoamento ainda não
 * encontrou a peça. As faixas acima e abaixo continuam existindo para o quadro
 * composto, onde não há como deslocar em Z, e ali valem como o par que precisa
 * **concordar entre si** — a mesma lógica da prova de oclusão.
 *
 * **A variância angular sozinha não prova turbulência.** A força foi desenhada
 * perpendicular à velocidade, ou seja para produzir exatamente essa grandeza:
 * medir só ela é perguntar ao código se ele fez o que foi escrito, e um tremor
 * branco passaria. O que separa vórtice de tremor é **escala** — a direção de
 * dois corpos vizinhos tem que se parecer, e parar de se parecer a uma distância
 * característica. Daí a quarta medida, o comprimento de correlação, que para o
 * ruído desta cena deveria cair perto de `0.3 · H` e para tremor cairia perto de
 * zero.
 *
 * **Tudo é acumulado em muitos quadros, e sempre com o `n` junto.** As
 * contra-formas de sete letras são um volume pequeno; num quadro só há poucos
 * corpos lá dentro, e poucos não sustentam nem densidade nem correlação. Um `n`
 * pequeno é um resultado sobre a cena, não um detalhe de implementação.
 *
 * **Os quadros são consumidos em fluxo.** Guardar 24 quadros de 2160×1350 seriam
 * 280 MB; guardar 240 instantes de 16.384 corpos seriam quatro milhões de
 * objetos. As duas funções recebem uma fonte e processam um de cada vez,
 * retendo só os subconjuntos pequenos de que a correlação precisa.
 */

export type ProbeField = {
  data: Float32Array;
  width: number;
  height: number;
  rect: [number, number, number, number];
};

export type MeasureContext = {
  H: number;
  W: number;
  ring: number;
  freeBand: readonly [number, number];
  upstream: number;
  inkHalfWidthH: number;
  specimenZ: number;
  attack: number;
};

/* --- amostragem do campo -------------------------------------------------- */

export function sampleField(field: ProbeField, lx: number, ly: number) {
  const u = (lx - field.rect[0]) / field.rect[2];
  const v = (ly - field.rect[1]) / field.rect[3];
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const x = Math.min(field.width - 1, Math.max(0, Math.floor(u * field.width)));
  const y = Math.min(field.height - 1, Math.max(0, Math.floor(v * field.height)));
  const at = (y * field.width + x) * 4;
  return {
    ax: field.data[at] ?? 0,
    ay: field.data[at + 1] ?? 0,
    /** Distância com sinal, em caixas altas. Negativa dentro da tinta. */
    d: field.data[at + 2] ?? 9,
    enc: field.data[at + 3] ?? 0,
  };
}

/* --- quadro composto ------------------------------------------------------ */

export type Bucket = { pixels: number; body: number; perThousand: number };

export type ComposedResult = {
  frames: number;
  threshold: number;
  /** Anel externo: fora da tinta e **fora** das contra-formas. A aresta. */
  ringOuter: Bucket;
  /** Anel interno: fora da tinta, dentro das contra-formas. */
  ringInner: Bucket;
  /** Dentro da silhueta. As letras são opacas, então aqui só se vê a esteira. */
  silhouette: Bucket;
  /**
   * Perfil vertical da densidade fora da tinta, por faixa de `|y|` em caixas
   * altas, na coluna do título. Separado em cima e embaixo: as duas metades
   * precisam concordar, e é essa concordância que descarta "o bando está torto".
   */
  profileAbove: number[];
  profileBelow: number[];
  profileBins: number[];
  /** Discordância média entre as duas metades do perfil, em porcento. */
  profileSpread: number;
  /** Quinto do título, da esquerda para a direita. Responde "as pontas estão inertes?". */
  columns: { ringOuter: Bucket; silhouette: Bucket }[];
  coralShareOfBodyPixels: number;
  bodyShareOfFrame: number;
};

const COLUMNS = 5;
/** Faixas do perfil vertical: de 0 a 2.4 caixas altas. */
const PROFILE_BINS = 24;
const PROFILE_TOP = 2.4;

function bucket(pixels: number): Bucket {
  return { pixels, body: 0, perThousand: 0 };
}

/**
 * Conta corpos por mil pixels nas regiões definidas no plano da peça.
 *
 * A medida da esteira funciona por um motivo específico e vale escrevê-lo: as
 * letras são **opacas e escrevem profundidade**, então tudo que aparece dentro
 * da silhueta está entre a peça e a câmera. Dentro da silhueta, "densidade de
 * corpos" é literalmente a densidade da esteira — a projeção, que dilui todo o
 * resto, aqui recorta.
 *
 * ## Por que o anel é **dois** anéis
 *
 * Um anel só em volta da silhueta mistura duas coisas que este prompt existe
 * para separar: a **aresta de ataque**, do lado de fora do desenho, e a
 * **contra-forma**, dentro do olho da letra. Medido junto, o número sobe por
 * qualquer um dos dois e não diz qual. O enclausuramento do campo assado já
 * distingue os dois, e sai de graça — então saem dois números.
 *
 * ## Por que não há faixa de fluxo livre nas mesmas alturas
 *
 * Foi medido, e a resposta é geométrica: as letras têm meia-altura de caixa
 * alta `0.5 · H` e a força de separação alcança `~0.5 · H` além disso; o tubo
 * do bando termina em `1.5 · H` (raio 4.6 achatado a 0.72 em Y). As duas
 * fronteiras coincidem — **não existe altura que esteja ao mesmo tempo fora da
 * influência da peça e dentro do bando**. Uma faixa em `[1.2, 2.0] · H` mede a
 * borda do tubo, não o escoamento livre, e usá-la como controle compararia o
 * efeito com o vazio.
 *
 * O que entra no lugar são dois controles melhores: o **perfil vertical
 * inteiro**, que mostra a crista e a depleção em vez de um número só, com as
 * metades de cima e de baixo tendo que concordar entre si; e a mesma máscara
 * com `?detach=0`, que é o controle mais forte possível — mesma geometria,
 * mesmas alturas, mesma semente, sem o efeito.
 *
 * As listas de índices são montadas uma vez: os mapas não mudam entre quadros
 * (o progresso está travado), e varrer 1.2 milhão de pixels dezesseis vezes
 * para tocar meio milhão seria pagar o dobro.
 */
export function measureComposed(
  frameCount: number,
  nextFrame: () => Uint8Array,
  width: number,
  height: number,
  maps: {
    dMap: Float32Array;
    encMap: Float32Array;
    xMap: Float32Array;
    yMap: Float32Array;
  },
  context: MeasureContext,
  threshold: number,
  toLinear: Float32Array,
): ComposedResult {
  const { ring: RING, inkHalfWidthH } = context;

  const outerIndex: number[] = [];
  const outerColumn: number[] = [];
  const innerIndex: number[] = [];
  const silIndex: number[] = [];
  const silColumn: number[] = [];
  /** Índice de faixa do perfil, ou −1. Positivo em cima, negativo embaixo. */
  const profileIndex: number[] = [];
  const profileBin: number[] = [];
  const profileSide: number[] = [];

  for (let index = 0; index < width * height; index += 1) {
    const d = maps.dMap[index] ?? 99;
    const enc = maps.encMap[index] ?? 0;
    const x = maps.xMap[index] ?? 0;
    const y = maps.yMap[index] ?? 0;
    const inColumn = inkHalfWidthH > 0 && Math.abs(x) <= inkHalfWidthH;
    if (!inColumn) continue;
    const column = Math.min(
      COLUMNS - 1,
      Math.max(
        0,
        Math.floor(((x + inkHalfWidthH) / (2 * inkHalfWidthH)) * COLUMNS),
      ),
    );

    if (d <= 0) {
      silIndex.push(index);
      silColumn.push(column);
      continue;
    }

    if (d <= RING) {
      if (enc > 0.5) innerIndex.push(index);
      else if (enc < 0.1) {
        outerIndex.push(index);
        outerColumn.push(column);
      }
    }

    const bin = Math.floor((Math.abs(y) / PROFILE_TOP) * PROFILE_BINS);
    if (bin < PROFILE_BINS) {
      profileIndex.push(index);
      profileBin.push(bin);
      profileSide.push(y >= 0 ? 1 : 0);
    }
  }

  const result: ComposedResult = {
    frames: frameCount,
    threshold,
    ringOuter: bucket(outerIndex.length * frameCount),
    ringInner: bucket(innerIndex.length * frameCount),
    silhouette: bucket(silIndex.length * frameCount),
    profileAbove: new Array<number>(PROFILE_BINS).fill(0),
    profileBelow: new Array<number>(PROFILE_BINS).fill(0),
    profileBins: Array.from(
      { length: PROFILE_BINS },
      (_, i) => ((i + 0.5) / PROFILE_BINS) * PROFILE_TOP,
    ),
    profileSpread: 0,
    columns: Array.from({ length: COLUMNS }, () => ({
      ringOuter: bucket(0),
      silhouette: bucket(0),
    })),
    coralShareOfBodyPixels: 0,
    bodyShareOfFrame: 0,
  };
  for (let column = 0; column < COLUMNS; column += 1) {
    const slot = result.columns[column];
    if (slot === undefined) continue;
    slot.ringOuter.pixels =
      outerColumn.filter((c) => c === column).length * frameCount;
    slot.silhouette.pixels =
      silColumn.filter((c) => c === column).length * frameCount;
  }

  const profileHitAbove = new Float64Array(PROFILE_BINS);
  const profileHitBelow = new Float64Array(PROFILE_BINS);
  const profileTotalAbove = new Float64Array(PROFILE_BINS);
  const profileTotalBelow = new Float64Array(PROFILE_BINS);

  let bodyPixels = 0;
  let coralPixels = 0;
  let scannedPixels = 0;

  const isBody = (pixels: Uint8Array, index: number) => {
    const at = index * 4;
    const r = toLinear[pixels[at] ?? 0] ?? 0;
    const g = toLinear[pixels[at + 1] ?? 0] ?? 0;
    const b = toLinear[pixels[at + 2] ?? 0] ?? 0;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > threshold;
  };

  for (let frame = 0; frame < frameCount; frame += 1) {
    const pixels = nextFrame();

    for (let i = 0; i < outerIndex.length; i += 1) {
      const index = outerIndex[i];
      if (index === undefined || !isBody(pixels, index)) continue;
      result.ringOuter.body += 1;
      const slot = result.columns[outerColumn[i] ?? 0];
      if (slot !== undefined) slot.ringOuter.body += 1;
    }
    for (const index of innerIndex) {
      if (isBody(pixels, index)) result.ringInner.body += 1;
    }
    for (let i = 0; i < silIndex.length; i += 1) {
      const index = silIndex[i];
      if (index === undefined || !isBody(pixels, index)) continue;
      result.silhouette.body += 1;
      const slot = result.columns[silColumn[i] ?? 0];
      if (slot !== undefined) slot.silhouette.body += 1;
    }
    for (let i = 0; i < profileIndex.length; i += 1) {
      const index = profileIndex[i];
      const bin = profileBin[i] ?? 0;
      const above = profileSide[i] === 1;
      if (above) profileTotalAbove[bin] = (profileTotalAbove[bin] ?? 0) + 1;
      else profileTotalBelow[bin] = (profileTotalBelow[bin] ?? 0) + 1;
      if (index === undefined || !isBody(pixels, index)) continue;
      if (above) profileHitAbove[bin] = (profileHitAbove[bin] ?? 0) + 1;
      else profileHitBelow[bin] = (profileHitBelow[bin] ?? 0) + 1;
    }

    // A guarda de coral é sobre o quadro inteiro (o teto do PROJECT.md §3.1 é
    // de tela), e uma varredura completa a cada quatro quadros basta para um
    // teto que não é apertado.
    if (frame % 4 === 0) {
      for (let index = 0; index < width * height; index += 1) {
        scannedPixels += 1;
        if (!isBody(pixels, index)) continue;
        bodyPixels += 1;
        const at = index * 4;
        const r = toLinear[pixels[at] ?? 0] ?? 0;
        const g = toLinear[pixels[at + 1] ?? 0] ?? 0;
        const b = toLinear[pixels[at + 2] ?? 0] ?? 0;
        // Coral contra rosa: os dois têm vermelho acima do verde; o que os
        // separa é o azul (coral 0.07 em linear, rosa 0.39).
        if (b < 0.25 * r && r > 2 * g) coralPixels += 1;
      }
    }
  }

  const finish = (target: Bucket) => {
    target.perThousand = target.pixels > 0 ? (target.body / target.pixels) * 1000 : 0;
  };
  finish(result.ringOuter);
  finish(result.ringInner);
  finish(result.silhouette);
  for (const slot of result.columns) {
    finish(slot.ringOuter);
    finish(slot.silhouette);
  }

  let spread = 0;
  let spreadCount = 0;
  for (let bin = 0; bin < PROFILE_BINS; bin += 1) {
    const above =
      (profileTotalAbove[bin] ?? 0) > 0
        ? ((profileHitAbove[bin] ?? 0) / (profileTotalAbove[bin] ?? 1)) * 1000
        : 0;
    const below =
      (profileTotalBelow[bin] ?? 0) > 0
        ? ((profileHitBelow[bin] ?? 0) / (profileTotalBelow[bin] ?? 1)) * 1000
        : 0;
    result.profileAbove[bin] = above;
    result.profileBelow[bin] = below;
    const mean = (above + below) / 2;
    if (mean > 1) {
      spread += (Math.abs(above - below) / mean) * 100;
      spreadCount += 1;
    }
  }
  result.profileSpread = spreadCount > 0 ? spread / spreadCount : 0;
  result.coralShareOfBodyPixels = bodyPixels > 0 ? coralPixels / bodyPixels : 0;
  result.bodyShareOfFrame = scannedPixels > 0 ? bodyPixels / scannedPixels : 0;
  return result;
}

/* --- estado da simulação -------------------------------------------------- */

type Body = {
  lx: number;
  ly: number;
  lz: number;
  vx: number;
  vy: number;
  vz: number;
  d: number;
  enc: number;
};

export type Dispersion = {
  n: number;
  /** `1 − |média dos versores|`. Zero é laminar, 1 é isotrópico. */
  dispersion: number;
  /** Desvio angular médio em relação à direção média, em graus. */
  meanAngleDeg: number;
  /** Fração da velocidade que é lateral ao eixo do escoamento. */
  lateralShare: number;
};

function dispersionOf(bodies: readonly Body[]): Dispersion {
  const units: [number, number, number][] = [];
  let mx = 0;
  let my = 0;
  let mz = 0;
  let lateral = 0;
  for (const body of bodies) {
    const length = Math.hypot(body.vx, body.vy, body.vz);
    if (length < 1e-5) continue;
    const unit: [number, number, number] = [
      body.vx / length,
      body.vy / length,
      body.vz / length,
    ];
    units.push(unit);
    mx += unit[0];
    my += unit[1];
    mz += unit[2];
    lateral += Math.hypot(body.vx, body.vy) / length;
  }
  if (units.length === 0) {
    return { n: 0, dispersion: 0, meanAngleDeg: 0, lateralShare: 0 };
  }
  const resultantLength = Math.hypot(mx, my, mz);
  const resultant = resultantLength / units.length;
  const dx = resultantLength > 0 ? mx / resultantLength : 0;
  const dy = resultantLength > 0 ? my / resultantLength : 0;
  const dz = resultantLength > 0 ? mz / resultantLength : 1;
  let angle = 0;
  for (const unit of units) {
    const dot = Math.min(1, Math.max(-1, unit[0] * dx + unit[1] * dy + unit[2] * dz));
    angle += Math.acos(dot);
  }
  return {
    n: units.length,
    dispersion: 1 - resultant,
    meanAngleDeg: ((angle / units.length) * 180) / Math.PI,
    lateralShare: lateral / units.length,
  };
}

export type Correlation = {
  frames: number;
  pairs: number;
  /** `C(r)` por faixa de separação, em caixas altas. */
  curve: { rH: number; c: number; pairs: number }[];
  /** Onde `C(r)` cruza `1/e`, em caixas altas. `null` se nunca cruza. */
  lengthH: number | null;
};

const BINS = 20;
const SPAN_H = 2;

/**
 * Acumulador do comprimento de correlação da **flutuação** de direção.
 *
 * A flutuação, e não a direção: todo corpo desta cena voa mais ou menos para
 * +Z, e correlacionar as direções cruas mediria essa média comum, que é
 * altíssima em qualquer regime. O que se correlaciona aqui é a componente
 * perpendicular à direção média do conjunto — o que sobra depois de tirar o
 * escoamento.
 *
 * **Os pares são sempre do mesmo quadro.** Dois corpos de instantes diferentes
 * não têm separação espacial nenhuma; só os histogramas é que se somam.
 *
 * Vórtice tem escala: `C(r)` cai devagar e cruza `1/e` numa distância
 * característica. Tremor branco não tem: `C(r)` já sai perto de zero na primeira
 * faixa. É essa diferença que a variância angular não enxerga.
 */
function createCorrelation(H: number) {
  const sums = new Float64Array(BINS);
  const counts = new Float64Array(BINS);
  let pairs = 0;
  let frames = 0;

  const add = (bodies: readonly Body[]) => {
    frames += 1;
    if (bodies.length < 2) return;

    let mx = 0;
    let my = 0;
    let mz = 0;
    const units: { x: number; y: number; z: number; px: number; py: number; pz: number }[] =
      [];
    for (const body of bodies) {
      const length = Math.hypot(body.vx, body.vy, body.vz);
      if (length < 1e-5) continue;
      const unit = {
        x: body.vx / length,
        y: body.vy / length,
        z: body.vz / length,
        px: body.lx,
        py: body.ly,
        pz: body.lz,
      };
      units.push(unit);
      mx += unit.x;
      my += unit.y;
      mz += unit.z;
    }
    const meanLength = Math.hypot(mx, my, mz);
    if (units.length < 2 || meanLength === 0) return;
    mx /= meanLength;
    my /= meanLength;
    mz /= meanLength;

    const fluctuations: typeof units = [];
    for (const unit of units) {
      const along = unit.x * mx + unit.y * my + unit.z * mz;
      const fx = unit.x - along * mx;
      const fy = unit.y - along * my;
      const fz = unit.z - along * mz;
      const length = Math.hypot(fx, fy, fz);
      if (length < 1e-4) continue;
      fluctuations.push({
        x: fx / length,
        y: fy / length,
        z: fz / length,
        px: unit.px,
        py: unit.py,
        pz: unit.pz,
      });
    }

    const span = SPAN_H * H;
    for (let i = 0; i < fluctuations.length; i += 1) {
      const a = fluctuations[i];
      if (a === undefined) continue;
      for (let j = i + 1; j < fluctuations.length; j += 1) {
        const b = fluctuations[j];
        if (b === undefined) continue;
        const r = Math.hypot(a.px - b.px, a.py - b.py, a.pz - b.pz);
        if (r >= span) continue;
        const slot = Math.min(BINS - 1, Math.floor((r / span) * BINS));
        sums[slot] = (sums[slot] ?? 0) + (a.x * b.x + a.y * b.y + a.z * b.z);
        counts[slot] = (counts[slot] ?? 0) + 1;
        pairs += 1;
      }
    }
  };

  const finish = (): Correlation => {
    const curve: Correlation["curve"] = [];
    for (let slot = 0; slot < BINS; slot += 1) {
      const n = counts[slot] ?? 0;
      curve.push({
        rH: ((slot + 0.5) * SPAN_H) / BINS,
        c: n > 0 ? (sums[slot] ?? 0) / n : 0,
        pairs: n,
      });
    }
    // O cruzamento de 1/e, interpolado entre as faixas que o cercam. Faixas com
    // menos de 30 pares são ruído e não decidem nada.
    const threshold = 1 / Math.E;
    let lengthH: number | null = null;
    let previous: { rH: number; c: number } | null = null;
    for (const point of curve) {
      if (point.pairs < 30) continue;
      if (previous !== null && previous.c >= threshold && point.c < threshold) {
        const drop = previous.c - point.c;
        const t = drop > 0 ? (previous.c - threshold) / drop : 0;
        lengthH = previous.rH + t * (point.rH - previous.rH);
        break;
      }
      previous = point;
    }
    return { frames, pairs, curve, lengthH };
  };

  return { add, finish };
}

export type SimResult = {
  frames: number;
  bodies: number;
  compression: { region: number; freeStream: number; ratio: number };
  turbulence: {
    counterform: Dispersion;
    freeStream: Dispersion;
    correlation: Correlation;
    freeCorrelation: Correlation;
  };
  reattachment: { atW: number; shadow: number; freeStream: number; ratio: number }[];
  /** Corpos que cruzam o plano da peça por quadro, por quinto do título. */
  crossingByColumn: number[];
};

export function measureSim(
  frameCount: number,
  nextSnapshot: () =>
    | { position: Float32Array; velocity: Float32Array; count: number }
    | null,
  field: ProbeField,
  context: MeasureContext,
): SimResult {
  const { H, W, ring: RING, upstream, inkHalfWidthH, specimenZ, attack } = context;
  const c = Math.cos(-attack);
  const s = Math.sin(-attack);

  let compressionRegion = 0;
  let compressionFree = 0;
  const counterform: Body[] = [];
  const freeBodies: Body[] = [];
  const correlation = createCorrelation(H);
  const freeCorrelation = createCorrelation(H);
  const crossing = new Array<number>(COLUMNS).fill(0);
  const distances = [1, 2, 4];
  const shadow = [0, 0, 0];
  const shadowFree = [0, 0, 0];
  let frames = 0;
  let bodies = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const snapshot = nextSnapshot();
    if (snapshot === null) break;
    frames += 1;
    bodies = snapshot.count;

    const inCounterform: Body[] = [];
    const inFree: Body[] = [];

    for (let i = 0; i < snapshot.count; i += 1) {
      const at = i * 4;
      const x = snapshot.position[at] ?? 0;
      const y = snapshot.position[at + 1] ?? 0;
      const z = (snapshot.position[at + 2] ?? 0) - specimenZ;
      const lx = c * x + s * z;
      const ly = y;
      const lz = -s * x + c * z;

      const sample = sampleField(field, lx, ly);
      if (sample === null) continue;
      const d = sample.d;
      const enc = sample.enc;

      // compressão: casca fina logo a montante da silhueta, e a mesma casca
      // deslocada para o fluxo livre.
      if (d > 0 && d <= RING) {
        if (lz > -0.5 * H && lz <= 0) compressionRegion += 1;
        if (lz > -0.5 * H - upstream && lz <= -upstream) compressionFree += 1;
      }

      // recolamento: sombra da tinta, em três lajes a jusante e três a montante.
      if (d <= 0) {
        for (let k = 0; k < distances.length; k += 1) {
          const away = (distances[k] ?? 1) * W;
          if (Math.abs(lz - away) <= 0.25 * W) shadow[k] = (shadow[k] ?? 0) + 1;
          if (Math.abs(lz + upstream + away) <= 0.25 * W) {
            shadowFree[k] = (shadowFree[k] ?? 0) + 1;
          }
        }
      }

      if (Math.abs(lz) <= 0.5 * H && inkHalfWidthH > 0) {
        const xh = lx / H;
        if (Math.abs(xh) <= inkHalfWidthH) {
          const column = Math.min(
            COLUMNS - 1,
            Math.max(
              0,
              Math.floor(((xh + inkHalfWidthH) / (2 * inkHalfWidthH)) * COLUMNS),
            ),
          );
          crossing[column] = (crossing[column] ?? 0) + 1;
        }
      }

      const nearCounterform = enc > 0.35;
      if (!nearCounterform) continue;
      const body: Body = {
        lx,
        ly,
        lz,
        vx: snapshot.velocity[at] ?? 0,
        vy: snapshot.velocity[at + 1] ?? 0,
        vz: snapshot.velocity[at + 2] ?? 0,
        d,
        enc,
      };
      if (Math.abs(lz) <= 0.4 * H) inCounterform.push(body);
      else if (Math.abs(lz + upstream) <= 0.4 * H) inFree.push(body);
    }

    counterform.push(...inCounterform);
    freeBodies.push(...inFree);
    correlation.add(inCounterform);
    freeCorrelation.add(inFree);
  }

  const divisor = Math.max(1, frames);
  return {
    frames,
    bodies,
    compression: {
      region: compressionRegion / divisor,
      freeStream: compressionFree / divisor,
      ratio: compressionFree > 0 ? compressionRegion / compressionFree : 0,
    },
    turbulence: {
      counterform: dispersionOf(counterform),
      freeStream: dispersionOf(freeBodies),
      correlation: correlation.finish(),
      freeCorrelation: freeCorrelation.finish(),
    },
    reattachment: distances.map((away, k) => {
      const inShadow = (shadow[k] ?? 0) / divisor;
      const free = (shadowFree[k] ?? 0) / divisor;
      return {
        atW: away,
        shadow: inShadow,
        freeStream: free,
        ratio: free > 0 ? inShadow / free : 0,
      };
    }),
    crossingByColumn: crossing.map((value) => value / divisor),
  };
}
