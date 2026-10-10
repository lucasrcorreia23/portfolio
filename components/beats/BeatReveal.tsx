"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { emitCue } from "@/lib/audio/field-store";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { getScrollProgress, subscribeToScroll } from "@/lib/scroll/scroll-store";
import { runReadouts } from "@/lib/text/readout";

type BeatRevealProps = {
  /** Progresso normalizado a partir do qual o bloco está aceso. */
  from: number;
  /** Progresso em que ele apaga. Sem ele, fica aceso até o fim. */
  to?: number;
  className?: string;
  children: ReactNode;
};

/** Folga para o estado não piscar com o scroll parado na borda. */
const EDGE = 0.008;

/**
 * O gatilho da entrada dos textos: escreve `data-lit` no próprio elemento
 * quando o progresso cruza a faixa, e só então. A entrada toca no tempo dela,
 * em CSS (`styles/globals.css`), e desfaz ao voltar; o scroll só dá a deixa.
 *
 * Sem `data-lit` o texto está inteiro. É o estado sem JavaScript, o de
 * `prefers-reduced-motion`, e o de quem recarrega já dentro da faixa: nesse
 * caso nada é escrito até o bloco apagar pela primeira vez.
 */
export function BeatReveal({
  from,
  to = Infinity,
  className = "",
  children,
}: BeatRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Antes da pintura: um bloco que monta já apagado (a legenda, a cada parada)
  // não pode aparecer inteiro por um quadro.
  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;

    // `null` é "ainda não dá para saber"; com a preferência ligada o texto
    // fica como veio do servidor.
    if (reducedMotion !== false) return;

    let lit: boolean | null = null;

    const write = (progress: number) => {
      const edge = lit === true ? EDGE : 0;
      const next = progress >= from - edge && progress <= to + edge;
      if (next === lit) return;
      const first = lit === null;
      lit = next;
      if (first && next) return;
      node.setAttribute("data-lit", String(next));
      runReadouts(node, next);
      // O som é da luz: só toca onde há título acendendo.
      if (next && node.querySelector(".glyph") !== null) emitCue("text");
    };

    write(getScrollProgress());
    const unsubscribe = subscribeToScroll((snapshot) => {
      write(snapshot.progress);
    });
    return () => {
      unsubscribe();
      runReadouts(node, false);
      node.removeAttribute("data-lit");
    };
  }, [from, to, reducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
