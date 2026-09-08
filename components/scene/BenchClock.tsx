"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  benchPlan,
  SATURATED,
  createFrameTimer,
  fitSlope,
  nextStepUrl,
  postReport,
  readBenchParams,
  stats,
  timerResolutionMs,
  type FrameTimer,
  type SlopePoint,
  type Stats,
} from "@/lib/scene/bench";
import { sceneSettings } from "@/lib/scene/settings";

/** A faixa medida: Emergência e Identidade, os dois beats que existem. */
const SWEEP_TO = 0.28;
/** Passo fixo do relógio. A varredura tem que ser a mesma a 60 e a 20 fps. */
const STEP_MS = 1000 / 60;

/**
 * Quadros vazios no começo, só para medir o período da tela.
 *
 * Sem isso não há como saber se um quadro de 16.7 ms é "a GPU levou 16.7" ou "a
 * tela não aceita mais que 60 por segundo", e é essa diferença que decide quais
 * pontos da escada valem. Num iPhone com ProMotion o período pode ser 8.3, e
 * supor 16.7 faria a metade dos pontos parecer saturada sem estar.
 */
const PACE_FRAMES = 40;
const WARMUP_FRAMES = 120;
const SETTLE_FRAMES = 60;
const SWEEP_FRAMES = 180;
const AMPLIFIED_FRAMES = 60;
/**
 * A escada de amplificação. Sobe até o quadro estourar o vsync com folga e
 * **para ali**: num aparelho lento o K=2 já satura, e insistir até 16 seria
 * meio minuto de telefone quente por nenhuma casa decimal a mais.
 */
const LADDER = [2, 4, 8, 16] as const;
/** Fundo de escada: acima disso o ponto é saturado o bastante e a escada para. */
const DEEP = 4;

/** Quantos quadros entre dois desenhos do painel. */
const PANEL_EVERY = 30;

/**
 * Acima disto o quadro não é lento, é **parado**: a janela ficou coberta, o
 * telefone trocou de app, o sistema resolveu fazer outra coisa. Ele é descartado
 * e contado, e a contagem vai no relatório — um número que veio de uma varredura
 * cheia de paradas precisa dizer isso na cara.
 *
 * A linha é 400 ms porque a coisa legítima mais lenta que esta medição produz é
 * a contrapressão da fila da GPU, e ela apareceu em 216 ms no pior K do M5. Um
 * quadro de um segundo não é contrapressão, é ausência de animação.
 */
const STALL_MS = 400;

type Stage = {
  kind: "pace" | "warmup" | "settle" | "sweep";
  k: number;
  frames: number;
  /** `false` no aquecimento e no assentamento: roda, não conta. */
  measured: boolean;
};

type BenchClockProps = {
  /** O progresso que a cena vai ler. Quem escreve nele é a varredura. */
  progressRef: { current: number };
};

type Series = { frame: number[]; gpu: number[]; stalls: number };

/**
 * O relógio no modo banco de prova.
 *
 * Ele substitui o `SceneClock` sob `?bench=1` e faz três coisas que o relógio
 * normal não faz: dirige o progresso por conta própria numa rampa determinista,
 * avança o quadro **K vezes** para a inclinação, e cronometra. Ver
 * `lib/scene/bench.ts` para por que a medição é uma inclinação e não a leitura
 * direta de um cronômetro de GPU.
 *
 * **O passo do relógio é fixo em 1/60 s, e isso é a medição, não preguiça.** Com
 * delta real, um celular a 20 fps percorreria a mesma varredura com um terço dos
 * quadros e um terço das atualizações da simulação: a carga de cada quadro
 * deixaria de ser comparável com a do desktop, que é justamente a comparação em
 * jogo. Com passo fixo, o quadro N do celular é o quadro N do M5.
 *
 * **As passadas extras usam o mesmo timestamp**, então o R3F entrega delta 0 a
 * todo `useFrame` e nada na cena se move: o que se paga K vezes é o desenho, que
 * é o que se quer medir. Ver `advance()` no R3F — `delta = timestamp −
 * clock.elapsedTime`.
 */
