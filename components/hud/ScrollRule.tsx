"use client";

import { BEATS } from "@/components/beats/beats";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";

/** Quantos degraus a régua tem. Cem marcas, cem re-renders na descida toda. */
const STEPS = 100;

type ScrollRuleProps = {
  progressLabel: string;
};

/**
 * O indicador de progresso, desenhado como **régua graduada com cotas** e não
 * como barra (DIRECTION.md §4).
 *
 * As marcas longas não são a cada dez por cento: são as **fronteiras dos
 * beats**, lidas de `BEATS`. Uma graduação regular seria papel milimetrado — e
 * uma régua cujas cotas caem em 0.10, 0.28, 0.45 e 0.85 diz onde a descida
 * muda de assunto, que é a única coisa que uma régua de progresso tem para
 * dizer aqui. Mexer na tabela de beats move as cotas sozinho.
 *
 * É o consumidor de `useScrollProgress` do lado do DOM: pede `steps` porque
 * precisa renderizar. A cena pede o mesmo hook sem `steps` e lê o ref a cada
 * quadro — mesma fonte, dois modos de consumo.
 */
export function ScrollRule({ progressLabel }: ScrollRuleProps) {
  const { value: progress } = useScrollProgress({ steps: STEPS });

  return (
    // No mobile a HUD colapsa num acionador, e a régua vertical não cabe nele:
    // ali quem mostra a estação é o próprio acionador (ver `HudPanel`).
    <div className="hidden flex-col gap-3 md:flex">
      <p className="type-mono text-hud-sm text-mist">{progressLabel}</p>

      <div
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="relative h-40 w-6"
      >
        {/* As marcas de intervalo: uma a cada cinco por cento. */}
        {Array.from({ length: 21 }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="bg-mist absolute left-0 h-px w-1.5"
            style={{ top: `${index * 5}%` }}
          />
        ))}

        {/* As cotas: onde um beat começa. */}
        {BEATS.map((beat) => (
          <span
            key={beat.id}
            aria-hidden="true"
            className="bg-mist absolute left-0 h-px w-4"
            style={{ top: `${beat.from * 100}%` }}
          />
        ))}

        {/* O cursor: a marca que corre pela régua. */}
        <span
          aria-hidden="true"
          className="bg-cyan absolute left-0 h-px w-6"
          style={{ top: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
