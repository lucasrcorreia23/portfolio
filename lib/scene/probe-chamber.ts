import {
  Mesh,
  Raycaster,
  Vector3,
  type Material,
  type Matrix4,
  type Object3D,
  type ShaderMaterial,
} from "three";
import { SCROLL_VH } from "@/components/beats/beats";
import {
  CARD_COVER_UV,
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
} from "./card-layout";
import { stationProgress } from "./case-pose";
import { RIB_CHAMFER, wallX, type ChamberPlan } from "./chamber-plan";

/**
 * As medições de aceite da câmara — **só em desenvolvimento**, como toda a sonda.
 *
 * Os critérios da rodada 7 são de **leitura**, não de calibragem, e cada um é
 * uma coisa que uma caixa lisa não consegue fingir:
 *
 * - `parallax` — três feições de estrutura a distâncias diferentes se deslocam
 *   na tela a velocidades diferentes quando a câmera anda. Uma caixa lisa dá uma
 *   velocidade só.
 * - `presence` — a fração do quadro em que a estrutura aparece **acima da
 *   névoa**, com o bando escondido, ao longo da descida.
 * - `engraving` — o contraste do número gravado contra a parede, no quadro em
 *   que a câmera passa mais perto dela em Quem sou.
 * - `presence` também devolve o teste de "nada emite": a estrutura mais clara de
 *   cada quadro contra o bando mais claro do mesmo quadro.
 *
 * ## "Acima da névoa", definido pelo que a névoa esconde
 *
 * O pixel entregue é `mix(cor, rampa, névoa)`. A parte que é **estrutura** é
 * `cor × (1 − névoa)`, e ela se isola com um segundo quadro em que o concreto
 * sai preto antes da névoa (`PROBE_BLACK`, um `#define` que só a sonda liga): a
 * diferença entre os dois é exatamente a contribuição da estrutura que
 * atravessa a névoa até a lente. Nada de limiar de cor inventado.
 *
 * ## Por que as condições se alternam em quadros reais
 *
 * É a mesma lição de `probe-cards.ts` e da prova de oclusão: um `advance()` com
 * o mesmo timestamp não é um quadro idêntico — a energia do bando satura — e
 * esconder o bando por um `hold()` contaminaria os quadros seguintes. Aqui cada
 * amostra são três quadros consecutivos de 1/60 s: `A` a cena inteira, `B` sem
 * o bando, `C` sem o bando e com o concreto preto. A câmera anda um sexagésimo
 * de segundo entre eles, que é menos de um pixel em qualquer feição medida.
 */

export type ChamberProbeDeps = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  bindDefault: () => void;
  scene: Object3D;
  step: (frames?: number) => void;
  settle: (progress: number, steps?: number) => void;
  progressRef: { current: number };
  camera: {
    projectionMatrix: Matrix4;
    matrixWorldInverse: Matrix4;
    position: Vector3;
  };
  plan: ChamberPlan;
  /** A corrente de cards como o shader a recebe (x, y, z, yaw). */
  cards: readonly { x: number; y: number; z: number; w: number }[];
  cardCount: { value: number };
  toLinear: Float32Array;
};

type Layers = {
  flock: Mesh[];
  chamber: Mesh[];
  structure: Mesh[];
};

function findLayers(scene: Object3D): Layers {
  const layers: Layers = { flock: [], chamber: [], structure: [] };
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material as Material & Partial<ShaderMaterial>;
    const uniforms = material.uniforms ?? {};
    const frag = material.fragmentShader ?? "";
    if ("uPos" in uniforms && "uBodyScale" in uniforms) layers.flock.push(object);
    else if ("uAtlas" in uniforms && frag.includes("shadeConcrete")) {
      layers.structure.push(object);
    } else if (frag.includes("shadeConcrete")) layers.chamber.push(object);
  });
  return layers;
}

function setBlack(meshes: readonly Mesh[], on: boolean): void {
  for (const mesh of meshes) {
    const material = mesh.material as ShaderMaterial;
    material.defines ??= {};
    const has = "PROBE_BLACK" in material.defines;
    if (on === has) continue;
    if (on) material.defines["PROBE_BLACK"] = 1;
    else delete material.defines["PROBE_BLACK"];
    material.needsUpdate = true;
  }
}

function setVisible(meshes: readonly Mesh[], on: boolean): void {
  for (const mesh of meshes) mesh.visible = on;
}

