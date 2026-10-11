import { HEIGHT_GLSL } from "../terrain";
import { FOG_GLSL, FOG_UNIFORMS_GLSL, NOISE_GLSL } from "./fog";
import { WIND_GLSL } from "./wind";

/**
 * Os esporos e o pólen: partículas com estado, simuladas na GPU.
 *
 * Cada texel de duas texturas de ponto flutuante é uma partícula: posição e
 * vida numa, velocidade e cor na outra. Uma passada por quadro lê o estado e
 * escreve o seguinte; os pontos leem o resultado pelo `gl_VertexID`.
 *
 * São duas famílias no mesmo desenho. Os **esporos** são os de sempre, soltos
 * no ar em volta da câmera, agora levados pelo vento. O **pólen** nasce na
 * cabeça de uma flor acesa, sobe quente e esfria; longe das flores ele é
 * poeira, que só aparece onde a luz delas chega.
 */

/** O lado da textura de estado: 256 × 256 partículas. */
export const SPORE_SIZE = 256;
/** A largura da textura das cabeças de flor. */
export const HEADS_WIDTH = 128;

/** Quanto cada partícula vive, pelo texel dela. O mesmo nas duas pontas. */
const LIFE_GLSL = /* glsl */ `
float sporeRnd(vec2 cell, float salt) {
  vec3 p = fract(vec3(cell.xyx) * vec3(0.1031, 0.1030, 0.0973) + salt * 0.61803);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float sporeLifetime(vec2 cell, bool classic) {
  float r = sporeRnd(cell, 1.0);
  return classic ? mix(14.0, 30.0, r) : mix(6.0, 18.0, r);
}
`;

export const SPORE_SIM_FRAG = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uHeads;
uniform vec2 uHeadRange;
uniform float uHeadShare;
uniform vec3 uCenter;
uniform vec3 uEye;
uniform vec3 uEyeVelocity;
uniform float uDelta;
uniform float uTime;
uniform float uFrame;
uniform float uInit;
uniform float uClassic;

layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;

${NOISE_GLSL}
${HEIGHT_GLSL}
${WIND_GLSL}
${LIFE_GLSL}

