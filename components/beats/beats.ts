/**
 * A descida, em números — DIRECTION.md §4.
 *
 * `from`/`to` são o progresso normalizado; `vh` é a altura rolável do beat em
 * alturas de viewport.
 *
 * **As linhas são a verdade; os totais são derivados delas.** `SCROLL_VH` e
 * `SCROLL_VH_MOBILE` são somas calculadas, nunca constantes digitadas — mexer
 * em um beat move o total e a verificação dos oito segundos junto, sem
 * ninguém precisar lembrar de atualizar um número em outro lugar.
 *
 *   desktop  2.1 + 3.8 + 3.6 + 8.4 + 3.15 = 21.05 vh roláveis (22.05 totais)
 *   mobile   2.1 + 3.8 + 3.6 + 5.1 + 3.15 = 17.75 vh roláveis (18.75 totais)
 *
 * A regra dos oito segundos (DIRECTION.md §1) passa com folga nos dois: o
 * quadro do descolamento cai em ≈0.18 de progresso, ou seja 3.79 vh no desktop
 * e 3.20 vh no mobile. Somando os 0.64 s de assentamento do Lenis, o pior caso
 * plausível é ~7.0 s no desktop (visitante lento, 0.6 vh/s) e ~2.2 s no mobile
 * (polegar a 2 vh/s). Ver a verificação completa no DIRECTION.md §4.
 */

export const BEAT_IDS = [
  "emergence",
  "identity",
  "about",
  "work",
  "surface",
] as const;

export type BeatId = (typeof BEAT_IDS)[number];

export type Beat = {
  id: BeatId;
  /** Progresso normalizado em que o beat começa. */
  from: number;
  /** Progresso normalizado em que o beat termina. */
  to: number;
  /** Altura rolável no desktop, em alturas de viewport. */
  vh: number;
  /** Altura rolável no mobile, em alturas de viewport. */
  mobileVh: number;
};

export const BEATS: readonly Beat[] = [
  { id: "emergence", from: 0.0, to: 0.1, vh: 2.1, mobileVh: 2.1 },
  { id: "identity", from: 0.1, to: 0.28, vh: 3.8, mobileVh: 3.8 },
  { id: "about", from: 0.28, to: 0.45, vh: 3.6, mobileVh: 3.6 },
  // O rio. Comprimento FIXO: 8.4 vh no desktop, 5.1 no mobile, com três cases
  // ou com sete. A contagem determina o espaçamento entre os cards, não o
  // comprimento do beat. Capacidade **reconferida** com a corrente montada e a
  // curva definitiva (DIRECTION.md §4, "Capacidade do rio, medida"): piso de
  // 4.5 unidades entre centros, **7 cards no desktop e 4 no mobile**, no mesmo
  // corredor de 44 unidades — o que encolhe no mobile é o custo em rolagem, não
  // o mundo. As medidas vivem em `lib/scene/cards.ts`. A curadoria é um
  // `river_rank` (número, ranking único) no frontmatter, não um booleano: cada
  // aparelho corta a mesma lista ordenada pela capacidade que couber (ver
  // lib/cases.ts).
  { id: "work", from: 0.45, to: 0.85, vh: 8.4, mobileVh: 5.1 },
  { id: "surface", from: 0.85, to: 1.0, vh: 3.15, mobileVh: 3.15 },
] as const;

/**
 * Somar 2.1 + 3.8 + 3.6 + 8.4 + 3.15 em ponto flutuante dá
 * 21.049999999999997. As linhas têm no máximo duas casas, então arredondar
 * para duas é exato — e evita que uma leitura de HUD algum dia mostre a
 * cauda binária.
 */
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Faixa rolável, em alturas de viewport. Derivada, não digitada. */
export const SCROLL_VH = round2(
  BEATS.reduce((total, beat) => total + beat.vh, 0),
);
export const SCROLL_VH_MOBILE = round2(
  BEATS.reduce((total, beat) => total + beat.mobileVh, 0),
);

/**
 * O viewport que qualquer página rolável deixa parado no fim: quando o
 * scroll esgota a faixa rolável, o último viewport de conteúdo continua na
 * tela sem custar rolagem nenhuma — não é um sexto beat, é o resto que sobra
 * de graça. `TOTAL_VH` sempre excede `SCROLL_VH` em exatamente isto.
 *
 * **Ele pertence à Superfície e fica fora da faixa de progresso.** O
 * DIRECTION.md §4 já descrevia esse frame — "o último frame é a câmara
 * vazia, com luz, e um número gravado" —, mas o beat de Superfície só
 * reservava altura para o seu próprio intervalo rolável (`0.85–1.00`, 3.15
 * vh). Este vh é a continuação *depois* de 1.00: o progresso trava lá, nada
 * mais se move, e o que fica na tela é esse quadro parado. `beatHoldVh()`
 * é quem soma isto à altura renderizada da Superfície — nunca a `vh` do
 * `Beat`, que continua sendo só a parte rolável e é o que entra em
 * `SCROLL_VH` e na verificação dos oito segundos.
 */
export const TERMINAL_HOLD_VH = 1;

/** Altura virtual total: a faixa rolável mais o viewport que fica parado. */
export const TOTAL_VH = SCROLL_VH + TERMINAL_HOLD_VH;
export const TOTAL_VH_MOBILE = SCROLL_VH_MOBILE + TERMINAL_HOLD_VH;

/** O único beat que carrega o viewport parado — ver `TERMINAL_HOLD_VH`. */
const TERMINAL_BEAT: BeatId = "surface";

/**
 * Quanto de altura extra, além da própria `vh` do beat, a seção de um beat
 * deve renderizar para incluir o viewport parado do fim da descida. Zero
 * para todo mundo, exceto a Superfície.
 */
export function beatHoldVh(id: BeatId): number {
  return id === TERMINAL_BEAT ? TERMINAL_HOLD_VH : 0;
}

/** Onde o quadro do descolamento cai — DIRECTION.md §4. */
export const SEPARATION_PROGRESS = 0.18;

/** Converte progresso global em progresso dentro do beat, 0 a 1. */
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
  // `progress` é clampado em 1 no store, então isto só acontece no fim.
  return BEATS[BEATS.length - 1] as Beat;
}