export function BenchClock({ progressRef }: BenchClockProps) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    clock.autoStart = false;
    clock.stop();
    clock.elapsedTime = 0;

    const params = readBenchParams();
    const settings = sceneSettings();
    const flock = settings.flockTextureSize ** 2;
    const context = gl.getContext();
    const webgl2 =
      typeof WebGL2RenderingContext !== "undefined" &&
      context instanceof WebGL2RenderingContext
        ? context
        : null;

    const panel = document.createElement("div");
    panel.setAttribute("data-bench-panel", "");
    panel.style.cssText = [
      "position:fixed",
      "inset:0 auto auto 0",
      "z-index:2147483647",
      "max-width:100vw",
      "padding:10px 12px",
      "background:rgba(0,0,0,.86)",
      "color:#7fe3d8",
      "font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace",
      "white-space:pre-wrap",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(panel);

    const say = (lines: string[]) => {
      panel.textContent = lines.join("\n");
    };

    const plan = benchPlan(params.plan);
    const head = `passo ${params.step + 1}/${plan.length} (${params.plan}) — dof ${
      settings.dof ? "on" : "off"
    } · flock ${flock} · descolamento ${settings.detach ? "on" : "off"}`;

    const timer: FrameTimer | null =
      webgl2 === null ? null : createFrameTimer(webgl2, params.timer);
    let disposed = false;
    let raf = 0;

    const startedAt = Date.now();
    const started = performance.now();

    /* --- estágios ----------------------------------------------------------- */
    const stages: Stage[] = [
      { kind: "pace", k: 1, frames: PACE_FRAMES, measured: false },
      { kind: "warmup", k: 1, frames: WARMUP_FRAMES, measured: false },
      { kind: "settle", k: 1, frames: SETTLE_FRAMES, measured: false },
      { kind: "sweep", k: 1, frames: SWEEP_FRAMES, measured: true },
    ];
    let rung = 0;

    const pushRung = () => {
      const k = LADDER[rung];
      rung += 1;
      if (k === undefined) return;
      stages.push({ kind: "settle", k: 1, frames: SETTLE_FRAMES, measured: false });
      stages.push({ kind: "sweep", k, frames: AMPLIFIED_FRAMES, measured: true });
    };

    /* --- o que se acumula --------------------------------------------------- */
    const byK = new Map<number, Series>();
    const submitSamples: number[] = [];
    const paceSamples: number[] = [];
    const drained: number[] = [];
    /** Período da tela, medido no estágio de ritmo. */
    let displayMs = 1000 / 60;

    let stageIndex = 0;
    let frameInStage = 0;
    let elapsed = 0;
    let previous = 0;
    let entered = false;
    let waited = 0;

    const seriesFor = (k: number): Series => {
      const existing = byK.get(k);
      if (existing !== undefined) return existing;
      const created: Series = { frame: [], gpu: [], stalls: 0 };
      byK.set(k, created);
      return created;
    };

    /* --- o portão ----------------------------------------------------------- */
    // O banco entra sozinho. Não é para pular o portão — o que se mede é o site
    // depois dele —, é para as quatro configurações do plano rodarem sem quatro
    // toques na tela de quem está segurando o telefone.
    const gateOpen = (): boolean => {
      const overlay = document.querySelector("[data-gate-overlay]");
      if (overlay === null) {
        // A descida fica travada durante a medição. Não é para esconder nada da
        // cena — é que um polegar encostado na tela de um telefone rola a
        // página, e rolar dispara revelação de texto e leitura de caixas que não
        // fazem parte do quadro que se está cronometrando.
        document.documentElement.style.overflow = "hidden";
        return true;
      }
      if (
        overlay instanceof HTMLElement &&
        overlay.getAttribute("data-gate-phase") === "ready" &&
        !entered
      ) {
        entered = true;
        overlay.click();
      }
      return false;
    };

    /* --- o fim -------------------------------------------------------------- */
    const finish = () => {
      const baseline = seriesFor(1);
      const frameStats = stats(baseline.frame);
      // O piso de saturação é o período da tela, medido no estágio de ritmo:
      // abaixo dele o número é o do monitor, não o da GPU.
      const floorMs = displayMs;

      const framePoints: SlopePoint[] = [];
      const gpuPoints: SlopePoint[] = [];
      const perK: {
        k: number;
        frameMs: Stats;
        gpuMs: Stats | null;
        perPassMs: Stats | null;
        stalls: number;
        suspect: boolean;
      }[] = [];

      const ks = [...byK.keys()].sort((a, b) => a - b);
      for (const k of ks) {
        const series = seriesFor(k);
        const frame = stats(series.frame);
        const gpu = series.gpu.length > 0 ? stats(series.gpu) : null;
        framePoints.push({ k, value: frame.mean, samples: frame.count });
        if (gpu !== null) {
          gpuPoints.push({ k, value: gpu.mean, samples: gpu.count });
        }
        // Por passada, e **sempre do relógio de parede**: cada quadro
        // amplificado é K desenhos do mesmo estado, então o tempo dele dividido
        // por K é o custo de um desenho. Só vale onde o quadro saturou; abaixo
        // disso o que se estaria dividindo por K é o período do monitor.
        perK.push({
          k,
          frameMs: frame,
          gpuMs: gpu,
          perPassMs:
            frame.mean > floorMs * SATURATED
              ? stats(series.frame.map((value) => value / k))
              : null,
          stalls: series.stalls,
          // Um punhado de paradas não invalida a vazão dos outros quadros; um
          // quinto deles invalida, porque aí a varredura mediu outra coisa.
          suspect: series.stalls > frame.count * 0.2,
        });
      }

      const fitFrame = fitSlope(framePoints, floorMs);
      // A query entra como diagnóstico, não como resposta — ver o cabeçalho de
      // `lib/scene/bench.ts`. O piso zero é de propósito: ela não é limitada
      // pelo vsync, então não há ponto dela para descartar.
      const fitGpu = gpuPoints.length >= 2 ? fitSlope(gpuPoints, 0) : null;

      // O K mais fundo que saturou é o que melhor mede vazão: quanto mais fundo,
      // menor o peso do que acontece uma vez por quadro.
      const deepest = [...perK]
        .reverse()
        .find((row) => row.perPassMs !== null && !row.suspect);
      const sustainedMs =
        deepest === undefined ? null : deepest.frameMs.mean / deepest.k;
      const p95PerPassMs = deepest?.perPassMs?.p95 ?? null;
      // A mediana da distribuição por passada, que o prompt do descolamento
      // pede junto do p95. Ela descreve o **quadro típico**; quem descreve o
      // **trabalho** é `sustainedMs`, a média. As duas juntas, nunca a mediana
      // sozinha — ver o cabeçalho de `lib/scene/bench.ts` sobre por que a
      // mediana do tempo de quadro não mede vazão.
      const medianPerPassMs = deepest?.perPassMs?.median ?? null;
      // O teto físico, que é o que reprova a query: em N quadros de M ms a GPU
      // não fez mais que M ms de trabalho por quadro. Um número acima de 1 aqui
      // é um cronômetro medindo espera.
      const queryOverCeiling =
        deepest?.gpuMs == null || sustainedMs === null
          ? null
          : deepest.gpuMs.mean / deepest.k / sustainedMs;

      const debug: unknown = webgl2?.getExtension("WEBGL_debug_renderer_info");
      const rendererName =
        webgl2 !== null && debug !== null && typeof debug === "object"
          ? (webgl2.getParameter(
              (debug as { UNMASKED_RENDERER_WEBGL: number })
                .UNMASKED_RENDERER_WEBGL,
            ) as string)
          : "";

      const report = {
        run: params.run,
        step: params.step,
        plan: params.plan,
        planSteps: plan.length,
        config: { dof: settings.dof, flock, detach: settings.detach },
        sceneMode: document.documentElement.getAttribute("data-scene-mode"),
        sweep: { from: 0, to: SWEEP_TO, frames: SWEEP_FRAMES, stepMs: STEP_MS },
        method: timer?.method ?? "slope",
        methodNote: timer?.note() ?? "sem cronômetro de GPU; só a inclinação",
        timerResolutionMs: timerResolutionMs(),
        displayMs,
        displayHz: displayMs > 0 ? 1000 / displayMs : 0,
        floorMs,
        /** O número: custo de GPU de um quadro, por vazão no K mais fundo. */
        gpuPerFrameMs: sustainedMs,
        gpuPerFrameMedianMs: medianPerPassMs,
        gpuPerFrameP95Ms: p95PerPassMs,
        /** A mesma coisa por inclinação entre dois K, como segunda opinião. */
        slopeMs: fitFrame?.gpuMs ?? null,
        perFrameOverheadMs: fitFrame?.perFrameMs ?? null,
        deepestK: deepest?.k ?? null,
        queryOverCeiling,
        gpuDistribution:
          deepest === undefined
            ? null
            : { k: deepest.k, stats: deepest.perPassMs },
        fitFrame,
        fitGpu,
        perK,
        frameMs: frameStats,
        fps: {
          median: frameStats.median > 0 ? 1000 / frameStats.median : 0,
          p5: frameStats.max > 0 ? 1000 / frameStats.max : 0,
        },
        cpuSubmitMs: stats(submitSamples),
        device: {
          ua: navigator.userAgent,
          dpr: window.devicePixelRatio,
          viewport: [window.innerWidth, window.innerHeight],
          buffer: [gl.domElement.width, gl.domElement.height],
          renderer: rendererName,
          cores: navigator.hardwareConcurrency ?? 0,
        },
        startedAt,
        durationMs: performance.now() - started,
      };

      const summary = [
        head,
        sustainedMs === null
          ? "GPU: nenhum K saturou — a cena não chega perto do teto aqui"
          : `GPU ${sustainedMs.toFixed(2)} ms/quadro (K=${deepest?.k}) · mediana ${medianPerPassMs?.toFixed(2) ?? "—"} · p95 ${p95PerPassMs?.toFixed(2) ?? "—"} ms · inclinação ${fitFrame?.gpuMs.toFixed(2) ?? "—"}`,
        `quadro K=1 média ${(perK[0]?.frameMs.mean ?? 0).toFixed(2)} · mediana ${frameStats.median.toFixed(2)} ms (${report.fps.median.toFixed(1)} fps) · pior ${frameStats.max.toFixed(0)}`,
        `tela ${displayMs.toFixed(2)} ms · buffer ${report.device.buffer[0]}×${report.device.buffer[1]} · dpr ${report.device.dpr} · ${perK.reduce((total, row) => total + row.stalls, 0)} parada(s)`,
        queryOverCeiling === null
          ? `método ${report.method}`
          : `query ${queryOverCeiling.toFixed(2)}× o teto físico`,
      ];

      say([...summary, "enviando…"]);

      void postReport(report, params.port).then((sent) => {
        if (disposed) return;
        const next = params.chain ? nextStepUrl(params) : null;
        say([
          ...summary,
          sent ? "relatório enviado" : "COLETOR MUDO — anote os números acima",
          next === null ? "fim do plano" : "próxima configuração em 3 s…",
        ]);
        if (next !== null) {
          window.setTimeout(() => {
            window.location.replace(next);
          }, 3000);
        }
      });
    };

    /* --- o laço ------------------------------------------------------------- */
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (disposed) return;

      // Aba oculta é aba sem medição. Navegador nenhum mantém o
      // `requestAnimationFrame` em 60 Hz numa aba escondida, e a escada de K é
      // uma reta em cima de tempos de quadro: um punhado de quadros de segundo
      // inteiro viraria inclinação sem nem parecer errado. No telefone o caso é
      // concreto — chega uma notificação, a pessoa troca de app, volta.
      if (document.hidden) {
        previous = 0;
        say([head, "aba oculta — medição pausada"]);
        return;
      }

      if (!gateOpen()) {
        waited += 1;
        if (waited % PANEL_EVERY === 0) say([head, "aguardando o portão…"]);
        previous = 0;
        return;
      }

      const stage = stages[stageIndex];
      if (stage === undefined) return;

      const interval = previous === 0 ? 0 : now - previous;
      previous = now;

      // O ritmo: nenhum quadro é desenhado, só se mede de quanto em quanto a
      // tela chama. Os primeiros são descartados porque o portão acabou de sair
      // de cena e a thread ainda está pagando por isso.
      if (stage.kind === "pace") {
        if (frameInStage > 8 && interval > 0) paceSamples.push(interval);
        frameInStage += 1;
        if (frameInStage >= stage.frames) {
          const paced = stats(paceSamples).median;
          if (paced > 0) displayMs = paced;
          frameInStage = 0;
          stageIndex += 1;
        }
        return;
      }

      // A rampa é a varredura: 0 → 0.28 ao longo do estágio. O assentamento
      // segura em 0 para o amortecimento do `SceneWorld` voltar ao início — sem
      // ele, a varredura seguinte começaria de onde a anterior parou.
      const span = Math.max(1, stage.frames - 1);
      progressRef.current =
        stage.kind === "settle" ? 0 : (frameInStage / span) * SWEEP_TO;

      elapsed += STEP_MS / 1000;

      const submitStart = performance.now();
      timer?.before();
      advance(elapsed);
      for (let pass = 1; pass < stage.k; pass += 1) advance(elapsed);
      const submitted = performance.now();
      timer?.after();

      if (timer !== null) {
        drained.length = 0;
        timer.drain(drained);
        if (stage.measured) {
          const series = seriesFor(stage.k);
          for (const sample of drained) series.gpu.push(sample);
        }
      }

      if (stage.measured && frameInStage > 1) {
        const series = seriesFor(stage.k);
        if (interval > STALL_MS) series.stalls += 1;
        else if (interval > 0) series.frame.push(interval);
        if (stage.k === 1) submitSamples.push(submitted - submitStart);
      }

      frameInStage += 1;
      if (frameInStage % PANEL_EVERY === 0) {
        say([
          head,
          `${stage.kind} K=${stage.k} · ${frameInStage}/${stage.frames}`,
          `método ${timer?.method ?? "slope"}`,
        ]);
      }

      if (frameInStage < stage.frames) return;

      // --- fim de estágio ---
      frameInStage = 0;
      stageIndex += 1;

      if (stage.kind === "sweep") {
        const throughput = stats(seriesFor(stage.k).frame).mean;
        // A escada sobe até o quadro estar fundo o bastante no território da
        // GPU, e para ali. Dois pontos saturados bastam para uma reta, e cada
        // degrau a mais é tempo de telefone quente na mão de alguém.
        if (rung < LADDER.length && throughput < displayMs * DEEP) pushRung();
      }

      if (stageIndex >= stages.length) {
        cancelAnimationFrame(raf);
        raf = 0;
        finish();
      }
    };

    say([head, `método ${timer?.method ?? "slope"}`, "aguardando o portão…"]);
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      if (raf !== 0) cancelAnimationFrame(raf);
      timer?.dispose();
      panel.remove();
      document.documentElement.style.removeProperty("overflow");
    };
  }, [advance, clock, gl, progressRef]);

  return null;
}
