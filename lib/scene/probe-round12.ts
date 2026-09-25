import {
  Mesh,
  Vector3,
  type DataArrayTexture,
  type Material,
  type Matrix4,
  type Object3D,
  type ShaderMaterial,
} from "three";
import { SCROLL_VH } from "@/components/beats/beats";
import {
  CARD_COVER_UV,
  CARD_PLATE_UV,
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
  COVER_LAYER_HEIGHT,
  COVER_LAYER_WIDTH,
} from "./card-layout";
import { stationProgress } from "./case-pose";

/**
 * As medições de aceite da rodada 12 — **só em desenvolvimento**, como toda a
 * sonda. Cada uma lê o **quadro composto** (PROJECT.md §7), nunca o número que
 * o código calculou:
 *
 * - `readings` — quanto da largura cada card ocupa no progresso em que ele é
 *   lido, medido pela **diferença de pixel** entre o quadro com a peça e o
 *   quadro sem ela (`uCardMask`), com o bando escondido. O total fora do quadro
 *   não tem pixel, então sai da projeção e é marcado como tal.
 * - `covers` — a luminância média entregue de cada capa, e a correlação dela
 *   com a luminância da **imagem original** amostrada nos mesmos pontos da
 *   capa. "A imagem continua sendo a imagem" é uma correlação, não um olhar.
 *
 * O grão é animado por quadro e entra na diferença entre dois quadros como
 * ruído de tela cheia: estas medições pedem `?grain=0` na URL, e conferem.
 */

export type Round12Deps = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  bindDefault: () => void;
  scene: Object3D;
  step: (frames?: number) => void;
  /** Redesenha sem avançar o relógio — ver `hold` em `probe.ts`. */
  hold: (frames?: number) => void;
  settle: (progress: number, steps?: number) => void;
  progressRef: { current: number };
  camera: {
    projectionMatrix: Matrix4;
    matrixWorldInverse: Matrix4;
    position: Vector3;
  };
  cards: readonly { x: number; y: number; z: number; w: number }[];
  cardCount: { value: number };
  cardMask: { value: number };
  toLinear: Float32Array;
  grain: boolean;
};

function findFlock(scene: Object3D): Mesh[] {
  const found: Mesh[] = [];
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material as Material & Partial<ShaderMaterial>;
    const uniforms = material.uniforms ?? {};
    if ("uPos" in uniforms && "uBodyScale" in uniforms) found.push(object);
  });
  return found;
}

function findCoverArray(scene: Object3D): DataArrayTexture | null {
  let found: DataArrayTexture | null = null;
  scene.traverse((object) => {
    if (found !== null || !(object instanceof Mesh)) return;
    const material = object.material as Material & Partial<ShaderMaterial>;
    const texture = material.uniforms?.["uCoverArray"]?.value as
      | DataArrayTexture
      | undefined;
    if (texture !== undefined) found = texture;
  });
  return found;
}

