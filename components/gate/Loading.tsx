"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { audioNeedsGesture, startAudio } from "@/lib/audio/audio-context";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { DURATION } from "@/lib/motion";
import { markEntered, markEntryPending } from "@/lib/preload/entered";
import { runPreload } from "@/lib/preload/manifest";
import { sceneSettings } from "@/lib/scene/settings";

type Phase = "loading" | "leaving" | "gone";

/**
 * O loading se atravessa uma vez por carga da página: voltar de um case para
 * a descida remonta este componente por navegação de cliente, e ele não pode
 * fechar a cena de novo.
 */
let crossed = false;

/**
 * O passo do contador, por segundo: ele sobe em linha reta, devagar, em vez de
 * saltar a cada tarefa que termina. De 0 a 100 leva três segundos, no mínimo.
 */
const RATE = 1 / 3;
/** A pausa em 100 antes do corte. */
const HOLD_MS = 300;
const CUT_MS = DURATION.cut * 1000;

type LoadingProps = {
  label: string;
  status: string;
  done: string;
  enter: string;
};

/**
 * O carregamento: a cabeça de uma flor no centro e, embaixo dela, o contador
 * em mono. Ele conta o manifesto real (`lib/preload/manifest.ts`: fontes,
 * driver de scroll, áudio, o chunk da cena e a compilação dos shaders) e
 * **nunca mostra mais do que já chegou**. A flor começa apagada e acende do
 * miolo para as pontas com o mesmo número (`--p`, de 0 a 1). Em 100 a cena
 * começa a revelação do Impacto.
 *
 * **Com o som ligado, ele abre num clique, toque ou tecla.** Navegador nenhum
 * deixa a trilha começar sem um gesto, e sem pedi-lo aqui a descida começava
 * muda para quem só rola a página. Quem desligou o som, ou já fez um gesto
 * durante a contagem, entra sem pedir nada.
 *
 * `data-gate` no `<html>` é o contrato com o CSS: `closed` enquanto carrega,
 * `open` depois.
 */
export function Loading({ label, status, done, enter }: LoadingProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(crossed ? "gone" : "loading");
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const counter = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    // `?at=` (só em desenvolvimento) fixa a descida para captura: sem loading.
    if (crossed || sceneSettings().at !== null) {
      crossed = true;
      root.setAttribute("data-gate", "open");
      // Assíncrono de propósito: a fase muda depois da hidratação.
      queueMicrotask(() => setPhase("gone"));
      return;
    }
    if (reducedMotion === null) return;

    root.setAttribute("data-gate", "closed");
    markEntryPending();

    let target = 0;
    let shown = 0;
    let raf = 0;
    let previous = 0;
    let hold = 0;
    let cut = 0;
    let finished = false;

    const write = (value: number) => {
      shown = value;
      const node = counter.current;
      if (node !== null) {
        node.textContent = String(Math.round(value * 100)).padStart(3, "0");
      }
      overlay.current?.style.setProperty("--p", value.toFixed(3));
    };

    const open = () => {
      crossed = true;
      root.setAttribute("data-gate", "open");
      markEntered();
      setPhase("leaving");
      // A trava de rolagem saiu: quem mede a página precisa medir de novo.
      window.dispatchEvent(new Event("resize"));
      cut = window.setTimeout(() => setPhase("gone"), CUT_MS);
    };

    // O gesto de entrada. O destrave do som é síncrono, dentro do handler:
    // um `await` antes dele perde o gesto em alguns navegadores.
    const gate = overlay.current;
    const onEnter = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        // Atalho do navegador ou tecla solta de modificador não é entrada.
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (["Escape", "Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      }
      disarm();
      startAudio();
      open();
    };
    const disarm = () => {
      gate?.removeEventListener("click", onEnter);
      window.removeEventListener("keydown", onEnter);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      setReady(true);
      hold = window.setTimeout(() => {
        // Som desligado, gesto já feito na contagem, ou um navegador que
        // deixa tocar sem gesto: entra direto.
        if (!audioNeedsGesture()) {
          startAudio();
          open();
          return;
        }
        setWaiting(true);
        // O clique fica no próprio overlay, e não na janela: o iOS só entrega
        // clique a um elemento que o escuta diretamente.
        gate?.addEventListener("click", onEnter);
        window.addEventListener("keydown", onEnter);
      }, HOLD_MS);
    };

    const frame = (now: number) => {
      const dt = previous === 0 ? 0.016 : Math.min((now - previous) / 1000, 0.05);
      previous = now;
      write(Math.min(shown + RATE * dt, target));
      if (shown >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const cancel = runPreload((progress) => {
      target = progress;
      // No modo calmo não há laço: o contador é escrito a cada tarefa.
      if (reducedMotion) {
        write(progress);
        if (progress >= 1) finish();
      }
    });
    if (!reducedMotion) raf = requestAnimationFrame(frame);

    return () => {
      cancel();
      disarm();
      if (raf !== 0) cancelAnimationFrame(raf);
      window.clearTimeout(hold);
      window.clearTimeout(cut);
      // Desmontado no meio (navegação para um case): nada pode ficar travado.
      if (!crossed) {
        crossed = true;
        markEntered();
      }
      root.setAttribute("data-gate", "open");
    };
  }, [reducedMotion]);

  if (phase === "gone") return null;

  return (
    <div
      ref={overlay}
      data-gate-overlay
      data-gate-phase={phase}
      className={`loading bg-void fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6${waiting ? " cursor-pointer" : ""}`}
      style={{ "--p": 0 } as CSSProperties}
    >
      <div
        className={`loading-flower${waiting ? " loading-flower-wind" : ""}`}
        aria-hidden="true"
      >
        <div className="loading-flower-head">
          <span className="loading-flower-light" />
        </div>
      </div>
      {waiting ? (
        <p aria-hidden="true" className="type-mono text-hud text-cyan">
          {enter}
        </p>
      ) : (
        <p className="type-mono text-hud text-mist">
          {label}{" "}
          <span ref={counter} aria-hidden="true" className="tabular-nums">
            000
          </span>
        </p>
      )}
      <p role="status" className="sr-only">
        {waiting ? `${done} ${enter}` : ready ? done : status}
      </p>
    </div>
  );
}
