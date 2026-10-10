/**
 * Os quatro momentos roláveis da descida (o Loading vem antes e não rola).
 *
 * `from`/`to` são a faixa de progresso; `vh`/`mobileVh` a altura da seção em
 * viewports. Os totais são somas desta tabela, nunca constantes digitadas.
 */
export const BEAT_IDS = ["impact", "intro", "cases", "vitrine", "cta"] as const;

export type BeatId = (typeof BEAT_IDS)[number];

export type Beat = {
  id: BeatId;
  from: number;
  to: number;
  vh: number;
  mobileVh: number;
};

export const BEATS: readonly Beat[] = [
  { id: "impact", from: 0.0, to: 0.16, vh: 1.8, mobileVh: 1.5 },
  { id: "intro", from: 0.16, to: 0.34, vh: 2.4, mobileVh: 2.4 },
  { id: "cases", from: 0.34, to: 0.8, vh: 9.6, mobileVh: 7.8 },
  // A vitrine: depois dos cases, a trilha desvia até a parede de telas e a
  // câmera a percorre de ponta a ponta.
  { id: "vitrine", from: 0.8, to: 0.9, vh: 4.4, mobileVh: 4.0 },
  { id: "cta", from: 0.9, to: 1.0, vh: 2.0, mobileVh: 2.0 },
] as const;

/** O progresso em que a câmera chega à parede da vitrine, nas primeiras telas. */
export const VITRINE_PROGRESS = 0.82;

const round2 = (value: number) => Math.round(value * 100) / 100;

export const SCROLL_VH = round2(BEATS.reduce((total, beat) => total + beat.vh, 0));
export const SCROLL_VH_MOBILE = round2(
  BEATS.reduce((total, beat) => total + beat.mobileVh, 0),
);

/** O viewport parado do fim: pertence ao CTA e fica fora da faixa de progresso. */
export const TERMINAL_HOLD_VH = 1;
export const TOTAL_VH = SCROLL_VH + TERMINAL_HOLD_VH;
export const TOTAL_VH_MOBILE = SCROLL_VH_MOBILE + TERMINAL_HOLD_VH;

const TERMINAL_BEAT: BeatId = "cta";

export function beatHoldVh(id: BeatId): number {
  return id === TERMINAL_BEAT ? TERMINAL_HOLD_VH : 0;
}

export function beatOf(id: BeatId): Beat {
  return BEATS.find((beat) => beat.id === id) as Beat;
}

export function beatProgress(beat: Beat, progress: number): number {
  const span = beat.to - beat.from;
  if (span <= 0) return 0;
  const local = (progress - beat.from) / span;
  return local < 0 ? 0 : local > 1 ? 1 : local;
}

export function beatAt(progress: number): Beat {
  for (const beat of BEATS) {
    if (progress < beat.to) return beat;
  }
  return BEATS[BEATS.length - 1] as Beat;
}