export function installChamberProbe(deps: ChamberProbeDeps) {
  const { canvas, gl, bindDefault, scene, step, settle, progressRef, camera, plan, toLinear } =
    deps;
  const { cards, cardCount } = deps;

  const read = (into: Uint8Array) => {
    bindDefault();
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, into);
    return into;
  };

  const lum = (p: Uint8Array, at: number) =>
    0.2126 * (toLinear[p[at] ?? 0] ?? 0) +
    0.7152 * (toLinear[p[at + 1] ?? 0] ?? 0) +
    0.0722 * (toLinear[p[at + 2] ?? 0] ?? 0);

  /** Ponto em quad convexo, por sinal consistente dos produtos vetoriais. */
  const insideQuad = (px: number, py: number, q: readonly number[]) => {
    let sign = 0;
    for (let i = 0; i < 4; i += 1) {
      const ax = q[i * 2] ?? 0;
      const ay = q[i * 2 + 1] ?? 0;
      const bx = q[((i + 1) % 4) * 2] ?? 0;
      const by = q[((i + 1) % 4) * 2 + 1] ?? 0;
      const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
      if (cross === 0) continue;
      const next = cross > 0 ? 1 : -1;
      if (sign === 0) sign = next;
      else if (sign !== next) return false;
    }
    return true;
  };

  /** Desce de `from` até `to` na taxa de uma pessoa, um quadro por vez. */
  const ramp = (from: number, to: number, rate = 1) => {
    const frames = Math.max(1, Math.round(((to - from) * SCROLL_VH * 60) / rate));
    for (let f = 1; f <= frames; f += 1) {
      progressRef.current = from + ((to - from) * f) / frames;
      step(1);
    }
  };

  /**
   * Presença da estrutura e o teste de "nada emite", numa descida.
   *
   * @param threshold contribuição mínima da estrutura, em luminância linear,
   *   para o pixel contar. O padrão é um nível de 8 bits perto do preto
   *   (sRGB 3 → linear 0.0009): o que o olho separa do fundo numa sala escura.
   */
  const presence = (
    options: {
      from?: number;
      to?: number;
      samples?: number;
      warmFrom?: number;
      threshold?: number;
      edgeThreshold?: number;
    } = {},
  ) => {
    const {
      from = 0.1,
      to = 0.85,
      samples = 16,
      warmFrom = 0.0,
      threshold = 0.0009,
      edgeThreshold = 0.0012,
    } = options;
    const layers = findLayers(scene);
    if (layers.chamber.length === 0) throw new Error("câmara não encontrada na cena");
    const n = canvas.width * canvas.height;
    const A = new Uint8Array(n * 4);
    const B = new Uint8Array(n * 4);
    const C = new Uint8Array(n * 4);
    const series: {
      p: number;
      z: number;
      share: number;
      shareStrong: number;
      edgeShare: number;
      structureMax: number;
      flockMax: number;
      emits: boolean;
    }[] = [];

    settle(warmFrom, 150);
    ramp(warmFrom, from);
    const structural = [...layers.chamber, ...layers.structure];
    try {
      for (let s = 0; s < samples; s += 1) {
        const target = from + ((to - from) * s) / Math.max(1, samples - 1);
        if (s > 0) ramp(progressRef.current, target);

        setVisible(layers.flock, true);
        setBlack(structural, false);
        step(1);
        read(A);
        setVisible(layers.flock, false);
        step(1);
        read(B);
        setBlack(structural, true);
        step(1);
        read(C);
        setBlack(structural, false);
        setVisible(layers.flock, true);

        // A contribuição da estrutura, por pixel, para a medida de feição.
        const S = new Float32Array(n);
        for (let i = 0; i < n; i += 1) S[i] = lum(B, i * 4) - lum(C, i * 4);
        // **Feição, não parede.** Uma parede lisa também atravessa a névoa — a
        // caixa antiga pontua na fração acima — então a fração sozinha não
        // separa câmara de caixa. O que separa é a quina: um degrau de
        // contribuição em dois pixels, que o grão do concreto (manchas de
        // dezenas de pixels) não produz e um chanfro, um nicho ou uma vala
        // produzem.
        const W = canvas.width;
        let edges = 0;
        for (let y = 2; y < canvas.height - 2; y += 1) {
          for (let x = 2; x < W - 2; x += 1) {
            const i = y * W + x;
            const gx = (S[i + 2] ?? 0) - (S[i - 2] ?? 0);
            const gy = (S[i + 2 * W] ?? 0) - (S[i - 2 * W] ?? 0);
            if (Math.hypot(gx, gy) > edgeThreshold) edges += 1;
          }
        }
        let lit = 0;
        let litStrong = 0;
        let structureMax = 0;
        let flockMax = 0;
        for (let i = 0; i < n; i += 1) {
          const at = i * 4;
          const b = lum(B, at);
          const contribution = b - lum(C, at);
          if (contribution > threshold) lit += 1;
          if (contribution > threshold * 3.3) litStrong += 1;
          // O que a estrutura põe no pixel — não o pixel, que pode estar
          // carregando o bloom de um card vizinho.
          if (contribution > structureMax) structureMax = contribution;
          const a = lum(A, at);
          if (a - b > 0.004 && a > flockMax) flockMax = a;
        }
        series.push({
          p: Number(progressRef.current.toFixed(3)),
          z: Number(camera.position.z.toFixed(1)),
          share: Number((lit / n).toFixed(4)),
          shareStrong: Number((litStrong / n).toFixed(4)),
          edgeShare: Number((edges / n).toFixed(4)),
          structureMax: Number(structureMax.toFixed(4)),
          flockMax: Number(flockMax.toFixed(4)),
          emits: structureMax > flockMax,
        });
      }
    } finally {
      setBlack(structural, false);
      setVisible(layers.flock, true);
    }

    const shares = series.map((row) => row.share);
    const strong = series.map((row) => row.shareStrong);
    const edgesSeries = series.map((row) => row.edgeShare);
    return {
      buffer: [canvas.width, canvas.height],
      threshold,
      min: Math.min(...shares),
      minStrong: Math.min(...strong),
      edgeThreshold,
      minEdges: Math.min(...edgesSeries),
      median: [...shares].sort((a, b) => a - b)[Math.floor(shares.length / 2)],
      emitting: series.filter((row) => row.emits).map((row) => row.p),
      series,
    };
  };

  /** Ponto em mundo → pixel de canvas, ou `null` fora do quadro. */
  const project = (point: Vector3): [number, number] | null => {
    const v = point.clone().applyMatrix4(camera.matrixWorldInverse);
    if (v.z >= -0.05) return null;
    v.applyMatrix4(camera.projectionMatrix);
    const x = (v.x * 0.5 + 0.5) * canvas.width;
    const y = (0.5 - v.y * 0.5) * canvas.height;
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    return [x, y];
  };

  /** Como `project`, mas sem descartar o que cai fora do quadro. */
  const projectLoose = (point: Vector3): [number, number] | null => {
    const v = point.clone().applyMatrix4(camera.matrixWorldInverse);
    if (v.z >= -0.05) return null;
    v.applyMatrix4(camera.projectionMatrix);
    return [(v.x * 0.5 + 0.5) * canvas.width, (0.5 - v.y * 0.5) * canvas.height];
  };

  const raycaster = new Raycaster();
  /** A feição é a primeira coisa da câmara ao longo do raio? */
  const unobstructed = (point: Vector3, meshes: readonly Mesh[]): boolean => {
    const origin = camera.position.clone();
    const dir = point.clone().sub(origin);
    const distance = dir.length();
    raycaster.set(origin, dir.normalize());
    raycaster.far = distance + 0.05;
    const hits = raycaster.intersectObjects(meshes as Mesh[], false);
    const first = hits[0];
    return first === undefined || first.distance >= distance - 0.15;
  };

  /**
   * As feições candidatas: a quina interna de cada quadro, a boca de cada nicho
   * e o centro de cada número gravado.
   */
  const features = () => {
    // Pontos **na face da frente** do anel, no meio da largura dele: a quina
    // interna é chanfrada, e um ponto exatamente nela fica atrás do próprio
    // chanfro para o raio de visibilidade.
    const ribs = plan.ribs.flatMap(({ z, inset, depth }) => {
      const s = plan.section(z);
      // O meio do chanfro interno da frente: é a parte do anel que entra no
      // quadro — a face da frente de um portal fica rente à borda da tela.
      const zc = z + depth / 2 - RIB_CHAMFER / 2 + 0.01;
      const k = inset - RIB_CHAMFER / 2 - 0.01;
      return [
        { kind: "quadro", label: `quadro z${z} est.`, point: new Vector3(s.right - k, 0, zc) },
        { kind: "quadro", label: `quadro z${z} bomb.`, point: new Vector3(-s.left + k, 0, zc) },
        { kind: "quadro", label: `quadro z${z} teto`, point: new Vector3(0, s.ceiling - k, zc) },
        { kind: "quadro", label: `quadro z${z} piso`, point: new Vector3(0, -s.floor + k, zc) },
      ];
    });
    // A boca do nicho: a aresta a montante, onde a parede dobra para dentro.
    const niches = plan.niches.flatMap((niche) =>
      [-1.5, 0.5, 2.5].map((dy) => {
        const z = niche.z + 1.4;
        const s = plan.section(z);
        return {
          kind: "nicho",
          label: `nicho z${niche.z}`,
          point: new Vector3(wallX(s, niche.side) - niche.side * 0.02, niche.y + dy, z),
        };
      }),
    );
    const labels = plan.labels
      .filter((label) => label.surface === "wall")
      .map((label) => {
        const s = plan.section(label.z);
        return {
          kind: "número",
          label: label.text,
          point: new Vector3(wallX(s, label.side), label.y, label.z),
        };
      });
    return [...ribs, ...niches, ...labels];
  };

  /**
   * Paralaxe: velocidade na tela de cada feição visível entre dois quadros
   * separados por `seconds`, descendo na taxa `rate` (vh/s).
   */
  const parallax = (options: { progress?: number; seconds?: number; rate?: number } = {}) => {
    const { progress = 0.6, seconds = 0.5, rate = 1 } = options;
    const layers = findLayers(scene);
    const occluders = [...layers.chamber];
    settle(Math.max(0, progress - 0.1), 150);
    ramp(Math.max(0, progress - 0.1), progress, rate);
    step(1);

    const list = features();
    const before = list.map((f) => ({
      f,
      at: project(f.point),
      clear: unobstructed(f.point, occluders),
      distance: f.point.distanceTo(camera.position),
    }));
    const dp = (seconds * rate) / SCROLL_VH;
    ramp(progressRef.current, progressRef.current + dp, rate);
    step(1);
    const after = list.map((f) => ({
      at: project(f.point),
      clear: unobstructed(f.point, occluders),
    }));

    const rows = before
      .map((b, i) => {
        const a = after[i];
        if (b.at === null || a === undefined || a.at === null || !b.clear || !a.clear) return null;
        const dx = a.at[0] - b.at[0];
        const dy = a.at[1] - b.at[1];
        return {
          kind: b.f.kind,
          label: b.f.label,
          distance: Number(b.distance.toFixed(1)),
          pxPerSecond: Number((Math.hypot(dx, dy) / seconds).toFixed(1)),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    // As três feições visíveis mais próximas, uma por peça (quadro, nicho ou
    // número distintos): o critério pede três feições, não três tipos — e um
    // portal do rio enquadra a vista, então de perto ele já está fora dela.
    const sorted = rows.sort((x, y) => x.distance - y.distance);
    const seen = new Set<string>();
    const three: typeof rows = [];
    for (const row of sorted) {
      const piece = row.label.replace(/ (est\.|bomb\.|teto|piso)$/, "");
      if (seen.has(piece)) continue;
      seen.add(piece);
      three.push(row);
      if (three.length === 3) break;
    }
    return {
      progress,
      seconds,
      buffer: [canvas.width, canvas.height],
      three,
      all: sorted,
    };
  };

  /**
   * O número gravado no quadro em que a câmera passa mais perto da parede em
   * Quem sou. A máscara do número é a diferença entre a cena com e sem as
   * placas (alternadas, `pairs` vezes), e o contraste é medido no quadro
   * entregue: glifo contra parede, dentro da caixa da placa.
   */
  const engraving = async (options: {
    progress?: number;
    pairs?: number;
    name?: string;
    port?: number;
  } = {}) => {
    const layers = findLayers(scene);
    // O quadro de passagem mais rente: a menor distância da câmera a uma parede
    // entre 0.28 e 0.45.
    let progress = options.progress ?? -1;
    if (progress < 0) {
      let best = Infinity;
      for (let p = 0.28; p <= 0.4501; p += 0.005) {
        settle(p, 1);
        const z = camera.position.z;
        const s = plan.section(z);
        const d = Math.min(s.right - camera.position.x, camera.position.x + s.left);
        if (d < best) {
          best = d;
          progress = p;
        }
      }
    }
    const pairs = options.pairs ?? 8;
    settle(Math.max(0, progress - 0.08), 150);
    ramp(Math.max(0, progress - 0.08), progress);

    const n = canvas.width * canvas.height;
    const on = new Float32Array(n);
    const off = new Float32Array(n);
    const buffer = new Uint8Array(n * 4);
    const snapshot = new Uint8Array(n * 4);
    try {
      for (let k = 0; k < pairs; k += 1) {
        setVisible(layers.structure, true);
        step(1);
        read(buffer);
        if (k === 0) snapshot.set(buffer);
        for (let i = 0; i < n; i += 1) on[i] = (on[i] ?? 0) + lum(buffer, i * 4) / pairs;
        setVisible(layers.structure, false);
        step(1);
        read(buffer);
        for (let i = 0; i < n; i += 1) off[i] = (off[i] ?? 0) + lum(buffer, i * 4) / pairs;
      }
    } finally {
      setVisible(layers.structure, true);
    }

    // Uma caixa por número na tela.
    const results = plan.labels
      .filter((label) => label.surface === "wall")
      .map((label) => {
        const s = plan.section(label.z);
        const x = wallX(s, label.side);
        const halfLength = label.text.length * label.cap * 0.45;
        const corners = [
          new Vector3(x, label.y - label.cap, label.z - halfLength),
          new Vector3(x, label.y + label.cap, label.z - halfLength),
          new Vector3(x, label.y - label.cap, label.z + halfLength),
          new Vector3(x, label.y + label.cap, label.z + halfLength),
        ].map(projectLoose);
        if (corners.some((c) => c === null)) return null;
        const xs = corners.map((c) => (c as [number, number])[0]);
        const ys = corners.map((c) => (c as [number, number])[1]);
        // Aparada pela borda: um número que entra de raspão no quadro conta
        // pelo pedaço que está na tela.
        const x0 = Math.max(0, Math.floor(Math.min(...xs)));
        const x1 = Math.min(canvas.width, Math.ceil(Math.max(...xs)));
        const y0 = Math.max(0, Math.floor(Math.min(...ys)));
        const y1 = Math.min(canvas.height, Math.ceil(Math.max(...ys)));
        if (x1 - x0 < 4 || y1 - y0 < 4) return null;
        let glyphSum = 0;
        let glyphN = 0;
        let wallSum = 0;
        let wallN = 0;
        for (let py = y0; py < y1; py += 1) {
          for (let px = x0; px < x1; px += 1) {
            // readPixels é de baixo para cima.
            const i = (canvas.height - 1 - py) * canvas.width + px;
            const a = on[i] ?? 0;
            const b = off[i] ?? 0;
            if (Math.abs(a - b) > Math.max(0.0004, b * 0.08)) {
              glyphSum += a;
              glyphN += 1;
            } else {
              wallSum += a;
              wallN += 1;
            }
          }
        }
        if (glyphN < 20 || wallN < 20) return null;
        const lg = glyphSum / glyphN;
        const lw = wallSum / wallN;
        const capPx = Math.abs(
          ((projectLoose(new Vector3(x, label.y + label.cap / 2, label.z)) ?? [0, 0])[1]) -
            ((projectLoose(new Vector3(x, label.y - label.cap / 2, label.z)) ?? [0, 0])[1]),
        );
        return {
          text: label.text,
          box: [x0, y0, x1, y1],
          capPx: Number(capPx.toFixed(1)),
          glyphPixels: glyphN,
          glyphL: Number(lg.toFixed(5)),
          wallL: Number(lw.toFixed(5)),
          weber: Number((Math.abs(lg - lw) / Math.max(lw, 1e-6)).toFixed(3)),
          wcag: Number(((Math.max(lg, lw) + 0.05) / (Math.min(lg, lw) + 0.05)).toFixed(3)),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    // O recorte de cada número, ampliado, para olhar — não para medir.
    let sent: string | null = null;
    if (options.name !== undefined && results.length > 0) {
      const pad = 24;
      const crops = results.map((r) => {
        const [x0, y0, x1, y1] = r.box as [number, number, number, number];
        return {
          x0: Math.max(0, x0 - pad),
          y0: Math.max(0, y0 - pad),
          x1: Math.min(canvas.width, x1 + pad),
          y1: Math.min(canvas.height, y1 + pad),
          text: r.text,
        };
      });
      const zoom = 3;
      const width = Math.max(...crops.map((c) => (c.x1 - c.x0) * zoom)) + 16;
      const height = crops.reduce((sum, c) => sum + (c.y1 - c.y0) * zoom + 30, 16);
      const sheet = document.createElement("canvas");
      sheet.width = width;
      sheet.height = height;
      const paper = sheet.getContext("2d");
      const frame = document.createElement("canvas");
      frame.width = canvas.width;
      frame.height = canvas.height;
      const framePaper = frame.getContext("2d");
      if (paper !== null && framePaper !== null) {
        const image = framePaper.createImageData(canvas.width, canvas.height);
        for (let y = 0; y < canvas.height; y += 1) {
          const source = (canvas.height - 1 - y) * canvas.width * 4;
          image.data.set(snapshot.subarray(source, source + canvas.width * 4), y * canvas.width * 4);
        }
        framePaper.putImageData(image, 0, 0);
        paper.fillStyle = "#030A12";
        paper.fillRect(0, 0, width, height);
        paper.imageSmoothingEnabled = false;
        let y = 8;
        for (const c of crops) {
          paper.fillStyle = "#DCE9EC";
          paper.font = "13px ui-monospace, Menlo, monospace";
          paper.fillText(`${c.text} · p ${progress.toFixed(3)} · ×${zoom}`, 8, y + 14);
          y += 22;
          paper.drawImage(frame, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 8, y, (c.x1 - c.x0) * zoom, (c.y1 - c.y0) * zoom);
          y += (c.y1 - c.y0) * zoom + 8;
        }
        const blob = await new Promise<Blob | null>((done) => sheet.toBlob(done, "image/png"));
        if (blob !== null) {
          const response = await fetch(
            `http://${window.location.hostname}:${options.port ?? 3131}/shot?name=${encodeURIComponent(options.name)}`,
            { method: "POST", body: blob },
          );
          sent = response.ok ? options.name : null;
        }
      }
    }

    return {
      progress: Number(progress.toFixed(3)),
      camera: [camera.position.x, camera.position.y, camera.position.z].map((v) => Number(v.toFixed(2))),
      buffer: [canvas.width, canvas.height],
      labels: results,
      sent,
    };
  };

  /**
   * As capas na travessia do rio (rodada 9): a luminância máxima dentro do
   * retângulo projetado de cada capa, **no quadro sem o bando** (um corpo na
   * frente da capa não é a capa), contra o bando mais claro do mesmo quadro; e a
   * distância até o próximo card à frente da câmera.
   *
   * Mesmos três quadros consecutivos da presença: A com tudo, B sem o bando.
   */
  const covers = (options: { from?: number; to?: number; samples?: number } = {}) => {
    const { from = 0.45, to = 0.85, samples = 17 } = options;
    const layers = findLayers(scene);
    const n = canvas.width * canvas.height;
    const A = new Uint8Array(n * 4);
    const B = new Uint8Array(n * 4);
    const [u0, v0, u1, v1] = CARD_COVER_UV;
    const series: {
      p: number;
      z: number;
      coverMax: number;
      flockMax: number;
      ahead: number | null;
      /** O pixel mais claro das capas: card, x, y (de cima), r, g, b em sRGB. */
      maxAt: number[];
    }[] = [];

    settle(0.3, 150);
    ramp(0.3, from);
    try {
      for (let s = 0; s < samples; s += 1) {
        const target = from + ((to - from) * s) / Math.max(1, samples - 1);
        if (s > 0) ramp(progressRef.current, target);
        setVisible(layers.flock, true);
        step(1);
        read(A);
        setVisible(layers.flock, false);
        step(1);
        read(B);
        setVisible(layers.flock, true);

        // Os quads de cada card — o card inteiro e a capa dele —, em pixels de
        // canvas (de baixo para cima, como o readPixels). **Um pixel é do card
        // mais próximo que o contém**, e só conta se cair na capa dele: medido,
        // a primeira versão atribuía à capa de um card do fundo o título
        // gravado na placa de um card da frente, e acusava 0.25 numa capa que
        // estava a 0.07.
        const owned = new Uint8Array(n);
        const order: { i: number; dist: number }[] = [];
        let ahead: number | null = null;
        for (let i = 0; i < cardCount.value; i += 1) {
          const card = cards[i];
          if (card === undefined) continue;
          const gap = camera.position.z - card.z;
          if (gap > 0.5 && (ahead === null || gap < ahead)) ahead = gap;
          order.push({
            i,
            dist: Math.hypot(card.x - camera.position.x, card.y - camera.position.y, card.z - camera.position.z),
          });
        }
        order.sort((a, b) => a.dist - b.dist);

        let coverMax = 0;
        let flockMax = 0;
        let maxAt: number[] = [];
        for (const { i } of order) {
          const card = cards[i];
          if (card === undefined) continue;
          const c = Math.cos(card.w);
          const sn = Math.sin(card.w);
          const corner = (u: number, v: number) => {
            const lx = (u * 2 - 1) * CARD_HALF_WIDTH;
            const ly = (v * 2 - 1) * CARD_HALF_HEIGHT;
            const at = projectLoose(new Vector3(card.x + c * lx, card.y + ly, card.z - sn * lx));
            return at === null ? null : [at[0], canvas.height - at[1]];
          };
          const full = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
          const cov = [corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)];
          if (full.some((p) => p === null) || cov.some((p) => p === null)) continue;
          const fq = (full as number[][]).flat();
          const cq = (cov as number[][]).flat();
          const xs = [fq[0], fq[2], fq[4], fq[6]] as number[];
          const ys = [fq[1], fq[3], fq[5], fq[7]] as number[];
          const x0 = Math.max(0, Math.floor(Math.min(...xs)));
          const x1 = Math.min(canvas.width - 1, Math.ceil(Math.max(...xs)));
          const y0 = Math.max(0, Math.floor(Math.min(...ys)));
          const y1 = Math.min(canvas.height - 1, Math.ceil(Math.max(...ys)));
          for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
              const index = y * canvas.width + x;
              if (owned[index] === 1) continue;
              if (!insideQuad(x + 0.5, y + 0.5, fq)) continue;
              owned[index] = 1;
              if (!insideQuad(x + 0.5, y + 0.5, cq)) continue;
              const at = index * 4;
              const l = lum(B, at);
              if (l > coverMax) {
                coverMax = l;
                maxAt = [i, x, canvas.height - 1 - y, B[at] ?? 0, B[at + 1] ?? 0, B[at + 2] ?? 0];
              }
            }
          }
        }
        for (let i = 0; i < n; i += 1) {
          const a = lum(A, i * 4);
          if (a - lum(B, i * 4) > 0.004 && a > flockMax) flockMax = a;
        }
        series.push({
          p: Number(progressRef.current.toFixed(3)),
          z: Number(camera.position.z.toFixed(1)),
          coverMax: Number(coverMax.toFixed(4)),
          flockMax: Number(flockMax.toFixed(4)),
          ahead: ahead === null ? null : Number(ahead.toFixed(1)),
          maxAt,
        });
      }
    } finally {
      setVisible(layers.flock, true);
    }
    const worst = series.reduce((a, b) => (b.coverMax > a.coverMax ? b : a));
    return {
      buffer: [canvas.width, canvas.height],
      worstCover: worst,
      coverAboveFlock: series.filter((r) => r.coverMax > r.flockMax).map((r) => r.p),
      nothingAhead: series.filter((r) => r.ahead === null).map((r) => r.p),
      series,
    };
  };

  /**
   * A folha da curadoria (rodada 9): os cards montados, cada um no progresso em
   * que a câmera o tem à distância de leitura, **na mesma luz** (um aglomerado
   * fixo quatro unidades à frente de cada peça, e só ele) e sem o bando na
   * frente. Cada peça é recortada do quadro entregue e escalada para a mesma
   * altura. Os rótulos vêm de quem chama — a sonda não conhece o conteúdo.
   *
   * Não decide nada: é a imagem que a curadoria precisa ver.
   */
  const lineup = async (options: {
    labels: readonly string[];
    footer?: string;
    name?: string;
    port?: number;
    tileHeight?: number;
  }) => {
    const { labels, footer = "", name = "09-curadoria.png", port = 3131, tileHeight = 300 } = options;
    const layers = findLayers(scene);
    const host = window as unknown as { __probeClusters?: number[][] };
    const frame = document.createElement("canvas");
    frame.width = canvas.width;
    frame.height = canvas.height;
    const framePaper = frame.getContext("2d");
    const crops: { canvas: HTMLCanvasElement; label: string }[] = [];
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    if (framePaper === null) throw new Error("sem contexto 2D");

    settle(0.3, 150);
    try {
      for (let i = 0; i < cardCount.value; i += 1) {
        const card = cards[i];
        if (card === undefined) continue;
        const p = stationProgress(card.z);
        host.__probeClusters = [[card.x * 0.6, card.y + 0.6, card.z + 4, 0.8]];
        setVisible(layers.flock, false);
        settle(p, 1);
        step(2);
        read(pixels);
        const image = framePaper.createImageData(canvas.width, canvas.height);
        for (let y = 0; y < canvas.height; y += 1) {
          const source = (canvas.height - 1 - y) * canvas.width * 4;
          image.data.set(pixels.subarray(source, source + canvas.width * 4), y * canvas.width * 4);
        }
        framePaper.putImageData(image, 0, 0);

        const c = Math.cos(card.w);
        const sn = Math.sin(card.w);
        const pts = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([u, v]) =>
          projectLoose(
            new Vector3(
              card.x + c * (u ?? 0) * CARD_HALF_WIDTH,
              card.y + (v ?? 0) * CARD_HALF_HEIGHT,
              card.z - sn * (u ?? 0) * CARD_HALF_WIDTH,
            ),
          ),
        );
        if (pts.some((q) => q === null)) continue;
        const xs = pts.map((q) => (q as [number, number])[0]);
        const ys = pts.map((q) => (q as [number, number])[1]);
        const pad = 10;
        const x0 = Math.max(0, Math.floor(Math.min(...xs)) - pad);
        const y0 = Math.max(0, Math.floor(Math.min(...ys)) - pad);
        const x1 = Math.min(canvas.width, Math.ceil(Math.max(...xs)) + pad);
        const y1 = Math.min(canvas.height, Math.ceil(Math.max(...ys)) + pad);
        const crop = document.createElement("canvas");
        const scale = tileHeight / Math.max(1, y1 - y0);
        crop.width = Math.round((x1 - x0) * scale);
        crop.height = tileHeight;
        crop.getContext("2d")?.drawImage(frame, x0, y0, x1 - x0, y1 - y0, 0, 0, crop.width, crop.height);
        crops.push({ canvas: crop, label: labels[i] ?? `card ${i}` });
      }
    } finally {
      delete host.__probeClusters;
      setVisible(layers.flock, true);
    }

    const gap = 16;
    const header = 48;
    const labelH = 44;
    const perRow = 4;
    const rows = Math.ceil(crops.length / perRow);
    const tileW = Math.max(...crops.map((c) => c.canvas.width));
    const sheet = document.createElement("canvas");
    sheet.width = gap + perRow * (tileW + gap);
    sheet.height = header + rows * (tileHeight + labelH + gap) + gap + 40;
    const paper = sheet.getContext("2d");
    if (paper === null) throw new Error("sem contexto 2D");
    paper.fillStyle = "#030A12";
    paper.fillRect(0, 0, sheet.width, sheet.height);
    paper.fillStyle = "#DCE9EC";
    paper.font = "16px ui-monospace, SFMono-Regular, Menlo, monospace";
    paper.fillText(
      `CURADORIA · ${crops.length} CARDS À DISTÂNCIA DE LEITURA · MESMA LUZ (UM AGLOMERADO FIXO À FRENTE) · SEM O BANDO · ORDEM ATUAL, PROVISÓRIA`,
      gap,
      30,
    );
    crops.forEach((crop, k) => {
      const col = k % perRow;
      const row = Math.floor(k / perRow);
      const x = gap + col * (tileW + gap);
      const y = header + row * (tileHeight + labelH + gap);
      paper.drawImage(crop.canvas, x + (tileW - crop.canvas.width) / 2, y);
      paper.fillStyle = "#DCE9EC";
      paper.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
      const [first, second] = crop.label.split(" | ");
      paper.fillText(first ?? "", x, y + tileHeight + 18);
      paper.fillText(second ?? "", x, y + tileHeight + 36);
    });
    paper.font = "14px ui-monospace, SFMono-Regular, Menlo, monospace";
    paper.fillText(footer, gap, sheet.height - 20);

    const blob = await new Promise<Blob | null>((done) => sheet.toBlob(done, "image/png"));
    if (blob === null) throw new Error("toBlob falhou");
    const response = await fetch(
      `http://${window.location.hostname}:${port}/shot?name=${encodeURIComponent(name)}`,
      { method: "POST", body: blob },
    );
    return { name, cards: crops.length, sent: response.ok, size: [sheet.width, sheet.height] };
  };

  return {
    presence,
    parallax,
    engraving,
    covers,
    lineup,
    findLayers: () => findLayers(scene),
  };
}
