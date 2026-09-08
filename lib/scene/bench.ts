/**
 * O banco de prova de GPU da cena.
 *
 * ## Por que ele existe
 *
 * O PROJECT.md §5 fixa 30 fps em iPhone recente, e esse era o único número do
 * orçamento nunca verificado: tudo que a AGENTS.md registra sobre desempenho
 * foi medido num M5. A cena é **limitada por preenchimento** — a névoa com
 * ruído 3D cobre o quadro inteiro, o alvo é multiamostrado —, que é o pior eixo
 * possível para celular, então a diferença entre "fecha girando botões" e
 * "precisa de outra cena" tinha que ser sabida antes de construir descolamento,
 * rio e transição de case por cima.
 *
 * Num desktop essa varredura se faz por fora, injetando script no DevTools. No
 * Safari de um iPhone não existe esse "por fora". Por isso o harness mora na
 * própria página, atrás de `?bench=1`. Ele custa 3.1 kB gz dentro do chunk da
 * cena, e a alternativa de tirá-lo dali por `import()` foi medida e custava
 * mais — ver `sceneSettings().bench`.
 *
 * ## A medição é uma inclinação, e isso não é preferência de estilo
 *
 * A pergunta é **tempo de GPU por quadro**, não fps: a 60 Hz o vsync trava os
 * dois lados de qualquer comparação em 59.9 e esconde a folga. A resposta é
 * **renderizar o mesmo quadro K vezes e ajustar uma reta no tempo de quadro
 * contra K**: tudo que acontece uma vez por quadro — esperar o vsync, esperar o
 * *drawable*, compor a página — entra no coeficiente linear e sai da conta, e o
 * que sobra na inclinação é o custo de uma passada.
 *
 * Isso substituiu duas tentativas, e as duas falharam de um jeito que vale
 * registrar:
 *
 * - **`EXT_disjoint_timer_query_webgl2`** parece o caminho óbvio — é o relógio
 *   da própria GPU. Mas a query envolve o blit final para o framebuffer padrão,
 *   e a espera pelo drawable acontece **dentro** dela. Medida assim, a cena deu
 *   16.41 ms de mediana num quadro de 16.70: o cronômetro estava cronometrando
 *   o vsync.
 *
 *   E não é só o quadro isolado. Amplificada, a query continua alta demais de um
 *   jeito que **o relógio de parede prova impossível**: em 88 quadros de 69.7 ms
 *   com K=16, a GPU não pode ter feito 16 × 9.17 ms de trabalho por quadro, e a
 *   parede é um teto físico que a query não tem. A extensão continua sendo lida
 *   quando existe, e o relatório traz o quanto ela estoura o teto — 2.0× a 2.1×
 *   nas três configurações limpas do M5 —, mas **quem decide o número é a
 *   parede**.
 * - **Cerca (`fenceSync` + `clientWaitSync`)** não funciona num laço que não
 *   devolve a thread: o Chrome só atualiza o estado do objeto de sincronização
 *   entre voltas do laço de eventos, então a sondagem em `while` bate no teto de
 *   espera todo quadro. Um cronômetro que precisa do laço de eventos não mede
 *   um quadro.
 *
 * O banco também guarda, sempre, o intervalo real entre quadros em K=1. É o
 * número que responde "o celular segura os 30 fps do PROJECT.md §5" sem
 * depender de método nenhum.
 */

/* --- estatística ---------------------------------------------------------- */

export type Stats = {
  count: number;
  mean: number;
  median: number;
  p5: number;
  p95: number;
  min: number;
  max: number;
};

const EMPTY_STATS: Stats = {
  count: 0,
  mean: 0,
  median: 0,
  p5: 0,
  p95: 0,
  min: 0,
  max: 0,
};

export function stats(values: readonly number[]): Stats {
  if (values.length === 0) return EMPTY_STATS;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const at = (quantile: number): number => {
    const index = Math.min(n - 1, Math.max(0, Math.round(quantile * (n - 1))));
    return sorted[index] ?? 0;
  };
  let sum = 0;
  for (const value of sorted) sum += value;
  return {
    count: n,
    mean: sum / n,
    median: at(0.5),
    p5: at(0.05),
    p95: at(0.95),
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
  };
}

/**
 * Resolução real de `performance.now()`, medida.
 *
 * O WebKit arredonda o relógio para proteger contra Spectre, e o valor do
 * arredondamento decide quanto de um p95 é ruído de quantização. Reportar isso
 * junto com o número é o que separa "13.8 ms" de "13.8 ± 1 ms".
 */
