import { prepareAudio } from "@/lib/audio/audio-context";
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
 */

export type PreloadTaskId = "fonts" | "scroll" | "audio";

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
  // Quando a cena existir ela entra aqui, com peso maior — é o chunk de
  // 350 kB do PROJECT.md §5, e o portão é o momento certo para baixá-lo.
];

const TOTAL_WEIGHT = TASKS.reduce((total, task) => total + task.weight, 0);

/**
 * Teto duro. Se uma tarefa nunca resolver — um CDN de fonte fora do ar, um
 * chunk que não chega — o portão abre assim mesmo. Um portão que não abre é
 * pior que uma fonte que chegou tarde: seria um site inteiro trancado atrás
 * de um recurso opcional.
 */
const CEILING_MS = 6000;

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

  const settle = (weight: number) => {
    if (cancelled) return;
    done += weight;
    onProgress(Math.min(done / TOTAL_WEIGHT, 1));
  };

  onProgress(0);

  for (const task of TASKS) {
    const credit = () => {
      settle(task.weight);
    };
    task.start().then(credit, credit);
  }

  const ceiling = window.setTimeout(() => {
    if (cancelled) return;
    done = TOTAL_WEIGHT;
    onProgress(1);
  }, CEILING_MS);

  return () => {
    cancelled = true;
    window.clearTimeout(ceiling);
  };
}
