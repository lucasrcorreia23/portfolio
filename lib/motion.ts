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
  /**
   * A abertura da veneziana no portão. A faixa prescrita é de 1.2 a 1.8 s;
   * 1.45 fica no meio dela, o que dá tempo do escalonamento das lâminas ser
   * lido como veneziana sem a espera virar impaciência.
   */
  gate: 1.45,
} as const;

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Amortecimento por quadro — PROJECT.md §3.3, "toda transformação passa por
 * `damp` a cada frame".
 *
 * `lambda` é a taxa de aproximação em 1/s: o resto da distância cai por um
 * fator `e` a cada `1/lambda` segundos. Depender de `dt` (e não de um alfa
 * fixo por quadro) é o que faz a mesma constante valer a 60 e a 120 Hz.
 */
export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function bezierAxis(a: number, b: number, u: number): number {
  const v = 1 - u;
  return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
}

function bezierAxisSlope(a: number, b: number, u: number): number {
  const v = 1 - u;
  return 3 * v * v * a + 6 * v * u * (b - a) + 3 * u * u * (1 - b);
}

/**
 * `EASE_STRONG` avaliada em JavaScript, para o que não é nem CSS nem GSAP:
 * o campo dormente do portão e a abertura da veneziana são desenhados num
 * relógio só, e esse relógio precisa da mesma curva que o resto do site.
 *
 * A curva é paramétrica em `u`, não em `x` — então achar `y` para um `t`
 * dado exige resolver `x(u) = t` primeiro. Newton converge em pouquíssimas
 * iterações porque `x` é monótona no intervalo.
 */
export function easeStrong(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const [x1, y1, x2, y2] = EASE_STRONG;
  let u = t;

  for (let i = 0; i < 6; i += 1) {
    const error = bezierAxis(x1, x2, u) - t;
    if (Math.abs(error) < 1e-6) break;
    const slope = bezierAxisSlope(x1, x2, u);
    if (slope === 0) break;
    u -= error / slope;
    if (u < 0) u = 0;
    else if (u > 1) u = 1;
  }

  return bezierAxis(y1, y2, u);
}
