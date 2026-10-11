import {
  ClampToEdgeWrapping,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Texture,
  type WebGLRenderer,
} from "three";
import { blit, createPassMaterial } from "./gpu";
import { getPointer, hasPointer } from "./pointer";
import { getQuality } from "./quality";
import { WAKE_FRAG, WAKE_SIZE, WAKE_SPAN } from "./shaders/wake";
import type { SharedUniforms } from "./uniforms";
import { heightAt } from "./world";

/**
 * O rastro no campo: o alvo que o guarda e o passo que o atualiza.
 *
 * Meio-float aqui serve: os valores são pequenos e relaxam para zero, nada é
 * integrado sem volta. O campo existe só com a cena em movimento e fora do
 * nível baixo de qualidade; desligado, `wakeOrigin.z` é zero e relva, plantas
 * e esporos ficam exatamente onde o vento os põe.
 */

const TEXEL = WAKE_SPAN / WAKE_SIZE;
/** A altura da câmera sobre o chão até onde ela toca a vegetação, e onde deixa de tocar. */
const TOUCH_NEAR = 2.5;
const TOUCH_FAR = 6;
/** Até onde o raio do ponteiro procura o chão, e o passo da busca, em metros. */
const RAY_REACH = 60;
const RAY_STEP = 0.8;
/** O ponto sob o ponteiro que anda mais que isto num quadro saltou, não se moveu. */
const TOUCH_JUMP = 6;
const TOUCH_SPEED_MAX = 12;

const RAY = new Vector3();
const HIT = new Vector3();

function createField(): WebGLRenderTarget {
  return new WebGLRenderTarget(WAKE_SIZE, WAKE_SIZE, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

/** O ponto do chão sob o ponteiro, em `out`, ou `false` se o raio não o acha. */
function groundUnderPointer(camera: Camera, out: Vector3): boolean {
  const pointer = getPointer();
  RAY.set(pointer.x, -pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
  let before = 0;
  for (let t = RAY_STEP; t <= RAY_REACH; t += RAY_STEP) {
    out.copy(camera.position).addScaledVector(RAY, t);
    if (out.y <= heightAt(out.x, out.z)) {
      // Um passo de bisseção: o ponto fica no chão, não um passo dentro dele.
      out.copy(camera.position).addScaledVector(RAY, (before + t) / 2);
      return true;
    }
    before = t;
  }
  return false;
}

export type Wake = {
  /** Atualiza o campo. `focus` é o centro do ladrilho de relva, em XZ. */
  step: (
    gl: WebGLRenderer,
    camera: Camera,
    focus: Vector2,
    delta: number,
    still: boolean,
  ) => void;
  dispose: () => void;
};

export function createWake(shared: SharedUniforms): Wake {
  let read = createField();
  let write = createField();
  /** Falso enquanto o campo está desligado: ao ligar ele parte do zero. */
  let live = false;
  let touching = false;

  const origin = new Vector2();
  const prevOrigin = new Vector2();
  const eye = new Vector3();
  const eyeVelocity = new Vector2();
  const touch = new Vector3();
  const touchVelocity = new Vector2();
  const lastTouch = new Vector2();

  const material = createPassMaterial(
    WAKE_FRAG,
    {
      uPrev: { value: null as Texture | null },
      uOrigin: { value: origin },
      uPrevOrigin: { value: prevOrigin },
      uDelta: { value: 0 },
      uEye: { value: eye },
      uEyeVelocity: { value: eyeVelocity },
      uTouch: { value: touch },
      uTouchVelocity: { value: touchVelocity },
    },
    GLSL3,
  );

  return {
    step(gl, camera, focus, delta, still) {
      if (still || !getQuality().wake) {
        shared.wakeOrigin.value.z = 0;
        live = false;
        touching = false;
        return;
      }

      origin.set(Math.round(focus.x / TEXEL) * TEXEL, Math.round(focus.y / TEXEL) * TEXEL);
      // Ao ligar não há quadro anterior: a origem antiga vai para longe e a
      // reprojeção devolve zero em todo texel.
      if (!live) prevOrigin.set(origin.x + 1e5, origin.y + 1e5);
      live = true;

      // A câmera só deita a vegetação quando passa rente a ela, e nunca
      // dentro de um case, onde a cena é fundo de leitura.
      const reading = 1 - shared.caseRecess.value;
      const above = camera.position.y - heightAt(camera.position.x, camera.position.z);
      const near = 1 - Math.min(1, Math.max(0, (above - TOUCH_NEAR) / (TOUCH_FAR - TOUCH_NEAR)));
      eye.set(camera.position.x, camera.position.z, near * reading);
      eyeVelocity.set(shared.eyeVelocity.value.x, shared.eyeVelocity.value.z);

      const found = hasPointer() && reading > 0.5 && groundUnderPointer(camera, HIT);
      if (found) {
        touchVelocity.set(HIT.x - lastTouch.x, HIT.z - lastTouch.y);
        if (!touching || touchVelocity.length() > TOUCH_JUMP) touchVelocity.set(0, 0);
        else touchVelocity.divideScalar(Math.max(delta, 1e-3)).clampLength(0, TOUCH_SPEED_MAX);
        lastTouch.set(HIT.x, HIT.z);
        touch.set(HIT.x, HIT.z, 1);
      } else {
        touch.z = 0;
      }
      touching = found;

      const uniforms = material.uniforms;
      if (uniforms["uPrev"]) uniforms["uPrev"].value = read.texture;
      if (uniforms["uDelta"]) uniforms["uDelta"].value = delta;
      blit(gl, material, write);
      [read, write] = [write, read];
      prevOrigin.copy(origin);

      shared.wake.value = read.texture;
      shared.wakeOrigin.value.set(origin.x, origin.y, 1);
    },
    dispose() {
      live = false;
      shared.wake.value = null;
      shared.wakeOrigin.value.z = 0;
      read.dispose();
      write.dispose();
      material.dispose();
    },
  };
}
