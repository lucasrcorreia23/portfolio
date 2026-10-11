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
      <BeatReveal from={beat.from} to={beat.from + 0.03} className="mt-auto pb-[12svh]">
        <p data-veil data-readout className="type-mono text-hud text-mist flex w-fit items-center gap-2">
          {hint}
          <span aria-hidden="true" className="h-3 w-px bg-current" />
        </p>
      </BeatReveal>
    </div>
  );
}
