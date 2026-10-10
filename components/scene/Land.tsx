"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  SphereGeometry,
  type Mesh,
} from "three";
import { createIndustry } from "@/lib/scene/industry";
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
 * O que não emite: o céu, o terreno, a indústria e as luzes indicadoras dela.
 * Quatro draw calls.
 */
export function Land({ shared }: { shared: SharedUniforms }) {
  const sky = useRef<Mesh>(null);

  const built = useMemo(() => {
    const fog = fogUniforms(shared);
    const industry = createIndustry();
    const beacons = new BufferGeometry();
    const count = industry.beacons.length / 4;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions.set(industry.beacons.subarray(i * 4, i * 4 + 3), i * 3);
      phases[i] = industry.beacons[i * 4 + 3] ?? 0;
    }
    beacons.setAttribute("position", new BufferAttribute(positions, 3));
    beacons.setAttribute("aPhase", new BufferAttribute(phases, 1));

    // As descargas: cada uma é uma linha de segmentos entre dois pontos.
    const pairs = industry.arcs.length / 6;
    const arcVertices = pairs * ARC_SEGMENTS * 2;
    const from = new Float32Array(arcVertices * 3);
    const to = new Float32Array(arcVertices * 3);
    const arc = new Float32Array(arcVertices * 2);
    for (let i = 0; i < pairs; i += 1) {
      for (let k = 0; k < ARC_SEGMENTS; k += 1) {
        for (let end = 0; end < 2; end += 1) {
          const v = (i * ARC_SEGMENTS + k) * 2 + end;
          from.set(industry.arcs.subarray(i * 6, i * 6 + 3), v * 3);
          to.set(industry.arcs.subarray(i * 6 + 3, i * 6 + 6), v * 3);
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

    return {
      arcGeometry: arcs,
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
        uniforms: { ...fog },
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
      industryGeometry: industry.geometry,
      industryMaterial: new ShaderMaterial({
        uniforms: { ...fog, uTeal: shared.teal },
        vertexShader: INDUSTRY_VERT,
        fragmentShader: INDUSTRY_FRAG,
      }),
      beaconGeometry: beacons,
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
      <mesh
        geometry={built.industryGeometry}
        material={built.industryMaterial}
        frustumCulled={false}
      />
      <lineSegments
        geometry={built.arcGeometry}
        material={built.arcMaterial}
        frustumCulled={false}
      />
      <points
        geometry={built.beaconGeometry}
        material={built.beaconMaterial}
        frustumCulled={false}
      />
    </>
  );
}
