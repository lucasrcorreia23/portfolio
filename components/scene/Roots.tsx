"use client";

import { useEffect, useMemo } from "react";
import { Color, GLSL3, ShaderMaterial } from "three";
import type { ChamberPlan } from "@/lib/scene/chamber-plan";
import { buildRoots } from "@/lib/scene/roots";
import { CONCRETE_GLSL } from "@/lib/scene/shaders/chamber";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "@/lib/scene/shaders/fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "@/lib/scene/shaders/lights";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";

/**
 * As raízes (rodada 16): a malha de `lib/scene/roots.ts`, sombreada pelo
 * concreto da câmara com um albedo de madeira escura. O corpo aparece quando a
 * luz do bando ou de uma lanterna passa rente, como a estrutura; só a ponta
 * tem luz própria.
 */
const VERT = /* glsl */ `
in float aAlong;
out float vAlong;
out vec3 vWorld;
out vec3 vNormal;
out float vViewDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vAlong = aAlong;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 view = viewMatrix * world;
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

const FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

in vec3 vWorld;
in vec3 vNormal;
in float vViewDepth;
in float vAlong;

uniform vec3 uTip;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}
${CONCRETE_GLSL}

void main() {
  vec3 n = normalize(vNormal);
  // Uma raiz é redonda: a normal não decide papel de piso ou teto. O papel
  // "parede" (raspão) é o que dá a ela a luz de lado que desenha o volume.
  vec3 role = normalize(vec3(n.x, n.y * 0.3, n.z));
  vec3 color = shadeConcrete(vWorld, role, n, 0.0, vViewDepth);
  // **A ponta viva.** O último quinto de cada raiz tem luz própria fraca, que
  // respira devagar — o organismo emite, a estrutura não. É o que as deixa
  // existir na câmara escura sem que a parede acenda.
  float tip = smoothstep(0.72, 1.0, vAlong);
  float breath = 0.65 + 0.35 * sin(uTime * 0.7 + vWorld.z * 1.3 + vWorld.y);
  float veil = 1.0 - exp(-uFogDensity * max(vViewDepth, 0.0));
  color += uTip * tip * breath * 0.9 * (1.0 - veil);
  fragColor = vec4(color, 1.0);
}
`;

export function Roots({ shared, plan }: { shared: SharedUniforms; plan: ChamberPlan }) {
  const { geometry, material } = useMemo(() => {
    // Madeira escura: --abyss puxado para o --peach, bem pouco.
    const bark = shared.abyss.value.clone().lerp(shared.peach.value, 0.035).multiplyScalar(1.4);
    const material = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uWallColor: { value: new Color().copy(bark) },
        uTip: shared.cyan,
        uCyan: shared.cyan,
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: true,
      transparent: false,
      toneMapped: false,
    });
    material.glslVersion = GLSL3;
    return { geometry: buildRoots(plan), material };
  }, [shared, plan]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <mesh geometry={geometry} material={material} />;
}
