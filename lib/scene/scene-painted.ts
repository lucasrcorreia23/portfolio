/**
 * "A cena pintou": o fio do compositor para o loading.
 *
 * O `import()` do chunk resolver não basta — o código chegou, os shaders não.
 * O compositor chama `markScenePainted()` depois do primeiro quadro composto,
 * que é quando todo programa já compilou. Sem WebGL a cena nunca pinta, e quem
 * espera é liberado por `markSceneUnavailable()`.
 *
 * Sem imports: a rota inicial lê este módulo.
 */
let painted = false;
const listeners = new Set<() => void>();

function settle(): void {
  if (painted) return;
  painted = true;
  for (const listener of listeners) listener();
  listeners.clear();
}

export function markScenePainted(): void {
  settle();
}

/** O modo sem WebGL: não há o que esperar. */
export function markSceneUnavailable(): void {
  settle();
}

export function isScenePainted(): boolean {
  return painted;
}

export function whenScenePainted(): Promise<void> {
  if (painted) return Promise.resolve();
  return new Promise((resolve) => {
    listeners.add(resolve);
  });
}
