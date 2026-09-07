import type { CSSProperties, ReactNode } from "react";
import type { Beat } from "./beats";

type BeatSectionProps = {
  beat: Beat;
  /** Rótulo do beat, em mono — o único texto que a casca já carrega. */
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
 */
export function BeatSection({ beat, label, children }: BeatSectionProps) {
  return (
    <section
      id={beat.id}
      data-beat={beat.id}
      aria-labelledby={`${beat.id}-label`}
      style={
        {
          "--beat-vh": beat.vh,
          "--beat-vh-mobile": beat.mobileVh,
        } as CSSProperties
      }
      className="relative flex flex-col justify-center px-6 py-24 md:px-12"
    >
      {/* Rótulo, não título: é uma etiqueta de estação em mono. Deixá-lo
          como <p> nomeando a seção via aria-labelledby mantém a ordem de
          cabeçalhos limpa para o h1 que vive dentro do beat de Identidade. */}
      <p
        id={`${beat.id}-label`}
        className="type-mono text-hud text-mist"
        data-range={`${beat.from.toFixed(2)}–${beat.to.toFixed(2)}`}
      >
        {label}
      </p>
      {children}
    </section>
  );
}
