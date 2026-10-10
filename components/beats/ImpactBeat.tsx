import type { Beat } from "./beats";
import { BeatReveal } from "./BeatReveal";

type ImpactBeatProps = {
  beat: Beat;
  hint: string;
};

/**
 * O Impacto: o único momento de espetáculo, e ele é da cena. O DOM só deixa
 * um convite a rolar, que sai assim que a descida começa.
 */
export function ImpactBeat({ beat, hint }: ImpactBeatProps) {
  return (
    <div className="beat-stage">
      <BeatReveal
        from={beat.from + 0.01}
        to={beat.from + 0.05}
        className="beat-reveal beat-out mt-auto"
      >
        <p data-veil className="type-mono text-hud text-mist w-fit">
          {hint} <span aria-hidden="true">↓</span>
        </p>
      </BeatReveal>
    </div>
  );
}
