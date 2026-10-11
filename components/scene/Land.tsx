"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  NoColorSpace,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Mesh,
  type Texture,
} from "three";
import {
  createIndustry,
  type IndustryModels,
  loadIndustryModels,
  BACKDROP_EXTENSION,
  markIndustrySettled,
  wallExtension,
} from "@/lib/scene/industry";
import { nextFrame, whenEntered } from "@/lib/scene/late-assets";
import {
  createPbrMaterial,
  disposePbrMaterial,
  loadMap,
  loadPbrSet,
} from "@/lib/scene/pbr";
import { getQuality } from "@/lib/scene/quality";
import {
  ARC_FRAG,
  ARC_SEGMENTS,
  ARC_VERT,
  BEACON_FRAG,
  BEACON_VERT,
  SKY_FRAG,
  SKY_VERT,
  TERRAIN_FRAG,
  TERRAIN_VERT,
} from "@/lib/scene/shaders/land";
import { createTerrainGeometry } from "@/lib/scene/terrain";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";

/**
 * O que não emite: o céu, o terreno, a indústria (parede da vitrine, tanques
 * e chaminés), as descargas e as luzes indicadoras dela. Sete draw calls.
 */
export function Land({ shared }: { shared: SharedUniforms }) {
  const sky = useRef<Mesh>(null);
  const gl = useThree((state) => state.gl);

  // As chaminés, os tanques e a tubulação nascem com texturas de um pixel,
  // para os programas compilarem com o resto; as de verdade chegam depois do
  // loading. Nada aqui é metal polido: o fator de metal fica em zero.
  const backdrop = useMemo(() => {
    const stacks = createPbrMaterial(shared, BACKDROP_EXTENSION);
    const hull = createPbrMaterial(shared, BACKDROP_EXTENSION);
    stacks.metalness = 0;
    hull.metalness = 0;
    // A estrutura da parede da vitrine: o mesmo aço dos pórticos.
    const wall = createPbrMaterial(shared, wallExtension());
    return { stacks, hull, wall };
  }, [shared]);
  useEffect(() => {
    let alive = true;
    void whenEntered().then(() => {
      void loadPbrSet(gl, backdrop.stacks, "chamine", () => alive).catch(() => {});
      void loadPbrSet(gl, backdrop.hull, "green_metal_rust", () => alive).catch(() => {});
      void loadPbrSet(gl, backdrop.wall, "green_metal_rust", () => alive).catch(() => {});
    });
    return () => {
      alive = false;
      disposePbrMaterial(backdrop.stacks);
      disposePbrMaterial(backdrop.hull);
      disposePbrMaterial(backdrop.wall);
    };
  }, [gl, backdrop]);

  // Os tanques e as chaminés chegam por arquivo. Se não chegarem, a silhueta
  // sai sem eles: ainda há torres e tubulação.
  const [models, setModels] = useState<IndustryModels | null>(null);
  useEffect(() => {
    let alive = true;
    loadIndustryModels().then(
      (loaded) => alive && setModels(loaded),
      () => alive && setModels({}),
    );
    return () => {
      alive = false;
    };
  }, []);

  const industry = useMemo(() => {
    if (models === null) return null;
    const made = createIndustry(models);
    const beacons = new BufferGeometry();
    const count = made.beacons.length / 4;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions.set(made.beacons.subarray(i * 4, i * 4 + 3), i * 3);
      phases[i] = made.beacons[i * 4 + 3] ?? 0;
    }
    beacons.setAttribute("position", new BufferAttribute(positions, 3));
    beacons.setAttribute("aPhase", new BufferAttribute(phases, 1));

    // As descargas: cada uma é uma linha de segmentos entre dois pontos.
    const pairs = made.arcs.length / 6;
    const arcVertices = pairs * ARC_SEGMENTS * 2;
    const from = new Float32Array(arcVertices * 3);
    const to = new Float32Array(arcVertices * 3);
    const arc = new Float32Array(arcVertices * 2);
    for (let i = 0; i < pairs; i += 1) {
      for (let k = 0; k < ARC_SEGMENTS; k += 1) {
        for (let end = 0; end < 2; end += 1) {
          const v = (i * ARC_SEGMENTS + k) * 2 + end;
          from.set(made.arcs.subarray(i * 6, i * 6 + 3), v * 3);
          to.set(made.arcs.subarray(i * 6 + 3, i * 6 + 6), v * 3);
          arc[v * 2] = (k + end) / ARC_SEGMENTS;
          arc[v * 2 + 1] = i * 1.37 + 0.5;
        }
      }
    }
    const arcs = new BufferGeometry();
    arcs.setAttribute("position", new BufferAttribute(new Float32Array(arcVertices * 3), 3));
    arcs.setAttribute("aFrom", new BufferAttribute(from, 3));
    arcs.setAttribute("aTo", new BufferAttribute(to, 3));
    arcs.setAttribute("aArc", new BufferAttribute(arc, 2));

    return { wall: made.wall, hull: made.hull, stacks: made.stacks, beacons, arcs };
  }, [models]);

  useEffect(() => {
    if (industry === null) return;
    markIndustrySettled();
    return () => {
      for (const item of Object.values(industry)) item.dispose();
    };
  }, [industry]);

  const built = useMemo(() => {
    const fog = fogUniforms(shared);
    const waiting = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    waiting.needsUpdate = true;
    return {
      arcMaterial: new ShaderMaterial({
        uniforms: { ...fog, uStorm: shared.storm },
        vertexShader: ARC_VERT,
        fragmentShader: ARC_FRAG,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
      skyGeometry: new SphereGeometry(320, 24, 12),
      skyMaterial: new ShaderMaterial({
        uniforms: { ...fog, uPlanet: shared.planet, uTeal: shared.teal, uMist: shared.mist },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: BackSide,
        depthWrite: false,
      }),
      terrainGeometry: createTerrainGeometry(),
      // O solo nasce com um pixel no lugar dos mapas e `uSoilOn` em zero:
      // até os arquivos chegarem o chão é o liso, e no nível baixo fica assim.
      soilWaiting: waiting,
      terrainMaterial: new ShaderMaterial({
        uniforms: {
          ...fog,
          uTeal: shared.teal,
          uSoil: { value: waiting as Texture },
          uSoilNormal: { value: waiting as Texture },
          uSoilArm: { value: waiting as Texture },
          uSoilOn: { value: 0 },
        },
        vertexShader: TERRAIN_VERT,
        fragmentShader: TERRAIN_FRAG,
      }),
      beaconMaterial: new ShaderMaterial({
        uniforms: { ...fog, uResolution: shared.resolution, uMist: shared.mist },
        vertexShader: BEACON_VERT,
        fragmentShader: BEACON_FRAG,
      }),
    };
  }, [shared]);

  useEffect(() => {
    const held = built;
    return () => {
      for (const item of Object.values(held)) item.dispose();
    };
  }, [built]);

  // O solo chega depois do loading, como as texturas da indústria: cor,
  // relevo e rugosidade, cada mapa num quadro. O nível baixo não o pede.
  const soilReady = useRef(false);
  useEffect(() => {
    let alive = true;
    let loaded: Texture[] = [];
    const uniforms = built.terrainMaterial.uniforms;
    void whenEntered()
      .then(() => {
        if (!alive || getQuality().tier === "low") return null;
        const base = "/textures/cena/brown_mud_rocks_01";
        return Promise.all([
          loadMap(`${base}_diff.webp`, SRGBColorSpace),
          loadMap(`${base}_nor_gl.webp`, NoColorSpace),
          loadMap(`${base}_arm.webp`, NoColorSpace),
        ]);
      })
      .then(async (maps) => {
        if (maps === null) return;
        loaded = maps;
        for (const map of maps) {
          if (!alive) break;
          gl.initTexture(map);
          await nextFrame();
        }
        if (!alive) {
          for (const map of maps) map.dispose();
          return;
        }
        const [color, normal, arm] = maps;
        if (uniforms["uSoil"]) uniforms["uSoil"].value = color;
        if (uniforms["uSoilNormal"]) uniforms["uSoilNormal"].value = normal;
        if (uniforms["uSoilArm"]) uniforms["uSoilArm"].value = arm;
        soilReady.current = true;
      })
      // Sem os arquivos o chão fica como sempre foi.
      .catch(() => undefined);
    return () => {
      alive = false;
      soilReady.current = false;
      for (const map of loaded) map.dispose();
    };
  }, [gl, built]);

  useFrame((state, delta) => {
    // O céu acompanha a câmera: é fundo, nunca se chega nele.
    sky.current?.position.copy(state.camera.position);
    // O solo entra aos poucos: o chão não troca de cara num quadro.
    const soil = built.terrainMaterial.uniforms["uSoilOn"];
    if (soil !== undefined && soilReady.current && soil.value < 1) {
      soil.value = Math.min(1, soil.value + Math.min(delta, 1) * 0.8);
    }
  }, -9);

  return (
    <>
      <mesh
        ref={sky}
        geometry={built.skyGeometry}
        material={built.skyMaterial}
        frustumCulled={false}
        renderOrder={-1}
      />
      {/* Por último entre os opacos: a relva e as plantas cobrem quase todo
          o chão, e o que elas cobrem não chega a ser calculado. */}
      <mesh
        geometry={built.terrainGeometry}
        material={built.terrainMaterial}
        frustumCulled={false}
        renderOrder={1}
      />
      {industry !== null && (
        <>
          <mesh geometry={industry.wall} material={backdrop.wall} frustumCulled={false} />
          <mesh geometry={industry.hull} material={backdrop.hull} frustumCulled={false} />
          <mesh geometry={industry.stacks} material={backdrop.stacks} frustumCulled={false} />
          <lineSegments
            geometry={industry.arcs}
            material={built.arcMaterial}
            frustumCulled={false}
          />
          <points
            geometry={industry.beacons}
            material={built.beaconMaterial}
            frustumCulled={false}
          />
        </>
      )}
    </>
  );
}
