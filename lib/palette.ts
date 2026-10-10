/**
 * A paleta do PROJECT.md §3.1 é declarada uma vez só, em `styles/tokens.css`.
 * Este módulo não repete os valores: ele lê os custom properties de volta do
 * documento, que é como os uniforms dos shaders vão consumir a mesma verdade
 * que o Tailwind consome.
 *
 * Só existe no cliente. Chamar no servidor lança — de propósito: um valor de
 * paleta hardcoded como fallback de SSR seria a segunda fonte de verdade que
 * este arquivo existe para evitar.
 */

export const PALETTE_TOKENS = [
  "void",
  "abyss",
  "deep",
  "teal",
  "cyan",
  "rose",
  "coral",
  "peach",
  "mist",
] as const;

export type PaletteToken = (typeof PALETTE_TOKENS)[number];
export type Palette = Readonly<Record<PaletteToken, string>>;

let cached: Palette | null = null;

export function readPalette(): Palette {
  if (cached !== null) return cached;
  if (typeof window === "undefined") {
    throw new Error(
      "readPalette() só roda no cliente: a paleta vive em styles/tokens.css e é lida do DOM.",
    );
  }

  const computed = window.getComputedStyle(document.documentElement);
  const entries = PALETTE_TOKENS.map((token) => {
    const value = computed.getPropertyValue(`--${token}`).trim();
    if (value === "") {
      throw new Error(
        `Token de paleta --${token} não está definido. Confira styles/tokens.css.`,
      );
    }
    return [token, value] as const;
  });

  cached = Object.fromEntries(entries) as Palette;
  return cached;
}
