import type { CSSProperties } from "react";
import { Glyphs } from "@/components/text/Glyphs";
import type { Beat } from "./beats";
import { BeatReveal } from "./BeatReveal";

type IntroBeatProps = {
  beat: Beat;
  first: string;
  last: string;
  fullName: string;
  position: string;
  manifesto: readonly string[];
};

/**
 * A Introdução: o nome em tipografia no DOM, o papel em uma frase e o
 * manifesto. O nome acende, o papel entra como leitura e o manifesto sai da
 * névoa, nessa ordem, a partir de uma deixa só. A deixa vem antes de o painel
 * grudar, com o nome já na tela: o texto chega quase junto do véu atrás dele.
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
      <BeatReveal from={beat.from - span * 0.15} className="flex flex-col gap-10">
        <h1 aria-label={fullName} className="type-display intro-name w-fit" data-veil>
          {[first, last].map((line, index) => (
            <span key={line} className="block">
              <Glyphs text={line} offset={index * 5} />
            </span>
          ))}
        </h1>
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          <p
            data-veil
            data-readout
            className="type-mono text-hud text-mist w-fit max-w-[26ch] shrink-0 text-balance"
            style={{ "--wait": "200ms" } as CSSProperties}
          >
            {position}
          </p>
          <div
            data-veil
            className="fog-in text-body text-mist flex w-fit max-w-[62ch] flex-col gap-4 text-pretty"
            style={{ "--wait": "350ms" } as CSSProperties}
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
