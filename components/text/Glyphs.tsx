import type { CSSProperties } from "react";

type GlyphsProps = {
  text: string;
  /** Desloca a ordem, para duas linhas vizinhas não acenderem iguais. */
  offset?: number;
};

/** A razão áurea dá a cada letra um desvio próprio, sem agrupar vizinhas. */
const SPREAD = 0.618034;
/** Quanto da vez de cada letra é desvio, e não posição. */
const JITTER = 0.3;

/**
 * Um título dividido em letras, para acender uma a uma (`.glyph` em
 * `styles/globals.css`). `--o` é a vez de cada letra, de 0 a 1: a luz
 * corre da esquerda para a direita, com um desvio por letra para não virar
 * uma linha sendo escrita.
 *
 * A divisão sai do servidor, sem medir nada: as palavras ficam inteiras e a
 * quebra de linha continua sendo do navegador. O resultado é decorativo; quem
 * usa dá o texto ao leitor de tela (`aria-label` ou `sr-only`).
 */
export function Glyphs({ text, offset = 0 }: GlyphsProps) {
  const words = text.split(" ");
  const starts = words.map((_, index) =>
    words.slice(0, index).reduce((sum, word) => sum + word.length, offset),
  );

  const total = Math.max(1, text.length - words.length);

  return (
    <span aria-hidden="true">
      {words.map((word, wordIndex) => (
        <span key={wordIndex}>
          {wordIndex > 0 ? " " : null}
          <span className="glyph-word">
            {Array.from(word).map((char, charIndex) => {
              const index = (starts[wordIndex] as number) + charIndex;
              const along = Math.min(1, (index - offset) / total);
              const order = along * (1 - JITTER) + ((index * SPREAD) % 1) * JITTER;
              return (
                <span
                  key={charIndex}
                  className="glyph"
                  style={{ "--o": order.toFixed(3) } as CSSProperties}
                >
                  {char}
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </span>
  );
}