export function installRound12(deps: Round12Deps) {
  const {
    canvas,
    gl,
    bindDefault,
    scene,
    step,
    hold,
    settle,
    progressRef,
    camera,
    cards,
    cardCount,
    cardMask,
    toLinear,
  } = deps;

  const read = (into: Uint8Array) => {
    bindDefault();
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, into);
    return into;
  };

  const lum = (p: Uint8Array | Uint8ClampedArray, at: number) =>
    0.2126 * (toLinear[p[at] ?? 0] ?? 0) +
    0.7152 * (toLinear[p[at + 1] ?? 0] ?? 0) +
    0.0722 * (toLinear[p[at + 2] ?? 0] ?? 0);

  /** Desce de `from` até `to` na taxa de uma pessoa, um quadro por vez. */
  const ramp = (from: number, to: number, rate = 1) => {
    const frames = Math.max(1, Math.round((Math.abs(to - from) * SCROLL_VH * 60) / rate));
    for (let f = 1; f <= frames; f += 1) {
      progressRef.current = from + ((to - from) * f) / frames;
      step(1);
    }
  };

  const setVisible = (meshes: readonly Mesh[], on: boolean) => {
    for (const mesh of meshes) mesh.visible = on;
  };

  const clip = new Vector3();
  /** Mundo → pixel de canvas (x da esquerda, y de **baixo**), ou null atrás da lente. */
  const project = (point: Vector3): [number, number] | null => {
    clip.copy(point).applyMatrix4(camera.matrixWorldInverse);
    if (clip.z > -0.05) return null;
    clip.applyMatrix4(camera.projectionMatrix);
    return [(clip.x * 0.5 + 0.5) * canvas.width, (clip.y * 0.5 + 0.5) * canvas.height];
  };

  /** Um ponto do card, em coordenadas de UV do próprio card (v de baixo). */
  const onCard = (card: { x: number; y: number; z: number; w: number }, u: number, v: number) => {
    const lx = (u * 2 - 1) * CARD_HALF_WIDTH;
    const ly = (v * 2 - 1) * CARD_HALF_HEIGHT;
    return new Vector3(
      card.x + Math.cos(card.w) * lx,
      card.y + ly,
      card.z - Math.sin(card.w) * lx,
    );
  };

  const requireNoGrain = () => {
    if (deps.grain) {
      throw new Error("esta medição precisa de ?grain=0: o grão muda a cada quadro e entra na diferença");
    }
  };

  /**
   * Cada card no progresso em que é lido, com o bando escondido: largura visível
   * medida no pixel (colunas em que o quadro com a peça difere do quadro sem
   * ela) e largura total projetada.
   */
  const readings = (options: { threshold?: number; warmFrom?: number } = {}) => {
    requireNoGrain();
    const { threshold = 0.002, warmFrom = 0.3 } = options;
    const flock = findFlock(scene);
    const width = canvas.width;
    const height = canvas.height;
    const A = new Uint8Array(width * height * 4);
    const B = new Uint8Array(width * height * 4);
    const rows: {
      card: number;
      p: number;
      visible: number;
      total: number;
      center: number;
      depth: number;
      /** Primeira e última coluna (px de canvas) em que a peça muda o quadro. */
      span: [number, number];
    }[] = [];

    settle(warmFrom, 150);
    const saved = cardMask.value;
    try {
      for (let i = 0; i < cardCount.value; i += 1) {
        const card = cards[i];
        if (card === undefined) continue;
        const p = stationProgress(card.z);
        ramp(progressRef.current, p);
        setVisible(flock, false);
        cardMask.value = 0;
        step(1);
        read(A);
        // **O mesmo instante**, redesenhado: entre dois quadros seguidos o
        // tempo anda, e a névoa (o halo da fonte tem ruído no tempo) muda
        // sozinha — medido, a diferença "da peça" do card 5 começava 200 px
        // antes da borda dela. Com `hold` só a máscara muda.
        cardMask.value = 2 ** i;
        hold(1);
        read(B);
        cardMask.value = 0;
        setVisible(flock, true);

        let x0 = width;
        let x1 = -1;
        for (let x = 0; x < width; x += 1) {
          let hits = 0;
          for (let y = 0; y < height; y += 2) {
            const at = (y * width + x) * 4;
            if (Math.abs(lum(A, at) - lum(B, at)) > threshold) hits += 1;
            if (hits >= 3) break;
          }
          if (hits >= 3) {
            if (x < x0) x0 = x;
            x1 = x;
          }
        }

        const corners = [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ].map(([u, v]) => project(onCard(card, u ?? 0, v ?? 0)));
        let total = Number.NaN;
        let center = Number.NaN;
        if (corners.every((c) => c !== null)) {
          const xs = corners.map((c) => (c as [number, number])[0]);
          total = (Math.max(...xs) - Math.min(...xs)) / width;
          center = (Math.max(...xs) + Math.min(...xs)) / 2 / width;
        }
        const view = new Vector3(card.x, card.y, card.z).applyMatrix4(camera.matrixWorldInverse);
        rows.push({
          card: i,
          p: Number(p.toFixed(4)),
          visible: x1 < 0 ? 0 : Number(((x1 - x0 + 1) / width).toFixed(3)),
          total: Number(total.toFixed(3)),
          center: Number(center.toFixed(3)),
          depth: Number((-view.z).toFixed(2)),
          span: [x0, x1],
        });
      }
    } finally {
      cardMask.value = saved;
      setVisible(flock, true);
    }
    return { buffer: [width, height], rows };
  };

  /**
   * As capas na leitura, com o bando escondido: média de luminância entregue
   * dentro da capa, e a correlação de Pearson dela com a luminância da imagem
   * da camada do atlas (a mesma imagem, já recortada na razão da capa) nos
   * mesmos pontos. Uma grade de 96 × 48 pontos em UV da capa, cada um
   * projetado para o pixel que o desenhou.
   *
   * Com `sheet`, monta `.screens/<name>`: original à esquerda, renderizada à
   * direita, com os números embaixo.
   */
  const covers = async (
    options: {
      warmFrom?: number;
      sheet?: boolean;
      name?: string;
      port?: number;
      /**
       * `true` apaga a luz do bando (os aglomerados do rig) durante a leitura:
       * é a condição "sem bando por perto", em que a capa só tem a luz própria.
       */
      dark?: boolean;
    } = {},
  ) => {
    requireNoGrain();
    const {
      warmFrom = 0.3,
      sheet = true,
      name = "12-capas.png",
      port = 3131,
      dark = false,
    } = options;
    const host = window as unknown as { __probeClusters?: number[][] };
    const flock = findFlock(scene);
    const atlas = findCoverArray(scene);
    if (atlas === null) throw new Error("atlas de capas não encontrado");
    const layer = atlas.image as unknown as { data: Uint8Array };
    const stride = COVER_LAYER_WIDTH * COVER_LAYER_HEIGHT * 4;
    const width = canvas.width;
    const height = canvas.height;
    const frame = new Uint8Array(width * height * 4);
    const [u0, v0, u1, v1] = CARD_COVER_UV;
    const GU = 96;
    const GV = 48;

    const rows: {
      card: number;
      p: number;
      meanL: number;
      sourceMeanL: number;
      r: number;
      maxL: number;
      samples: number;
    }[] = [];
    const tiles: { source: HTMLCanvasElement; shot: HTMLCanvasElement }[] = [];

    settle(warmFrom, 150);
    try {
      for (let i = 0; i < cardCount.value; i += 1) {
        const card = cards[i];
        if (card === undefined) continue;
        const p = stationProgress(card.z);
        ramp(progressRef.current, p);
        setVisible(flock, false);
        if (dark) host.__probeClusters = [];
        step(2);
        read(frame);
        delete host.__probeClusters;
        setVisible(flock, true);

        const xs: number[] = [];
        const ys: number[] = [];
        let sum = 0;
        let sumSource = 0;
        let maxL = 0;
        for (let gy = 0; gy < GV; gy += 1) {
          for (let gx = 0; gx < GU; gx += 1) {
            // Longe das bordas da capa: o rebaixo escurece 3.5% de cada lado de
            // propósito, e ele não é a imagem.
            const cu = 0.05 + (0.9 * (gx + 0.5)) / GU;
            const cv = 0.05 + (0.9 * (gy + 0.5)) / GV;
            const at = project(onCard(card, u0 + (u1 - u0) * cu, v0 + (v1 - v0) * cv));
            if (at === null) continue;
            const px = Math.floor(at[0]);
            const py = Math.floor(at[1]);
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            const rendered = lum(frame, (py * width + px) * 4);
            const sx = Math.min(COVER_LAYER_WIDTH - 1, Math.floor(cu * COVER_LAYER_WIDTH));
            const sy = Math.min(COVER_LAYER_HEIGHT - 1, Math.floor((1 - cv) * COVER_LAYER_HEIGHT));
            const source = lum(layer.data, i * stride + (sy * COVER_LAYER_WIDTH + sx) * 4);
            xs.push(source);
            ys.push(rendered);
            sum += rendered;
            sumSource += source;
            if (rendered > maxL) maxL = rendered;
          }
        }
        const n = xs.length;
        const mx = sumSource / Math.max(n, 1);
        const my = sum / Math.max(n, 1);
        let sxy = 0;
        let sxx = 0;
        let syy = 0;
        for (let k = 0; k < n; k += 1) {
          const dx = (xs[k] ?? 0) - mx;
          const dy = (ys[k] ?? 0) - my;
          sxy += dx * dy;
          sxx += dx * dx;
          syy += dy * dy;
        }
        const r = sxy / Math.sqrt(Math.max(sxx * syy, 1e-12));
        rows.push({
          card: i,
          p: Number(p.toFixed(4)),
          meanL: Number(my.toFixed(4)),
          sourceMeanL: Number(mx.toFixed(4)),
          r: Number(r.toFixed(3)),
          maxL: Number(maxL.toFixed(4)),
          samples: n,
        });

        if (sheet) {
          // A imagem original, da camada do atlas.
          const source = document.createElement("canvas");
          source.width = COVER_LAYER_WIDTH;
          source.height = COVER_LAYER_HEIGHT;
          const sourcePaper = source.getContext("2d");
          if (sourcePaper === null) throw new Error("sem contexto 2D");
          const sourceImage = sourcePaper.createImageData(COVER_LAYER_WIDTH, COVER_LAYER_HEIGHT);
          sourceImage.data.set(layer.data.subarray(i * stride, (i + 1) * stride));
          sourcePaper.putImageData(sourceImage, 0, 0);

          // A capa renderizada, recortada pela caixa projetada dela.
          const box = [
            [u0, v0],
            [u1, v0],
            [u1, v1],
            [u0, v1],
          ].map(([u, v]) => project(onCard(card, u ?? 0, v ?? 0)));
          const shot = document.createElement("canvas");
          shot.width = COVER_LAYER_WIDTH;
          shot.height = COVER_LAYER_HEIGHT;
          if (box.every((b) => b !== null)) {
            const bx = box.map((b) => (b as [number, number])[0]);
            const by = box.map((b) => (b as [number, number])[1]);
            const cx0 = Math.max(0, Math.floor(Math.min(...bx)));
            const cx1 = Math.min(width, Math.ceil(Math.max(...bx)));
            const cy0 = Math.max(0, Math.floor(Math.min(...by)));
            const cy1 = Math.min(height, Math.ceil(Math.max(...by)));
            const cw = Math.max(1, cx1 - cx0);
            const ch = Math.max(1, cy1 - cy0);
            const crop = document.createElement("canvas");
            crop.width = cw;
            crop.height = ch;
            const cropPaper = crop.getContext("2d");
            if (cropPaper === null) throw new Error("sem contexto 2D");
            const cropImage = cropPaper.createImageData(cw, ch);
            for (let y = 0; y < ch; y += 1) {
              // readPixels vem de baixo para cima.
              const src = ((cy1 - 1 - y) * width + cx0) * 4;
              cropImage.data.set(frame.subarray(src, src + cw * 4), y * cw * 4);
            }
            cropPaper.putImageData(cropImage, 0, 0);
            shot.getContext("2d")?.drawImage(crop, 0, 0, COVER_LAYER_WIDTH, COVER_LAYER_HEIGHT);
          }
          tiles.push({ source, shot });
        }
      }
    } finally {
      delete host.__probeClusters;
      setVisible(flock, true);
    }

    let sent = false;
    if (sheet && tiles.length > 0) {
      const tileW = 420;
      const tileH = Math.round((tileW * COVER_LAYER_HEIGHT) / COVER_LAYER_WIDTH);
      const gap = 14;
      const header = 44;
      const label = 26;
      const out = document.createElement("canvas");
      out.width = gap * 3 + tileW * 2;
      out.height = header + tiles.length * (tileH + label + gap) + gap;
      const paper = out.getContext("2d");
      if (paper === null) throw new Error("sem contexto 2D");
      paper.fillStyle = "#030A12";
      paper.fillRect(0, 0, out.width, out.height);
      paper.fillStyle = "#DCE9EC";
      paper.font = "15px ui-monospace, SFMono-Regular, Menlo, monospace";
      paper.fillText(
        `CAPAS NA LEITURA, BANDO ESCONDIDO${dark ? " E SEM LUZ DELE" : ""} · ORIGINAL | ENTREGUE · BUFFER ${width}×${height}`,
        gap,
        28,
      );
      tiles.forEach((tile, k) => {
        const y = header + k * (tileH + label + gap);
        paper.drawImage(tile.source, gap, y, tileW, tileH);
        paper.drawImage(tile.shot, gap * 2 + tileW, y, tileW, tileH);
        const row = rows[k];
        if (row === undefined) return;
        paper.fillStyle = "#DCE9EC";
        paper.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
        paper.fillText(
          `card ${row.card} · p ${row.p.toFixed(3)} · L original ${row.sourceMeanL.toFixed(3)} · L entregue ${row.meanL.toFixed(3)} · r ${row.r.toFixed(3)}`,
          gap,
          y + tileH + 18,
        );
      });
      const blob = await new Promise<Blob | null>((done) => out.toBlob(done, "image/png"));
      if (blob !== null) {
        const response = await fetch(
          `http://${window.location.hostname}:${port}/shot?name=${encodeURIComponent(name)}`,
          { method: "POST", body: blob },
        );
        sent = response.ok;
      }
    }

    return { buffer: [width, height], dark, rows, sent };
  };

  /**
   * O maior corpo na tela, de 0.00 a 1.00 (critério da rodada 12: nenhum
   * corpo individual acima de 6 px de comprimento em 1440×900).
   *
   * Só o bando desenha (o resto da cena fica invisível), e só um corpo em
   * `subset` (o `#define PROBE_SUBSET` do shader dos corpos), para dois corpos
   * não se fundirem numa componente. Cada componente conexa de pixels acima de
   * `threshold` (luminância linear entregue) é medida pela diagonal da caixa
   * dela, em pixels de CSS — que é o comprimento de um traço em qualquer
   * ângulo, e um pouco a mais para uma mancha redonda.
   *
   * A descida é na taxa de uma pessoa (1 vh/s), um quadro por vez: um corpo
   * perto da lente só existe no quadro em que passa por ela.
   */
  const bodyExtent = (
    options: { subset?: number; samples?: number; threshold?: number; from?: number; to?: number } = {},
  ) => {
    requireNoGrain();
    const { subset = 64, samples = 81, threshold = 0.03, from = 0, to = 1 } = options;
    const flock = findFlock(scene);
    const others: Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof Mesh && !flock.includes(object) && object.visible) others.push(object);
    });
    const width = canvas.width;
    const height = canvas.height;
    const dpr = width / Math.max(window.innerWidth, 1);
    const frame = new Uint8Array(width * height * 4);
    const seen = new Uint8Array(width * height);
    const stack = new Int32Array(width * height);
    const setSubset = (on: boolean) => {
      for (const mesh of flock) {
        const material = mesh.material as ShaderMaterial;
        material.defines ??= {};
        if (on) material.defines["PROBE_SUBSET"] = subset;
        else delete material.defines["PROBE_SUBSET"];
        material.needsUpdate = true;
      }
    };

    const members = new Int32Array(width * height);
    const series: {
      p: number;
      maxPx: number;
      /** O mesmo, só com os pixels acima de metade do pico da componente. */
      maxCore: number;
      bodies: number;
      at: [number, number];
    }[] = [];
    settle(from, 150);
    setSubset(true);
    for (const mesh of others) mesh.visible = false;
    try {
      for (let k = 0; k < samples; k += 1) {
        const target = from + ((to - from) * k) / Math.max(samples - 1, 1);
        if (k > 0) ramp(progressRef.current, target);
        step(1);
        read(frame);
        seen.fill(0);
        let maxPx = 0;
        let maxCore = 0;
        let bodies = 0;
        let at: [number, number] = [0, 0];
        for (let start = 0; start < width * height; start += 1) {
          if (seen[start] === 1) continue;
          if (lum(frame, start * 4) <= threshold) continue;
          // Preenchimento por pilha, vizinhança de 8.
          let top = 0;
          stack[top++] = start;
          seen[start] = 1;
          let x0 = width;
          let x1 = 0;
          let y0 = height;
          let y1 = 0;
          let count = 0;
          let peak = 0;
          while (top > 0) {
            const index = stack[--top] ?? 0;
            members[count++] = index;
            const here = lum(frame, index * 4);
            if (here > peak) peak = here;
            const x = index % width;
            const y = (index - x) / width;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
            for (let dy = -1; dy <= 1; dy += 1) {
              const ny = y + dy;
              if (ny < 0 || ny >= height) continue;
              for (let dx = -1; dx <= 1; dx += 1) {
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                const next = ny * width + nx;
                if (seen[next] === 1) continue;
                if (lum(frame, next * 4) <= threshold) continue;
                seen[next] = 1;
                stack[top++] = next;
              }
            }
          }
          bodies += 1;
          // O núcleo: a caixa dos pixels acima de metade do pico — a largura a
          // meia altura do corpo, sem a cauda do bloom de um corpo denso.
          let cx0 = width;
          let cx1 = 0;
          let cy0 = height;
          let cy1 = 0;
          for (let m = 0; m < count; m += 1) {
            const index = members[m] ?? 0;
            if (lum(frame, index * 4) < peak * 0.5) continue;
            const x = index % width;
            const y = (index - x) / width;
            if (x < cx0) cx0 = x;
            if (x > cx1) cx1 = x;
            if (y < cy0) cy0 = y;
            if (y > cy1) cy1 = y;
          }
          const core = Math.hypot(cx1 - cx0 + 1, cy1 - cy0 + 1) / dpr;
          if (core > maxCore) maxCore = core;
          const length = Math.hypot(x1 - x0 + 1, y1 - y0 + 1) / dpr;
          if (length > maxPx) {
            maxPx = length;
            at = [Math.round((x0 + x1) / 2 / dpr), Math.round((height - (y0 + y1) / 2) / dpr)];
          }
        }
        series.push({
          p: Number(progressRef.current.toFixed(4)),
          maxPx: Number(maxPx.toFixed(1)),
          maxCore: Number(maxCore.toFixed(1)),
          bodies,
          at,
        });
      }
    } finally {
      setSubset(false);
      for (const mesh of others) mesh.visible = true;
    }
    const worst = series.reduce((a, b) => (b.maxPx > a.maxPx ? b : a));
    const worstCore = series.reduce((a, b) => (b.maxCore > a.maxCore ? b : a));
    return { buffer: [width, height], dpr, subset, threshold, worst, worstCore, series };
  };

  /**
   * A onda de densidade da rodada 8, remedida com o método que o
   * MEASUREMENTS.md descreve ("dispersão da contagem de pixels de corpo entre
   * 24 faixas verticais do quadro, 120 quadros em 0.24") — a rodada 8 não
   * deixou a função, então ela é reconstruída aqui e roda **igual** nos dois
   * lados de uma comparação.
   *
   * Pixel de corpo: luminância linear entregue acima de `threshold` num quadro
   * em que só o bando desenha. Dispersão: desvio padrão ÷ média das 24
   * contagens. A série no tempo dá média, mínimo, máximo, amplitude (máx − mín)
   * e o desvio padrão dela.
   */
  const wave = (
    options: { progress?: number; frames?: number; strips?: number; threshold?: number } = {},
  ) => {
    const { progress = 0.24, frames = 120, strips = 24, threshold = 0.01 } = options;
    const flock = findFlock(scene);
    const others: Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof Mesh && !flock.includes(object) && object.visible) others.push(object);
    });
    const width = canvas.width;
    const height = canvas.height;
    const frame = new Uint8Array(width * height * 4);
    const counts = new Float64Array(strips);
    const light = new Float64Array(strips);
    const series: number[] = [];
    /** A luz de cada faixa, quadro a quadro — para a variação no tempo. */
    const history: Float64Array[] = [];
    settle(progress, 150);
    for (const mesh of others) mesh.visible = false;
    try {
      for (let f = 0; f < frames; f += 1) {
        step(1);
        read(frame);
        counts.fill(0);
        light.fill(0);
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const at = (y * width + x) * 4;
            const l = lum(frame, at);
            const strip = Math.min(strips - 1, Math.floor((x * strips) / width));
            light[strip] = (light[strip] ?? 0) + l;
            if (l > threshold) counts[strip] = (counts[strip] ?? 0) + 1;
          }
        }
        history.push(Float64Array.from(light));
        let mean = 0;
        for (const c of counts) mean += c;
        mean /= strips;
        let variance = 0;
        for (const c of counts) variance += (c - mean) ** 2;
        variance /= strips;
        series.push(mean > 0 ? Math.sqrt(variance) / mean : 0);
      }
    } finally {
      for (const mesh of others) mesh.visible = true;
    }
    // A frente da onda passa por uma faixa e ela acende e apaga: a variação
    // relativa da luz de cada faixa **no tempo**, em média sobre as faixas.
    let temporal = 0;
    for (let k = 0; k < strips; k += 1) {
      const values = history.map((h) => h[k] ?? 0);
      const m = values.reduce((a, b) => a + b, 0) / values.length;
      const v = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
      temporal += m > 0 ? Math.sqrt(v) / m : 0;
    }
    temporal /= strips;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const sd = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length);
    const min = Math.min(...series);
    const max = Math.max(...series);
    return {
      buffer: [width, height],
      progress,
      frames,
      mean: Number(mean.toFixed(3)),
      min: Number(min.toFixed(3)),
      max: Number(max.toFixed(3)),
      amplitude: Number((max - min).toFixed(3)),
      deviation: Number(sd.toFixed(3)),
      /** Variação relativa da luz de cada faixa no tempo, média das faixas. */
      temporal: Number(temporal.toFixed(4)),
    };
  };

  /**
   * A maior face chapada de cada quadro (critério da rodada 12: nenhuma face
   * de parede, piso, teto ou peça ocupando mais de 40% do quadro com
   * luminância uniforme).
   *
   * "Face" é o que da geometria atravessa a névoa até a lente, e não a névoa:
   * o quadro `A` (bando escondido) contra o quadro `F`, em que toda superfície
   * sai **preta antes da névoa** (`#define PROBE_BLACK` no concreto, na peça e
   * nos cards). Onde `A` e `F` diferem, há face à vista; onde não diferem, o
   * que se vê é névoa — e névoa uniforme é o escuro da câmara, não um plano.
   *
   * Em blocos de 16 × 16 px de CSS: um bloco é **face chapada** se a face
   * contribui em média mais que `visible` (luminância linear) e o desvio
   * padrão da luminância de `A` dentro dele é menor que `flat`. A maior região
   * conexa (vizinhança de 4) desses blocos, como fração do quadro.
   */
  const flatRegions = (
    options: { samples?: number; from?: number; to?: number; visible?: number; flat?: number } = {},
  ) => {
    requireNoGrain();
    const { samples = 101, from = 0, to = 1, visible = 0.004, flat = 0.0015 } = options;
    const flock = findFlock(scene);
    const surfaces: ShaderMaterial[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Mesh) || flock.includes(object)) return;
      const material = object.material as Material & Partial<ShaderMaterial>;
      const frag = material.fragmentShader ?? "";
      if (frag.includes("PROBE_BLACK")) surfaces.push(material as ShaderMaterial);
    });
    const setBlack = (on: boolean) => {
      for (const material of surfaces) {
        material.defines ??= {};
        if (on) material.defines["PROBE_BLACK"] = 1;
        else delete material.defines["PROBE_BLACK"];
        material.needsUpdate = true;
      }
    };
    const width = canvas.width;
    const height = canvas.height;
    const dpr = width / Math.max(window.innerWidth, 1);
    const tile = Math.max(1, Math.round(16 * dpr));
    const cols = Math.floor(width / tile);
    const rows = Math.floor(height / tile);
    const A = new Uint8Array(width * height * 4);
    const F = new Uint8Array(width * height * 4);
    const flatTile = new Uint8Array(cols * rows);
    const seen = new Uint8Array(cols * rows);
    const series: { p: number; largest: number; flatTiles: number; at: [number, number] }[] = [];

    settle(from, 150);
    try {
      for (let k = 0; k < samples; k += 1) {
        const target = from + ((to - from) * k) / Math.max(samples - 1, 1);
        if (k > 0) ramp(progressRef.current, target);
        setVisible(flock, false);
        step(1);
        read(A);
        setBlack(true);
        hold(1);
        read(F);
        setBlack(false);
        setVisible(flock, true);

        let flatCount = 0;
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            let sum = 0;
            let sq = 0;
            let face = 0;
            let n = 0;
            for (let y = r * tile; y < (r + 1) * tile; y += 1) {
              for (let x = c * tile; x < (c + 1) * tile; x += 1) {
                const at = (y * width + x) * 4;
                const l = lum(A, at);
                sum += l;
                sq += l * l;
                face += Math.abs(l - lum(F, at));
                n += 1;
              }
            }
            const mean = sum / n;
            const sd = Math.sqrt(Math.max(sq / n - mean * mean, 0));
            const isFlat = face / n > visible && sd < flat;
            flatTile[r * cols + c] = isFlat ? 1 : 0;
            if (isFlat) flatCount += 1;
          }
        }
        seen.fill(0);
        let largest = 0;
        let at: [number, number] = [0, 0];
        const queue: number[] = [];
        for (let i = 0; i < cols * rows; i += 1) {
          if (flatTile[i] !== 1 || seen[i] === 1) continue;
          queue.length = 0;
          queue.push(i);
          seen[i] = 1;
          let size = 0;
          let sx = 0;
          let sy = 0;
          while (queue.length > 0) {
            const j = queue.pop() ?? 0;
            size += 1;
            const jc = j % cols;
            const jr = (j - jc) / cols;
            sx += jc;
            sy += jr;
            const next = [
              jc > 0 ? j - 1 : -1,
              jc < cols - 1 ? j + 1 : -1,
              jr > 0 ? j - cols : -1,
              jr < rows - 1 ? j + cols : -1,
            ];
            for (const m of next) {
              if (m < 0 || seen[m] === 1 || flatTile[m] !== 1) continue;
              seen[m] = 1;
              queue.push(m);
            }
          }
          if (size > largest) {
            largest = size;
            // Centro da região em px de CSS, de cima.
            at = [
              Math.round(((sx / size + 0.5) * tile) / dpr),
              Math.round((height - (sy / size + 0.5) * tile) / dpr),
            ];
          }
        }
        series.push({
          p: Number(progressRef.current.toFixed(4)),
          largest: Number((largest / (cols * rows)).toFixed(3)),
          flatTiles: Number((flatCount / (cols * rows)).toFixed(3)),
          at,
        });
      }
    } finally {
      setBlack(false);
      setVisible(flock, true);
    }
    const worst = series.reduce((a, b) => (b.largest > a.largest ? b : a));
    return { buffer: [width, height], tile, visible, flat, worst, series };
  };

  /**
   * A placa de um card na leitura, recortada e ampliada (critério da rodada 12:
   * nenhuma franja de cor em volta das letras). Mede, dentro da placa, a
   * fração de pixels **quentes** (vermelho acima do verde e do azul) e o croma
   * médio (máx − mín dos canais sRGB), e posta o recorte ampliado no coletor.
   */
  const plate = async (
    options: { card?: number; scale?: number; name?: string; port?: number } = {},
  ) => {
    requireNoGrain();
    const { card: index = 3, scale = 3, name = "12-placa.png", port = 3131 } = options;
    const card = cards[index];
    if (card === undefined) throw new Error(`card ${index} não existe`);
    const flock = findFlock(scene);
    const width = canvas.width;
    const height = canvas.height;
    const frame = new Uint8Array(width * height * 4);
    settle(0.3, 150);
    ramp(progressRef.current, stationProgress(card.z));
    setVisible(flock, false);
    step(2);
    read(frame);
    setVisible(flock, true);

    const [u0, v0, u1, v1] = CARD_PLATE_UV;
    const box = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ].map(([u, v]) => project(onCard(card, u ?? 0, v ?? 0)));
    if (box.some((b) => b === null)) throw new Error("placa fora do quadro");
    const bx = box.map((b) => (b as [number, number])[0]);
    const by = box.map((b) => (b as [number, number])[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...bx)));
    const x1 = Math.min(width, Math.ceil(Math.max(...bx)));
    const y0 = Math.max(0, Math.floor(Math.min(...by)));
    const y1 = Math.min(height, Math.ceil(Math.max(...by)));
    const cw = x1 - x0;
    const ch = y1 - y0;

    let warm = 0;
    let chroma = 0;
    let bright = 0;
    let n = 0;
    const crop = document.createElement("canvas");
    crop.width = cw;
    crop.height = ch;
    const paper = crop.getContext("2d");
    if (paper === null) throw new Error("sem contexto 2D");
    const image = paper.createImageData(cw, ch);
    for (let y = 0; y < ch; y += 1) {
      for (let x = 0; x < cw; x += 1) {
        const at = ((y1 - 1 - y) * width + (x0 + x)) * 4;
        const r = frame[at] ?? 0;
        const g = frame[at + 1] ?? 0;
        const b = frame[at + 2] ?? 0;
        image.data.set([r, g, b, 255], (y * cw + x) * 4);
        n += 1;
        chroma += Math.max(r, g, b) - Math.min(r, g, b);
        if (r > g + 4 && r > b + 4) warm += 1;
        if (lum(frame, at) > 0.02) bright += 1;
      }
    }
    paper.putImageData(image, 0, 0);
    const out = document.createElement("canvas");
    out.width = cw * scale;
    out.height = ch * scale;
    const outPaper = out.getContext("2d");
    if (outPaper === null) throw new Error("sem contexto 2D");
    outPaper.imageSmoothingEnabled = false;
    outPaper.drawImage(crop, 0, 0, out.width, out.height);
    const blob = await new Promise<Blob | null>((done) => out.toBlob(done, "image/png"));
    let sent = false;
    if (blob !== null) {
      const response = await fetch(
        `http://${window.location.hostname}:${port}/shot?name=${encodeURIComponent(name)}`,
        { method: "POST", body: blob },
      );
      sent = response.ok;
    }
    return {
      card: index,
      box: [x0, height - y1, cw, ch],
      warmShare: Number((warm / Math.max(n, 1)).toFixed(4)),
      meanChroma: Number((chroma / Math.max(n, 1)).toFixed(2)),
      inkShare: Number((bright / Math.max(n, 1)).toFixed(4)),
      sent,
    };
  };

  /**
   * O mesmo instante, com e sem um conjunto de malhas (índices de
   * `__probe.objects()`): a caixa em que o quadro muda, a luminância média
   * dentro dela nos dois, e os dois quadros postados lado a lado. É o
   * diagnóstico por eliminação da rodada 12, sem o bando andando entre as
   * duas leituras.
   */
  const pairDiff = async (
    options: {
      progress: number;
      hide: readonly number[];
      warmFrom?: number;
      threshold?: number;
      name?: string;
      port?: number;
    },
  ) => {
    const { progress, hide, warmFrom = 0.25, threshold = 0.0015, name = "13-par.png", port = 3131 } = options;
    const meshes: Mesh[] = [];
    scene.traverse((object) => {
      if ((object as { geometry?: unknown }).geometry !== undefined) meshes.push(object as Mesh);
    });
    const width = canvas.width;
    const height = canvas.height;
    const A = new Uint8Array(width * height * 4);
    const B = new Uint8Array(width * height * 4);
    settle(warmFrom, 150);
    ramp(warmFrom, progress);
    step(1);
    read(A);
    for (const index of hide) {
      const mesh = meshes[index];
      if (mesh !== undefined) mesh.visible = false;
    }
    hold(1);
    read(B);
    for (const index of hide) {
      const mesh = meshes[index];
      if (mesh !== undefined) mesh.visible = true;
    }
    let x0 = width;
    let x1 = -1;
    let y0 = height;
    let y1 = -1;
    let changed = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const at = (y * width + x) * 4;
        if (Math.abs(lum(A, at) - lum(B, at)) <= threshold) continue;
        changed += 1;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    let inA = 0;
    let inB = 0;
    let n = 0;
    for (let y = Math.max(0, y0); y <= y1; y += 2) {
      for (let x = Math.max(0, x0); x <= x1; x += 2) {
        const at = (y * width + x) * 4;
        inA += lum(A, at);
        inB += lum(B, at);
        n += 1;
      }
    }
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height * 2;
    const paper = out.getContext("2d");
    if (paper === null) throw new Error("sem contexto 2D");
    for (const [k, frame] of [A, B].entries()) {
      const image = paper.createImageData(width, height);
      for (let y = 0; y < height; y += 1) {
        const source = (height - 1 - y) * width * 4;
        image.data.set(frame.subarray(source, source + width * 4), y * width * 4);
      }
      paper.putImageData(image, 0, k * height);
    }
    const blob = await new Promise<Blob | null>((done) => out.toBlob(done, "image/png"));
    if (blob !== null) {
      await fetch(`http://${window.location.hostname}:${port}/shot?name=${encodeURIComponent(name)}`, {
        method: "POST",
        body: blob,
      });
    }
    return {
      buffer: [width, height],
      changedShare: Number((changed / (width * height)).toFixed(4)),
      box: x1 < 0 ? null : [x0, height - 1 - y1, x1 - x0 + 1, y1 - y0 + 1],
      meanInBox: [Number((inA / Math.max(n, 1)).toFixed(5)), Number((inB / Math.max(n, 1)).toFixed(5))],
    };
  };

  return { readings, covers, bodyExtent, wave, flatRegions, plate, pairDiff };
}
