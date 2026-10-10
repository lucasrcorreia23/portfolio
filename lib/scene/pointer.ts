/**
 * O ponteiro, em −1 a 1 nos dois eixos: a câmera responde a ele de leve.
 * Toque não conta: no telefone o dedo está rolando.
 */
const pointer = { x: 0, y: 0 };
/** Há um ponteiro sobre a página: falso no toque e antes do primeiro movimento. */
let present = false;

function onMove(event: PointerEvent): void {
  if (event.pointerType === "touch") return;
  pointer.x = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
  pointer.y = (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
  present = true;
}

function onLeave(): void {
  pointer.x = 0;
  pointer.y = 0;
  present = false;
}

export function installPointer(): () => void {
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
}

export function getPointer(): Readonly<{ x: number; y: number }> {
  return pointer;
}

export function hasPointer(): boolean {
  return present;
}
