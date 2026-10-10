import type { CSSProperties } from "react";
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
 * manifesto. Tudo entra por recorte, sem esmaecer e sem transladar.
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
    <div className="beat-stage justify-end gap-10 pb-[12svh]">
      <BeatReveal
        from={beat.from + span * 0.05}
        to={beat.from + span * 0.4}
        className="beat-reveal"
      >
        <h1 aria-label={fullName} className="type-display intro-name w-fit" data-veil>
          {[first, last].map((line, index) => (
            <span
              key={line}
              aria-hidden="true"
              className="intro-line block"
              style={{ "--line": index } as CSSProperties}
            >
              {line}
            </span>
          ))}
        </h1>
      </BeatReveal>
      <BeatReveal
        from={beat.from + span * 0.3}
        to={beat.from + span * 0.65}
        className="beat-reveal beat-in flex flex-col gap-8 md:flex-row md:gap-16"
      >
        <ul data-veil className="type-mono text-hud text-mist flex w-fit shrink-0 flex-col gap-1">
          {position.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div data-veil className="measure text-body text-mist flex w-fit flex-col gap-4">
          {manifesto.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </BeatReveal>
    </div>
  );
}