// O volume em que um esporo nasce solto, e até onde ele continua vivo.
const vec3 BOX = vec3(64.0, 18.0, 76.0);
const vec3 KEEP = vec3(44.0, 16.0, 52.0);

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  ivec2 at = ivec2(cell);
  vec4 state = texelFetch(uPos, at, 0);
  vec4 motion = texelFetch(uVel, at, 0);

  bool classic = cell.y * ${SPORE_SIZE}.0 + cell.x < uClassic;
  float seed = sporeRnd(cell, 0.0);
  float lifetime = sporeLifetime(cell, classic);

  vec3 pos = state.xyz;
  vec3 vel = motion.xyz;
  float warm = motion.w;
  float life = state.w - uDelta;

  vec3 away = abs(pos - uCenter);
  bool gone = away.x > KEEP.x || away.y > KEEP.y || away.z > KEEP.z;

  if (uInit > 0.5 || life <= 0.0 || gone) {
    float salt = uFrame * 0.731 + 0.37;
    vec3 r = vec3(sporeRnd(cell, salt), sporeRnd(cell, salt + 1.0), sporeRnd(cell, salt + 2.0));
    // Solto no ar, em volta da câmera. O negativo marca quem não veio de flor.
    pos = uCenter + (r - 0.5) * BOX;
    warm = -1.0;
    if (!classic && uHeadRange.y > 0.5 && sporeRnd(cell, salt + 3.0) < uHeadShare) {
      // Três sorteios: fica a primeira flor perto o bastante para o pólen
      // dela ser visto. Mancha larga tem flor que a câmera nem alcança.
      for (int tries = 0; tries < 3; tries++) {
        float k = uHeadRange.x + floor(sporeRnd(cell, salt + 4.0 + float(tries)) * uHeadRange.y);
        vec4 head = texelFetch(uHeads, ivec2(int(mod(k, ${HEADS_WIDTH}.0)), int(k / ${HEADS_WIDTH}.0)), 0);
        vec2 reach = head.xz - uEye.xz;
        if (dot(reach, reach) < 40.0 * 40.0) {
          pos = head.xyz + (r - 0.5) * vec3(0.5, 0.3, 0.5);
          warm = head.w;
          break;
        }
      }
    }
    pos.y = max(pos.y, terrainHeight(pos.xz) + 0.25);
    // O pólen sai da flor para cima; o resto já nasce no passo do ar.
    vel = warm < 0.0 ? windVelocity(pos, uTime) : vec3(0.0, 0.18 + 0.25 * seed, 0.0);
    life = lifetime;

    if (uInit > 0.5) {
      // A partida: idades espalhadas pela vida inteira, e o pólen já levado
      // pelo ar o tempo que tem de idade. Sem isto a primeira leva nasceria
      // e morreria junta, numa onda.
      float age = sporeRnd(cell, 7.0) * lifetime;
      life = lifetime - age;
      if (warm >= 0.0) {
        vec3 jitter = vec3(sporeRnd(cell, 8.0), sporeRnd(cell, 9.0), sporeRnd(cell, 10.0)) - 0.5;
        pos += vec3(0.45, 0.1, 0.24) * age + jitter * sqrt(age) * 1.3;
        pos.y = max(pos.y, terrainHeight(pos.xz) + 0.25);
        vel = windVelocity(pos, uTime);
      }
    }
  } else {
    vec3 air = windVelocity(pos, uTime);
    // Leves: sobem devagar.
    air.y += 0.07 + 0.07 * seed;
    // A câmera arrasta o ar por onde passa.
    vec3 fromEye = pos - uEye;
    air += uEyeVelocity * 0.5 * exp(-dot(fromEye, fromEye) / 9.0);
    // Arrasto: a partícula persegue o ar, não o copia. É a inércia dela.
    vel += (air - vel) * (1.0 - exp(-uDelta * 1.4));
    pos += vel * uDelta;
    float ground = terrainHeight(pos.xz) + 0.06;
    if (pos.y < ground) {
      pos.y = ground;
      vel.y = max(vel.y, 0.0);
    }
  }

  outPos = vec4(pos, life);
  outVel = vec4(vel, warm);
}
`;

export const SPORE_VERT = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform vec2 uResolution;
uniform vec4 uVeilBox[8];
uniform float uVeilF[8];
uniform vec4 uPanelRect;
uniform float uClassic;
varying vec3 vColor;

${FOG_GLSL}
${LIFE_GLSL}

void main() {
  ivec2 at = ivec2(gl_VertexID % ${SPORE_SIZE}, gl_VertexID / ${SPORE_SIZE});
  vec2 cell = vec2(at);
  vec4 state = texelFetch(uPos, at, 0);
  float warm = texelFetch(uVel, at, 0).w;
  bool classic = float(gl_VertexID) < uClassic;
  float seed = sporeRnd(cell, 0.0);
  float age = sporeLifetime(cell, classic) - state.w;
  vec3 world = state.xyz;

  vec4 view = viewMatrix * vec4(world, 1.0);
  float depth = -view.z;
  vec4 clip = projectionMatrix * view;
  vec2 ndc = clip.xy / max(clip.w, 1e-4);
  vec2 uv = ndc * 0.5 + 0.5;

  // Nas bordas e no fundo do quadro: perto da lente só fora do centro.
  float border = smoothstep(0.3, 0.8, max(abs(ndc.x), abs(ndc.y)));
  float alpha = mix(border, 1.0, smoothstep(14.0, 34.0, depth));
  alpha *= smoothstep(3.0, 8.0, depth) * (1.0 - smoothstep(48.0, 62.0, depth));
  // Nunca sobre texto ou navegação: as mesmas caixas do véu de legibilidade.
  for (int i = 0; i < 8; i++) {
    if (uVeilF[i] <= 0.0) continue;
    vec2 d = max(uVeilBox[i].xy - uv, uv - uVeilBox[i].zw);
    alpha *= smoothstep(0.0, 0.05, max(d.x, d.y));
  }
  // Nem sobre o painel: o retângulo dele na tela, com uma margem.
  if (uPanelRect.z > uPanelRect.x) {
    vec2 d = max(uPanelRect.xy - uv, uv - uPanelRect.zw);
    alpha *= smoothstep(0.0, 0.04, max(d.x, d.y));
  }
  alpha *= exp(-uFogDensity * 0.5 * depth);
  // Nasce e morre aos poucos: ninguém aparece nem some de repente.
  alpha *= smoothstep(0.0, 1.4, age) * smoothstep(0.0, 2.2, state.w);

  float size;
  if (classic) {
    vColor = uCyan * 0.85 * alpha * uGlow * (0.4 + 0.6 * sporeRnd(cell, 3.0));
    size = clamp(uResolution.y * (0.045 + 0.05 * seed) / max(depth, 1.0), 1.0, uResolution.y * 0.007);
  } else {
    // O pólen sai aceso da flor, na cor dela, e esfria. O que sobra dele, e
    // a poeira que nunca foi flor, só aparece onde a luz das flores chega.
    vec3 hue = mix(uCyan, uRose, max(warm, 0.0));
    float ember = step(0.0, warm) * 2.4 * exp(-age * 0.4);
    vec3 lit = floraGlow(world) * 0.05;
    // De longe o pólen é menor que um pixel: somado, viraria um véu leitoso
    // sobre as flores. Ele existe perto, onde se vê cada grão.
    float near = 1.0 - smoothstep(20.0, 38.0, depth);
    vColor = (hue * ember * uGlow + lit) * alpha * near * (0.5 + 0.5 * seed);
    size = clamp(uResolution.y * (0.03 + 0.03 * seed) / max(depth, 1.0), 1.5, uResolution.y * 0.005);
  }

  gl_PointSize = size;
  gl_Position = alpha <= 0.001 ? vec4(2.0, 2.0, 2.0, 1.0) : clip;
}
`;

export const SPORE_FRAG = /* glsl */ `
varying vec3 vColor;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  // Disco de borda suave.
  float soft = exp(-d * 3.2) * (1.0 - smoothstep(0.7, 1.0, d));
  gl_FragColor = vec4(vColor * soft, 1.0);
}
`;
