"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { LENIS_LERP } from "@/lib/motion";
import { publishScroll, resetScroll } from "./scroll-store";

/**
 * O único driver de scroll do site, e o único lugar que publica no store.
 *
 * Dois caminhos, um contrato: aconteça o que acontecer, o progresso
 * normalizado de 0 a 1 continua sendo publicado. No modo calmo ele corta
 * entre composições em vez de dirigir a câmera, mas quem lê não muda.
 *
 * **Este módulo não está na rota inicial, e isso é o orçamento falando.**
 * Gsap e lenis são 48 kB comprimidos que não servem ao primeiro quadro útil:
 * o portão é DOM e não rola, e o scroll só começa depois do clique de
 * entrada. Ele é carregado por `loadScrollDriver()` — pelo preloader do
 * portão na home, e depois do primeiro quadro nas outras rotas. Ver
 * AGENTS.md, "Orçamento de JS".
 *
 * Não renderiza nada: quem renderiza os filhos é o `ScrollProvider`, que
 * fica no layout e continua leve.
 */
export default function ScrollDriver() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // `null` = ainda não sabemos. Não vale ligar o Lenis "por enquanto" e
    // desligar no frame seguinte.
    if (reducedMotion === null) return;

    gsap.registerPlugin(ScrollTrigger);

    if (reducedMotion) {
      const readNativeScroll = () => {
        const limit =
          document.documentElement.scrollHeight - window.innerHeight;
        publishScroll({
          progress: limit > 0 ? window.scrollY / limit : 0,
          velocity: 0,
        });
      };

      readNativeScroll();
      window.addEventListener("scroll", readNativeScroll, { passive: true });
      window.addEventListener("resize", readNativeScroll);
      ScrollTrigger.refresh();

      return () => {
        window.removeEventListener("scroll", readNativeScroll);
        window.removeEventListener("resize", readNativeScroll);
        resetScroll();
      };
    }

    const lenis = new Lenis({
      lerp: LENIS_LERP,
      smoothWheel: true,
      // O rAF é o do GSAP: um relógio só para o scroll, as animações e,
      // mais adiante, o loop de render da cena.
      autoRaf: false,
    });

    const onLenisScroll = (instance: Lenis) => {
      publishScroll({
        progress: instance.progress,
        velocity: instance.velocity,
      });
      ScrollTrigger.update();
    };

    const tick = (time: number) => {
      // O ticker do GSAP conta em segundos; o Lenis quer milissegundos.
      lenis.raf(time * 1000);
    };

    lenis.on("scroll", onLenisScroll);
    gsap.ticker.add(tick);
    // Sem isto o GSAP "engole" quadros longos e o scroll dá um salto ao
    // voltar de uma aba em segundo plano.
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onLenisScroll);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      resetScroll();
    };
  }, [reducedMotion]);

  return null;
}
