"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { lastFrameTime, subscribeToFrame } from "@/lib/scroll/frame-bus";

/** Se o driver de scroll não publicar um quadro nesse prazo, a cena assume. */
const WATCHDOG_MS = 500;
/** Passo máximo. Voltar de uma aba em segundo plano não pode virar um salto. */
const MAX_STEP_S = 1 / 30;

/**
 * O relógio da cena. Um só, e é o do scroll.
 *
 * `frameloop="never"` desliga o `requestAnimationFrame` do R3F; quem avança a
 * cena é o ticker do GSAP, publicado pelo `ScrollDriver` em
 * `lib/scroll/frame-bus.ts`. É o que o comentário do `autoRaf: false` do driver
 * sempre quis dizer: um relógio para o scroll, as animações e o render.
 *
 * ## Os dois detalhes que fazem isso funcionar
 *
 * **`clock.autoStart = false`.** No modo `never`, o R3F calcula o delta como
 * `timestamp − clock.elapsedTime` — mas ele chama `clock.getDelta()` **antes**
 * disso, e `getDelta()` com `autoStart` ligado inicia o relógio e soma o tempo
 * de parede em `elapsedTime`. O resultado é que `timestamp − elapsedTime`
 * colapsa para ~0 a partir do segundo quadro: todo `useFrame(( , delta) => …)`
 * receberia zero, e todo `damp` da cena congelaria. Com `autoStart` desligado o
 * relógio nunca corre sozinho e o delta é exatamente o que passamos.
 *
 * **O tempo começa em zero.** O primeiro argumento do ticker do GSAP é o
 * *uptime* dele, não o tempo desde a montagem da cena. Passá-lo direto daria um
 * primeiro delta do tamanho de quanto tempo a aba está aberta.
 *
 * ## O cão de guarda
 *
 * O `ScrollProvider` tolera o chunk do scroll nunca chegar — e nesse mundo
 * ninguém publicaria quadro nenhum. Sem isto a cena seria um retângulo preto
 * para sempre. É o único segundo `requestAnimationFrame` do projeto, e ele só
 * liga quando o primeiro não existe.
 */
export function SceneClock() {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);

  useEffect(() => {
    clock.autoStart = false;
    clock.stop();
    clock.elapsedTime = 0;

    let elapsed = 0;
    let raf = 0;
    let previous = 0;

    const step = (deltaMs: number) => {
      elapsed += Math.min(deltaMs / 1000, MAX_STEP_S);
      advance(elapsed);
    };

    const unsubscribe = subscribeToFrame(step);

    const stale = () => performance.now() - lastFrameTime() >= WATCHDOG_MS;

    const fallback = (now: number) => {
      // O driver voltou a publicar: devolve o relógio e para de agendar.
      if (!stale()) {
        raf = 0;
        return;
      }
      step(previous === 0 ? 16.7 : now - previous);
      previous = now;
      raf = requestAnimationFrame(fallback);
    };

    // Reavalia de tempos em tempos, e não uma vez só: o chunk do scroll pode
    // chegar tarde, e pode nunca chegar.
    const watchdog = window.setInterval(() => {
      if (!stale() || raf !== 0) return;
      previous = 0;
      raf = requestAnimationFrame(fallback);
    }, WATCHDOG_MS);

    return () => {
      unsubscribe();
      window.clearInterval(watchdog);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, [advance, clock]);

  return null;
}
