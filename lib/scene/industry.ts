import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { PANEL_HEIGHT, PANEL_WIDTH } from "./case-pose";
import { STOP_COUNT } from "./stops";
import { heightAt, panelPlacement, pathX, STOP_Z, Z_END } from "./world";

/**
 * A indústria: torres, tanques, tubulação e os pórticos que sustentam os
 * painéis, gerados de primitivas e mesclados numa geometria só (um draw call).
 * Ela é silhueta: neutra, fosca, sem emissão.
 */

type Part = { geometry: BufferGeometry; matrix: Matrix4 };

const POSITION = new Vector3();
const SCALE = new Vector3(1, 1, 1);
const ROTATION = new Quaternion();
const EULER = new Euler();

function place(
  geometry: BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): Part {
  POSITION.set(x, y, z);
  ROTATION.setFromEuler(EULER.set(rx, ry, rz));
  return { geometry, matrix: new Matrix4().compose(POSITION, ROTATION, SCALE) };
}

function merge(parts: readonly Part[]): BufferGeometry {
  let total = 0;
  const flat = parts.map((part) => {
    const geometry = part.geometry.index === null ? part.geometry.clone() : part.geometry.toNonIndexed();
    geometry.applyMatrix4(part.matrix);
    total += geometry.getAttribute("position").count;
    return geometry;
  });
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  let offset = 0;
  for (const geometry of flat) {
    positions.set(geometry.getAttribute("position").array, offset);
    normals.set(geometry.getAttribute("normal").array, offset);
    offset += geometry.getAttribute("position").count * 3;
    geometry.dispose();
  }
  for (const part of parts) part.geometry.dispose();
  const merged = new BufferGeometry();
  merged.setAttribute("position", new BufferAttribute(positions, 3));
  merged.setAttribute("normal", new BufferAttribute(normals, 3));
  merged.computeBoundingSphere();
  return merged;
}

/** Um ponto no chão. */
function ground(x: number, z: number): number {
  return heightAt(x, z);
}

/** O pórtico de uma parada: dois montantes, travessas e a moldura do painel. */
function gantry(index: number, parts: Part[], beacons: number[]): void {
  const panel = panelPlacement(index);
  const yaw = panel.yaw;
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const half = PANEL_WIDTH / 2 + 0.34;
  const top = panel.y + PANEL_HEIGHT / 2 + 0.5;

  for (const side of [-1, 1]) {
    const x = panel.x + rightX * half * side;
    const z = panel.z + rightZ * half * side;
    const base = ground(x, z) - 0.4;
    const height = top - base + 1.1;
    parts.push(place(new BoxGeometry(0.2, height, 0.2), x, base + height / 2, z, 0, yaw, 0));
    parts.push(place(new BoxGeometry(0.9, 0.16, 0.9), x, base + 0.48, z, 0, yaw, 0));
    // A mão-francesa, para trás.
    const backX = x - Math.sin(yaw) * 1.5;
    const backZ = z - Math.cos(yaw) * 1.5;
    parts.push(
      place(new BoxGeometry(0.1, 4.6, 0.1), (x + backX) / 2, base + 2.1, (z + backZ) / 2, -0.66, yaw, 0),
    );
    beacons.push(x, base + height + 0.08, z, index % 2 === 0 ? 0.2 : 0.8);
  }
  // As travessas: uma em cima, outra embaixo do painel.
  parts.push(place(new BoxGeometry(half * 2 + 0.6, 0.18, 0.18), panel.x, top, panel.z, 0, yaw, 0));
  parts.push(
    place(new BoxGeometry(half * 2 + 0.2, 0.1, 0.1), panel.x, panel.y - PANEL_HEIGHT / 2 - 0.3, panel.z, 0, yaw, 0),
  );
  // A placa de fundo, um nada atrás do painel: sem ela ele flutuaria.
  parts.push(
    place(
      new BoxGeometry(PANEL_WIDTH + 0.24, PANEL_HEIGHT + 0.24, 0.08),
      panel.x - Math.sin(yaw) * 0.09,
      panel.y,
      panel.z - Math.cos(yaw) * 0.09,
      0,
      yaw,
      0,
    ),
  );
  // Uma caixa de equipamento e o duto que sai dela para o chão.
  const boxX = panel.x + rightX * (half + 1.1);
  const boxZ = panel.z + rightZ * (half + 1.1);
  const boxY = ground(boxX, boxZ);
  parts.push(place(new BoxGeometry(0.8, 1.3, 0.6), boxX, boxY + 0.65, boxZ, 0, yaw, 0));
  parts.push(
    place(new CylinderGeometry(0.07, 0.07, 6, 6), boxX - Math.sin(yaw) * 3, boxY + 0.5, boxZ - Math.cos(yaw) * 3, Math.PI / 2, yaw, 0),
  );
}

