import type { CSSProperties } from "react";
import { Glyphs } from "@/components/text/Glyphs";
import { EMAIL, PROFILES } from "@/lib/contact";
import type { Beat } from "./beats";
import { BeatReveal } from "./BeatReveal";

type CtaBeatProps = {
  beat: Beat;
  line: string;
  profileNames: Record<"linkedin" | "github" | "x", string>;
};

/**
 * O CTA: o contato, sem formulário. A frase acende; o e-mail e os perfis
 * entram como leitura.
 */
export function CtaBeat({ beat, line, profileNames }: CtaBeatProps) {
  const span = beat.to - beat.from;
  return (
    <div className="beat-stage justify-end pb-[14svh]">
      <BeatReveal from={beat.from + span * 0.3} className="flex flex-col gap-8">
        <p data-veil className="type-display text-display-3 w-fit">
          <span className="sr-only">{line}</span>
          <Glyphs text={line} />
        </p>
        <a
          data-veil
          data-readout
          href={`mailto:${EMAIL}`}
          className="cta-email type-mono w-fit"
          style={{ "--wait": "500ms" } as CSSProperties}
        >
          {EMAIL}
        </a>
        <div
          data-veil
          data-readout
          className="w-fit"
          style={{ "--wait": "650ms" } as CSSProperties}
        >
          <ul className="flex gap-6">
            {PROFILES.map((profile) => (
              <li key={profile.id}>
                <a
                  href={profile.href}
                  rel="me noreferrer"
                  target="_blank"
                  className="type-mono text-label text-mist hover:text-cyan"
                >
                  {profileNames[profile.id]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </BeatReveal>
    </div>
  );
}
