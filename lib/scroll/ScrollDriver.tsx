"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { LENIS_LERP } from "@/lib/motion";
import { publishFrame } from "./frame-bus";
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

    const tick = (time: number, deltaMs: number) => {
      // O ticker do GSAP conta em segundos; o Lenis quer milissegundos.
      lenis.raf(time * 1000);
      // O quadro é publicado **depois** do Lenis, porque o `lenis.raf` é quem
      // dispara o `onLenisScroll` e portanto o `publishScroll`. Nesta ordem a
      // cena avança já com o progresso deste quadro; invertida, ela desenharia
      // sempre um quadro atrás. Ver `lib/scroll/frame-bus.ts`.
      publishFrame(deltaMs);
    };

    lenis.on("scroll", onLenisScroll);
    gsap.ticker.add(tick);

    // A sonda de contraste precisa rolar a página de verdade: as caixas de
    // texto que ela mede são `sticky`, então a posição delas na tela é função
    // do scroll, e medir com a página no topo mediria outro enquadramento. Um
    // `window.scrollTo` seria desfeito pelo Lenis no quadro seguinte, então o
    // que ela pede é a própria instância.
    //
    // Some da build de produção: o `process.env.NODE_ENV` vira literal e o
    // bloco inteiro cai. Ver `lib/scene/probe-contrast.ts`.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    }
    // Sem isto o GSAP "engole" quadros longos e o scroll dá um salto ao
    // voltar de uma aba em segundo plano.
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as { __lenis?: Lenis }).__lenis;
      }
      lenis.off("scroll", onLenisScroll);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      resetScroll();
    };
  }, [reducedMotion]);

  return null;
}
