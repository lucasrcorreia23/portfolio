"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  SphereGeometry,
  type Mesh,
} from "three";
import {
  createIndustry,
  type IndustryModels,
  loadIndustryModels,
  markIndustrySettled,
  STACK_EXTENSION,
} from "@/lib/scene/industry";
import { whenEntered } from "@/lib/scene/late-assets";
import { createPbrMaterial, disposePbrMaterial, loadPbrSet } from "@/lib/scene/pbr";
import {
  ARC_FRAG,
  ARC_SEGMENTS,
  ARC_VERT,
  BEACON_FRAG,
  BEACON_VERT,
  INDUSTRY_FRAG,
  INDUSTRY_VERT,
  SKY_FRAG,
  SKY_VERT,
  TERRAIN_FRAG,
  TERRAIN_VERT,
} from "@/lib/scene/shaders/land";
import { createTerrainGeometry } from "@/lib/scene/terrain";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";

/**
 * O que não emite: o céu, o terreno, a indústria, as chaminés, as descargas
 * e as luzes indicadoras dela. Seis draw calls.
 */
export function Land({ shared }: { shared: SharedUniforms }) {
  const sky = useRef<Mesh>(null);
  const gl = useThree((state) => state.gl);

  // As chaminés nascem com texturas de um pixel, para o programa compilar
  // com o resto; as do modelo chegam depois do loading.
  const stackMaterial = useMemo(() => {
    const material = createPbrMaterial(shared, STACK_EXTENSION);
    // Concreto: o modelo traz o fator de metal em zero.
    material.metalness = 0;
    return material;
  }, [shared]);
  useEffect(() => {
    let alive = true;
    void whenEntered()
      .then(() => loadPbrSet(gl, stackMaterial, "chamine", () => alive))
      .catch(() => {});
    return () => {
      alive = false;
      disposePbrMaterial(stackMaterial);
    };
  }, [gl, stackMaterial]);

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

    return { geometry: made.geometry, stacks: made.stacks, beacons, arcs };
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
      terrainMaterial: new ShaderMaterial({
        uniforms: { ...fog, uTeal: shared.teal },
        vertexShader: TERRAIN_VERT,
        fragmentShader: TERRAIN_FRAG,
      }),
      industryMaterial: new ShaderMaterial({
        uniforms: { ...fog, uTeal: shared.teal },
        vertexShader: INDUSTRY_VERT,
        fragmentShader: INDUSTRY_FRAG,
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

  // O céu acompanha a câmera: é fundo, nunca se chega nele.
  useFrame((state) => {
    sky.current?.position.copy(state.camera.position);
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
      <mesh
        geometry={built.terrainGeometry}
        material={built.terrainMaterial}
        frustumCulled={false}
      />
      {industry !== null && (
        <>
          <mesh
            geometry={industry.geometry}
            material={built.industryMaterial}
            frustumCulled={false}
          />
          <mesh geometry={industry.stacks} material={stackMaterial} frustumCulled={false} />
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
