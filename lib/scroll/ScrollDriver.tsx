"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { LENIS_LERP } from "@/lib/motion";
import { publishFrame } from "./frame-bus";
import {
  consumeScrollRequest,
  consumeScrollResize,
  publishScroll,
  resetScroll,
} from "./scroll-store";

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
      const limitOf = () =>
        document.documentElement.scrollHeight - window.innerHeight;

      const readNativeScroll = () => {
        const limit = limitOf();
        publishScroll({
          progress: limit > 0 ? window.scrollY / limit : 0,
          velocity: 0,
        });
      };

      // Mesmo contrato do caminho normal, sem Lenis: o pedido de rolagem da
      // volta é atendido, e uma troca de rota remede antes de publicar.
      const drain = () => {
        if (consumeScrollResize()) ScrollTrigger.refresh();
        const wanted = consumeScrollRequest();
        if (wanted !== null) {
          window.scrollTo({ top: wanted * limitOf(), behavior: "auto" });
        }
        readNativeScroll();
      };

      readNativeScroll();
      window.addEventListener("scroll", readNativeScroll, { passive: true });
      window.addEventListener("resize", readNativeScroll);
      gsap.ticker.add(drain);
      ScrollTrigger.refresh();

      return () => {
        window.removeEventListener("scroll", readNativeScroll);
        window.removeEventListener("resize", readNativeScroll);
        gsap.ticker.remove(drain);
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
      // **Remedir antes de rolar, e rolar antes de publicar.** Uma navegação de
      // cliente troca 22 alturas de viewport por três sem o Lenis saber, e um
      // `scrollTo` contra o limite antigo vai para o lugar errado — ou, pior,
      // para o topo, que é exatamente o que a volta do case não pode fazer.
      if (consumeScrollResize()) {
        lenis.resize();
        ScrollTrigger.refresh();
      }
      const wanted = consumeScrollRequest();
      if (wanted !== null) {
        lenis.scrollTo(wanted * lenis.limit, { immediate: true, force: true });
      }

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
