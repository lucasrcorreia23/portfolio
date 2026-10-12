"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  VideoTexture,
} from "three";
import { damp } from "@/lib/motion";
import { getPointer, hasPointer } from "@/lib/scene/pointer";
import { CAMERA_FOV } from "@/lib/scene/rail";
import { WALL_VERT, wallFrag } from "@/lib/scene/shaders/wall";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";
import { wallFocus } from "@/lib/scene/wall-focus";
import { WALL_SCREENS } from "@/lib/scene/wall-screens";
import { createWallAtlas, tileSpan } from "@/lib/scene/wall-texture";
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
 * O atlas da parede: três texturas de 3 × 3 telas, um terço da parede cada
 * (três colunas). Uma só passaria do tamanho máximo de muitos aparelhos.
 */
const ATLAS_COLUMNS = 3;
const ATLAS_CELLS = ATLAS_COLUMNS * WALL_ROWS;
const ATLAS_COUNT = Math.ceil((WALL_COLUMNS * WALL_ROWS) / ATLAS_CELLS);

/** As telas só respondem ao ponteiro enquanto a câmera olha para a parede. */
const LIVE_FORK = 0.35;
/** Os vídeos só carregam e tocam a partir daqui: antes a parede está longe ou apagada. */
const PLAY_FORK = 0.05;
/**
 * Quantas colunas além das que a câmera vê os vídeos já carregam, e a partir
 * de quantas eles soltam o arquivo. A folga evita carregar e soltar o mesmo
 * vídeo a cada passo do scroll.
 */
const LOAD_AHEAD = 1;
const DROP_BEYOND = 2.5;

const ASPECT = WALL_CELL.width / WALL_CELL.height;
const STEP_X = WALL_CELL.width + WALL_CELL.gap;

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
 * Os quads das telas: um por célula, no plano da parede. `uv` diz onde a
 * imagem está na textura (centro e tamanho); `atlas` liga isso à célula do
 * atlas, e sem ele a textura inteira é a imagem (as placas por cima).
 */
