"use client";

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Sphere,
  Vector3,
} from "three";
import { LAMP_COUNT } from "@/lib/scene/lamps";
import { FOG_UNIFORMS_GLSL } from "@/lib/scene/shaders/fog";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";

/**
 * O corpo visível das lanternas (rodada 15): um punhado de pontos de luz em
 * volta de cada uma, rente à superfície em que ela anda. A luz que elas jogam
 * no concreto é `lampLight`, em `shaders/lights.ts`; isto é só quem a emite.
 *
 * Cada ponto gira devagar em volta do centro da lanterna, no plano da
 * superfície, e sobe e desce um pouco: um organismo pequeno respirando, não um
 * holofote. Gaussianos e aditivos, sem escrever profundidade — são luz, não
 * coisa.
 */
const MOTES_PER_LAMP = 44;

const VERT = /* glsl */ `
uniform vec4 uLamps[${LAMP_COUNT}];
uniform vec3 uLampNormal[${LAMP_COUNT}];
uniform vec3 uLampColor[${LAMP_COUNT}];
uniform float uTime;
uniform vec2 uResolution;

in float aLamp;
in vec3 aSeed;

out vec2 vQuad;
out vec3 vColor;
out float vViewDepth;

void main() {
  int i = int(aLamp + 0.5);
  vec4 lamp = uLamps[i];
  vec3 n = uLampNormal[i];
  vec3 t1 = normalize(cross(n, vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
  vec3 t2 = vec3(0.0, 0.0, 1.0);

  // Um disco de raio ~0.9, mais denso no centro, girando devagar.
  float r = 0.08 + 0.85 * aSeed.x * aSeed.x;
  float a = aSeed.y * 6.2832 + uTime * (0.15 + 0.35 * aSeed.z) * (aSeed.z < 0.5 ? -1.0 : 1.0);
  float lift = 0.03 + 0.22 * aSeed.z * (0.6 + 0.4 * sin(uTime * 0.9 + aSeed.y * 20.0));
  vec3 world = lamp.xyz + t1 * cos(a) * r + t2 * sin(a) * r * 1.6 + n * lift;

  vec4 view = viewMatrix * vec4(world, 1.0);
  vViewDepth = -view.z;
  vec4 clip = projectionMatrix * view;

  // Um ponto de 5 a 11 px do buffer (uResolution é o buffer, não o CSS),
  // independente da distância até perto da lente.
  float px = mix(7.0, 15.0, fract(aSeed.x * 13.7)) * smoothstep(0.8, 3.0, vViewDepth);
  float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + 2.0 * aSeed.z) + aSeed.y * 40.0);
  vColor = uLampColor[i] * lamp.w * twinkle * (3.6 - 2.2 * aSeed.x);
  vQuad = position.xy;
  vec2 offset = position.xy * px / uResolution * clip.w * 2.0;
  gl_Position = clip + vec4(offset * step(0.001, lamp.w), 0.0, 0.0);
}
`;

const FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}

in vec2 vQuad;
in vec3 vColor;
in float vViewDepth;

out vec4 fragColor;

void main() {
  float g = exp(-3.5 * dot(vQuad, vQuad));
  if (g < 0.02) discard;
  // Aditivo através da névoa: o que atravessa é a parte não velada.
  float veil = 1.0 - exp(-uFogDensity * max(vViewDepth, 0.0));
  fragColor = vec4(vColor * g * (1.0 - veil), 1.0);
}
`;

/**
 * A aura do cursor (rodada 17): uma mancha gaussiana quente, larga e fraca, no
 * ponto em que a luz do cursor mora. Sem ela a luz acendia o bando e a parede
 * sem origem visível; com ela, lê-se que é a mão iluminando a câmara.
 */
const AURA_VERT = /* glsl */ `
uniform vec4 uPointer;
uniform vec2 uResolution;
out vec2 vQuad;
out float vViewDepth;
void main() {
  vec4 view = viewMatrix * vec4(uPointer.xyz, 1.0);
  vViewDepth = -view.z;
  vec4 clip = projectionMatrix * view;
  vQuad = position.xy;
  // ~160 px do buffer de raio: uma luz no ar, não um disco.
  vec2 offset = position.xy * 160.0 / uResolution * clip.w * 2.0;
  gl_Position = clip + vec4(offset * step(0.001, uPointer.w), 0.0, 0.0);
}
`;

const AURA_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform vec4 uPointer;
uniform vec3 uPointerColor;
in vec2 vQuad;
in float vViewDepth;
out vec4 fragColor;
void main() {
  float r2 = dot(vQuad, vQuad);
  float g = exp(-5.0 * r2) * 0.12 + exp(-40.0 * r2) * 0.18;
  if (g < 0.002) discard;
  fragColor = vec4(uPointerColor * g * uPointer.w, 1.0);
}
`;

export function Lamps({ shared }: { shared: SharedUniforms }) {
  const { geometry, material, aura, auraGeometry } = useMemo(() => {
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const count = LAMP_COUNT * MOTES_PER_LAMP;
    const lamp = new Float32Array(count);
    const seed = new Float32Array(count * 3);
    let state = 0x1a2b3c;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let k = 0; k < count; k += 1) {
      lamp[k] = Math.floor(k / MOTES_PER_LAMP);
      seed.set([random(), random(), random()], k * 3);
    }
    geometry.setAttribute("aLamp", new InstancedBufferAttribute(lamp, 1));
    geometry.setAttribute("aSeed", new InstancedBufferAttribute(seed, 3));
    geometry.instanceCount = count;
    geometry.boundingSphere = new Sphere(new Vector3(), 1e4);

    const material = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        uLamps: shared.lamps,
        uLampNormal: shared.lampNormal,
        uLampColor: shared.lampColor,
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    material.glslVersion = GLSL3;

    const aura = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        uPointer: shared.pointer,
        uPointerColor: shared.pointerColor,
      },
      vertexShader: AURA_VERT,
      fragmentShader: AURA_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    aura.glslVersion = GLSL3;
    const auraGeometry = new BufferGeometry();
    auraGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
    );
    auraGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    auraGeometry.boundingSphere = new Sphere(new Vector3(), 1e4);
    return { geometry, material, aura, auraGeometry };
  }, [shared]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      aura.dispose();
      auraGeometry.dispose();
    },
    [geometry, material, aura, auraGeometry],
  );

  return (
    <>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
      <mesh geometry={auraGeometry} material={aura} frustumCulled={false} renderOrder={10} />
    </>
  );
}
