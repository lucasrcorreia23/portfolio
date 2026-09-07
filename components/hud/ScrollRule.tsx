"use client";

import { beatAt } from "@/components/beats/beats";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";

/** Quantos degraus a régua tem. Cem marcas, cem re-renders na descida toda. */
const STEPS = 100;

type ScrollRuleProps = {
  progressLabel: string;
  /** `EST.` — o léxico numérico atravessa pt/en quase sem tradução. */
  stationLabel: string;
};

/**
 * O indicador de progresso, desenhado como régua graduada com cotas e não
 * como barra (DIRECTION.md §4).
 *
 * É o consumidor de `useScrollProgress` do lado do DOM: pede `steps` porque
 * precisa renderizar. A cena vai pedir o mesmo hook sem `steps`, e ler o ref
 * a cada frame — mesma fonte, dois modos de consumo.
 */
export function ScrollRule({ progressLabel, stationLabel }: ScrollRuleProps) {
  const { value: progress } = useScrollProgress({ steps: STEPS });

  const beat = beatAt(progress);
  const station = Math.round(progress * 1000)
    .toString()
    .padStart(4, "0");

  return (
    // No mobile a HUD é uma faixa no topo; a régua vertical não cabe nela.
    <div className="hidden flex-col gap-3 md:flex">
      <p className="type-mono text-hud-sm">{progressLabel}</p>

      <div
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="relative h-40 w-6"
      >
        {/* A régua: marcas gravadas, a cada cinquenta por cento uma cota longa. */}
        {Array.from({ length: 11 }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="absolute left-0 h-px bg-mist"
            style={{
              top: `${index * 10}%`,
              width: index % 5 === 0 ? "1rem" : "0.5rem",
            }}
          />
        ))}

        {/* O cursor: uma marca que corre pela régua. */}
        <span
          aria-hidden="true"
          className="absolute left-0 h-px w-6 bg-cyan"
          style={{ top: `${progress * 100}%` }}
        />
      </div>

      <p className="type-mono text-hud tabular-nums">
        {stationLabel} {station}
      </p>
      <p className="type-mono text-hud-sm">{beat.id}</p>
    </div>
  );
}
