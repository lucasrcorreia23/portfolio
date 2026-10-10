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

const vec3 MOON_DIR = normalize(vec3(-0.216, 0.13, -0.968));

void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  // O horizonte é a cor da névoa distante, e ele fecha para o fundo acima:
  // três paradas com ruído, sem linha onde o terreno acaba.
  vec3 horizon = fogColorAt(120.0, cameraPosition + dir * 120.0);
  float n = sceneNoise(dir * 3.2 + vec3(0.0, uTime * 0.004, 0.0));
  float up = smoothstep(-0.04, 0.42, dir.y + (n - 0.5) * 0.12);
  vec3 color = mix(horizon, mix(uAbyss, uVoid, 0.55), up);
  color = mix(color, uVoid, smoothstep(0.3, 0.9, dir.y));
  // No fim da trilha a noite fecha um pouco em cima, e o fundo ganha uma
  // claridade pálida rente ao horizonte, só do lado do astro: atrás do texto
  // o céu fica escuro, para o véu de leitura não ter o que apagar.
  float az = atan(dir.x, -dir.z);
  color *= 1.0 - 0.3 * uAstro;
  vec3 pale = mix(uCyan, uRose, 0.4) * 0.5 + 0.35;
  color += pale * 0.12 * exp(-max(dir.y + 0.14, 0.0) * 7.0) * smoothstep(0.2, 0.5, az) * uAstro;

  // O astro do fim da trilha: um crescente rosa com a borda fria, nascendo
  // atrás do horizonte. A base dele some na névoa, como tudo que está longe.
  float away = acos(clamp(dot(dir, ASTRO_DIR), -1.0, 1.0));
  float radius = 0.15;
  float disc = 1.0 - smoothstep(radius - 0.004, radius + 0.004, away);
  // A normal da esfera vista de frente, para a luz vir de um lado só.
  vec3 side = normalize(cross(ASTRO_DIR, vec3(0.0, 1.0, 0.0)));
  vec3 top = cross(side, ASTRO_DIR);
  vec2 p = vec2(dot(dir, side), dot(dir, top)) / sin(radius);
  vec3 normal = vec3(p, sqrt(max(1.0 - dot(p, p), 0.0)));
  vec3 sun = normalize(vec3(0.7, 0.6, 0.1));
  float lit = smoothstep(0.05, 0.9, dot(normal, sun));
  float bands = sceneNoise(vec3(p.x * 1.4, p.y * 6.0, 3.0) + normal * 1.5);
  vec3 body = mix(color * 0.7, uRose * (0.55 + 0.45 * bands), lit);
  body += uCyan * 1.3 * pow(1.0 - normal.z, 3.0) * (0.12 + 0.88 * lit);
  // Está longe: o ar fica entre ele e a câmera.
  body = mix(body, color, 0.22);
  float sunk = smoothstep(-0.1, 0.06, dir.y);
  color = mix(color, body, disc * sunk * uAstro);
  // O halo: fino, logo fora da borda.
  color += uRose * 0.2 * exp(-max(away - radius, 0.0) * 22.0) * (1.0 - disc) * sunk * uAstro;

  // A lua: muito ao fundo, quase da cor do céu, como uma sombra nele. Um
  // resto da luz azul da flora vaza por trás, de um lado só.
  float moonAway = acos(clamp(dot(dir, MOON_DIR), -1.0, 1.0));
  float moonRadius = 0.028;
  float moon = 1.0 - smoothstep(moonRadius - 0.003, moonRadius + 0.003, moonAway);
  vec3 moonSide = normalize(cross(MOON_DIR, vec3(0.0, 1.0, 0.0)));
  vec2 q = vec2(dot(dir, moonSide), dot(dir, cross(moonSide, MOON_DIR)));
  float lean = max(dot(normalize(q + 1e-5), normalize(vec2(0.6, 0.8))), 0.0);
  color += uCyan * 0.022 * lean * exp(-max(moonAway - moonRadius, 0.0) * 70.0) * uAstro;
  color = mix(color, color * 0.66, moon * uAstro);

  // As serras ao longe, do lado oposto ao astro: duas cristas frias, da cor
  // da flora, com o ar aceso por cima. A base delas também some na névoa.
  // A altura é fixa: o que cresce com a chegada é o quanto a névoa as deixa ver.
  float reach = smoothstep(0.14, -0.5, az);
  float cold = reach * uAstro;
  float ridgeA = sceneNoise(vec3(az * 5.0, 1.7, 0.0)) * 0.62 + sceneNoise(vec3(az * 19.0, 4.1, 0.0)) * 0.26
    + sceneNoise(vec3(az * 53.0, 8.4, 0.0)) * 0.12;
  float ridgeB = sceneNoise(vec3(az * 8.0 + 9.0, 6.3, 0.0)) * 0.6 + sceneNoise(vec3(az * 31.0, 2.2, 0.0)) * 0.28
    + sceneNoise(vec3(az * 71.0, 5.5, 0.0)) * 0.12;
  float crestA = -0.16 + 0.34 * ridgeA * reach;
  float crestB = -0.16 + 0.19 * ridgeB * reach;
  vec3 blue = uCyan * vec3(0.5, 0.78, 1.05);
  color += blue * 0.05 * exp(-max(dir.y - crestA, 0.0) * 30.0) * cold;
  float inA = smoothstep(crestA + 0.002, crestA - 0.002, dir.y);
  color = mix(color, blue * mix(0.1, 0.05, smoothstep(0.0, 0.2, crestA - dir.y)), inA * cold);
  float inB = smoothstep(crestB + 0.002, crestB - 0.002, dir.y);
  color = mix(color, blue * mix(0.04, 0.015, smoothstep(0.0, 0.14, crestB - dir.y)), inB * cold);

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
