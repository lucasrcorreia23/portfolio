import { Vector3 } from "three";
import { beatOf } from "@/components/beats/beats";
import {
  cameraZ,
  forkWeight,
  heightAt,
  panelPlacement,
  pathX,
  stopWeight,
  vitrineWall,
} from "./world";

/**
 * A trilha da câmera: o mundo é aberto na aparência, mas a câmera anda numa
 * linha só, guiada pelo progresso do scroll. Ver `world.ts` para a planta.
 */

export const CAMERA_FOV = 45;

export type CameraPose = {
  position: Vector3;
  target: Vector3;
};

export function createCameraPose(): CameraPose {
  return { position: new Vector3(), target: new Vector3() };
}

function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A altura do olho acima do chão: desce no Impacto, sobe um pouco no CTA. */
function eyeAt(progress: number): number {
  const impact = beatOf("impact");
  const cta = beatOf("cta");
  const down = smooth(progress / impact.to);
  const up = smooth((progress - cta.from) / (1 - cta.from));
  return lerp(13, 2.5, down) + 1.6 * up;
}

const LOOK_AHEAD = 18;
const PANEL = new Vector3();

export function cameraPose(progress: number, out: CameraPose): CameraPose {
  const z = cameraZ(progress);
  const x = pathX(z);
  const eye = eyeAt(progress);
  out.position.set(x, heightAt(x, z) + eye, z);

  // Olha para a frente da trilha. No começo, do alto e para baixo: o campo
  // inteiro cabe no quadro; conforme desce, o olhar sobe para o horizonte.
  const level = smooth(progress / beatOf("impact").to);
  const aheadZ = z - lerp(30, LOOK_AHEAD, level);
  const aheadX = pathX(aheadZ) + lerp(4, 0, level);
  out.target.set(
    aheadX,
    heightAt(aheadX, aheadZ) + lerp(0.6, eye * 0.55, level),
    aheadZ,
  );

  // Em cada parada o olhar vai para o painel, e volta para a trilha depois.
  const { index, weight } = stopWeight(progress);
  if (index >= 0 && weight > 0) {
    const panel = panelPlacement(index);
    PANEL.set(panel.x - 1.1, panel.y - 0.2, panel.z);
    out.target.lerp(PANEL, weight);
    // E a câmera sobe até a altura do painel, para lê-lo de frente.
    out.position.y = lerp(out.position.y, panel.y - 0.5, weight * 0.8);
  }
  // Na bifurcação o olhar cede para o desvio da vitrine, sem a câmera sair
  // da trilha: é um convite, não uma curva.
  const fork = forkWeight(progress);
  if (fork > 0) {
    const wall = vitrineWall();
    PANEL.set(wall.x + 4, wall.y - 1.2, wall.z);
    out.target.lerp(PANEL, fork * 0.85);
    out.position.y += 1.2 * fork;
  }
  return out;
}

/**
 * A revelação do Impacto, 0 a 1, aplicada por cima da pose: a câmera começa
 * recuada e alta, dentro da névoa, e desce até a trilha. Corre no tempo.
 */
export function applyReveal(pose: CameraPose, reveal: number): void {
  const back = 1 - reveal;
  if (back <= 0) return;
  pose.position.y += 6 * back;
  pose.position.z += 12 * back;
  pose.target.y += 1.5 * back;
}

/** Quanto dura a revelação, em milissegundos. */
export const REVEAL_MS = 3200;
/** A névoa e a emissão com que a cena nasce, antes da revelação. */
export const REVEAL_FOG = 0.11;
export const REVEAL_GLOW = 0.12;

/** Densidade da névoa ao longo da descida. */
export function fogAt(progress: number): number {
  const impact = beatOf("impact");
  const cta = beatOf("cta");
  const open = smooth(progress / impact.to);
  const end = smooth((progress - cta.from) / (1 - cta.from));
  return lerp(0.02, 0.017, open) - 0.003 * end;
}

/** Abertura da profundidade de campo, 0 a 1: abre nas paradas, no painel. */
export function apertureAt(progress: number): number {
  return 0.16 + 0.3 * stopWeight(progress).weight;
}
