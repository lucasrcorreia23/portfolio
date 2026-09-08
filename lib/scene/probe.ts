import { Matrix4, Vector3, type WebGLRenderTarget, type WebGLRenderer } from "three";
import { SEPARATION_PROGRESS } from "@/components/beats/beats";
import {
  measureComposed,
  measureSim,
  sampleField,
  type ComposedResult,
  type MeasureContext,
  type ProbeField,
  type SimResult,
} from "./probe-measure";
import { sceneSettings } from "./settings";
import { TYPE_ARTICLE, TYPE_FIELD } from "./type-article";
import { currentTypeField, typeFieldBakeCount } from "./type-field";
import { SPECIMEN_SIZE, SPECIMEN_Z } from "./world";

/**
 * A sonda de medição — **só em desenvolvimento**.
 *
 * O banco de prova (`lib/scene/bench.ts`) mede tempo, e por isso roda na build
 * de produção. Esta sonda mede **pixel e estado da simulação**, que são
 * idênticos nas duas builds — mesmos shaders, mesmo three, mesmo teto de DPR —,
 * então ela não precisa viajar nos 350 kB do chunk da cena. Quem a apaga é o
 * `process.env.NODE_ENV` no ramo de `SceneWorld`, que o Next substitui por
 * literal, e a paridade dev/prod de um quadro é conferida antes de confiar nos
 * números.
 *
 * ## O que ela existe para consertar
 *
 * A prova de oclusão do beat anterior deixou três números no AGENTS.md — 3.88
 * dentro da faixa das letras contra 6.84 acima e 6.72 abaixo — e **nada** que
 * diga onde ficavam as faixas, qual era o limiar de "corpo visível" ou como se
 * contava. Os três são comparáveis entre si e com mais nada; refazer a medição
 * depois do descolamento significaria reinventar a geometria e comparar com uma
 * régua diferente. Aqui a geometria é código: as faixas são definidas no
 * **referencial local da peça** e projetadas com a câmera viva, o limiar é um
 * parâmetro com valor registrado, e cada conclusão sai também em 0.8× e 1.25×
 * dele.
 *
 * ## Os dois instrumentos, e por que são dois
 *
 * PROJECT.md §7 manda medir no ponto de entrega. Para densidade isso é o quadro
 * composto, e é o que a sonda usa. Duas grandezas, porém, não cabem num quadro
 * parado:
 *
 * - **Direção de velocidade** não existe numa imagem estática, e o escoamento
 *   vem quase de frente para a câmera, então nem a orientação projetada ajuda.
 * - **O perfil por distância a jusante** é 3D: a projeção integra ~66 unidades
 *   de tubo ao longo do raio e dilui um efeito de uma unidade.
 *
 * Para essas duas a sonda lê as FBOs de posição e velocidade. Isso é ler o ponto
 * de cálculo, e sai dito em cada número que vem dali.
 */

/** O que o `Flock` publica para a sonda. */
export type FlockRead = {
  size: number;
  position: () => WebGLRenderTarget | undefined;
  velocity: () => WebGLRenderTarget | undefined;
};

export type ProbeDeps = {
  gl: WebGLRenderer;
  /** A cena do R3F, para a sonda achar o mesh do corpo de prova. */
  scene: { traverse: (visit: (object: object) => void) => void };
  advance: (timestamp: number) => void;
  camera: {
    projectionMatrix: Matrix4;
    matrixWorldInverse: Matrix4;
    position: Vector3;
  };
  progressRef: { current: number };
  settleRef: { current: ((steps: number) => void) | null };
  flockRef: { current: FlockRead | null };
  attackRef: { readonly current: number };
};

/** Altura de caixa alta, a unidade de todas as distâncias daqui. */
const H = TYPE_ARTICLE.capHeight;
/** Avanço de uma letra, a unidade do critério de recolamento. */
const W = 0.8 * SPECIMEN_SIZE;

