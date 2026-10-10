"use client";

import { BEATS } from "@/components/beats/beats";
import { stopAt, stops } from "@/lib/scene/stops";
import { requestScrollTo } from "@/lib/scroll/scroll-store";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";

const STEPS = 200;

type ScrollRuleProps = {
  label: string;
  /** O rótulo acessível de cada parada, já com o índice. */
  stopLabels: readonly string[];
};

/**
 * A régua da trilha: as fronteiras dos momentos, uma marca por case e o cursor
 * que corre por ela. As marcas dos cases são botões que levam à parada.
 */
export function ScrollRule({ label, stopLabels }: ScrollRuleProps) {
  const { value: progress } = useScrollProgress({ steps: STEPS });
  const active = stopAt(progress);

  return (
    <div className="hidden flex-col gap-3 md:flex">
      <p className="type-mono text-hud-sm text-mist">{label}</p>
      <div className="relative h-56 w-16">
        {BEATS.map((beat) => (
          <span
            key={beat.id}
            aria-hidden="true"
            className="bg-teal absolute left-0 h-px w-2"
            style={{ top: `${beat.from * 100}%` }}
          />
        ))}
        {stops().map((at, index) => (
          <button
            key={at}
            type="button"
            aria-label={stopLabels[index]}
            aria-current={index === active ? "true" : "false"}
            onClick={() => requestScrollTo(at)}
            className="type-mono text-hud-sm text-mist group absolute left-0 flex h-3 -translate-y-1/2 items-center gap-2 aria-[current=true]:text-cyan"
            style={{ top: `${at * 100}%` }}
          >
            <span
              aria-hidden="true"
              className="bg-mist h-px w-4 group-aria-[current=true]:w-6 group-aria-[current=true]:bg-cyan"
            />
            <span aria-hidden="true" className="tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
        <span
          aria-hidden="true"
          className="bg-mist absolute left-0 h-px w-2"
          style={{ top: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
