"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { installProbe, type FlockRead } from "@/lib/scene/probe";
import type { Roost } from "@/lib/scene/curve";
import type { ProxySim } from "@/lib/scene/proxy-sim";
import type { SharedUniforms } from "@/lib/scene/uniforms";

type ProbeClockProps = {
  progressRef: { current: number };
  settleRef: { current: ((steps: number) => void) | null };
  flockRef: { current: FlockRead | null };
  attackRef: { readonly current: number };
  shared: SharedUniforms;
  roost: Roost;
  proxy: ProxySim;
};

/**
 * O relógio da sonda — **só em desenvolvimento**, e nunca no chunk de produção.
 *
 * Ele não roda laço nenhum. A cena fica parada até alguém chamar
 * `window.__probe.*`, e cada chamada avança o relógio em passos fixos de 1/60 s
 * antes de ler. Isso é o que torna a medição repetível: a semente do bando é
 * por índice, o assentamento é um número fixo de passos, e o relógio não anda
 * sozinho entre a leitura e a conta.
 *
 * O portão é aberto sozinho, como o banco de prova faz, e o scroll é travado —
 * um polegar apoiado moveria o progresso no meio de uma varredura.
 */
export function ProbeClock({
  progressRef,
  settleRef,
  flockRef,
  attackRef,
  shared,
  roost,
  proxy,
}: ProbeClockProps) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    clock.autoStart = false;
    clock.stop();
    clock.elapsedTime = 0;

    // O portão é aberto **por atributo**, não por clique, e a diferença importa.
    // O contador dele é dirigido por `requestAnimationFrame`, que o Chrome
    // congela quando a janela está coberta — e uma janela coberta é o estado
    // normal de uma sessão dirigida por ferramenta. Esperando a fase "ready"
    // como o banco de prova faz, a sonda esperaria para sempre.
    //
    // Nada se perde: o portão é DOM e a cena desenha atrás dele desde que o
    // chunk chega, então a medição de pixel nunca dependeu dele. O que o
    // atributo destrava é o scroll e a visão para quem estiver olhando.
    const root = document.documentElement;
    const previousGate = root.getAttribute("data-gate");
    root.setAttribute("data-gate", "open");
    root.style.overflow = "hidden";
    const overlay = document.querySelector<HTMLElement>("[data-gate-overlay]");
    if (overlay !== null) overlay.style.display = "none";

    const uninstall = installProbe({
      gl,
      scene,
      advance,
      camera,
      progressRef,
      settleRef,
      flockRef,
      attackRef,
      veil: { box: shared.veilBox.value, f: shared.veilF.value },
      roost,
      proxy,
    });

    console.info(
      "[probe] pronto — window.__probe.meta() / .measure() / .contrast() / .sheet()",
    );

    return () => {
      if (previousGate === null) root.removeAttribute("data-gate");
      else root.setAttribute("data-gate", previousGate);
      root.style.overflow = "";
      if (overlay !== null) overlay.style.display = "";
      uninstall();
    };
  }, [
    advance,
    clock,
    gl,
    scene,
    camera,
    progressRef,
    settleRef,
    flockRef,
    attackRef,
    shared,
    roost,
    proxy,
  ]);

  return null;
}