export function timerResolutionMs(): number {
  let min = Number.POSITIVE_INFINITY;
  let last = performance.now();
  for (let i = 0; i < 30000; i += 1) {
    const now = performance.now();
    const delta = now - last;
    if (delta > 0) {
      if (delta < min) min = delta;
      last = now;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

/* --- os relógios de GPU --------------------------------------------------- */

export type TimerMethod = "ext" | "slope";

export type FrameTimer = {
  readonly method: TimerMethod;
  /** Antes de submeter o quadro. */
  before(): void;
  /** Depois de submeter. */
  after(): void;
  /** Move as amostras prontas (em ms) para `out`. */
  drain(out: number[]): void;
  /** Diagnóstico do método, para o relatório. */
  note(): string;
  dispose(): void;
};

type TimerQueryExt = {
  readonly TIME_ELAPSED_EXT: number;
  readonly GPU_DISJOINT_EXT: number;
};

function createExtTimer(gl: WebGL2RenderingContext): FrameTimer | null {
  const raw: unknown = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  if (raw === null || typeof raw !== "object") return null;
  const ext = raw as TimerQueryExt;

  const pending: WebGLQuery[] = [];
  let active: WebGLQuery | null = null;
  let disjointFrames = 0;

  return {
    method: "ext",
    before() {
      if (active !== null) return;
      const query = gl.createQuery();
      if (query === null) return;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      active = query;
    },
    after() {
      if (active === null) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      pending.push(active);
      active = null;
    },
    drain(out) {
      while (pending.length > 0) {
        const query = pending[0];
        if (query === undefined) break;
        const ready = gl.getQueryParameter(
          query,
          gl.QUERY_RESULT_AVAILABLE,
        ) as boolean;
        if (!ready) break;
        pending.shift();
        // A leitura zera o flag, então ela tem que vir uma vez por resultado.
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
        const nanos = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
        gl.deleteQuery(query);
        // Quadro disjunto é quadro em que o relógio da GPU foi interrompido:
        // o número existe e não vale nada.
        if (disjoint) disjointFrames += 1;
        else out.push(nanos / 1e6);
      }
    },
    note() {
      return `EXT_disjoint_timer_query_webgl2, ${disjointFrames} quadro(s) disjunto(s) descartado(s)`;
    },
    dispose() {
      if (active !== null) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        active = null;
      }
      for (const query of pending) gl.deleteQuery(query);
      pending.length = 0;
    },
  };
}

/**
 * Escolhe o relógio disponível, ou `null` para cair na inclinação.
 *
 * `?timer=slope` força a inclinação pura mesmo onde a extensão existe. É assim
 * que o número do M5 é medido pelo **mesmo caminho** que o do iPhone, que é a
 * única forma de os dois serem comparáveis.
 */
export function createFrameTimer(
  gl: WebGL2RenderingContext,
  forced: TimerMethod | "auto",
): FrameTimer | null {
  if (forced === "slope") return null;
  return createExtTimer(gl);
}

/* --- a inclinação --------------------------------------------------------- */

/**
 * Um degrau da escada.
 *
 * `value` é a **média** do tempo de quadro daquele K, e a mediana seria o erro
 * mais fácil de cometer aqui. Com K=16 no M5 a mediana do quadro é 16.70 ms — a
 * mesma de K=1 — porque o navegador continua chamando o `requestAnimationFrame`
 * no vsync enquanto a fila da GPU cresce, e a conta chega de vez em quando num
 * quadro de 216 ms. O quadro *típico* mente sobre o trabalho; a média, que é
 * tempo total ÷ quadros, é a vazão, e vazão é a pergunta.
 */
export type SlopePoint = { k: number; value: number; samples: number };

export type SlopeFit = {
  /** Custo de GPU de uma passada, em ms. É este o número da medição. */
  gpuMs: number;
  /**
   * O que sobra por quadro independentemente de K: esperar o vsync, esperar o
   * drawable, compor a página. É o termo que o cronômetro de query media junto
   * e que a inclinação separa.
   */
  perFrameMs: number;
  /** Quais K entraram no ajuste. */
  used: readonly number[];
  /** Período de tela usado como piso de saturação, em ms. */
  floorMs: number;
};

/** Quanto o tempo de quadro precisa passar do piso para o ponto valer. */
export const SATURATED = 1.5;

/**
 * Ajusta uma reta no tempo de quadro contra K.
 *
 * Só entram os K em que o quadro já **estourou** o vsync com folga: abaixo
 * disso o tempo medido é o do monitor, não o da GPU, e incluí-los achataria a
 * reta. Um ponto que ainda toca o piso mente para baixo — foi o que fez o K=4
 * do M5 (18.6 ms contra um piso de 15.8) devolver um intercepto negativo, que
 * é a assinatura de "este ponto ainda não saturou".
 */
export function fitSlope(
  points: readonly SlopePoint[],
  floorMs: number,
): SlopeFit | null {
  const usable = points.filter((point) => point.value > floorMs * SATURATED);
  if (usable.length < 2) return null;

  let sumK = 0;
  let sumY = 0;
  for (const point of usable) {
    sumK += point.k;
    sumY += point.value;
  }
  const meanK = sumK / usable.length;
  const meanY = sumY / usable.length;

  let covariance = 0;
  let variance = 0;
  for (const point of usable) {
    const dk = point.k - meanK;
    covariance += dk * (point.value - meanY);
    variance += dk * dk;
  }
  if (variance === 0) return null;

  const gpuMs = covariance / variance;
  return {
    gpuMs,
    perFrameMs: meanY - gpuMs * meanK,
    used: usable.map((point) => point.k),
    floorMs,
  };
}

/* --- parâmetros e encadeamento -------------------------------------------- */

export type BenchConfig = { dof: boolean; flock: number; detach: boolean };

/**
 * **A linha 0 de todo plano precisa ser igual aos `DEFAULTS` de
 * `settings.ts`.** O primeiro passo é entrado por um `?bench=1` pelado, sem
 * `dof`, `flock` nem `detach` na URL, então a configuração que roda ali é a
 * padrão — e um plano cuja primeira linha diga outra coisa reporta uma
 * configuração enquanto renderiza outra, em silêncio.
 */

/**
 * O plano largo: DOF ligada/desligada cruzada com o teto e o piso da faixa de
 * bando do DIRECTION.md §5. É a medição de regressão da cena inteira.
 */
export const BENCH_PLAN: readonly BenchConfig[] = [
  { dof: true, flock: 16384, detach: true },
  { dof: false, flock: 16384, detach: true },
  { dof: true, flock: 4096, detach: true },
  { dof: false, flock: 4096, detach: true },
];

/**
 * O plano focado: só o descolamento, ligado contra desligado, com o resto no
 * padrão.
 *
 * Duas células e não oito porque o comportamento térmico do aparelho é a única
 * coisa que a seção de desempenho do AGENTS.md registra como **não
 * verificada**: cada configuração roda 22 a 25 s, e um 2×2×2 são três minutos e
 * meio de telefone na mão sem ninguém saber o que acontece com o clock nesse
 * tempo. Duas células medem exatamente o que o prompt pede — "com e sem o
 * descolamento isolado" — em menos de um minuto, na mesma sessão e com o mesmo
 * buffer, que é o que fez o quadrado do iPhone fechar limpo.
 */
export const DETACH_PLAN: readonly BenchConfig[] = [
  { dof: true, flock: 16384, detach: true },
  { dof: true, flock: 16384, detach: false },
];

export type BenchPlanId = "grid" | "detach";

export function benchPlan(id: BenchPlanId): readonly BenchConfig[] {
  return id === "detach" ? DETACH_PLAN : BENCH_PLAN;
}

export type BenchParams = {
  timer: TimerMethod | "auto";
  chain: boolean;
  step: number;
  run: string;
  plan: BenchPlanId;
  /** Porta do coletor na máquina que serve a página. */
  port: number;
};

export function readBenchParams(): BenchParams {
  const params = new URLSearchParams(window.location.search);
  const timer = params.get("timer");
  const step = Number.parseInt(params.get("step") ?? "0", 10);
  const port = Number.parseInt(params.get("port") ?? "3131", 10);
  const run = params.get("run");
  return {
    timer:
      timer === "ext" || timer === "slope"
        ? timer
        : "auto",
    // O padrão é o plano inteiro, e isso é ergonomia de telefone: a URL que
    // alguém vai digitar numa tela pequena precisa ser `?bench=1`, não
    // `?bench=1&chain=1&run=…`. `?chain=0` mede uma configuração só.
    chain: params.get("chain") !== "0",
    step: Number.isFinite(step) && step > 0 ? step : 0,
    // O identificador nasce no primeiro passo e viaja pela URL nos outros:
    // é ele que junta as configurações numa rodada só no coletor.
    run: run === null || run === "" ? Date.now().toString(36) : run,
    plan: params.get("plan") === "detach" ? "detach" : "grid",
    port: Number.isFinite(port) && port > 0 ? port : 3131,
  };
}

/** A URL do próximo passo do plano, ou `null` se este foi o último. */
export function nextStepUrl(params: BenchParams): string | null {
  const next = params.step + 1;
  const config = benchPlan(params.plan)[next];
  if (config === undefined) return null;
  const url = new URL(window.location.href);
  url.searchParams.set("bench", "1");
  url.searchParams.set("chain", "1");
  url.searchParams.set("run", params.run);
  url.searchParams.set("plan", params.plan);
  url.searchParams.set("step", String(next));
  // Este é o **único** lugar onde a configuração vira URL. Esquecer um campo
  // aqui não quebra nada: o passo roda com o padrão e reporta o que o plano
  // diz, ou seja mede a coisa errada com o rótulo certo.
  url.searchParams.set("dof", config.dof ? "on" : "off");
  url.searchParams.set("flock", String(config.flock));
  url.searchParams.set("detach", config.detach ? "on" : "off");
  url.searchParams.set("port", String(params.port));
  if (params.timer !== "auto") url.searchParams.set("timer", params.timer);
  return url.toString();
}

/**
 * Manda o relatório para o coletor da máquina que serve a página.
 *
 * `text/plain` de propósito: `application/json` dispara preflight de CORS, e
 * um preflight a mais é uma coisa a mais para dar errado num telefone dentro de
 * uma rede doméstica. O corpo continua sendo JSON.
 */
export async function postReport(
  payload: unknown,
  port: number,
): Promise<boolean> {
  try {
    const response = await fetch(
      `http://${window.location.hostname}:${port}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
