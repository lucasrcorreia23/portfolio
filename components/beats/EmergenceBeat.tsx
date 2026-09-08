import { BeatReveal } from "./BeatReveal";
import type { Beat } from "./beats";

type EmergenceBeatProps = {
  beat: Beat;
  /** O nome, como ele aparece gravado na câmara. */
  name: string;
  /** Rótulo de estação do léxico da HUD — `EST.` (DIRECTION.md §2). */
  stationLabel: string;
};

/**
 * O DOM da Emergência — DIRECTION.md §4: "O nome aparece pequeno, em mono, na
 * margem inferior, com um número de estação."
 *
 * **O número não é digitado.** Ele é a estação onde o beat começa, derivada do
 * próprio `beat.from` na mesma escala de mil que a régua da HUD usa
 * (`ScrollRule`), então a etiqueta gravada e a leitura ao vivo concordam por
 * construção. Um literal aqui seria um segundo número dizendo a mesma coisa,
 * e os dois divergiriam na primeira vez que a tabela de beats mudasse.
 *
 * **Fica preso na margem por um painel `sticky`.** A seção tem 2.1 alturas de
 * viewport; sem isso o nome atravessaria o quadro em um terço do beat e a
 * "margem inferior" seria um instante, não um lugar. Grudado, ele é o que fica
 * parado enquanto a câmara se move atrás — que é a leitura certa: a câmera
 * desce, a gravação não.
 *
 * Opacidade cheia em `--mist`, nunca alpha: o DIRECTION.md §5 é explícito de
 * que nada que carrega informação usa opacidade, e o tom baixo vem de corpo
 * pequeno com tracking largo.
 */
export function EmergenceBeat({ beat, name, stationLabel }: EmergenceBeatProps) {
  const station = Math.round(beat.from * 1000)
    .toString()
    .padStart(4, "0");

  return (
    <BeatReveal
      from={beat.from}
      to={beat.from + (beat.to - beat.from) * 0.45}
      className="beat-reveal pointer-events-none sticky top-0 flex h-svh flex-col items-start justify-end pb-10"
    >
      {/* `data-veil` marca a caixa que o véu de legibilidade ancora na cena, e
          `w-fit` é o que faz essa caixa ser o texto e não a viewport. Sem ele o
          elemento estica como item de flex, o véu vira um scrim de sangria
          total — que o DIRECTION.md §5 veta pelo nome — e a varredura de
          contraste passaria a medir a tela inteira. */}
      <div data-veil className="pointer-events-auto w-fit">
        <p className="beat-emergence-name type-mono text-hud text-mist">
          {name}
        </p>
        <p className="beat-emergence-station type-mono text-hud-sm text-mist mt-2">
          {stationLabel} {station}
        </p>
      </div>
    </BeatReveal>
  );
}
