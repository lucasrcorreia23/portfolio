"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { beatAt, SEPARATION_PROGRESS } from "@/components/beats/beats";
import type { BeatId } from "@/components/beats/beats";
import { DURATION } from "@/lib/motion";
import { getScrollProgress, subscribeToScroll } from "@/lib/scroll/scroll-store";

/**
 * O progresso em que cada beat é *composto* no modo calmo.
 *
 * Não é o meio do beat: é o quadro que aquele beat existe para mostrar. Na
 * Identidade é `SEPARATION_PROGRESS`, o mesmo 0.18 do quadro do descolamento —
 * "cada composição é uma pose diferente do bando, não a mesma congelada cinco
 * vezes" (DIRECTION.md §5).
 *
 * Os três beats que ainda não existem apontam para o meio do intervalo deles,
 * como marcador. Eles não têm conteúdo para compor ainda.
 */
const COMPOSITION_AT: Record<BeatId, number> = {
  emergence: 0.055,
  identity: SEPARATION_PROGRESS,
  about: 0.365,
  work: 0.65,
  surface: 0.93,
};

/** Passos de simulação para o bando assentar numa pose. São dois blits de 64². */
const SETTLE_STEPS = 150;

type ComposedClockProps = {
  /** Escreve o progresso da composição; o laço mestre o aplica sem amortecer. */
  composedRef: { current: number };
  /** Roda a simulação do bando sem desenhar. Preenchido pelo `Flock`. */
  settleRef: { current: ((steps: number) => void) | null };
  /** O `<canvas>`, para o corte de 120 ms. */
  canvasRef: { current: HTMLCanvasElement | null };
};

/**
 * O relógio do modo calmo — DIRECTION.md §5, "Movimento reduzido: uma
 * composição por beat".
 *
 * **Não existe `requestAnimationFrame` nenhum aqui**, e essa é a paridade que o
 * portão já entrega: o modo calmo é o mesmo site sem câmera em movimento, não
 * uma versão reduzida. O mesmo conteúdo, os mesmos cinco beats, os mesmos
 * cards — só que a câmera **corta** entre poses fixas em vez de percorrer a
 * curva.
 *
 * A troca é um corte de 120 ms (`DURATION.cut`), e não uma interpolação de
 * posição: movimento de câmera é exatamente o que este modo tira. O que
 * esmaece é o quadro inteiro, por opacidade do canvas — a única coisa do site
 * que esmaece, pelo mesmo motivo que a abertura do portão vira um corte aqui.
 *
 * Congelar a cena num quadro só apagaria o rio de projetos mais adiante: os
 * cards são objetos na câmara, e câmera parada nunca chega neles.
 */
export function ComposedClock({
  composedRef,
  settleRef,
  canvasRef,
}: ComposedClockProps) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);
  const current = useRef<BeatId | null>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    clock.autoStart = false;
    clock.stop();
    clock.elapsedTime = 0;

    const canvas = canvasRef.current;
    let timer = 0;

    const compose = (id: BeatId) => {
      composedRef.current = COMPOSITION_AT[id];
      // O bando assenta rodando a simulação sem desenhar. São 150 pares de
      // blits numa textura de 64×64 — alguns milissegundos, uma vez por beat —
      // contra 150 quadros completos se fosse pelo laço de render.
      settleRef.current?.(SETTLE_STEPS);
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
  }, [advance, clock, canvasRef, composedRef, settleRef]);

  // Redimensionar não é uma troca de beat, mas o quadro parado precisa ser
  // redesenhado — senão a composição fica esticada até o próximo corte.
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
