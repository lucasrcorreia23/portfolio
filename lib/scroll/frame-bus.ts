/**
 * O relógio, publicado.
 *
 * O `ScrollDriver` já declarava a intenção no comentário do `autoRaf: false`:
 * *"um relógio só para o scroll, as animações e, mais adiante, o loop de render
 * da cena."* Este módulo é o "mais adiante". Ele é para o tempo o que
 * `scroll-store.ts` é para o progresso: um ponto de publicação fora do React,
 * um `Set` de ouvintes, zero alocação por quadro.
 *
 * **Por que a cena não importa o gsap.** Poderia — os dois chunks são
 * assíncronos e o bundler compartilharia o módulo. Mas isso deixaria a ordem
 * "publica o progresso, depois avança a cena" no acaso da ordem de inscrição no
 * ticker, e a cena leria o progresso de um quadro atrás em algumas montagens e
 * do mesmo quadro em outras. Publicando daqui, de dentro do `tick` que já
 * existe e logo depois do `lenis.raf`, a ordem é estrutural. De quebra o gsap
 * não tem chance de entrar na caixa de 350 kB da cena.
 *
 * O delta vem em **milissegundos** porque é o que o ticker do gsap entrega
 * como segundo argumento. Quem precisa de segundos divide — e clampa: o
 * `lagSmoothing(0)` do driver é deliberado, então voltar de uma aba em segundo
 * plano entrega um delta de vários segundos.
 */

type FrameListener = (deltaMs: number) => void;

const listeners = new Set<FrameListener>();

/**
 * Quando o último quadro foi publicado, em `performance.now()`. Zero se nunca.
 *
 * A cena usa isto como cão de guarda. O `ScrollProvider` tolera o chunk do
 * scroll nunca chegar — "o scroll continua nativo e o progresso fica em 0" —
 * e nesse mundo ninguém publicaria quadro nenhum e a cena seria um retângulo
 * preto para sempre. Contar ouvintes não responderia a pergunta certa (quem
 * ouve é a cena, não o driver); contar o **último quadro** responde, e ainda
 * cobre o caso de o driver ter montado e o ticker ter travado.
 *
 * É o único segundo `requestAnimationFrame` legítimo do projeto, e ele só liga
 * quando o primeiro não existe.
 */
let lastFrameAt = 0;

export function lastFrameTime(): number {
  return lastFrameAt;
}

/** Chamado só pelo `ScrollDriver`, dentro do ticker do GSAP. */
export function publishFrame(deltaMs: number): void {
  lastFrameAt = performance.now();
  for (const listener of listeners) listener(deltaMs);
}

export function subscribeToFrame(listener: FrameListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
