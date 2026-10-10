import { MathUtils, Vector3, type Vector4 } from "three";
import { CAMERA_FOV, type CameraPose } from "./rail";
import { PANEL_ASPECT } from "./stops";

/**
 * As duas poses da travessia para o case: o **encaixe**, em que o painel
 * ocupa exatamente o retângulo da capa em DOM, e o **repouso**, a pose em que
 * a cena fica como fundo de leitura.
 */

/** Altura do painel em unidades de mundo. A largura sai da proporção. */
export const PANEL_HEIGHT = 3.2;
export const PANEL_WIDTH = PANEL_HEIGHT * PANEL_ASPECT;

const TAN_HALF_FOV = Math.tan(MathUtils.degToRad(CAMERA_FOV / 2));

/** Quanto da largura da tela o painel ocupa enquanto a capa não foi medida. */
const PROVISIONAL_FILL = 0.7;

/** O repouso: para trás e para cima do painel, olhando o campo. */
const REST_BACK = 9;
const REST_LIFT = 5.5;
const REST_LOOK_AHEAD = 30;

/** A névoa dentro de um case: fechada, para o texto morar no escuro. */
export const CASE_FOG = 0.075;

const AXIS = new Vector3();
const NORMAL = new Vector3();
const RIGHT = new Vector3();
const UP = new Vector3(0, 1, 0);

export type CoverRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * A pose em que o painel coincide com `rect` na tela. `panel.w` é o giro em
 * torno de Y; a face olha para +Z quando o giro é zero.
 */
export function dockPose(
  panel: Vector4,
  rect: CoverRect | null,
  viewportWidth: number,
  viewportHeight: number,
  out: CameraPose,
): CameraPose {
  const height =
    rect === null
      ? (viewportWidth * PROVISIONAL_FILL) / PANEL_ASPECT
      : rect.height;
  const centerX = rect === null ? viewportWidth / 2 : rect.x + rect.width / 2;
  const centerY = rect === null ? viewportHeight / 2 : rect.y + rect.height / 2;

  const distance =
    (PANEL_HEIGHT * viewportHeight) / (2 * Math.max(height, 1) * TAN_HALF_FOV);

  NORMAL.set(Math.sin(panel.w), 0, Math.cos(panel.w));
  RIGHT.copy(NORMAL).multiplyScalar(-1).cross(UP).normalize();

  const halfHeightWorld = distance * TAN_HALF_FOV;
  const halfWidthWorld = (halfHeightWorld * viewportWidth) / viewportHeight;
  const offsetX =
    ((centerX - viewportWidth / 2) / (viewportWidth / 2)) * halfWidthWorld;
  const offsetY =
    ((viewportHeight / 2 - centerY) / (viewportHeight / 2)) * halfHeightWorld;

  AXIS.set(panel.x, panel.y, panel.z)
    .addScaledVector(RIGHT, -offsetX)
    .addScaledVector(UP, -offsetY);

  out.target.copy(AXIS);
  out.position.copy(AXIS).addScaledVector(NORMAL, distance);
  return out;
}

export function restPose(panel: Vector4, out: CameraPose): CameraPose {
  NORMAL.set(Math.sin(panel.w), 0, Math.cos(panel.w));
  out.position
    .set(panel.x, panel.y + REST_LIFT, panel.z)
    .addScaledVector(NORMAL, REST_BACK);
  out.target
    .set(panel.x, panel.y + REST_LIFT * 0.55, panel.z)
    .addScaledVector(NORMAL, -REST_LOOK_AHEAD);
  return out;
}
