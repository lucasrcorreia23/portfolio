import { Vector3 } from "three";
import { damp } from "@/lib/motion";
import { flockTubeHalfWidth } from "./curve";
import {
  CHAMBER_HALF_HEIGHT,
  CHAMBER_HALF_WIDTH,
  FLOCK_RECYCLE_Z,
  FLOCK_SPAWN_Z,
  FLOCK_TUBE_HEIGHT,
  FLOCK_TUBE_NARROW,
} from "./world";

/**
 * A simulação proxy na CPU — DIRECTION.md §5, "Rig de luz, sem readback
 * síncrono".
 *
 * O bando de verdade roda na GPU, em FBO ping-pong, e **nada volta de lá**.
 * Ler o centroide do FBO por quadro travaria o pipeline: a GPU teria que
 * terminar antes de a CPU receber, e o quadro morre. Então quem informa a luz,
 * o realce da estrutura e o véu de legibilidade é esta nuvem grosseira de 64
 * macro-partículas rodando as mesmas forças a 15 Hz.
 *
 * Ela não precisa bater com a simulação da GPU corpo a corpo. Precisa
 * concordar sobre **onde está a massa** — e isso ela faz, porque as forças e o
 * escoamento são os mesmos. Rodando adiantada, ela também deixa o véu subir
 * *antes* de o cacho chegar; ler o quadro renderizado atrasaria um quadro, e
 * um quadro ilegível já é uma falha.
 */

const PARTICLES = 64;
const CLUSTERS = 4;

/** 15 Hz. Entre atualizações o consumidor interpola com `damp`. */
const STEP_MS = 1000 / 15;
/** Teto de passos por quadro: uma aba em segundo plano não deve devolver 200. */
const MAX_STEPS = 3;

const NEIGHBOR_RADIUS = 7;
const SEPARATION_RADIUS = 2.4;

export type ProxyCluster = {
  /** Centroide amortecido, em coordenadas de mundo. */
  position: Vector3;
  /**
   * Quanta massa e quanta energia o cacho carrega, 0 a 1. É isto que vira
   * intensidade de luz, brilho de quina na estrutura e altura do véu.
   */
  energy: number;
};

