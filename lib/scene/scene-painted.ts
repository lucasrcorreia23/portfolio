/**
 * "A cena já pintou um quadro" — o fio entre o compositor e o portão.
 *
 * Fica fora do React e **não importa nada**, pelo mesmo motivo do
 * `readout-store`: quem lê é o portão, que está na rota inicial, e quem escreve
 * é o compositor, que está no chunk da cena. Um import de three aqui levaria a
 * cena inteira para a rota inicial.
 *
 * O portão precisa disto e não da tarefa `scene` do preload: o `import()`
 * resolver significa que o código chegou, não que o WebGL compilou os shaders e
 * desenhou. Abrir as frestas antes disso mostraria o fundo vazio do
 * `SceneGate` — um retângulo preto onde devia estar a câmara.
 */

let painted = false;
const listeners = new Set<() => void>();

export function markScenePainted(): void {
  if (painted) return;
  painted = true;
  for (const listener of listeners) listener();
}

export function isScenePainted(): boolean {
  return painted;
}

export function subscribeScenePainted(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
