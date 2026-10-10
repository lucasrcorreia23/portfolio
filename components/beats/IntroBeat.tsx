import type { CSSProperties } from "react";
import { Glyphs } from "@/components/text/Glyphs";
import type { Beat } from "./beats";
import { BeatReveal } from "./BeatReveal";

type IntroBeatProps = {
  beat: Beat;
  first: string;
  last: string;
  fullName: string;
  position: readonly string[];
  manifesto: readonly string[];
};

/**
 * A Introdução: o nome em tipografia no DOM, o papel em três linhas e o
 * manifesto. O nome acende, o papel entra como leitura e o manifesto sai da
 * névoa, nessa ordem, a partir de uma deixa só.
 */
export function IntroBeat({
  beat,
  first,
  last,
  fullName,
  position,
  manifesto,
}: IntroBeatProps) {
  const span = beat.to - beat.from;
  return (
    <div className="beat-stage justify-end pb-[12svh]">
      <BeatReveal from={beat.from + span * 0.15} className="flex flex-col gap-10">
        <h1 aria-label={fullName} className="type-display intro-name w-fit" data-veil>
          {[first, last].map((line, index) => (
            <span key={line} className="block">
              <Glyphs text={line} offset={index * 5} />
            </span>
          ))}
        </h1>
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          <ul
            data-veil
            data-readout
            className="type-mono text-hud text-mist flex w-fit shrink-0 flex-col gap-1"
            style={{ "--wait": "500ms" } as CSSProperties}
          >
            {position.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div
            data-veil
            className="fog-in measure text-body text-mist flex w-fit flex-col gap-4"
            style={{ "--wait": "800ms" } as CSSProperties}
          >
            {manifesto.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </BeatReveal>
    </div>
  );
}