function createPlates(cells: readonly number[], atlas: boolean): BufferGeometry {
  const position = new Float32Array(cells.length * 12);
  const local = new Float32Array(cells.length * 8);
  const fit = new Float32Array(cells.length * 8);
  const center = new Float32Array(cells.length * 8);
  const span = new Float32Array(cells.length * 8);
  const order = new Float32Array(cells.length * 4);
  const ids = new Float32Array(cells.length * 4);
  const index: number[] = [];

  cells.forEach((cell, i) => {
    const screen = WALL_SCREENS[cell];
    const { x, y } = wallCell(cell);
    const fitX = (screen?.width ?? WALL_CELL.width) / WALL_CELL.width;
    const fitY = (screen?.height ?? WALL_CELL.height) / WALL_CELL.height;
    let cu = 0.5;
    let cv = 0.5;
    let su = 1;
    let sv = 1;
    if (atlas) {
      // A textura é uma grade com a primeira tela em cima à esquerda,
      // descendo por coluna.
      const slot = cell % ATLAS_CELLS;
      const column = Math.floor(slot / WALL_ROWS);
      const row = slot % WALL_ROWS;
      const [spanX, spanY] = tileSpan(screen?.aspect ?? ASPECT);
      cu = (column + 0.5) / ATLAS_COLUMNS;
      cv = 1 - (row + 0.5) / WALL_ROWS;
      su = spanX / ATLAS_COLUMNS;
      sv = spanY / WALL_ROWS;
    }
    // Os quatro cantos: embaixo à esquerda, embaixo à direita, em cima idem.
    for (let corner = 0; corner < 4; corner += 1) {
      const sx = corner % 2;
      const sy = Math.floor(corner / 2);
      const vertex = i * 4 + corner;
      position.set(
        [x + (sx - 0.5) * WALL_CELL.width, y + (sy - 0.5) * WALL_CELL.height, 0],
        vertex * 3,
      );
      local.set([sx, sy], vertex * 2);
      fit.set([fitX, fitY], vertex * 2);
      center.set([cu, cv], vertex * 2);
      span.set([su, sv], vertex * 2);
      order[vertex] = cellOrder(cell);
      ids[vertex] = cell;
    }
    const first = i * 4;
    index.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("aLocal", new BufferAttribute(local, 2));
  geometry.setAttribute("aFit", new BufferAttribute(fit, 2));
  geometry.setAttribute("aCenter", new BufferAttribute(center, 2));
  geometry.setAttribute("aSpan", new BufferAttribute(span, 2));
  geometry.setAttribute("aOrder", new BufferAttribute(order, 1));
  geometry.setAttribute("aCell", new BufferAttribute(ids, 1));
  geometry.setIndex(index);
  return geometry;
}

/** Uma placa por cima da parede: o vídeo de uma tela, ou a imagem grande dela. */
type Live = {
  cell: number;
  mesh: Mesh<BufferGeometry, ShaderMaterial>;
  /** A textura que a placa desenha. */
  map: { value: Texture | null };
  video: HTMLVideoElement | undefined;
  texture: Texture | undefined;
  loaded: boolean;
  ready: boolean;
};

/**
 * As telas da parede da vitrine. Não há página nem clique: a vitrine é a
 * parede, a tela debaixo do ponteiro acende e, se ele para nela, a câmera se
 * aproxima (`wallFocus`, decidido no `SceneWorld`).
 *
 * De saída a parede carrega só as telas pequenas, num atlas. Os vídeos
 * carregam quando a coluna deles chega perto da câmera e tocam enquanto ela
 * os vê; a imagem grande de uma tela parada carrega quando a câmera vai até
 * ela, e sai quando a câmera volta.
 */
export function Wall({ shared }: WallProps) {
  const point = useRef(0);
  const placement = useMemo(() => vitrineWall(), []);

  const built = useMemo(() => {
    const point = { value: new Vector2(-1, 0) };
    const focus = { value: new Vector2(-1, 0) };
    const material = (map: { value: Texture | null }, defines: Record<string, string>) =>
      new ShaderMaterial({
        uniforms: {
          ...fogUniforms(shared),
          uMap: map,
          uMist: shared.mist,
          uFork: shared.fork,
          uPoint: point,
          uFocus: focus,
        },
        defines,
        vertexShader: WALL_VERT,
        fragmentShader: wallFrag(ASPECT),
        side: DoubleSide,
      });

    const cells = WALL_SCREENS.map((_, cell) => cell);
    const atlases = Array.from({ length: ATLAS_COUNT }, (_, k) =>
      createWallAtlas(WALL_SCREENS.slice(k * ATLAS_CELLS, (k + 1) * ATLAS_CELLS), ATLAS_COLUMNS, WALL_ROWS),
    );
    const geometry = createPlates(cells, true);
    // Um grupo por textura, um terço da parede cada.
    for (let k = 0; k < ATLAS_COUNT; k += 1) {
      geometry.addGroup(k * ATLAS_CELLS * 6, ATLAS_CELLS * 6, k);
    }
    const materials = atlases.map((texture) => material({ value: texture }, {}));

    const lives: Live[] = cells.map((cell) => {
      const screen = WALL_SCREENS[cell];
      const video = screen?.video === true ? document.createElement("video") : undefined;
      let texture: Texture | undefined;
      if (video !== undefined) {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        // Sem \`src\` nada baixa; com ele, baixa inteiro, antes de a coluna aparecer.
        video.preload = "auto";
        texture = new VideoTexture(video);
        texture.colorSpace = SRGBColorSpace;
      }
      const map = { value: texture ?? null };
      const plate = material(map, video !== undefined ? { LIVE: "", VIDEO: "" } : { LIVE: "" });
      // No mesmo plano da parede, desenhada por cima dela.
      plate.polygonOffset = true;
      plate.polygonOffsetFactor = -1;
      plate.polygonOffsetUnits = -1;
      const mesh = new Mesh(createPlates([cell], false), plate);
      mesh.visible = false;
      const live: Live = { cell, mesh, map, video, texture, loaded: false, ready: false };
      video?.addEventListener("loadeddata", () => {
        if (live.texture !== undefined) live.texture.needsUpdate = true;
        live.ready = true;
      });
      return live;
    });

    return { geometry, atlases, materials, lives, point: point.value, focus: focus.value };
  }, [shared]);

  // Movimento reduzido: a parede fica com os quadros parados.
  const calm = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  /** A tela parada cuja imagem grande está carregada (ou carregando). */
  const sharp = useRef(-1);

  useEffect(() => {
    const held = built;
    return () => {
      held.geometry.dispose();
      for (const texture of held.atlases) texture.dispose();
      for (const material of held.materials) material.dispose();
      for (const live of held.lives) {
        if (live.video !== undefined) {
          live.video.pause();
          live.video.removeAttribute("src");
          live.video.load();
        }
        live.texture?.dispose();
        live.mesh.geometry.dispose();
        live.mesh.material.dispose();
      }
    };
  }, [built]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const live =
      hasPointer() && shared.caseRecess.value < 0.02 && shared.fork.value > LIVE_FORK;

    RIGHT.set(Math.cos(placement.yaw), 0, -Math.sin(placement.yaw));
    NORMAL.set(Math.sin(placement.yaw), 0, Math.cos(placement.yaw));
    TO_WALL.set(placement.x, placement.y, placement.z).sub(state.camera.position);

    // A tela debaixo do ponteiro: o raio dele contra o plano da parede.
    let cell = -1;
    if (live) {
      const pointer = getPointer();
      RAY.set(pointer.x, -pointer.y, 0.5)
        .unproject(state.camera)
        .sub(state.camera.position)
        .normalize();
      const toward = RAY.dot(NORMAL);
      if (toward < -1e-4) {
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

    // O que a câmera vê da parede: o ponto diante dela e meia largura.
    const along = -TO_WALL.dot(RIGHT);
    const distance = Math.max(TO_WALL.dot(NORMAL) * -1, 0.1);
    const reach =
      distance * Math.tan((CAMERA_FOV * Math.PI) / 360) * (state.size.width / Math.max(state.size.height, 1)) +
      WALL_CELL.width / 2;
    const wall = !calm && shared.fork.value > PLAY_FORK;

    for (const plate of built.lives) {
      const screen = WALL_SCREENS[plate.cell];
      if (screen === undefined) continue;
      if (plate.video !== undefined) {
        // Os vídeos: carregam perto da câmera, tocam à vista, soltam longe.
        const off = Math.abs(wallCell(plate.cell).x - along);
        const near = wall && off < reach + STEP_X * LOAD_AHEAD;
        const far = !wall || off > reach + STEP_X * DROP_BEYOND;
        if (near && !plate.loaded) {
          plate.loaded = true;
          plate.video.src = screen.src;
          plate.video.load();
        } else if (far && plate.loaded) {
          plate.loaded = false;
          plate.ready = false;
          plate.video.pause();
          plate.video.removeAttribute("src");
          plate.video.load();
        }
        const play = plate.loaded && off < reach;
        if (play && plate.video.paused) void plate.video.play().catch(() => {});
        else if (!play && !plate.video.paused) plate.video.pause();
        plate.mesh.visible = plate.ready;
      }
    }

    // A imagem grande da tela parada em foco: carrega quando a câmera vai até
    // ela, sai quando volta. Uma só por vez.
    const target = wallFocus.weight > 0 && WALL_SCREENS[wallFocus.cell]?.video === false ? wallFocus.cell : -1;
    if (target !== sharp.current) {
      const previous = built.lives[sharp.current];
      if (previous !== undefined) {
        previous.mesh.visible = false;
        previous.texture?.dispose();
        previous.texture = undefined;
        previous.map.value = null;
      }
      sharp.current = target;
      const next = built.lives[target];
      const screen = WALL_SCREENS[target];
      if (next !== undefined && screen !== undefined) {
        new TextureLoader().load(screen.src, (texture) => {
          // Chegou depois de a câmera ir embora: não serve mais.
          if (sharp.current !== target) {
            texture.dispose();
            return;
          }
          texture.colorSpace = SRGBColorSpace;
          texture.minFilter = LinearMipmapLinearFilter;
          texture.magFilter = LinearFilter;
          texture.anisotropy = 8;
          next.texture = texture;
          next.map.value = texture;
          next.mesh.visible = true;
        });
      }
    }
  }, -7);

  return (
    <group position={[placement.x, placement.y, placement.z]} rotation={[0, placement.yaw, 0]}>
      <mesh geometry={built.geometry} material={built.materials} />
      {built.lives.map((plate) => (
        <primitive key={plate.cell} object={plate.mesh} />
      ))}
    </group>
  );
}
