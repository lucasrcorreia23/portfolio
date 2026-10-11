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
  WALL_CELL,
  WALL_SPAN,
  WALL_TALL,
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
  // Na vitrine o olhar cede para a parede de telas; a aproximação vem depois,
  // em `applyWallApproach`.
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

/**
 * Quanto da parede o quadro mostra: na altura, uma linha e meia — a de baixo
 * cortada no meio, para o olhar descer até ela —; na largura, nunca menos que
 * uma tela e um terço (no retrato).
 */
const WALL_VIEW_TALL = WALL_CELL.height * 1.6;
const WALL_VIEW_WIDE = WALL_CELL.width * 1.3;
/** Quanto da largura da tela fica livre nas pontas: à esquerda mora a HUD. */
const WALL_LEAD = 0.14;
const WALL_TRAIL = 0.05;

/**
 * A câmera diante da parede da vitrine, por cima da pose. `amount` (0 a 1) é
 * o desvio: a trilha chega de frente para as telas, perto, com duas telas no
 * quadro. `pan` (0 a 1) é o percurso: o scroll arrasta a câmera da primeira à
 * última coluna. `drop` (0 a 1) é o olhar para baixo: a câmera desce da
 * primeira linha até a última, sem inclinar.
 */
export function applyWallApproach(
  pose: CameraPose,
  amount: number,
  pan: number,
  drop: number,
  aspect: number,
): void {
  if (amount <= 0) return;
  const wall = vitrineWall();
  const half = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const distance = Math.max(WALL_VIEW_TALL / (2 * half), WALL_VIEW_WIDE / (2 * half * aspect));
  // Meia largura e meia altura do que a câmera vê no plano da parede.
  const reach = distance * half * aspect;
  const rise = distance * half;
  let first = -WALL_SPAN / 2 + reach * (1 - 2 * WALL_LEAD);
  let last = WALL_SPAN / 2 - reach * (1 - 2 * WALL_TRAIL);
  // Uma janela tão larga que a parede cabe inteira: a câmera fica no meio.
  if (first > last) first = last = (first + last) / 2;
  const along = lerp(first, last, pan);
  // Do topo à base; se a altura inteira cabe, no meio.
  const top = Math.max(0, WALL_TALL / 2 - rise + WALL_CELL.gap);
  const y = wall.y + lerp(top, -top, drop);

  const nx = Math.sin(wall.yaw);
  const nz = Math.cos(wall.yaw);
  const x = wall.x + Math.cos(wall.yaw) * along;
  const z = wall.z - Math.sin(wall.yaw) * along;
  PANEL.set(x + nx * distance, y, z + nz * distance);
  pose.position.lerp(PANEL, amount);
  PANEL.set(x, y, z);
  pose.target.lerp(PANEL, amount);
}

/** Quanto dura a revelação, em milissegundos. */
export const REVEAL_MS = 3200;
/** A névoa e a emissão com que a cena nasce, antes da revelação. */
export const REVEAL_FOG = 0.11;
export const REVEAL_GLOW = 0.12;

/** Quanto da névoa fica com a HUD desligada: o ar abre para se olhar em volta. */
export const BARE_FOG = 0.5;

/** Densidade da névoa ao longo da descida. */
export function fogAt(progress: number): number {
  const impact = beatOf("impact");
  const open = smooth(progress / impact.to);
  return lerp(0.02, 0.017, open) - 0.003 * astroAt(progress);
}

/**
 * O fim da trilha, 0 a 1: o ar abre, o horizonte clareia e o planeta aparece.
 * Começa quando a câmera sai da vitrine; antes disso a névoa o esconde.
 */
export function astroAt(progress: number): number {
  const cta = beatOf("cta");
  return smooth((progress - cta.from) / (1 - cta.from));
}

/** O olhar da câmera no CTA, em graus: um pouco à esquerda. */
const PLANET_HEADING = -5.5;
/** Quanto à direita do olhar o planeta fica, no máximo, e a altura dele. */
const PLANET_ASIDE = 19;
const PLANET_LIFT = 2.5;
const PLANET_RADIUS = 0.15;

/**
 * Onde o planeta fica no céu e o tamanho dele, para a proporção da tela.
 * Numa tela larga ele fica à direita, longe do texto e da primeira placa.
 * Numa tela estreita esse lugar está fora do quadro: ele vem para a borda
 * direita e encolhe, e o que se vê é a metade dele. Devolve o raio.
 */
export function planetPlace(aspect: number, out: Vector3): number {
  const half = Math.atan(Math.tan((CAMERA_FOV * Math.PI) / 360) * aspect);
  const aside = Math.min((PLANET_ASIDE * Math.PI) / 180, half);
  const azimuth = (PLANET_HEADING * Math.PI) / 180 + aside;
  const lift = (PLANET_LIFT * Math.PI) / 180;
  out.set(Math.sin(azimuth) * Math.cos(lift), Math.sin(lift), -Math.cos(azimuth) * Math.cos(lift));
  return Math.min(PLANET_RADIUS, half * 0.6);
}

/** O planeta pequeno do segredo do CTA: à esquerda do olhar, no alto, e o raio. */
const MOON_ASIDE = 0.5;
const MOON_LIFT = 9;
export const MOON_RADIUS = 0.022;

/** Onde o planeta pequeno fica no céu: no vazio acima das serras. */
export function moonPlace(aspect: number, out: Vector3): void {
  const half = Math.atan(Math.tan((CAMERA_FOV * Math.PI) / 360) * aspect);
  const azimuth = (PLANET_HEADING * Math.PI) / 180 - half * MOON_ASIDE;
  const lift = (MOON_LIFT * Math.PI) / 180;
  out.set(Math.sin(azimuth) * Math.cos(lift), Math.sin(lift), -Math.cos(azimuth) * Math.cos(lift));
}

/** Abertura da profundidade de campo, 0 a 1: abre nas paradas, no painel. */
export function apertureAt(progress: number): number {
  return 0.16 + 0.3 * stopWeight(progress).weight;
}
