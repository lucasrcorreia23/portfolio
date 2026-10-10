import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * O terreno, o céu e a indústria: o que não emite.
 *
 * A regra da direção está aqui em número: nada destes três passa de ~0.5 em
 * luz linear, então o bloom (limiar 1.05) não os pega. A única luz que eles
 * recebem é a da flora.
 */

export const TERRAIN_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normal;
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const TERRAIN_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform vec3 uTeal;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDepth;

${FOG_GLSL}

void main() {
  vec3 n = normalize(vNormal);
  // O chão é quase preto: o que se lê dele é a relva por cima e a luz da
  // flora que o toca. O ruído é o tapete de relva que a distância não instancia.
  float mat = sceneNoise(vWorld * vec3(0.9, 0.2, 0.9));
  float fine = sceneNoise(vWorld * 4.3);
  vec3 base = mix(uDeep * 0.05, uTeal * 0.09, mat * 0.6 + fine * 0.4);
  float sky = 0.35 + 0.65 * clamp(n.y, 0.0, 1.0);
  vec3 color = base * sky;
  color += floraGlow(vWorld + vec3(0.0, 0.6, 0.0)) * (0.05 + 0.06 * fine);
  gl_FragColor = vec4(applyFog(color, vDepth, vWorld), 1.0);
}
`;

export const SKY_VERT = /* glsl */ `
varying vec3 vWorld;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SKY_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
varying vec3 vWorld;

${FOG_GLSL}

void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  // O horizonte é a cor da névoa distante, e ele fecha para o fundo acima:
  // três paradas com ruído, sem linha onde o terreno acaba.
  vec3 horizon = fogColorAt(120.0, cameraPosition + dir * 120.0);
  float n = sceneNoise(dir * 3.2 + vec3(0.0, uTime * 0.004, 0.0));
  float up = smoothstep(-0.04, 0.42, dir.y + (n - 0.5) * 0.12);
  vec3 color = mix(horizon, mix(uAbyss, uVoid, 0.55), up);
  color = mix(color, uVoid, smoothstep(0.3, 0.9, dir.y));
  gl_FragColor = vec4(color, 1.0);
}
`;

/** A indústria: iluminada por vértice, porque é silhueta. */
export const INDUSTRY_VERT = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform vec3 uTeal;
varying vec3 vColor;

${FOG_GLSL}

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec4 view = viewMatrix * world;
  vec3 n = normalize(normal);
  // Neutra e fosca: duas cores de estrutura, a de cima um passo mais clara.
  vec3 base = mix(uDeep, uTeal, 0.35 + 0.4 * clamp(n.y, 0.0, 1.0)) * 0.34;
  // A flora a alcança de leve, sem cor própria: é reflexo, não emissão.
  base += floraGlow(world.xyz) * 0.035;
  vColor = applyFog(base, -view.z, world.xyz);
  gl_Position = projectionMatrix * view;
}
`;

export const INDUSTRY_FRAG = /* glsl */ `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

/** Quantos segmentos tem cada descarga. */
export const ARC_SEGMENTS = 18;

/**
 * As descargas elétricas: um fio quebrado entre dois pontos altos da
 * indústria, redesenhado várias vezes por segundo e visível só em rajadas.
 * É a única coisa da indústria que acende, e acende em rosa quase branco.
 */
export const ARC_VERT = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform float uStorm;
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec2 aArc;
varying float vAlpha;

float arcHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  float t = aArc.x;
  float seed = aArc.y;
  // O desenho do raio muda em degraus: é o que o faz tremer em vez de ondular.
  float beat = floor(uTime * 22.0);
  vec3 jitter = vec3(
    arcHash(vec3(t * 37.0, seed, beat)),
    arcHash(vec3(t * 53.0, seed + 3.1, beat)),
    arcHash(vec3(t * 71.0, seed + 7.7, beat))
  ) - 0.5;
  float span = length(aTo - aFrom);
  vec3 world = mix(aFrom, aTo, t) + jitter * span * 0.09 * sin(t * 3.14159);
  world.y -= span * 0.05 * sin(t * 3.14159);

  // Cada descarga dispara em algumas rajadas, e pisca dentro delas.
  float chosen = step(0.5, arcHash(vec3(seed, floor(uTime * 0.6), 1.0)));
  float flicker = step(0.35, arcHash(vec3(seed, beat, 2.0)));
  vec4 view = viewMatrix * vec4(world, 1.0);
  vAlpha = uStorm * chosen * flicker * exp(-uFogDensity * 0.35 * max(-view.z, 0.0));
  gl_Position = vAlpha <= 0.001 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * view;
}
`;

export const ARC_FRAG = /* glsl */ `
uniform vec3 uRose;
varying float vAlpha;

void main() {
  gl_FragColor = vec4(mix(uRose, vec3(1.0), 0.5) * 3.2 * vAlpha, 1.0);
}
`;

/** As luzes indicadoras: pontos pequenos, neutros, abaixo do limiar do bloom. */
export const BEACON_VERT = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform vec2 uResolution;
attribute float aPhase;
varying float vAlpha;

void main() {
  vec4 view = viewMatrix * modelMatrix * vec4(position, 1.0);
  float depth = max(-view.z, 0.1);
  // Metade delas pisca devagar, como luz de obstáculo.
  float blink = aPhase > 0.5 ? 0.55 + 0.45 * step(0.5, fract(uTime * 0.35 + aPhase)) : 1.0;
  vAlpha = blink * exp(-uFogDensity * 0.45 * depth);
  gl_PointSize = clamp(uResolution.y * 0.9 / depth, 1.5, uResolution.y * 0.006);
  gl_Position = projectionMatrix * view;
}
`;

export const BEACON_FRAG = /* glsl */ `
uniform vec3 uMist;
varying float vAlpha;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  gl_FragColor = vec4(uMist * 0.6 * vAlpha * (1.0 - d), 1.0);
}
`;