/**
 * Limiar de "corpo visível", em luminância linear do quadro composto.
 *
 * **Este número é o que faltava na prova de oclusão.** Sem ele registrado, dois
 * relatórios do mesmo efeito não são comparáveis.
 *
 * E ele não podia ser escolhido "no vale do histograma", que é o instinto: o
 * vale óbvio do quadro em 0.18 fica em L ≈ 0.045, e **0.045 é a face das
 * letras**, não o fundo. Medido em oito quadros, a densidade dentro da silhueta
 * despenca de 666 por mil em τ = 0.040 para 12.4 em τ = 0.048 — esse degrau é a
 * peça saindo da conta. De 0.048 a 0.14 a curva é um platô suave (12.4 → 5.5),
 * que é a população de corpos.
 *
 * Daí 0.070: no meio do platô, e escolhido para que **também os 0.8× da
 * varredura de sensibilidade** (0.056) fiquem acima do degrau. Um τ mais baixo
 * passaria no número central e contaria letra como corpo no braço de baixo.
 */
export const BODY_LUMINANCE = 0.07;

/** Anel em volta da silhueta onde a compressão é medida, em caixas altas. */
const RING = 0.12;
/**
 * Faixa herdada, mantida só porque o tipo do contexto a carrega.
 *
 * **Não existe fluxo livre nas mesmas alturas nesta cena** — ver o docblock de
 * `measureComposed`. O controle é o perfil vertical inteiro mais `?detach=0`.
 */
const FREE_BAND: readonly [number, number] = [1.2, 2.0];
/**
 * Deslocamento a montante do controle de fluxo livre nas medidas de simulação.
 *
 * `3 · H = 6.03` unidades, e o número precisa ser maior que o alcance da rampa
 * de aproximação (`1.5 · H = 3.01`) — senão o "controle" está dentro do efeito.
 */
const UPSTREAM = 3 * H;

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i += 1) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Meio-float → float. O campo é RGBA16F e o three devolve os bits crus. */
function halfToFloat(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits & 0x7c00) >> 10;
  const fraction = bits & 0x03ff;
  if (exponent === 0) return sign * 6.103515625e-5 * (fraction / 1024);
  if (exponent === 0x1f) return fraction === 0 ? sign * Infinity : NaN;
  return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

export type ProbeReport = {
  meta: Record<string, unknown>;
  composed: ComposedResult;
  composedLowThreshold: ComposedResult;
  composedHighThreshold: ComposedResult;
  sim: SimResult;
};

