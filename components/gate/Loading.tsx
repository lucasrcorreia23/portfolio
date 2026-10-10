"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { damp, DURATION } from "@/lib/motion";
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

/** Quanto o contador persegue o progresso real, por segundo. */
const CHASE_LAMBDA = 5;
/** O perseguidor mira além de 1 para chegar a 100 num tempo finito. */
const CHASE_AIM = 1.04;
/** A pausa em 100 antes do corte. */
const HOLD_MS = 300;
const CUT_MS = DURATION.cut * 1000;

type LoadingProps = {
  label: string;
  status: string;
  done: string;
};

/**
 * O contador de carregamento: pequeno, em mono, no canto. Ele conta o
 * manifesto real (`lib/preload/manifest.ts`: fontes, driver de scroll, áudio,
 * o chunk da cena e a compilação dos shaders) e **nunca mostra mais do que já
 * chegou**. Em 100 ele fecha sozinho, e a cena começa a revelação do Impacto.
 *
 * `data-gate` no `<html>` é o contrato com o CSS: `closed` enquanto carrega,
 * `open` depois.
 */
export function Loading({ label, status, done }: LoadingProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(crossed ? "gone" : "loading");
  const [ready, setReady] = useState(false);
  const counter = useRef<HTMLSpanElement>(null);

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
    let chase = 0;
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
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      setReady(true);
      hold = window.setTimeout(() => {
        crossed = true;
        root.setAttribute("data-gate", "open");
        markEntered();
        setPhase("leaving");
        // A trava de rolagem saiu: quem mede a página precisa medir de novo.
        window.dispatchEvent(new Event("resize"));
        cut = window.setTimeout(() => setPhase("gone"), CUT_MS);
      }, HOLD_MS);
    };

    const frame = (now: number) => {
      const dt = previous === 0 ? 0.016 : Math.min((now - previous) / 1000, 0.05);
      previous = now;
      chase = damp(chase, CHASE_AIM, CHASE_LAMBDA, dt);
      write(Math.min(chase, target, 1));
      if (target >= 1 && shown >= 0.995) {
        write(1);
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
      data-gate-overlay
      data-gate-phase={phase}
      className="loading bg-void fixed inset-0 z-[60] flex items-end justify-between px-6 py-6 md:px-12 md:py-10"
    >
      <p className="type-mono text-hud text-mist">
        {label}{" "}
        <span ref={counter} aria-hidden="true" className="tabular-nums">
          000
        </span>
      </p>
      <p role="status" className="sr-only">
        {ready ? done : status}
      </p>
    </div>
  );
}
