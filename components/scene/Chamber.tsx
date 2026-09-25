"use client";

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  FrontSide,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Sphere,
  Vector3,
} from "three";
import { buildChamberGeometry } from "@/lib/scene/chamber-geometry";
import {
  APERTURE_HALF_HEIGHT,
  APERTURE_Y,
  louverGaps,
  LOUVER_Z,
  PLAN_FAR,
  type ChamberPlan,
} from "@/lib/scene/chamber-plan";
import {
  BEAM_FRAG,
  BEAM_VERT,
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

/**
 * O céu fica cinco unidades atrás das venezianas: fundo o bastante para a
 * abertura da DOF da Superfície o desmanchar, e com folga de sobra para quem
 * olha pela fresta de esguelha não achar a borda dele.
 */
const SKY_Z = LOUVER_Z - 5;

/**
 * As lâminas: uma por fresta, da altura inteira da abertura, estendidas ao
 * longo da luz. Elas não terminam num corte — o próprio shader as apaga ao
 * longo do caminho —, então o comprimento só precisa passar da soleira.
 */
const BEAM_LENGTH = 10;

function buildBeams(): InstancedBufferGeometry {
  const gaps = louverGaps();
  const origins = new Float32Array(gaps.length * 3);
  const widths = new Float32Array(gaps.length);
  const lengths = new Float32Array(gaps.length);
  gaps.forEach(([x0, x1], i) => {
    origins.set([x0, APERTURE_Y - APERTURE_HALF_HEIGHT, LOUVER_Z], i * 3);
    widths[i] = x1 - x0;
    lengths[i] = BEAM_LENGTH;
  });

  const cube = new BoxGeometry(1, 1, 1);
  cube.translate(0.5, 0.5, 0.5);
  const geometry = new InstancedBufferGeometry();
  geometry.index = cube.index;
  geometry.setAttribute("position", cube.getAttribute("position"));
  geometry.setAttribute("aOrigin", new InstancedBufferAttribute(origins, 3));
  geometry.setAttribute("aWidth", new InstancedBufferAttribute(widths, 1));
  geometry.setAttribute("aLength", new InstancedBufferAttribute(lengths, 1));
  geometry.instanceCount = gaps.length;
  geometry.boundingSphere = new Sphere(new Vector3(0, APERTURE_Y, PLAN_FAR), 30);
  return geometry;
}

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
  const { wall, source, beam, geometry, beams } = useMemo(() => {
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

    const beamMaterial = new ShaderMaterial({
      uniforms: fogUniforms(shared),
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      side: FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    beamMaterial.glslVersion = GLSL3;

    return {
      wall: wallMaterial,
      source: sourceMaterial,
      beam: beamMaterial,
      geometry: buildChamberGeometry(plan),
      beams: buildBeams(),
    };
  }, [shared, plan]);

  useEffect(() => {
    return () => {
      wall.dispose();
      source.dispose();
      beam.dispose();
      geometry.dispose();
      beams.dispose();
    };
  }, [wall, source, beam, geometry, beams]);

  return (
    <>
      <mesh geometry={geometry} material={wall} />
      {/* O lado de fora: atrás das venezianas, largo o bastante para nenhuma
          fresta mostrar a borda dele. Na descida é só o brilho fraco da fonte
          a montante; na Superfície vira céu. */}
      <mesh position={[0, APERTURE_Y, SKY_Z]} material={source}>
        <planeGeometry args={[24, 16]} />
      </mesh>
      {/* As lâminas de luz, desenhadas depois de tudo que é opaco. */}
      <mesh geometry={beams} material={beam} frustumCulled={false} />
    </>
  );
}
