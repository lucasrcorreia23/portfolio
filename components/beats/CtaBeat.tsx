import { EMAIL, PROFILES } from "@/lib/contact";
import type { Beat } from "./beats";
import { BeatReveal } from "./BeatReveal";

type CtaBeatProps = {
  beat: Beat;
  line: string;
  labels: { email: string; profiles: string };
  profileNames: Record<"linkedin" | "github" | "x", string>;
};

/**
 * O CTA: o contato, sem formulário. O e-mail é o único elemento do site no
 * acento quente.
 */
export function CtaBeat({ beat, line, labels, profileNames }: CtaBeatProps) {
  const span = beat.to - beat.from;
  return (
    <div className="beat-stage justify-end pb-[14svh]">
      <BeatReveal
        from={beat.from + span * 0.15}
        to={beat.from + span * 0.75}
        className="beat-reveal beat-in flex flex-col gap-8"
      >
        <p data-veil className="type-display text-display-3 w-fit">
          {line}
        </p>
        <div data-veil className="flex w-fit flex-col gap-2">
          <p className="type-mono text-hud-sm text-mist">{labels.email}</p>
          <a href={`mailto:${EMAIL}`} className="cta-email type-mono w-fit">
            {EMAIL}
          </a>
        </div>
        <div data-veil className="flex w-fit flex-col gap-2">
          <p className="type-mono text-hud-sm text-mist">{labels.profiles}</p>
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
