"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis, { type VirtualScrollData } from "lenis";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { easeStrong, LENIS_LERP } from "@/lib/motion";
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
 * O passo do rio (rodada 14): dentro do beat de Trabalho, **um gesto de roda
 * leva a um card** — nem meio, nem dois.
 *
 * Os cards ficam a ~1 vh de rolagem um do outro no desktop, e a medição de
 * antes (roda sintética a 1440×900) mostrou um gesto de uma tela atravessando
 * dois cases e um de duas telas atravessando quatro. Um snap por proximidade
 * alinhava a parada ao card mas não limitava o avanço: medido, os mesmos 2 e 4.
 *
 * `STEP_DURATION_S` é quanto dura a viagem de um card ao outro; `QUIET_MS` é o
 * silêncio de roda que encerra o gesto — um trackpad continua mandando inércia
 * por meio segundo depois do dedo sair, e cada resto dessa inércia não pode
 * virar outro passo.
 */
const STEP_DURATION_S = 1.1;
const QUIET_MS = 240;

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

    // **O rio anda um card por gesto.** Um evento de roda dentro do alcance do
    // rio (a leitura vizinha na direção do gesto a no máximo um intervalo) vira
    // uma viagem até essa leitura, e o resto do gesto é engolido até a viagem
    // acabar e a roda silenciar. Na última leitura, rolando para baixo, e na
    // primeira, rolando para cima, não há vizinha: a rolagem volta a ser livre e
    // sai do rio. As leituras são as da curva (`riverReadings`), e a curva
    // repousa em cada uma (`RIVER_HOLD`, em `lib/scene/curve.ts`).
    //
    // Só roda e trackpad: no toque a rolagem é nativa, e quem segura é o
    // repouso da curva. Dentro de um case a rolagem é do artigo, e nada muda.
    let stepping = false;
    let stepDone = true;
    let lastWheel = 0;
    let stepStarted = 0;
    const stepRiver = (data: VirtualScrollData): boolean => {
      if (getScrollRole() !== "descent" || !data.event.type.includes("wheel")) return true;
      const now = performance.now();
      if (stepping) {
        lastWheel = now;
        if (data.event.cancelable) data.event.preventDefault();
        return false;
      }
      const direction = Math.sign(data.deltaY);
      const limit = lenis.limit;
      if (direction === 0 || limit <= 0) return true;
      const readings = riverReadings();
      const interval = readings.length > 1 ? readings[1]! - readings[0]! : 1;
      const here = descentFromScroll(lenis.animatedScroll / limit);
      const epsilon = 0.002;
      const next =
        direction > 0
          ? readings.find((at) => at > here + epsilon)
          : readings.findLast((at) => at < here - epsilon);
      if (next === undefined || Math.abs(next - here) > interval + epsilon) return true;
      stepping = true;
      stepDone = false;
      lastWheel = now;
      stepStarted = now;
      lenis.scrollTo(scrollFromDescent(next) * limit, {
        duration: STEP_DURATION_S,
        easing: easeStrong,
        force: true,
        onComplete: () => {
          stepDone = true;
        },
      });
      if (data.event.cancelable) data.event.preventDefault();
      return false;
    };

    const lenis = new Lenis({
      lerp: LENIS_LERP,
      smoothWheel: true,
      virtualScroll: stepRiver,
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
      // O `onComplete` não chega se outra rolagem interromper a viagem (o
      // `requestScrollTo` da volta de um case, o foco de teclado): o prazo da
      // viagem encerra o passo do mesmo jeito, senão a roda ficaria presa.
      const now = performance.now();
      if (stepping && !stepDone && now - stepStarted > STEP_DURATION_S * 1000 + 200) {
        stepDone = true;
      }
      if (stepping && stepDone && now - lastWheel > QUIET_MS) {
        stepping = false;
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
