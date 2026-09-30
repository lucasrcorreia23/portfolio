"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis, { type VirtualScrollData } from "lenis";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { LENIS_LERP } from "@/lib/motion";
import { riverReadings } from "@/lib/scene/river-readings";
import { descentFromScroll, scrollFromDescent } from "./descent-map";
import { publishFrame } from "./frame-bus";
import {
  consumeScrollRequest,
  consumeScrollResize,
  getScrollRole,
  publishScroll,
  resetScroll,
} from "./scroll-store";

/**
 * O rio tem água (rodada 14, revista): perto de cada card a rolagem fica mais
 * densa, e quando a mão para, a página assenta devagar na leitura mais
 * próxima.
 *
 * A primeira versão travava: um gesto virava uma viagem de duração fixa até o
 * card vizinho e o resto do gesto era engolido. Resolvia o pulo de cases, mas o
 * Lucas a leu como radical e não natural — e tudo neste projeto precisa
 * refletir o mundo real. Então nada é engolido e nada tem duração fixa:
 *
 * - `RIVER_VISCOSITY` é quanto um gesto rende em cima de um card (metade), e
 *   ele sobe até o cheio no meio da passagem — a rolagem desacelera onde há o
 *   que ver, como a câmera, que também desacelera ali (`RIVER_SLOW`, em
 *   `curve.ts`);
 * - depois de `SETTLE_QUIET_MS` sem roda e com a página parada, ela deriva até
 *   a leitura mais próxima pelo próprio `lerp` do Lenis, bem mais baixo que o
 *   da rolagem (`SETTLE_LERP`): um assentamento, não um estalo.
 */
const RIVER_VISCOSITY = 0.5;
const SETTLE_QUIET_MS = 420;
const SETTLE_LERP = 0.028;

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

    // **O rio tem água.** Ver `RIVER_VISCOSITY`. As leituras são as da curva
    // (`riverReadings`); no toque a rolagem é nativa e só a desaceleração da
    // câmera vale. Dentro de um case a rolagem é do artigo, e nada muda.
    let lastWheel = 0;
    let settled = true;
    const nearestReading = (here: number) => {
      const readings = riverReadings();
      const interval = readings.length > 1 ? readings[1]! - readings[0]! : 1;
      let best = readings[0] ?? 0;
      for (const at of readings) if (Math.abs(at - here) < Math.abs(best - here)) best = at;
      return { best, interval };
    };
    const viscous = (data: VirtualScrollData): boolean => {
      if (getScrollRole() !== "descent" || !data.event.type.includes("wheel")) return true;
      lastWheel = performance.now();
      settled = false;
      const limit = lenis.limit;
      if (limit <= 0) return true;
      const here = descentFromScroll(lenis.animatedScroll / limit);
      const { best, interval } = nearestReading(here);
      const d = Math.abs(here - best) / (interval / 2);
      if (d > 1) return true;
      const t = d * d * (3 - 2 * d);
      data.deltaY *= RIVER_VISCOSITY + (1 - RIVER_VISCOSITY) * t;
      return true;
    };

    const lenis = new Lenis({
      lerp: LENIS_LERP,
      smoothWheel: true,
      virtualScroll: viscous,
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
      // O assentamento: uma vez por pausa, com a página já parada.
      if (
        !settled &&
        getScrollRole() === "descent" &&
        performance.now() - lastWheel > SETTLE_QUIET_MS &&
        Math.abs(lenis.velocity) < 0.3 &&
        lenis.limit > 0
      ) {
        settled = true;
        const here = descentFromScroll(lenis.animatedScroll / lenis.limit);
        const { best, interval } = nearestReading(here);
        const gap = Math.abs(here - best);
        if (gap < interval / 2 && gap > 0.001) {
          lenis.scrollTo(scrollFromDescent(best) * lenis.limit, { lerp: SETTLE_LERP });
        }
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
