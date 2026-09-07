/**
 * Constantes de movimento — PROJECT.md §3.3, DIRECTION.md §5.
 *
 * O CSS tem as mesmas grandezas em `styles/tokens.css` (`--ease-strong`,
 * `--dur-*`), porque uma transição de CSS não consegue ler um módulo de
 * TypeScript e o GSAP não consegue interpolar a string `cubic-bezier(...)`.
 * São os dois únicos lugares onde esses números aparecem; se um mudar, o
 * outro muda junto.
 */

/** Nada é linear: toda saída passa por aqui. */
export const EASE_STRONG = [0.16, 1, 0.3, 1] as const;
export const EASE_STRONG_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Lenis: o scroll nunca para de repente. PROJECT.md §3.3. */
export const LENIS_LERP = 0.075;

/** Durações em segundos, que é a unidade do GSAP. */
export const DURATION = {
  /** Reorganização do bando. */
  snap: 0.12,
  /** Corte entre composições fixas no modo de movimento reduzido. */
  cut: 0.12,
  /** Borrão → navalha: a assinatura do beat de Identidade. */
  aperture: 0.6,
  /** Planeio entre estalos. */
  glide: 2.2,
} as const;