/** Uma torre: fuste afilado, plataformas e uma antena. */
function tower(x: number, z: number, height: number, radius: number, parts: Part[], beacons: number[]): void {
  const base = ground(x, z) - 1;
  parts.push(place(new CylinderGeometry(radius * 0.55, radius, height, 10, 1), x, base + height / 2, z));
  for (const at of [0.38, 0.66, 0.9]) {
    parts.push(place(new CylinderGeometry(radius * 1.25, radius * 1.25, 0.35, 10, 1), x, base + height * at, z));
  }
  parts.push(place(new CylinderGeometry(0.08, 0.14, height * 0.28, 5, 1), x, base + height * 1.14, z));
  beacons.push(x, base + height * 1.28, z, 0.6 + (height % 0.4));
  beacons.push(x + radius * 1.25, base + height * 0.66, z, 0.1);
}

/** Um tanque baixo e largo, com escada em anel. */
function tank(x: number, z: number, radius: number, height: number, parts: Part[]): void {
  const base = ground(x, z) - 0.6;
  parts.push(place(new CylinderGeometry(radius, radius, height, 14, 1), x, base + height / 2, z));
  parts.push(place(new SphereGeometry(radius, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2), x, base + height, z, 0, 0, 0));
}

/** Um duto elevado, de um lado ao outro do campo, sobre cavaletes. */
function pipeline(z: number, fromX: number, toX: number, lift: number, slant: number, parts: Part[]): void {
  const length = Math.hypot(toX - fromX, slant);
  const midX = (fromX + toX) / 2;
  const yaw = Math.atan2(slant, toX - fromX);
  let low = Infinity;
  for (let x = fromX; x <= toX; x += 6) low = Math.min(low, ground(x, z));
  const y = Math.max(low, ground(pathX(z), z)) + lift;
  parts.push(place(new CylinderGeometry(0.42, 0.42, length, 8, 1), midX, y, z + slant / 2, 0, -yaw, Math.PI / 2));
  parts.push(place(new CylinderGeometry(0.2, 0.2, length, 6, 1), midX, y + 0.72, z + slant / 2 + 0.3, 0, -yaw, Math.PI / 2));
  for (let x = fromX + 6; x < toX; x += 13) {
    // Nenhum cavalete no meio da trilha.
    if (Math.abs(x - pathX(z)) < 5) continue;
    const pz = z + (slant * (x - fromX)) / (toX - fromX);
    const foot = ground(x, pz) - 0.5;
    parts.push(place(new BoxGeometry(0.22, y - foot, 0.22), x, (y + foot) / 2, pz));
    parts.push(place(new BoxGeometry(1.6, 0.14, 0.3), x, y - 0.5, pz));
  }
}

export type Industry = {
  geometry: BufferGeometry;
  /** As luzes indicadoras: xyz e a fase de cada uma. */
  beacons: Float32Array;
};

export function createIndustry(): Industry {
  const parts: Part[] = [];
  const beacons: number[] = [];

  for (let index = 0; index < STOP_COUNT; index += 1) gantry(index, parts, beacons);

  // O complexo do Impacto: o que a câmera vê em silhueta ao sair da névoa.
  tower(-34, -96, 46, 3.4, parts, beacons);
  tower(-52, -118, 62, 4.6, parts, beacons);
  tower(48, -128, 54, 3.8, parts, beacons);
  tower(70, -92, 34, 3, parts, beacons);
  tank(-70, -84, 9, 8, parts);
  tank(58, -66, 7, 6, parts);
  tank(74, -74, 5, 9, parts);

  // Ao longo dos cases, dos dois lados, cada vez mais longe.
  for (let index = 0; index < STOP_COUNT; index += 1) {
    const z = (STOP_Z[index] ?? 0) - 14;
    const left = index % 2 === 0;
    tower(pathX(z) + (left ? -46 : 52) - index * 2, z - 8, 30 + ((index * 17) % 26), 2.6 + (index % 3) * 0.6, parts, beacons);
    if (index % 2 === 1) tank(pathX(z) - 58, z + 6, 6 + index, 7, parts);
    else tank(pathX(z) + 66, z - 2, 8, 5 + index, parts);
  }
  // O fim da trilha: um último grupo atrás da mancha do CTA.
  tower(pathX(Z_END) - 30, Z_END - 44, 58, 4.2, parts, beacons);
  tower(pathX(Z_END) + 36, Z_END - 52, 42, 3.2, parts, beacons);

  // A tubulação que atravessa o campo: a câmera passa por baixo da primeira.
  pipeline(-66, -96, 96, 6.4, 10, parts);
  pipeline(STOP_Z[1]! - 16, -100, 100, 7.5, -14, parts);
  pipeline(STOP_Z[3]! - 17, -100, 100, 8.2, 12, parts);
  pipeline(STOP_Z[5]! - 20, -100, 100, 7, -8, parts);

  return { geometry: merge(parts), beacons: new Float32Array(beacons) };
}
