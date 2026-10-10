"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { beatAt } from "@/components/beats/beats";
import type { BeatId } from "@/components/beats/beats";
import { DURATION } from "@/lib/motion";
import { stopProgress } from "@/lib/scene/stops";
import { getScrollProgress, subscribeToScroll } from "@/lib/scroll/scroll-store";

/**
 * O progresso em que cada momento é composto no modo calmo: um quadro fixo por
 * beat, e a troca entre eles é corte.
 */
const COMPOSITION_AT: Record<BeatId, number> = {
  impact: 0.12,
  intro: 0.25,
  cases: stopProgress(0),
  cta: 0.97,
};

type ComposedClockProps = {
  /** O progresso da composição atual, lido pelo laço mestre. */
  composedRef: { current: number };
  canvasRef: { current: HTMLCanvasElement | null };
};

/**
 * O relógio do modo calmo (`prefers-reduced-motion`): não há laço. A cena é
 * desenhada uma vez por momento, com o corte de 120 ms entre um e outro, e de
 * novo no resize.
 */
export function ComposedClock({ composedRef, canvasRef }: ComposedClockProps) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);
  const gl = useThree((state) => state.gl);
  const current = useRef<BeatId | null>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    // Ver `SceneClock`: sem isto o delta do R3F colapsa no segundo quadro.
    clock.autoStart = false;
    clock.stop();
    clock.elapsedTime = 0;

    const canvas = canvasRef.current;
    let timer = 0;

    const compose = (id: BeatId) => {
      composedRef.current = COMPOSITION_AT[id];
      // Dois quadros: o primeiro escreve a pose e os uniforms, o segundo
      // desenha com as caixas do véu já lidas do DOM do momento novo.
      elapsed.current += 1;
      advance(elapsed.current);
      elapsed.current += 1;
      advance(elapsed.current);
    };

    const cut = (id: BeatId) => {
      if (canvas === null) {
        compose(id);
        return;
      }
      canvas.style.opacity = "0";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        compose(id);
        canvas.style.opacity = "1";
      }, DURATION.cut * 1000);
    };

    const evaluate = (progress: number) => {
      const id = beatAt(progress).id;
      if (id === current.current) return;
      const first = current.current === null;
      current.current = id;
      if (first) compose(id);
      else cut(id);
    };

    if (canvas !== null) {
      canvas.style.transition = `opacity ${DURATION.cut * 1000}ms var(--ease-strong)`;
    }
    evaluate(getScrollProgress());
    const unsubscribe = subscribeToScroll((snapshot) => {
      evaluate(snapshot.progress);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [advance, clock, canvasRef, composedRef]);

  // A fonte dos posters e da imagem de Open Graph: o quadro composto de um
  // momento, lido do buffer do WebGL. Só existe em desenvolvimento.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const hook = {
      capture(id: BeatId): string {
        composedRef.current = COMPOSITION_AT[id];
        elapsed.current += 1;
        advance(elapsed.current);
        elapsed.current += 1;
        advance(elapsed.current);
        // No mesmo task do desenho: o buffer ainda não foi apresentado.
        return gl.domElement.toDataURL("image/webp", 0.86);
      },
    };
    (window as unknown as { __calm?: typeof hook }).__calm = hook;
    return () => {
      delete (window as unknown as { __calm?: typeof hook }).__calm;
    };
  }, [advance, gl, composedRef]);

  useEffect(() => {
    const redraw = () => {
      elapsed.current += 1;
      advance(elapsed.current);
    };
    window.addEventListener("resize", redraw);
    return () => {
      window.removeEventListener("resize", redraw);
    };
  }, [advance]);

  return null;
}
