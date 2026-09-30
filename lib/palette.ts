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
  "violet",
  "magenta",
] as const;

export type PaletteToken = (typeof PALETTE_TOKENS)[number];
export type Palette = Readonly<Record<PaletteToken, string>>;

let cached: Palette | null = null;
/** O tema em que a paleta em cache foi lida (rodada 18: há dois). */
let cachedFor: string | null = null;

/**
 * Lê a paleta do `<html>`. O resultado é memoizado **por tema**: desde a
 * rodada 18 há o amanhecer (`data-theme="dawn"`), e a troca relê os tokens.
 */
export function readPalette(): Palette {
  const theme =
    typeof document === "undefined" ? null : document.documentElement.getAttribute("data-theme");
  if (cached !== null && cachedFor === theme) return cached;

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
  cachedFor = theme;
  return cached;
}
