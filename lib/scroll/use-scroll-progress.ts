"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  getScrollProgress,
  subscribeToScroll,
  type ScrollSnapshot,
} from "./scroll-store";

export type UseScrollProgressOptions = {
  /**
   * Quantiza o progresso em N degraus e devolve como estado do React.
   * Sem isto o hook não re-renderiza nunca — que é o comportamento certo
   * para a cena e para os uniforms.
   *
   * A régua da HUD, por exemplo, tem 100 marcas: `{ steps: 100 }` re-renderiza
   * no máximo 100 vezes na descida inteira, em vez de a cada frame.
   */
  steps?: number;
};

export type ScrollProgress = {
  /**
   * Atualizado a cada frame, sem causar render. É daqui que a câmera, os
   * uniforms e qualquer coisa dentro de um `requestAnimationFrame` leem.
   */
  ref: RefObject<number>;
  /**
   * Progresso quantizado, como estado do React. Só muda se `steps` foi
   * passado; sem `steps` fica parado no valor inicial de propósito.
   */
  value: number;
  /**
   * Assina o store diretamente, para trabalho por frame que não passa pelo
   * React. Devolve a função de cancelamento.
   */
  subscribe: (listener: (snapshot: Readonly<ScrollSnapshot>) => void) => () => void;
};

function quantize(progress: number, steps: number | undefined): number {
  if (steps === undefined) return progress;
  return Math.round(progress * steps) / steps;
}

/**
 * O único acesso ao progresso do scroll. Tudo que reage à descida passa
 * por aqui — PROJECT.md §3.3.
 */
export function useScrollProgress(
  options: UseScrollProgressOptions = {},
): ScrollProgress {
  const steps = options.steps;
  const ref = useRef(getScrollProgress());
  const [value, setValue] = useState(() => quantize(getScrollProgress(), steps));

  useEffect(() => {
    // O provider pode já ter publicado antes deste componente montar.
    ref.current = getScrollProgress();
    if (steps !== undefined) setValue(quantize(ref.current, steps));

    return subscribeToScroll((snapshot) => {
      ref.current = snapshot.progress;
      if (steps === undefined) return;
      setValue((previous) => {
        const next = quantize(snapshot.progress, steps);
        return next === previous ? previous : next;
      });
    });
  }, [steps]);

  return { ref, value, subscribe: subscribeToScroll };
}
