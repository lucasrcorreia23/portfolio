import { BEATS } from "@/components/beats/beats";

/**
 * Rolagem do documento ↔ progresso da descida, beat a beat (rodada 14).
 *
 * O progresso da descida é o dos `from`/`to` de `BEATS`: é nele que a curva, os
 * uniforms e a HUD pensam (0.18 é o quadro do descolamento em qualquer
 * aparelho). A rolagem do documento é a das seções renderizadas, que medem
 * `vh` no desktop e `mobileVh` no mobile. As duas **não coincidem no mobile**:
 * o rio tem 5.1 vh de seção mas 0.45–0.85 de progresso, e sem este mapa a
 * câmera entrava no rio com a seção de Quem sou ainda na tela (medido a
 * 390×844: Trabalho em 0.535–0.823 da rolagem contra 0.45–0.85 da câmera).
 *
 * O mapa é linear por beat: cada seção varre exatamente a faixa do seu beat.
 * No desktop ele é quase a identidade (as frações das `vh` já batem com
 * `from`/`to` a menos de 0.002).
 */

/** O mesmo `48rem` da media query de `[data-beat]` em `globals.css`. */
const MOBILE_QUERY = "(max-width: 48rem)";

type Knots = { scroll: number[]; descent: number[] };

let cached: { mobile: boolean; knots: Knots } | null = null;

function knots(): Knots {
  const mobile =
    typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
  if (cached !== null && cached.mobile === mobile) return cached.knots;
  const heights = BEATS.map((beat) => (mobile ? beat.mobileVh : beat.vh));
  const total = heights.reduce((sum, h) => sum + h, 0);
  const scroll = [0];
  const descent = [BEATS[0]?.from ?? 0];
  let run = 0;
  BEATS.forEach((beat, index) => {
    run += heights[index] ?? 0;
    scroll.push(run / total);
    descent.push(beat.to);
  });
  cached = { mobile, knots: { scroll, descent } };
  return cached.knots;
}

function remap(value: number, from: number[], to: number[]): number {
  const v = value < 0 ? 0 : value > 1 ? 1 : value;
  for (let i = 1; i < from.length; i += 1) {
    const a = from[i - 1]!;
    const b = from[i]!;
    if (v > b && i < from.length - 1) continue;
    const local = b > a ? (v - a) / (b - a) : 0;
    return to[i - 1]! + (to[i]! - to[i - 1]!) * local;
  }
  return v;
}

/** Fração de rolagem do documento → progresso da descida. */
export function descentFromScroll(scroll: number): number {
  const { scroll: from, descent: to } = knots();
  return remap(scroll, from, to);
}

/** Progresso da descida → fração de rolagem do documento. */
export function scrollFromDescent(progress: number): number {
  const { scroll: to, descent: from } = knots();
  return remap(progress, from, to);
}
