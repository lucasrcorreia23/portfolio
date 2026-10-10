"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getEntry } from "@/lib/preload/entered";
import {
  getQuality,
  setQuality,
  subscribeToQuality,
  type QualityTier,
} from "@/lib/scene/quality";
import { REVEAL_MS } from "@/lib/scene/rail";
import { sceneSettings } from "@/lib/scene/settings";

/** A primeira janela decide o nível; as seguintes só podem baixá-lo. */
const FIRST_WINDOW_MS = 3000;
const WINDOW_MS = 2000;
/** Mediana de quadro, em ms: até aqui sobe para o alto; daqui para cima, cai. */
const PROMOTE_BELOW = 17.5;
const DEMOTE_ABOVE = 22;
const LOWER: Record<QualityTier, QualityTier> = {
  high: "medium",
  medium: "low",
  low: "low",
};

function median(samples: number[]): number {
  const sorted = samples.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Escolhe o nível de qualidade pelo tempo de quadro medido.
 *
 * A cena nasce no nível médio. Depois da revelação do Impacto, os três
 * primeiros segundos decidem: com folga ela sobe para o alto, sem folga desce.
 * Dali em diante a medição continua em janelas de dois segundos e só derruba
 * — nunca sobe de novo, para o nível não oscilar.
 *
 * A troca espera o fim da revelação de propósito: a resolução não pode estalar
 * no meio do único momento de espetáculo.
 */
export function QualityGovernor({ still }: { still: boolean }) {
  const setDpr = useThree((state) => state.setDpr);
  const samples = useRef<number[]>([]);
  const last = useRef(0);
  const windowStart = useRef(0);
  const decided = useRef(false);

  useEffect(() => {
    const forced = sceneSettings().dprCap;
    const apply = () => {
      setDpr(
        forced ?? Math.min(window.devicePixelRatio || 1, getQuality().dpr),
      );
    };
    apply();
    return subscribeToQuality(apply);
  }, [setDpr]);

  useFrame(() => {
    // No modo calmo não há laço para medir: o nível médio fica.
    if (still || document.hidden) {
      last.current = 0;
      return;
    }
    const entry = getEntry();
    const now = performance.now();
    if (
      entry.phase === "pending" ||
      (entry.phase === "entered" && now - entry.at < REVEAL_MS)
    ) {
      last.current = 0;
      return;
    }
    if (last.current === 0) {
      last.current = now;
      windowStart.current = now;
      samples.current.length = 0;
      return;
    }
    samples.current.push(now - last.current);
    last.current = now;

    const span = decided.current ? WINDOW_MS : FIRST_WINDOW_MS;
    if (now - windowStart.current < span || samples.current.length < 20) return;

    const typical = median(samples.current);
    samples.current.length = 0;
    windowStart.current = now;
    const tier = getQuality().tier;
    if (!decided.current) {
      decided.current = true;
      if (typical <= PROMOTE_BELOW) setQuality("high");
      else if (typical > DEMOTE_ABOVE) setQuality(LOWER[tier]);
      return;
    }
    if (typical > DEMOTE_ABOVE) setQuality(LOWER[tier]);
  }, -11);

  return null;
}
