import { Vector3, type Camera, type Vector4 } from "three";
import { damp } from "@/lib/motion";

/**
 * **O cursor na câmara** (rodada 17, pedido do Lucas de 2026-09-30): onde o
 * mouse passa, uma luz quente e fraca acende o que está perto, e o bando desvia
 * dela como desvia dos quadros.
 *
 * A luz não fica no plano da tela: ela é posta **dentro** da câmara, sobre o
 * raio que sai da câmera pelo cursor, à distância em que a cena está em foco
 * (`focus`, a mesma da profundidade de campo) — é ali que o bando e a peça
 * estão. Aparece quando o mouse se move e se apaga devagar quando ele para:
 * uma presença, não um holofote grudado no ponteiro. No toque ela não existe
 * (não há cursor), e no modo calmo também não (é movimento).
 */

/** Quanto tempo depois do último movimento a luz começa a se apagar. */
const LINGER_MS = 1800;
/** Onde, ao longo do raio, a luz mora: perto do foco, dentro de uma faixa. */
const NEAREST = 4.5;
const FARTHEST = 12;

let clientX = -1;
let clientY = -1;
let lastMove = -Infinity;

function onMove(event: PointerEvent) {
  if (event.pointerType === "touch") return;
  clientX = event.clientX;
  clientY = event.clientY;
  lastMove = performance.now();
}

function onLeave() {
  clientX = -1;
  clientY = -1;
}

/** Liga os ouvintes; devolve a limpeza. Chamado de um efeito do `SceneWorld`. */
export function installPointerLight(): () => void {
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
}

const ray = new Vector3();

/**
 * Escreve em `out` a posição (xyz) e a força (w, 0 a 1) da luz do cursor neste
 * quadro. `enabled` falso apaga (modo calmo, sonda, dentro de um case).
 */
export function updatePointerLight(
  out: Vector4,
  camera: Camera,
  canvas: HTMLCanvasElement,
  focus: number,
  enabled: boolean,
  dt: number,
): void {
  const alive =
    enabled && clientX >= 0 && performance.now() - lastMove < LINGER_MS ? 1 : 0;
  // Acende em ~0.3 s, apaga em ~1.2 s: chega junto com a mão, sai depois dela.
  const strength = damp(out.w, alive, alive > out.w ? 3.5 : 0.9, dt);
  if (clientX >= 0) {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    ray.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
    const distance = Math.min(FARTHEST, Math.max(NEAREST, focus));
    const x = camera.position.x + ray.x * distance;
    const y = camera.position.y + ray.y * distance;
    const z = camera.position.z + ray.z * distance;
    // A posição também é amortecida: a luz segue a mão como algo que flutua,
    // não como um cursor.
    const follow = out.w < 0.01 ? 1 : 1 - Math.exp(-8 * dt);
    out.set(out.x + (x - out.x) * follow, out.y + (y - out.y) * follow, out.z + (z - out.z) * follow, strength);
  } else {
    out.w = strength;
  }
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as { __pointerLight?: number[] }).__pointerLight = [out.x, out.y, out.z, out.w, clientX];
  }
}
