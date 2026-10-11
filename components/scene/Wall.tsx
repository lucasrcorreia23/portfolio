"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { VITRINE } from "@/content/vitrine";
import { damp } from "@/lib/motion";
import { createWallTexture, wallScreens } from "@/lib/scene/panel-texture";
import { getPointer, hasPointer } from "@/lib/scene/pointer";
import { WALL_VERT, wallFrag } from "@/lib/scene/shaders/wall";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";
import {
  vitrineWall,
  WALL_CELL,
  WALL_COLUMNS,
  WALL_ROWS,
  WALL_SPAN as SPAN,
  WALL_TALL as TALL,
} from "@/lib/scene/world";

type WallProps = {
  shared: SharedUniforms;
};

/**
 * A grade da textura não é a da parede: a parede é uma faixa comprida, e as
 * telas vão na resolução das imagens. Uma textura só passaria do tamanho
 * máximo de muitos aparelhos; são duas, 4 × 4 telas cada.
 */
const ATLAS_COLUMNS = 4;
const ATLAS_ROWS = 4;
const ATLAS_CELLS = ATLAS_COLUMNS * ATLAS_ROWS;

/** As telas só respondem ao ponteiro enquanto a câmera olha para a parede. */
const LIVE_FORK = 0.35;

const TO_WALL = new Vector3();
const RIGHT = new Vector3();
const NORMAL = new Vector3();
const RAY = new Vector3();

