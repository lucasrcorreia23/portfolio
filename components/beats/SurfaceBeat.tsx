import { BeatReveal } from "./BeatReveal";
import type { Beat } from "./beats";
import { EMAIL, PROFILES } from "@/lib/contact";
import { LOCALES, localizePath, type Locale } from "@/lib/i18n/config";

type SurfaceBeatProps = {
  beat: Beat;
  locale: Locale;
  /** A frase de despedida. */
  farewell: string;
  labels: {
    email: string;
    profiles: string;
    language: string;
  };
  /** Nome por extenso de cada perfil, na ordem de `PROFILES`. */
  profileNames: Record<(typeof PROFILES)[number]["id"], string>;
  /** Nome de cada idioma no próprio idioma — "Português", "English". */
  localeNames: Record<Locale, string>;
};

/**
 * O DOM da Superfície — DIRECTION.md §4: "Contato em DOM: e-mail, perfis,
 * seletor de idioma. Sem formulário, sem frase de convite."
 *
 * São três linhas de instrumento e uma frase. O e-mail aparece **por extenso**
 * aqui, e só aqui: na HUD ele é um rótulo, porque o endereço não cabe numa
 * coluna de 176 px, e o PROJECT.md §4 põe o contato inteiro neste beat.
 *
 * **A coluna fica à esquerda e embaixo**, sobre o concreto escuro, e a
 * abertura com a luz de fora fica à direita do centro (`curve.ts`, as paradas
 * de 0.90 em diante). Texto de leitura sobre a fresta acesa seria o pior quadro
 * da varredura de contraste inteira; aqui ele não precisa disputar com ela.
 *
 * **A entrada sobe.** Cada beat tem a sua (PROJECT.md §3.3), e esta é a
 * descida chegando ao nível: o bloco é recortado de baixo para cima, como a
 * linha d'água de quem emerge. Recorte, não opacidade — o piso de 4.5:1 vale
 * durante a entrada também.
 *
 * O painel é `sticky` numa seção que carrega o viewport terminal
 * (`TERMINAL_HOLD_VH`), então ele continua na tela no quadro parado do fim,
 * depois de o progresso travar em 1.00.
 */
export function SurfaceBeat({
  beat,
  locale,
  farewell,
  labels,
  profileNames,
  localeNames,
}: SurfaceBeatProps) {
  const span = beat.to - beat.from;

  return (
    <BeatReveal
      from={beat.from + span * 0.3}
      to={beat.from + span * 0.8}
      className="beat-reveal pointer-events-none sticky top-0 flex h-svh flex-col items-start justify-end pb-16 md:pb-20"
    >
      <div
        data-veil
        className="beat-surface pointer-events-auto flex w-fit max-w-full flex-col gap-8"
      >
        <p className="text-body-lg text-mist max-w-[36ch]">{farewell}</p>
        <dl className="beat-surface-contact grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3">
          <dt className="type-mono text-hud-sm text-mist">{labels.email}</dt>
          <dd>
            <a
              href={`mailto:${EMAIL}`}
              className="type-mono text-hud text-mist hover:text-cyan break-all"
            >
              {EMAIL}
            </a>
          </dd>
          <dt className="type-mono text-hud-sm text-mist">{labels.profiles}</dt>
          <dd>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {PROFILES.map((profile) => (
                <li key={profile.id}>
                  <a
                    href={profile.href}
                    rel="me noreferrer"
                    target="_blank"
                    className="type-mono text-hud text-mist hover:text-cyan"
                  >
                    {profileNames[profile.id]}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
          <dt className="type-mono text-hud-sm text-mist">{labels.language}</dt>
          <dd>
            <ul className="flex gap-x-4">
              {LOCALES.map((option) => (
                <li key={option}>
                  <a
                    href={localizePath("/", option)}
                    hrefLang={option}
                    lang={option}
                    aria-current={option === locale ? "true" : "false"}
                    className="type-mono text-hud text-mist hover:text-cyan aria-[current=true]:text-cyan"
                  >
                    {localeNames[option]}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </dl>
      </div>
    </BeatReveal>
  );
}
