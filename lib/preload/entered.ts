/**
 * Quando a pessoa entrou na descida: o instante em que o loading fechou.
 *
 * A cena lê isto para disparar a revelação do Impacto, que corre no tempo.
 * Três estados: `idle` (não há loading nesta rota: a cena já nasce revelada),
 * `pending` (o loading está na tela) e `entered` (fechou em `at`).
 *
 * Sem imports: fica na rota inicial e é lido pelo chunk da cena.
 */
export type EntryState =
  | { phase: "idle" }
  | { phase: "pending" }
  | { phase: "entered"; at: number };

let state: EntryState = { phase: "idle" };

export function getEntry(): EntryState {
  return state;
}

export function markEntryPending(): void {
  if (state.phase === "idle") state = { phase: "pending" };
}

export function markEntered(): void {
  if (state.phase === "entered") return;
  state = { phase: "entered", at: performance.now() };
}