/** As placas numa geometria só: um quad por tela, no plano da parede. */
function createPlates(dots: readonly [number, number, number][]): BufferGeometry {
  const count = WALL_COLUMNS * WALL_ROWS;
  const position = new Float32Array(count * 12);
  const uv = new Float32Array(count * 8);
  const local = new Float32Array(count * 8);
  const dot = new Float32Array(count * 12);
  const order = new Float32Array(count * 4);
  const cells = new Float32Array(count * 4);
  const index: number[] = [];
  const last = WALL_COLUMNS - 1 + (WALL_ROWS - 1) * 0.6;

  // As telas descem por coluna: as de um mesmo projeto ficam juntas, e a
  // câmera as encontra na ordem em que percorre a parede.
  for (let cell = 0; cell < count; cell += 1) {
    const column = Math.floor(cell / WALL_ROWS);
    const row = cell % WALL_ROWS;
    const atlasColumn = (cell % ATLAS_CELLS) % ATLAS_COLUMNS;
    const atlasRow = Math.floor((cell % ATLAS_CELLS) / ATLAS_COLUMNS);
    const x = -SPAN / 2 + WALL_CELL.width / 2 + column * (WALL_CELL.width + WALL_CELL.gap);
    const y = TALL / 2 - WALL_CELL.height / 2 - row * (WALL_CELL.height + WALL_CELL.gap);
    const [dx, dy, dr] = dots[cell] ?? [0.5, 0.5, 0];
    // Os quatro cantos: embaixo à esquerda, embaixo à direita, em cima idem.
    for (let corner = 0; corner < 4; corner += 1) {
      const sx = corner % 2;
      const sy = Math.floor(corner / 2);
      const vertex = cell * 4 + corner;
      position.set(
        [x + (sx - 0.5) * WALL_CELL.width, y + (sy - 0.5) * WALL_CELL.height, 0],
        vertex * 3,
      );
      // A textura é uma grade com a primeira tela em cima à esquerda.
      uv.set(
        [(atlasColumn + sx) / ATLAS_COLUMNS, 1 - (atlasRow + 1 - sy) / ATLAS_ROWS],
        vertex * 2,
      );
      local.set([sx, sy], vertex * 2);
      dot.set([dx, dy, dr], vertex * 3);
      order[vertex] = (column + row * 0.6) / last;
      cells[vertex] = cell;
    }
    const first = cell * 4;
    index.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setAttribute("aLocal", new BufferAttribute(local, 2));
  geometry.setAttribute("aDot", new BufferAttribute(dot, 3));
  geometry.setAttribute("aOrder", new BufferAttribute(order, 1));
  geometry.setAttribute("aCell", new BufferAttribute(cells, 1));
  geometry.setIndex(index);
  // Um grupo por textura: as primeiras telas numa, as outras na segunda.
  const split = Math.min(count, ATLAS_CELLS) * 6;
  geometry.addGroup(0, split, 0);
  geometry.addGroup(split, index.length - split, 1);
  return geometry;
}

/**
 * Em que tela da parede um ponto do plano dela cai, ou −1: nos vãos e fora
 * dela. `x` e `y` são a partir do centro.
 */
function cellAt(x: number, y: number): number {
  const stepX = WALL_CELL.width + WALL_CELL.gap;
  const stepY = WALL_CELL.height + WALL_CELL.gap;
  const fromLeft = x + SPAN / 2;
  const fromTop = TALL / 2 - y;
  const column = Math.floor(fromLeft / stepX);
  const row = Math.floor(fromTop / stepY);
  if (column < 0 || column >= WALL_COLUMNS || row < 0 || row >= WALL_ROWS) return -1;
  if (fromLeft - column * stepX > WALL_CELL.width) return -1;
  if (fromTop - row * stepY > WALL_CELL.height) return -1;
  return column * WALL_ROWS + row;
}

/**
 * As telas da parede da vitrine. Não há página nem clique: a vitrine é a
 * parede, e a tela debaixo do ponteiro acende.
 */
export function Wall({ shared }: WallProps) {
  const point = useRef(0);
  const placement = useMemo(() => vitrineWall(), []);

  const built = useMemo(() => {
    const screens = wallScreens(VITRINE, WALL_COLUMNS * WALL_ROWS);
    const atlases = [screens.slice(0, ATLAS_CELLS), screens.slice(ATLAS_CELLS)].map(
      (part) => createWallTexture(part, ATLAS_COLUMNS, ATLAS_ROWS),
    );
    const geometry = createPlates(atlases.flatMap((atlas) => atlas.dots));
    // As duas placas dividem o ponteiro: uma escrita acende a tela nas duas.
    const point = { value: new Vector2(-1, 0) };
    const materials = atlases.map(
      ({ texture }) =>
        new ShaderMaterial({
          uniforms: {
            ...fogUniforms(shared),
            uMap: { value: texture },
            uMist: shared.mist,
            uFork: shared.fork,
            uPoint: point,
          },
          vertexShader: WALL_VERT,
          fragmentShader: wallFrag(WALL_CELL.width / WALL_CELL.height),
          side: DoubleSide,
        }),
    );
    const textures = atlases.map((atlas) => atlas.texture);
    return { geometry, textures, materials, point: point.value };
  }, [shared]);

  useEffect(() => {
    const held = built;
    return () => {
      held.geometry.dispose();
      for (const texture of held.textures) texture.dispose();
      for (const material of held.materials) material.dispose();
    };
  }, [built]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const live =
      hasPointer() && shared.caseRecess.value < 0.02 && shared.fork.value > LIVE_FORK;

    // A tela debaixo do ponteiro: o raio dele contra o plano da parede.
    let cell = -1;
    if (live) {
      const pointer = getPointer();
      RIGHT.set(Math.cos(placement.yaw), 0, -Math.sin(placement.yaw));
      NORMAL.set(Math.sin(placement.yaw), 0, Math.cos(placement.yaw));
      RAY.set(pointer.x, -pointer.y, 0.5)
        .unproject(state.camera)
        .sub(state.camera.position)
        .normalize();
      const toward = RAY.dot(NORMAL);
      if (toward < -1e-4) {
        TO_WALL.set(placement.x, placement.y, placement.z).sub(state.camera.position);
        RAY.multiplyScalar(TO_WALL.dot(NORMAL) / toward).sub(TO_WALL);
        cell = cellAt(RAY.dot(RIGHT), RAY.y);
      }
    }
    point.current = damp(point.current, cell >= 0 ? 1 : 0, 12, dt);
    // A tela só troca quando há outra debaixo do ponteiro: a que ele deixou
    // apaga no lugar.
    if (cell >= 0) built.point.x = cell;
    built.point.y = point.current;
  }, -7);

  return (
    <mesh
      geometry={built.geometry}
      material={built.materials}
      position={[placement.x, placement.y, placement.z]}
      rotation={[0, placement.yaw, 0]}
    />
  );
}
