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
uniform vec2 uPlanet;
uniform vec3 uTeal;
uniform vec3 uMist;
varying vec3 vWorld;

${FOG_GLSL}

void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  // O horizonte é a cor da névoa distante, e ele fecha para o fundo acima:
  // três paradas com ruído, sem linha onde o terreno acaba.
  vec3 horizon = fogBaseAt(120.0, cameraPosition + dir * 120.0);
  float n = sceneNoise(dir * 3.2 + vec3(0.0, uTime * 0.004, 0.0));
  float up = smoothstep(-0.04, 0.42, dir.y + (n - 0.5) * 0.12);
  vec3 color = mix(horizon, mix(uAbyss, uVoid, 0.55), up);
  color = mix(color, uVoid, smoothstep(0.3, 0.9, dir.y));
  // No fim da trilha a noite fecha um pouco em cima, e o fundo ganha uma
  // claridade pálida rente ao horizonte, só do lado do planeta: atrás do texto
  // o céu fica escuro, para o véu de leitura não ter o que apagar.
  float az = atan(dir.x, -dir.z);
  float toward = az - atan(uAstroDir.x, -uAstroDir.z);
  color *= 1.0 - 0.3 * uAstro;
  vec3 pale = mix(uCyan, uRose, 0.4) * 0.5 + 0.35;
  color += pale * 0.12 * exp(-max(dir.y + 0.14, 0.0) * 7.0) * smoothstep(-0.12, 0.18, toward) * uAstro;

  // O planeta: uma esfera grande e distante, meio encoberta pelo horizonte.
  // A luz é rosa, de um lado só. Do outro, a sombra se confunde com o céu e
  // guarda um resto do azul das serras, quase imperceptível.
  // A base some na névoa, como tudo que está longe.
  float away = acos(clamp(dot(dir, uAstroDir), -1.0, 1.0));
  float radius = uPlanet.y;
  if (uPlanet.x > 0.001 && away < radius * 2.0) {
    float disc = 1.0 - smoothstep(radius - 0.003, radius + 0.003, away);
    // A normal da esfera vista de frente.
    vec3 side = normalize(cross(uAstroDir, vec3(0.0, 1.0, 0.0)));
    vec3 top = cross(side, uAstroDir);
    vec2 p = vec2(dot(dir, side), dot(dir, top)) / sin(radius);
    vec3 normal = vec3(p, sqrt(max(1.0 - dot(p, p), 0.0)));
    // A luz rosa vem de cima, à direita; a azul, de baixo, à esquerda. Nenhuma
    // tem linha de sombra: uma vai cedendo para a outra ao longo da esfera.
    vec3 sun = normalize(vec3(0.62, 0.55, 0.56));
    vec3 sky = normalize(vec3(-0.8, -0.3, 0.52));
    float lit = smoothstep(-0.3, 0.85, dot(normal, sun));
    float fill = smoothstep(-0.2, 1.0, dot(normal, sky));
    vec3 blue = uCyan * vec3(0.5, 0.78, 1.05);

    // As faixas: ruído esticado ao longo dos paralelos, num eixo inclinado,
    // girando tão devagar que só se nota de uma visita para a outra.
    vec2 q = mat2(0.94, 0.34, -0.34, 0.94) * p;
    float lon = atan(q.x, normal.z) + uTime * 0.003;
    float bend = sceneNoise(vec3(lon * 1.3, q.y * 3.0, 7.0)) - 0.5;
    float bands = sceneNoise(vec3(lon * 0.5 + 4.0, (q.y + bend * 0.1) * 9.0, 2.0)) * 0.65
      + sceneNoise(vec3(lon * 1.7, (q.y + bend * 0.16) * 24.0, 5.0)) * 0.35;
    float tone = 0.45 + 0.55 * smoothstep(0.2, 0.8, bands);

    // A esfera escurece para a borda: é o que a faz ter volume.
    float round = 0.5 + 0.5 * normal.z;
    // A sombra é quase a cor do céu; o azul nela é só um resto, não uma luz.
    vec3 body = mix(color * 0.75, mix(uRose, uMist, 0.12) * tone * round, lit);
    body += blue * (0.02 + 0.03 * tone) * fill * (1.0 - lit) * round;
    // A atmosfera: um fio na borda, da cor da luz que bate ali.
    float rim = pow(1.0 - normal.z, 4.0);
    body += (mix(uRose, uMist, 0.45) * 0.55 * lit + blue * 0.1 * fill * (1.0 - lit)) * rim;
    // Está longe: o ar fica entre ele e a câmera.
    body = mix(body, color, 0.24);
    float sunk = smoothstep(-0.1, 0.06, dir.y) * uPlanet.x;
    color = mix(color, body, disc * sunk);
    // O halo logo fora da borda: rosa do lado da luz, azul do outro, fino.
    vec2 out2 = normalize(p + 1e-5);
    float warmSide = smoothstep(-0.3, 0.8, dot(out2, normalize(sun.xy)));
    float glow = exp(-max(away - radius, 0.0) * 34.0) * (1.0 - disc) * sunk;
    color += (uRose * 0.16 * warmSide + blue * 0.015 * (1.0 - warmSide)) * glow;
  }

  // As serras ao longe, do lado oposto ao planeta: duas cristas frias, da cor
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
  float chosen = step(0.7, arcHash(vec3(seed, floor(uTime * 0.6), 1.0)));
  float flicker = step(0.55, arcHash(vec3(seed, beat, 2.0)));
  vec4 view = viewMatrix * vec4(world, 1.0);
  vAlpha = uStorm * chosen * flicker * exp(-uFogDensity * 0.35 * max(-view.z, 0.0));
  gl_Position = vAlpha <= 0.001 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * view;
}
`;

export const ARC_FRAG = /* glsl */ `
uniform vec3 uRose;
varying float vAlpha;

void main() {
  gl_FragColor = vec4(mix(uRose, vec3(1.0), 0.5) * 1.7 * vAlpha, 1.0);
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
  float phase = fract(aPhase);
  float blink = phase > 0.5 ? 0.55 + 0.45 * step(0.5, fract(uTime * 0.35 + phase)) : 1.0;
  vAlpha = blink * exp(-uFogDensity * 0.45 * depth);
  // As dos pórticos (fase acima de 1) escurecem de longe junto com as placas.
  if (aPhase > 1.0) vAlpha *= 1.0 - 0.72 * smoothstep(14.0, 60.0, depth);
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
