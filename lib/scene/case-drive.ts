import { Vector3, type Vector4 } from "three";
import { damp, easeStrong } from "@/lib/motion";
import {
  getCaseState,
  setCaseIndex,
  setDocked,
  setReturnProgress,
  settleRiver,
} from "@/lib/work/case-transition";
import { dockPose, restPose } from "./case-pose";
import type { CameraPose } from "./rail";
import { stopProgress } from "./stops";
import type { SharedUniforms } from "./uniforms";

/**
 * A travessia para o case, quadro a quadro: a câmera voa do ponto da trilha
 * até o painel encaixar no retângulo da capa em DOM, avisa que atracou, e
 * depois recua para a pose de leitura.
 *
 * O painel e a capa em DOM desenham o mesmo placeholder, então a troca é o
 * corte curto do `<img>` por cima do painel: não há entrega de textura.
 */

const FLIGHT_DAMP = 5;
const FLIGHT_SNAP = 0.995;
const RECEDE_DAMP = 2;
/** Quanto o painel fica encaixado antes de a câmera recuar. */
const HANDOFF_HOLD_MS = 260;

const COVER_SELECTOR = "[data-case-cover] svg";

export type CaseDrive = {
  /** Mistura a travessia por cima de `pose` e devolve quanto dela aconteceu. */
  update: (
    dt: number,
    instant: boolean,
    shared: SharedUniforms,
    pose: CameraPose,
    viewportWidth: number,
    viewportHeight: number,
  ) => number;
};

export function createCaseDrive(): CaseDrive {
  const dock: CameraPose = { position: new Vector3(), target: new Vector3() };
  const rest: CameraPose = { position: new Vector3(), target: new Vector3() };
  let amount = 0;
  let recede = 0;
  let handoffAt = 0;
  let idle = true;
  let stationFor = "";

  const update: CaseDrive["update"] = (
    dt,
    instant,
    shared,
    pose,
    viewportWidth,
    viewportHeight,
  ) => {
    const state = getCaseState();
    const flying = state.phase === "entering" || state.phase === "case";

    if (!flying && amount <= 0.0005) {
      if (!idle) {
        idle = true;
        amount = 0;
        recede = 0;
        handoffAt = 0;
        stationFor = "";
        settleRiver();
      }
      return 0;
    }
    idle = false;

    const wanted = flying ? 1 : 0;
    amount = instant ? wanted : damp(amount, wanted, FLIGHT_DAMP, dt);
    if (amount > FLIGHT_SNAP) amount = 1;
    if (amount < 0.0005) amount = 0;

    const index = state.index;
    const panel: Vector4 | undefined =
      index >= 0 && index < shared.panelCount.value
        ? shared.panels.value[index]
        : undefined;
    if (panel === undefined) {
      // Sem painel (cena ainda sem cenário): a página não pode ficar esperando.
      if (flying) setDocked(true);
      return amount;
    }

    if (state.slug !== null && stationFor !== state.slug) {
      stationFor = state.slug;
      setCaseIndex(index);
      setReturnProgress(stopProgress(index));
    }

    const image = document.querySelector<SVGElement>(COVER_SELECTOR);
    const rect = image === null ? null : image.getBoundingClientRect();
    const usable =
      rect !== null && rect.width > 1 && rect.height > 1 ? rect : null;

    dockPose(panel, usable, viewportWidth, viewportHeight, dock);
    restPose(panel, rest);

    const arrived = amount >= 1 && usable !== null;
    if (flying) setDocked(arrived);
    if (arrived) {
      if (handoffAt === 0) handoffAt = performance.now();
    } else {
      handoffAt = 0;
    }
    const handed =
      handoffAt !== 0 &&
      (instant || performance.now() - handoffAt >= HANDOFF_HOLD_MS);

    recede = instant
      ? handed
        ? 1
        : 0
      : damp(recede, handed ? 1 : 0, RECEDE_DAMP, dt);
    dock.position.lerp(rest.position, easeStrong(recede));
    dock.target.lerp(rest.target, easeStrong(recede));

    const blend = easeStrong(amount);
    pose.position.lerp(dock.position, blend);
    pose.target.lerp(dock.target, blend);
    return amount;
  };

  return { update };
}
