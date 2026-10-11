"use client";

import { useEffect, useRef } from "react";
import { getScrollSnapshot, subscribeToScroll } from "@/lib/scroll/scroll-store";

/**
 * A barra de rolagem da HUD, no lugar da nativa (escondida em
 * `styles/globals.css`): um polegar ciano de comprimento fixo, por cima da
 * cena. É leitura, não controle — `pageProgress`, a rolagem do
 * documento em qualquer rota.
 *
 * O trilho de dentro é mais curto que a barra pelo comprimento do polegar,
 * então deslocá-lo em 100% da própria altura leva o polegar exatamente ao fim,
 * sem medir nada.
 */
export function ScrollBar() {
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = (progress: number) => {
      if (rail.current === null) return;
      rail.current.style.transform = `translateY(${progress * 100}%)`;
    };
    // O driver pode já ter publicado antes deste componente montar.
    place(getScrollSnapshot().pageProgress);
    return subscribeToScroll((snapshot) => place(snapshot.pageProgress));
  }, []);

  return (
    <div
      aria-hidden="true"
      data-hud-bar
      className="pointer-events-none fixed inset-y-6 right-0 z-50 w-1.5"
    >
      <div ref={rail} className="absolute inset-x-0 top-0 bottom-10">
        <span className="bg-cyan absolute inset-x-0 top-0 h-10" />
      </div>
    </div>
  );
}
