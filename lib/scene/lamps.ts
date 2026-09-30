import type { Color, Vector3, Vector4 } from "three";
import type { Section } from "./chamber-plan";
import { PLAN_FAR, PLAN_NEAR } from "./chamber-plan";

/**
 * **As lanternas** (rodada 15) — a vida além do bando.
 *
 * Poucos organismos presos à superfície da câmara, que rastejam devagar pela
 * parede, pelo piso e pelo teto, cada um um punhado de pontos de luz e **uma
 * luz colorida** que acende o concreto em volta dele. É a resposta ao "preciso
 * de mais elementos em volta, alguns passando próximo à parede iluminando" do
 * Lucas: o bando atravessa o meio do duto; as lanternas moram na borda dele.
 *
 * A física é na CPU, sem nada voltar da GPU (DIRECTION.md §5): uma deriva
 * lenta ao longo do eixo e em volta do perímetro da seção, presa à planta
 * (`plan.section(z)`), e a reciclagem relativa à câmera, como a do bando.
 *
 * **Elas não disputam com o descolamento** (DIRECTION.md §6): até o fim da
 * Identidade só três acendem, a meia força; o grupo inteiro entra com Quem
 * sou.
 */
export const LAMP_COUNT = 8;

/** Até que distância uma lanterna acende o concreto, em unidades. */
export const LAMP_REACH = 7;

/** A cor de cada lanterna, pelo nome do token. Frias na maioria. */
export const LAMP_HUES = [
  "cyan",
  "peach",
  "teal",
  "rose",
  "cyan",
  "peach",
  "teal",
  "coral",
] as const;

/** A lanterna fica um pouco acima da superfície, não dentro dela. */
const INSET = 0.18;

/** A faixa, relativa à câmera, em que as lanternas vivem. */
const AHEAD_NEAR = 3;
const AHEAD_FAR = 42;

type Lamp = {
  z: number;
  /** Posição em volta do perímetro da seção, 0 a 1. */
  s: number;
  vz: number;
  vs: number;
  phase: number;
};

export type LampSim = {
  update: (dt: number, time: number, progress: number, cameraZ: number) => void;
  /** Escreve posição/intensidade, normal e cor nos uniforms. */
  write: (
    lamps: readonly Vector4[],
    normals: readonly Vector3[],
    colors: readonly Color[],
    palette: Readonly<Record<(typeof LAMP_HUES)[number], Color>>,
  ) => void;
};

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Quantas acendem e com que força, pelo progresso da descida. */
function presence(progress: number, index: number): number {
  const early = index < 3 ? 0.5 : 0;
  const t = Math.min(1, Math.max(0, (progress - 0.27) / 0.06));
  const full = early + (1 - early) * t;
  // Na Superfície a luz de fora manda; elas se recolhem.
  const surface = 1 - Math.min(1, Math.max(0, (progress - 0.86) / 0.06));
  // Na Emergência a câmara ainda não acordou.
  const wake = Math.min(1, Math.max(0, (progress - 0.06) / 0.05));
  return full * surface * wake;
}

export function createLampSim(section: (z: number) => Section): LampSim {
  const random = rng(0x5eed1a);
  const lamps: Lamp[] = [];
  const spawn = (lamp: Lamp, cameraZ: number, anywhere: boolean) => {
    const depth = anywhere
      ? AHEAD_NEAR + random() * (AHEAD_FAR - AHEAD_NEAR)
      : AHEAD_FAR - random() * 8;
    lamp.z = Math.max(PLAN_FAR + 3, Math.min(PLAN_NEAR - 1, cameraZ - depth));
    lamp.s = random();
    lamp.vz = (random() < 0.5 ? -1 : 1) * (0.2 + random() * 0.45);
    lamp.vs = (random() - 0.5) * 0.02;
    lamp.phase = random() * Math.PI * 2;
  };
  for (let i = 0; i < LAMP_COUNT; i += 1) {
    const lamp: Lamp = { z: 0, s: 0, vz: 0, vs: 0, phase: 0 };
    spawn(lamp, 0, true);
    lamps.push(lamp);
  }

  let placedFor = Number.NaN;
  let lastTime = 0;
  let lastProgress = 0;

  return {
    update(dt, time, progress, cameraZ) {
      lastTime = time;
      lastProgress = progress;
      // A primeira vez (e depois de um salto de câmera: a volta de um case, um
      // corte do modo calmo) espalha o grupo inteiro na faixa viva.
      if (!Number.isFinite(placedFor) || Math.abs(cameraZ - placedFor) > 30) {
        for (const lamp of lamps) spawn(lamp, cameraZ, true);
      }
      placedFor = cameraZ;
      for (const lamp of lamps) {
        // Uma deriva que muda de ideia devagar: organismo, não trilho.
        lamp.vs += (Math.sin(time * 0.31 + lamp.phase * 3.7) * 0.004 - lamp.vs * 0.2) * dt;
        lamp.z += lamp.vz * dt;
        lamp.s = (((lamp.s + lamp.vs * dt) % 1) + 1) % 1;
        const ahead = cameraZ - lamp.z;
        if (ahead < AHEAD_NEAR - 4 || ahead > AHEAD_FAR + 6 || lamp.z < PLAN_FAR + 2) {
          spawn(lamp, cameraZ, false);
        }
      }
    },

    write(uLamps, uNormals, uColors, palette) {
      lamps.forEach((lamp, i) => {
        const at = section(lamp.z);
        const height = at.floor + at.ceiling;
        const width = at.left + at.right;
        const perimeter = 2 * (height + width);
        let d = lamp.s * perimeter;
        let x: number;
        let y: number;
        let nx = 0;
        let ny = 0;
        if (d < height) {
          // Parede de bombordo, de baixo para cima.
          x = -at.left + INSET;
          y = -at.floor + d;
          nx = 1;
        } else if ((d -= height) < width) {
          // Teto, de bombordo a estibordo.
          x = -at.left + d;
          y = at.ceiling - INSET;
          ny = -1;
        } else if ((d -= width) < height) {
          // Parede de estibordo, de cima para baixo.
          x = at.right - INSET;
          y = at.ceiling - d;
          nx = -1;
        } else {
          d -= height;
          // Piso, de estibordo a bombordo.
          x = at.right - d;
          y = -at.floor + INSET;
          ny = 1;
        }
        const breath = 0.7 + 0.3 * Math.sin(lastTime * (0.6 + 0.07 * i) + lamp.phase);
        const intensity = presence(lastProgress, i) * breath;
        uLamps[i]?.set(x, y, lamp.z, intensity);
        uNormals[i]?.set(nx, ny, 0);
        const hue = LAMP_HUES[i] ?? "teal";
        uColors[i]?.copy(palette[hue]);
      });
    },
  };
}
