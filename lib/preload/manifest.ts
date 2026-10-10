import { prepareAudio } from "@/lib/audio/audio-context";
import { loadScene } from "@/lib/scene/load-scene";
import { whenScenePainted } from "@/lib/scene/scene-painted";
import { loadScrollDriver } from "@/lib/scroll/load-driver";

/**
 * O que o portão espera antes de deixar entrar — PROJECT.md §4: "Nada carrega
 * além do necessário para o primeiro frame."
 *
 * Esta é a lista, e ela é curta de propósito. Cada entrada é uma coisa que
 * precisa existir para a descida começar direito; nada aqui é decorativo e
 * nada aqui é adiantamento de conteúdo que só aparece lá embaixo.
 *
 * O peso é grosseiro e é honesto sobre isso: `import()` e `fonts.ready` não
 * expõem bytes recebidos, então o progresso avança em degraus, um por tarefa
 * concluída. Quem transforma degrau em subida é o amortecimento do contador
 * (ver `components/gate/GateOverlay.tsx`) — nunca um temporizador fingindo
 * ser carregamento.
 *
 * ## Nenhuma tarefa pode trancar o portão
 *
 * Um portão que não abre é pior que uma cena incompleta. Havia um teto global
 * de 6 s e ele não bastava: ele conta a partir do início, então uma tarefa que
 * demora 5.9 s deixava o portão aberto num quadro e a seguinte sem margem
 * nenhuma — e, pior, um teto só não diz **qual** tarefa travou. Agora cada
 * tarefa tem prazo próprio, e o que estourar é creditado e registrado pelo
 * nome. O teto global continua como último recurso.
 */

export type PreloadTaskId = "fonts" | "scroll" | "audio" | "scene" | "shaders";

type PreloadTask = {
  id: PreloadTaskId;
  /** Proporcional ao que a tarefa custa em rede, não ao que ela importa. */
  weight: number;
  start: () => Promise<unknown>;
};

const TASKS: readonly PreloadTask[] = [
  // As duas famílias do projeto. Sem elas o primeiro texto da descida é
  // desenhado com a métrica errada — e é a fonte real que o `DisplayLine`
  // mede para resolver a regra dos 80%.
  { id: "fonts", weight: 1, start: () => document.fonts.ready },
  // O driver de scroll: gsap, ScrollTrigger e lenis. É o que faz a descida
  // ser uma descida, e é exatamente o que não pode estar na rota inicial.
  { id: "scroll", weight: 1, start: () => loadScrollDriver() },
  // A partida do serviço de áudio. Não é o som — é o `new AudioContext()`,
  // que custa ~110 ms de thread principal. Ele estava dentro do handler do
  // clique e sozinho estourava o teto de 100 ms de latência de ponteiro do
  // PROJECT.md §3.3. Aqui a espera é o que o portão existe para cobrir; o
  // gesto do usuário fica só com o `resume()`, que custa 0.1 ms.
  { id: "audio", weight: 1, start: () => prepareAudio() },
  // A cena: three, R3F, troika e os shaders. É o chunk de 350 kB do
  // PROJECT.md §5, e o portão é o momento certo para baixá-lo — enquanto a
  // veneziana está fechada e a espera é o que ele existe para cobrir. Peso 4
  // contra 1 das outras porque o peso é proporcional ao que a tarefa custa em
  // rede, e este chunk custa uma ordem de grandeza a mais.
  { id: "scene", weight: 3, start: () => loadScene() },
  // Os shaders: a cena compila todos os programas ao montar e avisa quando o
  // primeiro quadro composto saiu. Sem WebGL, quem avisa é o `SceneGate`.
  { id: "shaders", weight: 3, start: () => whenScenePainted() },
];

const TOTAL_WEIGHT = TASKS.reduce((total, task) => total + task.weight, 0);

/**
 * Prazo por tarefa. Menor que o teto global, para que uma tarefa lenta seja
 * creditada e **nomeada** antes de o teto disparar sem explicação.
 */
const TASK_TIMEOUT_MS = 5000;

/**
 * Teto duro. Se algo escapar dos prazos individuais — uma tarefa que trava a
 * thread, um `start()` que lança antes de virar promessa — o portão abre assim
 * mesmo. Um portão que não abre seria um site inteiro trancado atrás de um
 * recurso opcional.
 */
const CEILING_MS = 6000;

export type PreloadOutcome = "pronto" | "erro" | "tempo-esgotado";

export type PreloadEntry = {
  id: PreloadTaskId;
  outcome: PreloadOutcome;
  /** Do início do preload até o desfecho desta tarefa, em ms. */
  ms: number;
};

let report: PreloadEntry[] = [];

/**
 * O que aconteceu com cada tarefa da última corrida, em ordem de conclusão.
 *
 * Existe para responder "qual delas não resolveu?" sem instrumentar de novo —
 * a pergunta que o contador do portão, por construção, não consegue responder:
 * ele mostra quanto chegou, nunca o que falta.
 */
export function preloadReport(): readonly PreloadEntry[] {
  return report;
}

/**
 * Dispara todas as tarefas em paralelo e informa o progresso normalizado a
 * cada conclusão. Devolve a função de cancelamento.
 *
 * Uma tarefa que falha conta como concluída, pelo mesmo motivo do teto: o
 * portão não é um guardião de qualidade, é uma espera.
 */
export function runPreload(onProgress: (progress: number) => void): () => void {
  let cancelled = false;
  let done = 0;
  const started = performance.now();
  const timers: number[] = [];
  report = [];

  const settle = (task: PreloadTask, outcome: PreloadOutcome) => {
    if (cancelled) return;
    if (report.some((entry) => entry.id === task.id)) return;

    report.push({
      id: task.id,
      outcome,
      ms: Math.round(performance.now() - started),
    });

    // Só o caminho ruim fala. Uma tarefa que estourou o prazo em produção é um
    // defeito de campo que alguém precisa conseguir ver; o caminho feliz não
    // tem por que ocupar o console de ninguém.
    if (outcome !== "pronto") {
      console.warn(
        `[preload] "${task.id}" ${outcome} em ${Math.round(performance.now() - started)} ms — o loading fecha assim mesmo.`,
      );
    }

    done += task.weight;
    onProgress(Math.min(done / TOTAL_WEIGHT, 1));
  };

  onProgress(0);

  for (const task of TASKS) {
    const timer = window.setTimeout(() => {
      settle(task, "tempo-esgotado");
    }, TASK_TIMEOUT_MS);
    timers.push(timer);

    const finish = (outcome: PreloadOutcome) => () => {
      window.clearTimeout(timer);
      settle(task, outcome);
    };

    // `start()` dentro do try: uma exceção síncrona aqui abortaria o laço e
    // deixaria as tarefas seguintes sem sequer começar — e o portão sem teto.
    try {
      task.start().then(finish("pronto"), finish("erro"));
    } catch {
      finish("erro")();
    }
  }

  const ceiling = window.setTimeout(() => {
    if (cancelled) return;
    for (const task of TASKS) settle(task, "tempo-esgotado");
    done = TOTAL_WEIGHT;
    onProgress(1);
  }, CEILING_MS);

  return () => {
    cancelled = true;
    window.clearTimeout(ceiling);
    for (const timer of timers) window.clearTimeout(timer);
  };
}
