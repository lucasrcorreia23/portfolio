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
 * O painel e a capa em DOM desenham a mesma placa, então a troca é o
 * corte curto do `<img>` por cima do painel: não há entrega de textura.
 *
 * **A entrega é uma trava.** Enquanto o voo acontece o encaixe segue a capa;
 * entregue, ele fica guardado e o DOM não é mais lido. A leitura rola a capa
 * para milhares de pixels acima da janela, e um encaixe que a seguisse levaria
 * a mira da câmera para baixo do terreno.
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
  const seat: CameraPose = { position: new Vector3(), target: new Vector3() };
  let amount = 0;
  let recede = 0;
  let handoffAt = 0;
  let handed = false;
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
        handed = false;
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
      handoffAt = 0;
      // Chegada sem voo (link direto, reload, um case aberto a partir de
      // outro): não há de onde voar, então a câmera já nasce no repouso.
      handed = state.phase === "case" && !state.fromRiver;
      if (handed) {
        amount = 1;
        recede = 1;
        dockPose(panel, null, viewportWidth, viewportHeight, dock);
      }
    }

    if (!handed) {
      const image = document.querySelector<SVGElement>(COVER_SELECTOR);
      const rect = image === null ? null : image.getBoundingClientRect();
      const present = rect !== null && rect.width > 1 && rect.height > 1;
      // Uma capa fora da janela não posiciona nada: vale o encaixe centrado.
      const onScreen = present && rect.bottom > 0 && rect.top < viewportHeight;
      dockPose(panel, onScreen ? rect : null, viewportWidth, viewportHeight, dock);

      const arrived = flying && amount >= 1 && present;
      if (flying) setDocked(arrived);
      if (!arrived) {
        handoffAt = 0;
      } else {
        if (handoffAt === 0) handoffAt = performance.now();
        handed = instant || performance.now() - handoffAt >= HANDOFF_HOLD_MS;
      }
    }
    restPose(panel, rest);

    const settled = handed && flying ? 1 : 0;
    recede = instant ? settled : damp(recede, settled, RECEDE_DAMP, dt);
    const back = easeStrong(recede);
    seat.position.copy(dock.position).lerp(rest.position, back);
    seat.target.copy(dock.target).lerp(rest.target, back);

    const blend = easeStrong(amount);
    pose.position.lerp(seat.position, blend);
    pose.target.lerp(seat.target, blend);
    return amount;
  };

  return { update };
}
