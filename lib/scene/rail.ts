import { Vector3 } from "three";

/**
 * A trilha da câmera. Provisória: uma reta, até o cenário existir.
 */

export const CAMERA_FOV = 45;

export type CameraPose = {
  position: Vector3;
  target: Vector3;
};

export function createCameraPose(): CameraPose {
  return { position: new Vector3(), target: new Vector3() };
}

export function cameraPose(progress: number, out: CameraPose): CameraPose {
  out.position.set(0, 2.2, 10 - progress * 240);
  out.target.set(0, 1.4, out.position.z - 20);
  return out;
}

/** Densidade da névoa ao longo da descida. */
export function fogAt(progress: number): number {
  return 0.03 + progress * 0;
}

/** Abertura da profundidade de campo, 0 a 1. */
export function apertureAt(progress: number): number {
  return progress * 0;
}