export function installProbe(deps: ProbeDeps): () => void {
  const { gl, scene, advance, camera, progressRef, settleRef, flockRef, attackRef } =
    deps;
  const context = gl.getContext();
  let elapsed = 0;

  const step = (frames = 1, dt = 1 / 60) => {
    for (let i = 0; i < frames; i += 1) {
      elapsed += dt;
      advance(elapsed);
    }
  };

  /**
   * Fixa o quadro de medição em pixels, independente da janela.
   *
   * Sem isto a medição herda o tamanho da janela do navegador, e a janela de uma
   * sessão dirigida por ferramenta é o que o sistema operacional quiser — aqui
   * ela abriu em 2560×907, uma razão de 2.8:1 em que o título ocupa 49% da
   * largura em vez dos 84% para os quais `SPECIMEN_SIZE` foi resolvido. Medir
   * ali mediria outro enquadramento.
   *
   * O tamanho é imposto no elemento que o R3F **mede** (o pai do canvas), e não
   * no canvas: assim quem reconfigura a razão da câmera e os alvos do compositor
   * é o próprio R3F, pelo caminho normal, e nada fica fora de sincronia.
   */
  const viewport = async (width = 1440, height = 900) => {
    const host = gl.domElement.parentElement;
    if (host === null) return { width: gl.domElement.width, height: gl.domElement.height };
    host.style.width = `${width}px`;
    host.style.height = `${height}px`;
    for (let i = 0; i < 60; i += 1) {
      if (gl.domElement.width === Math.round(width * Math.min(window.devicePixelRatio, 1.5))) {
        break;
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    step(2);
    return { width: gl.domElement.width, height: gl.domElement.height };
  };

  const settle = (progress = SEPARATION_PROGRESS, steps = 150) => {
    progressRef.current = progress;
    settleRef.current?.(steps);
    step(1);
    return { progress, steps };
  };

  /**
   * Os pixels entregues.
   *
   * **A leitura acontece na mesma tarefa do `advance()`.** O canvas não tem
   * `preserveDrawingBuffer`, então o buffer de desenho só é válido até o fim da
   * volta do laço de eventos; um `readPixels` num `setTimeout` devolveria preto.
   *
   * **E o alvo é religado no nulo antes de ler.** O `blit()` salva e restaura o
   * alvo anterior (`lib/scene/gpu.ts`), então o composite final — que desenha no
   * framebuffer padrão — termina devolvendo o alvo da cena. Os pixels chegaram à
   * tela, mas o que está **ligado** é um FBO de meio-float, e ler dali devolve
   * zeros com `INVALID_OPERATION` no console de ninguém. Foi exatamente esse o
   * primeiro resultado desta sonda: quadro cheio na tela, medição toda em preto.
   */
  const composedInto = (pixels: Uint8Array) => {
    step(1);
    gl.setRenderTarget(null);
    context.readPixels(
      0,
      0,
      gl.domElement.width,
      gl.domElement.height,
      context.RGBA,
      context.UNSIGNED_BYTE,
      pixels,
    );
    return pixels;
  };

  const readField = (): ProbeField | null => {
    const held = currentTypeField();
    if (held === null) return null;
    const { target, rect } = held;
    const raw = new Uint16Array(target.width * target.height * 4);
    gl.readRenderTargetPixels(target, 0, 0, target.width, target.height, raw);
    const data = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) data[i] = halfToFloat(raw[i] ?? 0);
    return {
      data,
      width: target.width,
      height: target.height,
      rect: [rect.x, rect.y, rect.z, rect.w],
    };
  };

  const readSim = () => {
    const held = flockRef.current;
    if (held === null) return null;
    const positionTarget = held.position();
    const velocityTarget = held.velocity();
    if (positionTarget === undefined || velocityTarget === undefined) return null;
    const size = held.size;
    const position = new Float32Array(size * size * 4);
    const velocity = new Float32Array(size * size * 4);
    gl.readRenderTargetPixels(positionTarget, 0, 0, size, size, position);
    gl.readRenderTargetPixels(velocityTarget, 0, 0, size, size, velocity);
    return { position, velocity, count: size * size };
  };

  /** Mundo → local da peça, com o mesmo yaw que o shader dos boids usa. */
  const toLocal = (x: number, y: number, z: number) => {
    const yaw = attackRef.current;
    const c = Math.cos(-yaw);
    const s = Math.sin(-yaw);
    const rz = z - SPECIMEN_Z;
    return { x: c * x + s * rz, y, z: -s * x + c * rz };
  };

  /**
   * Para cada pixel, onde ele cai no plano da peça.
   *
   * O caminho oposto — projetar cada texel do campo na tela — deixaria buracos:
   * são 262 mil texels contra ~370 mil pixels de título. Desprojetar por pixel é
   * exato e custa um produto matriz-vetor.
   *
   * As linhas saem de baixo para cima, como o `readPixels` devolve, e é nessa
   * ordem que tudo aqui trabalha.
   */
  const planeMap = (width: number, height: number, field: ProbeField) => {
    const inverse = new Matrix4()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .invert();
    const yaw = attackRef.current;
    const normal = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const origin = camera.position;
    const toPlane =
      (0 - origin.x) * normal.x +
      (0 - origin.y) * normal.y +
      (SPECIMEN_Z - origin.z) * normal.z;

    const dMap = new Float32Array(width * height).fill(99);
    const encMap = new Float32Array(width * height);
    const xMap = new Float32Array(width * height);
    const yMap = new Float32Array(width * height);
    const far = new Vector3();

    for (let py = 0; py < height; py += 1) {
      const ndcY = (2 * (py + 0.5)) / height - 1;
      const row = py * width;
      for (let px = 0; px < width; px += 1) {
        far.set((2 * (px + 0.5)) / width - 1, ndcY, 1).applyMatrix4(inverse);
        const dx = far.x - origin.x;
        const dy = far.y - origin.y;
        const dz = far.z - origin.z;
        const denominator = dx * normal.x + dy * normal.y + dz * normal.z;
        if (Math.abs(denominator) < 1e-9) continue;
        const t = toPlane / denominator;
        if (t <= 0) continue;
        const local = toLocal(origin.x + dx * t, origin.y + dy * t, origin.z + dz * t);
        const index = row + px;
        xMap[index] = local.x / H;
        yMap[index] = local.y / H;
        const sample = sampleField(field, local.x, local.y);
        if (sample !== null) {
          dMap[index] = sample.d;
          encMap[index] = sample.enc;
        }
      }
    }
    return { dMap, encMap, xMap, yMap };
  };

  /**
   * O mesh do corpo de prova, achado pela cena.
   *
   * Pelo `textRenderInfo`, que só o `Text` do troika tem — e não por nome ou
   * ordem, que mudam sem avisar.
   */
  const specimen = (): {
    material: { depthTest: boolean };
    visible: boolean;
  } | null => {
    let found: { material: { depthTest: boolean }; visible: boolean } | null = null;
    scene.traverse((object) => {
      if (found !== null) return;
      if (!("textRenderInfo" in object)) return;
      const mesh = object as unknown as {
        material: { depthTest: boolean } | { depthTest: boolean }[];
        visible: boolean;
      };
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (material === undefined) return;
      found = mesh as unknown as {
        material: { depthTest: boolean };
        visible: boolean;
      };
    });
    return found;
  };

  /**
   * A prova de oclusão, e ela precisa das **duas** metades.
   *
   * O tripleto de faixas horizontais que provava a oclusão antes parou de
   * funcionar quando o descolamento entrou: ele media a queda de corpos na faixa
   * das letras, e o descolamento comprime corpos exatamente ali. Oclusão a menos
   * e compressão a mais caem na mesma faixa de tela e se cancelam.
   *
   * O instrumento certo alterna o estado da própria peça e compara o **mesmo
   * quadro**. E o botão certo é o `depthTest`, não o `depthWrite`: os corpos são
   * opacos e desenham **antes** do glifo, que é transparente. Ou seja, nada no
   * bando é descartado por profundidade por causa das letras — o que acontece é
   * o contrário, o glifo é que é recortado onde um corpo está mais perto. Então:
   *
   * - `A` normal — o glifo passa no teste de profundidade só onde não há corpo
   *   na frente; dentro da silhueta aparece **o que está entre a peça e a
   *   câmera**.
   * - `B` com `depthTest = false` — o glifo pinta a silhueta inteira, sem ser
   *   recortado. Se a oclusão funciona nos dois sentidos, aqui não sobra corpo
   *   nenhum.
   * - `C` com a peça invisível — a silhueta mostra **todos** os corpos ao longo
   *   do raio, inclusive os 52 unidades que a peça esconderia.
   *
   * `A < C` prova que a peça esconde o que está atrás; `A > B` prova que os
   * corpos na frente sobrevivem. Um sem o outro não decide nada.
   *
   * As três condições são intercaladas quadro a quadro em vez de repetirem o
   * mesmo timestamp: um segundo `advance()` com o mesmo tempo roda a simulação
   * com `dt = 0`, e aí `energy = |Δv| / (dt·9 + 1e-5)` estoura para 1 em todo
   * corpo — o quadro "idêntico" sairia com a rampa emissiva inteira diferente.
   * Intercalando, cada condição vê a mesma evolução amostrada nos mesmos
   * intervalos, e a diferença de um sexagésimo de segundo entre elas some na
   * média.
   */
  const occlusion = (frames = 120) => {
    const mesh = specimen();
    if (mesh === null) throw new Error("corpo de prova não encontrado na cena");
    const field = readField();
    if (field === null) throw new Error("o campo não foi assado");

    const width = gl.domElement.width;
    const height = gl.domElement.height;
    const maps = planeMap(width, height, field);
    const inside: number[] = [];
    for (let index = 0; index < width * height; index += 1) {
      if ((maps.dMap[index] ?? 99) <= 0) inside.push(index);
    }

    const pixels = new Uint8Array(width * height * 4);
    const hits = [0, 0, 0];
    const counts = [0, 0, 0];
    const wasDepthTest = mesh.material.depthTest;
    const wasVisible = mesh.visible;

    try {
      for (let frame = 0; frame < frames; frame += 1) {
        const mode = frame % 3;
        mesh.material.depthTest = mode !== 1;
        mesh.visible = mode !== 2;
        composedInto(pixels);
        counts[mode] = (counts[mode] ?? 0) + 1;
        for (const index of inside) {
          const at = index * 4;
          const r = SRGB_TO_LINEAR[pixels[at] ?? 0] ?? 0;
          const g = SRGB_TO_LINEAR[pixels[at + 1] ?? 0] ?? 0;
          const b = SRGB_TO_LINEAR[pixels[at + 2] ?? 0] ?? 0;
          if (0.2126 * r + 0.7152 * g + 0.0722 * b > BODY_LUMINANCE) {
            hits[mode] = (hits[mode] ?? 0) + 1;
          }
        }
      }
    } finally {
      mesh.material.depthTest = wasDepthTest;
      mesh.visible = wasVisible;
    }

    const perThousand = (mode: number) =>
      (counts[mode] ?? 0) > 0
        ? ((hits[mode] ?? 0) / (inside.length * (counts[mode] ?? 1))) * 1000
        : 0;
    const normal = perThousand(0);
    const painted = perThousand(1);
    const removed = perThousand(2);
    return {
      frames,
      silhouettePixels: inside.length,
      threshold: BODY_LUMINANCE,
      /** A: peça normal. Corpos entre a peça e a câmera. */
      normal,
      /** B: glifo sem teste de profundidade. Deve ser ~0. */
      painted,
      /** C: peça invisível. Todos os corpos ao longo do raio. */
      removed,
      /** Quanto a peça esconde do que está atrás. Menor que 1 prova oclusão. */
      hiddenRatio: removed > 0 ? normal / removed : 0,
      /** Quanto sobrevive na frente. Muito maior que 1 prova que passam. */
      infrontRatio: painted > 0 ? normal / painted : Infinity,
    };
  };

  /** Meia-largura da tinta, em caixas altas. */
  const inkHalfWidthH = () => {
    const held = currentTypeField();
    if (held === null) return 0;
    return (held.rect.z / 2 - TYPE_FIELD.margin * H) / H;
  };

  const meta = () => ({
    progress: progressRef.current,
    attack: attackRef.current,
    detach: sceneSettings().detach,
    dof: sceneSettings().dof,
    flock: sceneSettings().flockTextureSize ** 2,
    capHeight: H,
    letterAdvance: W,
    specimenZ: SPECIMEN_Z,
    inkHalfWidthH: inkHalfWidthH(),
    fieldRect: currentTypeField()?.rect.toArray() ?? null,
    bakes: typeFieldBakeCount(),
    buffer: [gl.domElement.width, gl.domElement.height],
    dpr: window.devicePixelRatio,
    viewport: [window.innerWidth, window.innerHeight],
    camera: [camera.position.x, camera.position.y, camera.position.z],
    threshold: BODY_LUMINANCE,
    ring: RING,
    freeBand: FREE_BAND,
    upstream: UPSTREAM,
    locale: document.documentElement.lang,
  });

  const measureContext = (): MeasureContext => ({
    H,
    W,
    ring: RING,
    freeBand: FREE_BAND,
    upstream: UPSTREAM,
    inkHalfWidthH: inkHalfWidthH(),
    specimenZ: SPECIMEN_Z,
    attack: attackRef.current,
  });

  /** O relatório inteiro: as quatro medidas, com controles, num JSON só. */
  const measure = (
    options: {
      progress?: number;
      settleSteps?: number;
      composedFrames?: number;
      composedStride?: number;
      simFrames?: number;
      threshold?: number;
    } = {},
  ): ProbeReport => {
    const {
      progress = SEPARATION_PROGRESS,
      // Um trânsito inteiro para assentar, outro para medir. Ver abaixo.
      settleSteps = 700,
      composedFrames = 40,
      composedStride = 17,
      simFrames = 700,
      threshold = BODY_LUMINANCE,
    } = options;

    /**
     * ## Por que os números são tão grandes
     *
     * Com o progresso **travado**, a câmera não anda — e aí a reciclagem do
     * bando revela uma coisa que a descida real esconde: todo corpo que passa
     * pela lente renasce em `uCameraZ − 64`, que é **um plano**, não uma
     * distribuição. Com a câmera parada, esse plano é sempre o mesmo, e a
     * população se organiza numa lâmina viajante — medido: um terço do bando
     * (5.7 mil de 16.4 mil corpos) num único bin de quatro unidades, com bins
     * vizinhos vazios.
     *
     * A lâmina cruza o duto inteiro (66 unidades a ~6 u/s) em cerca de **660
     * quadros**. Medir menos que isso é medir a fase da lâmina, não a cena: foi
     * o que fez a mesma configuração devolver razão de compressão 1.60 numa
     * rodada e 1.12 na seguinte, e controles de fluxo livre com zero corpos.
     *
     * Então: um trânsito para assentar e um trânsito para medir. No site real
     * a câmera desce enquanto isso acontece, o plano de renascimento se move
     * junto e a lâmina se desmancha — este é um artefato de medir com o
     * progresso travado, não um defeito do bando.
     */
    settle(progress, settleSteps);
    const field = readField();
    if (field === null) throw new Error("o campo não foi assado");

    const width = gl.domElement.width;
    const height = gl.domElement.height;
    const maps = planeMap(width, height, field);
    const context = measureContext();

    const pixels = new Uint8Array(width * height * 4);
    // Os quadros são espaçados de `composedStride`, não consecutivos: quarenta
    // quadros seguidos são 0.67 s de cena e veem a lâmina numa posição só.
    // Espaçados de 17, os mesmos quarenta cobrem os 680 quadros do trânsito.
    const [composed, composedLowThreshold, composedHighThreshold] =
      measureComposed(
        composedFrames,
        () => {
          if (composedStride > 1) step(composedStride - 1);
          return composedInto(pixels);
        },
        width,
        height,
        maps,
        context,
        [threshold, threshold * 0.8, threshold * 1.25],
        SRGB_TO_LINEAR,
      );

    const sim = measureSim(
      simFrames,
      () => {
        step(1);
        return readSim();
      },
      field,
      context,
    );

    if (
      composed === undefined ||
      composedLowThreshold === undefined ||
      composedHighThreshold === undefined
    ) {
      throw new Error("varredura de limiar vazia");
    }

    return {
      meta: {
        ...meta(),
        settleSteps,
        composedFrames,
        composedStride,
        simFrames,
      },
      composed,
      composedLowThreshold,
      composedHighThreshold,
      sim,
    };
  };

  /**
   * A contact sheet: uma grade de quadros no mesmo progresso, com o tempo em
   * cada um.
   *
   * Montada num `<canvas>` 2D dentro da própria página e postada no coletor —
   * não há navegador sem cabeça neste repositório, e mandar um PNG de vários
   * megabytes por dentro de uma chamada de ferramenta seria pior que não ter.
   */
  const sheet = async (
    options: {
      progress?: number;
      columns?: number;
      rows?: number;
      spacingSeconds?: number;
      settleSteps?: number;
      tileWidth?: number;
      name?: string;
      port?: number;
    } = {},
  ) => {
    const {
      progress = SEPARATION_PROGRESS,
      columns = 4,
      rows = 3,
      spacingSeconds = 0.1,
      settleSteps = 150,
      tileWidth = 640,
      name = "03b-descolamento.png",
      port = 3131,
    } = options;

    settle(progress, settleSteps);

    const width = gl.domElement.width;
    const height = gl.domElement.height;
    const tileHeight = Math.round((tileWidth * height) / width);
    const gap = 12;
    const header = 44;
    const label = 26;

    const sheetCanvas = document.createElement("canvas");
    sheetCanvas.width = columns * tileWidth + (columns + 1) * gap;
    sheetCanvas.height = header + rows * (tileHeight + label) + (rows + 1) * gap;
    const paper = sheetCanvas.getContext("2d");
    if (paper === null) throw new Error("sem contexto 2D");

    paper.fillStyle = "#030A12";
    paper.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
    paper.fillStyle = "#DCE9EC";
    paper.font = "16px ui-monospace, SFMono-Regular, Menlo, monospace";
    const info = meta();
    paper.fillText(
      `PROGRESSO ${progress.toFixed(2)} · DESCOLAMENTO ${
        info.detach ? "ON" : "OFF"
      } · BUFFER ${width}×${height} · DPR ${info.dpr} · PASSO ${(
        spacingSeconds * 1000
      ).toFixed(0)} MS`,
      gap,
      28,
    );

    const tile = document.createElement("canvas");
    tile.width = width;
    tile.height = height;
    const tilePaper = tile.getContext("2d");
    if (tilePaper === null) throw new Error("sem contexto 2D");
    const image = tilePaper.createImageData(width, height);
    const pixels = new Uint8Array(width * height * 4);
    const framesPerTile = Math.max(1, Math.round(spacingSeconds * 60));

    for (let index = 0; index < columns * rows; index += 1) {
      if (index > 0) step(framesPerTile - 1);
      composedInto(pixels);
      // `readPixels` entrega de baixo para cima; o canvas 2D espera o contrário.
      for (let y = 0; y < height; y += 1) {
        const source = (height - 1 - y) * width * 4;
        image.data.set(pixels.subarray(source, source + width * 4), y * width * 4);
      }
      tilePaper.putImageData(image, 0, 0);

      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = gap + column * (tileWidth + gap);
      const y = header + gap + row * (tileHeight + label + gap);
      paper.drawImage(tile, x, y, tileWidth, tileHeight);
      paper.fillStyle = "#DCE9EC";
      paper.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
      paper.fillText(
        `t = +${(index * spacingSeconds).toFixed(3)} s`,
        x,
        y + tileHeight + 18,
      );
    }

    const blob = await new Promise<Blob | null>((done) =>
      sheetCanvas.toBlob(done, "image/png"),
    );
    if (blob === null) throw new Error("toBlob falhou");
    const response = await fetch(
      `http://${window.location.hostname}:${port}/shot?name=${encodeURIComponent(name)}`,
      { method: "POST", body: blob },
    );
    return {
      name,
      bytes: blob.size,
      size: [sheetCanvas.width, sheetCanvas.height],
      sent: response.ok,
    };
  };

  const api = {
    meta,
    step,
    settle,
    viewport,
    readField,
    readSim,
    planeMap,
    toLocal,
    measure,
    occlusion,
    sheet,
  };

  const host = window as unknown as { __probe?: typeof api };
  host.__probe = api;
  return () => {
    // Só desinstala se ainda for **esta** instalação. Em desenvolvimento o
    // efeito monta e desmonta várias vezes (StrictMode, Fast Refresh), e as
    // ordens se cruzam: uma limpeza tardia apagava a sonda que uma montagem
    // mais nova tinha acabado de publicar, e a página ficava com o
    // `[probe] pronto` no console e nada em `window.__probe`.
    if (host.__probe === api) delete host.__probe;
  };
}
