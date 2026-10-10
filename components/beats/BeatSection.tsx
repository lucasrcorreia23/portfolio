import type { CSSProperties, ReactNode } from "react";
import { beatHoldVh, type Beat } from "./beats";

type BeatSectionProps = {
  beat: Beat;
  /** Rótulo do beat, visível só para leitor de tela. */
  label: string;
  children?: ReactNode;
};

/**
 * A casca de um beat: uma seção com altura própria em alturas de viewport,
 * o intervalo de progresso que ela ocupa exposto em atributos de dado, e um
 * rótulo em mono.
 *
 * A altura vem de custom properties para o breakpoint mobile poder trocar o
 * número sem o componente saber de media query (ver `styles/globals.css`).
 *
 * O conteúdo começa no topo, não centralizado: os beats prendem o próprio
 * conteúdo num painel `sticky` de uma altura de viewport, e centralizar a
 * pilha empurraria esse painel para meio beat abaixo antes de ele grudar —
 * metade da seção rolaria com o texto fora da tela.
 *
 * A Superfície soma o viewport parado do fim da descida (`beatHoldVh`) à
 * própria altura — a mesma seção, sem elemento novo e sem espaçador vazio.
 * `beat.vh`/`beat.mobileVh` continuam representando só a parte rolável: é o
 * que a HUD e a verificação dos oito segundos leem, e não deve mudar por
 * causa de um viewport que não é rolagem.
 */
export function BeatSection({ beat, label, children }: BeatSectionProps) {
  const hold = beatHoldVh(beat.id);

  return (
    <section
      id={beat.id}
      data-beat={beat.id}
      aria-labelledby={`${beat.id}-label`}
      style={
        {
          "--beat-vh": beat.vh + hold,
          "--beat-vh-mobile": beat.mobileVh + hold,
        } as CSSProperties
      }
      className="relative flex flex-col justify-start px-6 py-24 md:px-12"
    >
      {/* Rótulo só para leitor de tela: nomeia a seção via aria-labelledby, sem
          aparecer. Como <p>, mantém a ordem de cabeçalhos limpa para o h1 que
          vive dentro do beat de Identidade. */}
      <p
        id={`${beat.id}-label`}
        className="sr-only"
        data-range={`${beat.from.toFixed(2)}–${beat.to.toFixed(2)}`}
      >
        {label}
      </p>
      {children}
    </section>
  );
}
