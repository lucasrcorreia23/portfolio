import Link from "next/link";
import type { Beat } from "./beats";
import { BeatReveal } from "./BeatReveal";

type ForkBeatProps = {
  beat: Beat;
  href: string;
  lead: string;
  enter: string;
  onward: string;
  count: number;
};

/**
 * A bifurcação: depois dos cases a trilha oferece um desvio. A câmera olha
 * para a parede da vitrine, e quem decide ir é a pessoa — o caminho de sempre
 * continua para baixo, até o contato.
 */
export function ForkBeat({ beat, href, lead, enter, onward, count }: ForkBeatProps) {
  const span = beat.to - beat.from;
  return (
    <div className="beat-stage justify-end pb-[14svh]">
      <BeatReveal
        from={beat.from + span * 0.1}
        to={beat.from + span * 0.5}
        className="beat-reveal beat-in flex flex-col gap-6"
      >
        <p data-veil className="type-display text-display-3 w-fit">
          {lead}
        </p>
        <div data-veil className="flex w-fit flex-col gap-3">
          <Link href={href} className="fork-enter type-mono text-label w-fit">
            {enter} <span aria-hidden="true">→</span>{" "}
            <span className="text-hud">+{String(count).padStart(2, "0")}</span>
          </Link>
          <p className="type-mono text-hud text-mist">
            {onward} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </BeatReveal>
    </div>
  );
}
