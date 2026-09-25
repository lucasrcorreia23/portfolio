"use client";

import { useEffect, useMemo } from "react";
import { FrontSide, GLSL3, ShaderMaterial } from "three";
import { buildChamberGeometry } from "@/lib/scene/chamber-geometry";
import {
  APERTURE_HALF_HEIGHT,
  APERTURE_HALF_WIDTH,
  APERTURE_Y,
  type ChamberPlan,
} from "@/lib/scene/chamber-plan";
import {
  CHAMBER_FRAG,
  CHAMBER_VERT,
  SOURCE_FRAG,
  SOURCE_VERT,
} from "@/lib/scene/shaders/chamber";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";
import { CHAMBER_FAR } from "@/lib/scene/world";

/**
 * A câmara: o duto visto por dentro, e a fonte distante que fecha o fundo dele.
 *
 * **Deixou de ser uma caixa.** A seção varia ao longo do eixo — garganta antes
 * do corpo de prova, alargamento no rio, nichos nas estações, quadros
 * estruturais com chanfro — e tudo sai de `lib/scene/chamber-plan.ts`. A malha
 * é uma só e o material é um só: o papel de cada face (piso, parede, teto) sai
 * da normal dela no shader, não de três materiais que um dia divergiriam.
 *
 * A fonte do fundo continua um objeto à parte porque **não é parede**: é a
 * única coisa da cena que emite, e emite fraquíssimo. Ela ocupa a abertura da
 * parede do fundo (`APERTURE_*` em `chamber-plan.ts`), não a seção inteira.
 * "Uma fonte distante a montante" (DIRECTION.md §4) é o que impede o fim do
 * duto de ser um buraco preto, e é a luz para a qual a descida inteira está
 * andando.
 */
export function Chamber({
  shared,
  plan,
}: {
  shared: SharedUniforms;
  plan: ChamberPlan;
}) {
  const { wall, source, geometry } = useMemo(() => {
    const wallMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uWallColor: shared.abyss,
        uCyan: shared.cyan,
      },
      vertexShader: CHAMBER_VERT,
      fragmentShader: CHAMBER_FRAG,
      side: FrontSide,
      depthWrite: true,
      transparent: false,
      toneMapped: false,
    });
    wallMaterial.glslVersion = GLSL3;

    const sourceMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
      },
      vertexShader: SOURCE_VERT,
      fragmentShader: SOURCE_FRAG,
      depthWrite: true,
      transparent: false,
      toneMapped: false,
    });
    sourceMaterial.glslVersion = GLSL3;

    return {
      wall: wallMaterial,
      source: sourceMaterial,
      geometry: buildChamberGeometry(plan),
    };
  }, [shared, plan]);

  useEffect(() => {
    return () => {
      wall.dispose();
      source.dispose();
      geometry.dispose();
    };
  }, [wall, source, geometry]);

  return (
    <>
      <mesh geometry={geometry} material={wall} />
      {/* A fonte, no fundo do requadro da abertura: quase uma unidade atrás
          da parede, para a espessura dela aparecer. */}
      <mesh position={[0, APERTURE_Y, CHAMBER_FAR - 0.9]} material={source}>
        <planeGeometry
          args={[APERTURE_HALF_WIDTH * 2, APERTURE_HALF_HEIGHT * 2]}
        />
      </mesh>
    </>
  );
}