export type ProxySim = {
  clusters: readonly ProxyCluster[];
  /**
   * Avança a simulação. `dt` em segundos, já é o do quadro.
   *
   * `cameraZ` entra porque a reciclagem é relativa à câmera, exatamente como na
   * simulação da GPU — o proxy precisa concordar sobre **onde está a massa**, e
   * uma nuvem que ficasse para trás enquanto o bando acompanha a descida faria
   * a luz e o véu apontarem para um lugar vazio.
   */
  update: (dt: number, progress: number, cameraZ: number) => void;
  /**
   * Densidade normalizada do bando num ponto de mundo, 0 a 1. Alimenta o rim
   * de fresnel do corpo de prova: as letras clareiam **porque o bando está
   * perto**, que é como a luz nasce de dentro da cena.
   */
  densityAt: (point: Vector3) => number;
};

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createProxySim(): ProxySim {
  const px = new Float32Array(PARTICLES);
  const py = new Float32Array(PARTICLES);
  const pz = new Float32Array(PARTICLES);
  const vx = new Float32Array(PARTICLES);
  const vy = new Float32Array(PARTICLES);
  const vz = new Float32Array(PARTICLES);

  for (let i = 0; i < PARTICLES; i += 1) {
    const a = hash(i) * Math.PI * 2;
    const r = Math.sqrt(hash(i + 91));
    px[i] = Math.cos(a) * r * FLOCK_TUBE_NARROW;
    py[i] = Math.sin(a) * r * FLOCK_TUBE_HEIGHT;
    // Espalhados pelo duto inteiro no começo, senão o primeiro quadro tem
    // toda a massa num plano só.
    pz[i] = FLOCK_SPAWN_Z + hash(i + 17) * (FLOCK_RECYCLE_Z - FLOCK_SPAWN_Z);
    vx[i] = (hash(i + 33) - 0.5) * 0.4;
    vy[i] = (hash(i + 57) - 0.5) * 0.4;
    vz[i] = 2 + hash(i + 71);
  }

  const clusters: ProxyCluster[] = [];
  for (let c = 0; c < CLUSTERS; c += 1) {
    clusters.push({
      position: new Vector3(0, 0, FLOCK_SPAWN_Z + (c + 1) * 18),
      energy: 0,
    });
  }

  // Centroides crus, antes do amortecimento. Separá-los do que o consumidor lê
  // é o que permite atualizar a 15 Hz e desenhar a 60.
  const rawX = new Float32Array(CLUSTERS);
  const rawY = new Float32Array(CLUSTERS);
  const rawZ = new Float32Array(CLUSTERS);
  const rawEnergy = new Float32Array(CLUSTERS);
  const counts = new Int32Array(CLUSTERS);
  // Fora do laço: a k-média roda 15 vezes por segundo e não tem por que
  // produzir lixo para o coletor.
  const sumX = new Float32Array(CLUSTERS);
  const sumY = new Float32Array(CLUSTERS);
  const sumZ = new Float32Array(CLUSTERS);
  const sumSpeed = new Float32Array(CLUSTERS);

  let accumulator = 0;
  let seeded = false;

  const step = (progress: number, cameraZ: number) => {
    const recycleAt = cameraZ + 2;
    const spawnAt = cameraZ - 64;
    const dt = STEP_MS / 1000;

    // O escoamento acelera conforme a descida avança: ar parado na Emergência,
    // bando formado e vindo contra você na Identidade (DIRECTION.md §4).
    const drive = 0.6 + 5.4 * Math.min(progress / 0.16, 1);
    const cohesion = 0.35 + 0.9 * Math.min(progress / 0.2, 1);

    for (let i = 0; i < PARTICLES; i += 1) {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      let ax = 0;
      let ay = 0;
      let az = 0;
      let sx = 0;
      let sy = 0;
      let sz = 0;
      let neighbors = 0;

      for (let j = 0; j < PARTICLES; j += 1) {
        if (j === i) continue;
        const dx = (px[j] as number) - (px[i] as number);
        const dy = (py[j] as number) - (py[i] as number);
        const dz = (pz[j] as number) - (pz[i] as number);
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > NEIGHBOR_RADIUS * NEIGHBOR_RADIUS) continue;

        neighbors += 1;
        cx += dx;
        cy += dy;
        cz += dz;
        ax += vx[j] as number;
        ay += vy[j] as number;
        az += vz[j] as number;

        if (d2 < SEPARATION_RADIUS * SEPARATION_RADIUS && d2 > 1e-4) {
          const inv = 1 / d2;
          sx -= dx * inv;
          sy -= dy * inv;
          sz -= dz * inv;
        }
      }

      if (neighbors > 0) {
        const inv = 1 / neighbors;
        cx *= inv * cohesion;
        cy *= inv * cohesion;
        cz *= inv * cohesion;
        ax = (ax * inv - (vx[i] as number)) * 0.5;
        ay = (ay * inv - (vy[i] as number)) * 0.5;
        az = (az * inv - (vz[i] as number)) * 0.5;
      }

      // Escoamento pelo eixo, mais um puxão de volta para o eixo: o duto
      // segura o bando laminar sem que ele encoste nas paredes.
      const pull = -0.35;
      const nvx = (vx[i] as number) + (cx + ax + sx * 1.4 + (px[i] as number) * pull) * dt;
      const nvy = (vy[i] as number) + (cy + ay + sy * 1.4 + (py[i] as number) * pull) * dt;
      const nvz = (vz[i] as number) + (cz + az + sz * 1.4 + (drive - (vz[i] as number)) * 1.6) * dt;

      vx[i] = nvx * 0.985;
      vy[i] = nvy * 0.985;
      vz[i] = nvz * 0.985;

      px[i] = (px[i] as number) + nvx * dt;
      py[i] = (py[i] as number) + nvy * dt;
      pz[i] = (pz[i] as number) + nvz * dt;

      // Reciclagem: quem passou pela lente volta a montante.
      if ((pz[i] as number) > recycleAt) {
        const a = hash(i * 3 + Math.floor(pz[i] as number)) * Math.PI * 2;
        // O proxy renasce no mesmo tubo elíptico que a simulação da GPU: ele
        // só serve se concordar com ela sobre **onde está a massa**, e uma
        // nuvem estreita informaria luz e véu de um bando que não existe mais.
        const r = Math.sqrt(hash(i * 7 + 5));
        px[i] = Math.cos(a) * r * flockTubeHalfWidth(progress);
        py[i] = Math.sin(a) * r * FLOCK_TUBE_HEIGHT;
        pz[i] = spawnAt;
      }
      if ((pz[i] as number) < spawnAt - 24) pz[i] = recycleAt - 8;
      px[i] = Math.max(-CHAMBER_HALF_WIDTH, Math.min(CHAMBER_HALF_WIDTH, px[i] as number));
      py[i] = Math.max(-CHAMBER_HALF_HEIGHT, Math.min(CHAMBER_HALF_HEIGHT, py[i] as number));
    }

    // Quatro médias, duas iterações. Semeadas nos centroides anteriores, então
    // a identidade de cada cacho sobrevive entre passos e a luz não pisca de
    // um aglomerado para outro.
    if (!seeded) {
      for (let c = 0; c < CLUSTERS; c += 1) {
        const i = Math.floor((c * PARTICLES) / CLUSTERS);
        rawX[c] = px[i] as number;
        rawY[c] = py[i] as number;
        rawZ[c] = pz[i] as number;
      }
      seeded = true;
    }

    for (let iter = 0; iter < 2; iter += 1) {
      counts.fill(0);
      sumX.fill(0);
      sumY.fill(0);
      sumZ.fill(0);
      sumSpeed.fill(0);

      for (let i = 0; i < PARTICLES; i += 1) {
        let best = 0;
        let bestD = Infinity;
        for (let c = 0; c < CLUSTERS; c += 1) {
          const dx = (px[i] as number) - (rawX[c] as number);
          const dy = (py[i] as number) - (rawY[c] as number);
          const dz = (pz[i] as number) - (rawZ[c] as number);
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        counts[best] = (counts[best] as number) + 1;
        sumX[best] = (sumX[best] as number) + (px[i] as number);
        sumY[best] = (sumY[best] as number) + (py[i] as number);
        sumZ[best] = (sumZ[best] as number) + (pz[i] as number);
        const speed = Math.hypot(vx[i] as number, vy[i] as number, vz[i] as number);
        sumSpeed[best] = (sumSpeed[best] as number) + speed;
      }

      for (let c = 0; c < CLUSTERS; c += 1) {
        const n = counts[c] as number;
        if (n === 0) continue;
        rawX[c] = (sumX[c] as number) / n;
        rawY[c] = (sumY[c] as number) / n;
        rawZ[c] = (sumZ[c] as number) / n;
        if (iter === 1) {
          // Massa × velocidade, normalizado. Um cacho denso e rápido é o que
          // brilha — o DIRECTION.md §5 diz que o brilho segue a aceleração.
          const density = n / PARTICLES;
          const speed = (sumSpeed[c] as number) / n;
          rawEnergy[c] = Math.min(1, density * 2.6 * Math.min(speed / 5, 1.3));
        }
      }
    }
  };

  return {
    clusters,

    update(dt, progress, cameraZ) {
      accumulator += dt * 1000;
      let steps = 0;
      while (accumulator >= STEP_MS && steps < MAX_STEPS) {
        step(progress, cameraZ);
        accumulator -= STEP_MS;
        steps += 1;
      }
      if (steps === MAX_STEPS) accumulator = 0;

      // Entre passos, `damp`. O DIRECTION.md §5 pede exatamente isto: a luz
      // não anda em degraus de 15 Hz porque o que ela segue é interpolado.
      for (let c = 0; c < CLUSTERS; c += 1) {
        const cluster = clusters[c];
        if (cluster === undefined) continue;
        cluster.position.set(
          damp(cluster.position.x, rawX[c] as number, 6, dt),
          damp(cluster.position.y, rawY[c] as number, 6, dt),
          damp(cluster.position.z, rawZ[c] as number, 6, dt),
        );
        cluster.energy = damp(cluster.energy, rawEnergy[c] as number, 5, dt);
      }
    },

    densityAt(point) {
      let total = 0;
      for (const cluster of clusters) {
        const d = cluster.position.distanceTo(point);
        // Queda suave: um cacho a 18 unidades já não ilumina nada.
        const falloff = Math.max(0, 1 - d / 18);
        total += cluster.energy * falloff * falloff;
      }
      return Math.min(1, total);
    },
  };
}
