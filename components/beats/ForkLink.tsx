"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSceneMode } from "@/lib/capabilities/use-scene-mode";
import {
  endVitrineFlight,
  startVitrineFlight,
  VITRINE_FLIGHT_MS,
} from "@/lib/work/vitrine-flight";

type ForkLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

/**
 * O link da bifurcação. Com a cena em movimento, o clique primeiro leva a
 * câmera até a parede da vitrine e só então troca de página. No modo calmo,
 * sem cena ou com tecla modificadora, é um link comum.
 */
export function ForkLink({ href, className, children }: ForkLinkProps) {
  const router = useRouter();
  const mode = useSceneMode();
  const timer = useRef(0);

  useEffect(() => {
    router.prefetch(href);
    return () => {
      window.clearTimeout(timer.current);
      endVitrineFlight();
    };
  }, [router, href]);

  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (mode !== "driven") return;
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        startVitrineFlight();
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => router.push(href), VITRINE_FLIGHT_MS);
      }}
    >
      {children}
    </a>
  );
}
