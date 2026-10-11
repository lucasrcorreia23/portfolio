"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  VideoTexture,
} from "three";
import { VITRINE } from "@/content/vitrine";
import { damp } from "@/lib/motion";
import { createWallTexture, wallScreens } from "@/lib/scene/panel-texture";
import { getPointer, hasPointer } from "@/lib/scene/pointer";
import { WALL_VERT, wallFrag } from "@/lib/scene/shaders/wall";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";
import { wallFocus } from "@/lib/scene/wall-focus";
import {
  vitrineWall,
  WALL_CELL,
  WALL_COLUMNS,
  WALL_ROWS,
  wallCell,
  wallCellAt,
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
/** Os vídeos só tocam a partir daqui: antes disso a parede está longe ou apagada. */
const PLAY_FORK = 0.05;

/**
 * Uma tela em vídeo é um loop mudo. No atlas entra o quadro parado dela (o
 * `.webp` de mesmo nome); por cima, uma placa própria com a textura do vídeo.
 * Textura própria porque reenviar o atlas inteiro a cada quadro custaria
 * dezenas de megabytes por segundo, e o vídeo pequeno custa quase nada.
 */
const isVideo = (src: string | undefined) => src?.endsWith(".mp4") === true;
const posterOf = (src: string) => src.replace(/\.mp4$/, ".webp");

const TO_WALL = new Vector3();
const RIGHT = new Vector3();
const NORMAL = new Vector3();
const RAY = new Vector3();

/** A vez de uma tela na onda que acende a parede, 0 a 1. */
function cellOrder(cell: number): number {
  const last = WALL_COLUMNS - 1 + (WALL_ROWS - 1) * 0.6;
  return (Math.floor(cell / WALL_ROWS) + (cell % WALL_ROWS) * 0.6) / last;
}

/**
 * As placas dos vídeos: um quad por tela em vídeo, com a textura inteira, e um
 * grupo por placa para cada uma ter o seu material.
 */
function createVideoPlates(cells: readonly number[]): BufferGeometry {
  const position = new Float32Array(cells.length * 12);
  const uv = new Float32Array(cells.length * 8);
  const dot = new Float32Array(cells.length * 12);
  const order = new Float32Array(cells.length * 4);
  const ids = new Float32Array(cells.length * 4);
  const index: number[] = [];
  cells.forEach((cell, i) => {
    const { x, y } = wallCell(cell);
    for (let corner = 0; corner < 4; corner += 1) {
      const sx = corner % 2;
      const sy = Math.floor(corner / 2);
      const vertex = i * 4 + corner;
      position.set(
        [x + (sx - 0.5) * WALL_CELL.width, y + (sy - 0.5) * WALL_CELL.height, 0],
        vertex * 3,
      );
      uv.set([sx, sy], vertex * 2);
      order[vertex] = cellOrder(cell);
      ids[vertex] = cell;
    }
    const first = i * 4;
    index.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  // Na placa do vídeo, `aLocal` é a própria UV.
  geometry.setAttribute("aLocal", new BufferAttribute(uv, 2));
  geometry.setAttribute("aDot", new BufferAttribute(dot, 3));
  geometry.setAttribute("aOrder", new BufferAttribute(order, 1));
  geometry.setAttribute("aCell", new BufferAttribute(ids, 1));
  geometry.setIndex(index);
  cells.forEach((_, i) => geometry.addGroup(i * 6, 6, i));
  return geometry;
}

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

  // As telas descem por coluna: as de um mesmo projeto ficam juntas, e a
  // câmera as encontra na ordem em que percorre a parede.
  for (let cell = 0; cell < count; cell += 1) {
    const atlasColumn = (cell % ATLAS_CELLS) % ATLAS_COLUMNS;
    const atlasRow = Math.floor((cell % ATLAS_CELLS) / ATLAS_COLUMNS);
    const { x, y } = wallCell(cell);
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
      order[vertex] = cellOrder(cell);
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
 * As telas da parede da vitrine. Não há página nem clique: a vitrine é a
 * parede, a tela debaixo do ponteiro acende e, se ele para nela, a câmera se
 * aproxima (`wallFocus`, decidido no `SceneWorld`).
 */
export function Wall({ shared }: WallProps) {
  const point = useRef(0);
  const placement = useMemo(() => vitrineWall(), []);

  const built = useMemo(() => {
    const all = wallScreens(VITRINE, WALL_COLUMNS * WALL_ROWS);
    // No atlas, a tela em vídeo entra com o quadro parado dela.
    const screens = all.map((screen) =>
      screen.src !== undefined && isVideo(screen.src)
        ? { ...screen, src: posterOf(screen.src) }
        : screen,
    );
    const atlases = [screens.slice(0, ATLAS_CELLS), screens.slice(ATLAS_CELLS)].map(
      (part) => createWallTexture(part, ATLAS_COLUMNS, ATLAS_ROWS),
    );
    const geometry = createPlates(atlases.flatMap((atlas) => atlas.dots));
    // As duas placas dividem o ponteiro: uma escrita acende a tela nas duas.
    const point = { value: new Vector2(-1, 0) };
    const focus = { value: new Vector2(-1, 0) };
    const materials = atlases.map(
      ({ texture }) =>
        new ShaderMaterial({
          uniforms: {
            ...fogUniforms(shared),
            uMap: { value: texture },
            uMist: shared.mist,
            uFork: shared.fork,
            uPoint: point,
            uFocus: focus,
          },
          vertexShader: WALL_VERT,
          fragmentShader: wallFrag(WALL_CELL.width / WALL_CELL.height),
          side: DoubleSide,
        }),
    );
    const textures = atlases.map((atlas) => atlas.texture);

    const clips = all.flatMap((screen, cell) =>
      screen.src !== undefined && isVideo(screen.src) ? [{ cell, src: screen.src }] : [],
    );
    const videos = clips.map(({ src }) => {
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = src;
      return video;
    });
    const videoTextures = videos.map((video) => {
      const texture = new VideoTexture(video);
      texture.colorSpace = SRGBColorSpace;
      return texture;
    });
    const videoGeometry = createVideoPlates(clips.map((clip) => clip.cell));
    const videoMaterials = videoTextures.map((texture) => {
      const material = new ShaderMaterial({
        uniforms: {
          ...fogUniforms(shared),
          uMap: { value: texture },
          uMist: shared.mist,
          uFork: shared.fork,
          uPoint: point,
          uFocus: focus,
        },
        vertexShader: WALL_VERT,
        fragmentShader: wallFrag(WALL_CELL.width / WALL_CELL.height),
        side: DoubleSide,
      });
      // No mesmo plano das placas, desenhada por cima delas.
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -1;
      return material;
    });

    return {
      geometry,
      textures,
      materials,
      point: point.value,
      focus: focus.value,
      videos,
      videoTextures,
      videoGeometry,
      videoMaterials,
    };
  }, [shared]);

  // Movimento reduzido: a parede fica com os quadros parados.
  const calm = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const playing = useRef(false);

  useEffect(() => {
    const held = built;
    return () => {
      held.geometry.dispose();
      for (const texture of held.textures) texture.dispose();
      for (const material of held.materials) material.dispose();
      for (const video of held.videos) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      for (const texture of held.videoTextures) texture.dispose();
      held.videoGeometry.dispose();
      for (const material of held.videoMaterials) material.dispose();
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
        cell = wallCellAt(RAY.dot(RIGHT), RAY.y);
      }
    }
    wallFocus.hover = cell;
    built.focus.set(wallFocus.cell, wallFocus.weight);
    point.current = damp(point.current, cell >= 0 ? 1 : 0, 12, dt);
    // A tela só troca quando há outra debaixo do ponteiro: a que ele deixou
    // apaga no lugar.
    if (cell >= 0) built.point.x = cell;
    built.point.y = point.current;

    // Os vídeos tocam enquanto a câmera olha para a parede, e param fora dela.
    const play = !calm && shared.fork.value > PLAY_FORK;
    if (play !== playing.current) {
      playing.current = play;
      for (const video of built.videos) {
        if (play) void video.play().catch(() => {});
        else video.pause();
      }
    }
  }, -7);

  return (
    <group position={[placement.x, placement.y, placement.z]} rotation={[0, placement.yaw, 0]}>
      <mesh geometry={built.geometry} material={built.materials} />
      {built.videos.length > 0 ? (
        <mesh geometry={built.videoGeometry} material={built.videoMaterials} />
      ) : null}
    </group>
  );
}
