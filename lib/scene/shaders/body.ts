import { OUTSIDE_GLSL } from "./chamber";
import { FOG_UNIFORMS_GLSL } from "./fog";

/**
 * **Os esporos** (rodada 19) — o organismo, depois de oito rodadas de lascas.
 *
 * Até a rodada 18 cada corpo era uma lasca lenticular orientada pela
 * velocidade, com um halo gaussiano por cima. Lido em movimento, o bando era um
 * cardume — "peixes mortos", nas palavras do Lucas. Com o activetheory.net
 * como referência de nível, o organismo passou a ser **esporos luminosos**:
 * orbes redondos de tamanhos muito variados, com núcleo quente, que perto da
 * lente viram discos grandes e translúcidos de bokeh.
 *
 * ## O esporo é um sprite, e o bokeh é dele
 *
 * Um quad por esporo, voltado para a tela. O raio na tela é o maior de dois:
 * o do próprio esporo projetado e o **círculo de confusão** na profundidade
 * dele, pela mesma conta de `cocFromDepth` do compositor. Em foco, um ponto
 * com núcleo; fora de foco, um disco com a borda um pouco mais acesa, que é
 * como uma lente desenha uma fonte pequena. A intensidade cai com a área do
 * disco, com um piso, para o disco grande continuar visível.
 *
 * **Os esporos não passam pela DOF da cena.** Aditivos e sem profundidade,
 * eles seriam borrados pela profundidade do fundo — que no vazio é o infinito.
 * Então eles moram na camada dos sprites (`SPRITE_LAYER`): o compositor os
 * desenha num alvo à parte, depois da cena, e os soma depois da DOF. O teste
 * de profundidade contra a cena é feito aqui, à mão, com a textura de
 * profundidade dela: um esporo atrás de uma peça some suave, não recortado.
 *
 * A simulação (`boids.ts`) não mudou: o que o Lucas via como peixe era a forma
 * e a orientação, não o movimento.
 */

/**
 * O matiz de cada esporo: sorteio estável da paleta, agora com violeta e
 * magenta (a cor como massa, decisão de 2026-09-30). Frios e violetas pesam
 * mais; os quentes existem como parte da massa, não como evento.
 */
export const SPORE_HUE_WEIGHTS = [0.24, 0.17, 0.18, 0.14, 0.1, 0.11, 0.06] as const;

const cumulative = SPORE_HUE_WEIGHTS.reduce<number[]>(
  (acc, w) => [...acc, (acc[acc.length - 1] ?? 0) + w],
  [],
);

const SPORE_HUE_GLSL = /* glsl */ `
vec3 sporeHue(float h) {
  if (h < ${cumulative[0]!.toFixed(3)}) return uTeal;
  if (h < ${cumulative[1]!.toFixed(3)}) return uCyan;
  if (h < ${cumulative[2]!.toFixed(3)}) return uViolet;
  if (h < ${cumulative[3]!.toFixed(3)}) return uMagenta;
  if (h < ${cumulative[4]!.toFixed(3)}) return uRose;
  if (h < ${cumulative[5]!.toFixed(3)}) return uPeach;
  return uCoral;
}
`;

/** O raio de mundo de um esporo médio. Os grandes (6%) têm 2.6×. */
export const SPORE_SCALE = 0.07;

export const SPORE_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uSporeScale;
uniform float uForming;
uniform float uTime;
/** O tamanho do buffer em pixels (o alvo dos sprites tem o mesmo). */
uniform vec2  uResolution;
uniform float uFocus;
uniform float uFocusRange;
uniform float uAperture;
uniform float uNearBlur;

in vec2 aRef;

out vec2  vQuad;
out vec3  vWorld;
out float vViewDepth;
out float vEnergy;
out float vDensity;
out float vSharp;
out float vAmount;
out float vPulse;
flat out float vHue;

void main() {
  vec4 P = texture(uPos, aRef);
  vec4 V = texture(uVel, aRef);
  vec3 center = P.xyz;
  vDensity = P.w;
  vEnergy = V.w;

  // Sorteios estáveis: admissão (a população cresce com o bando se formando),
  // matiz e tamanho, cada um de um hash diferente.
  float lot = fract(sin(dot(aRef, vec2(12.9898, 78.233))) * 43758.5453);
  vHue = fract(sin(dot(aRef, vec2(39.3468, 11.1351))) * 24634.6345);
  float sizeLot = fract(sin(dot(aRef, vec2(7.123, 91.77))) * 17231.113);
  float admit = step(lot, 0.035 + 0.965 * pow(uForming, 2.5));
#ifdef PROBE_SUBSET
  admit *= step(fract(lot * 97.13), 1.0 / float(PROBE_SUBSET));
#endif
  // Quem saiu pela tomada de ar está estacionado longe de tudo (boids.ts).
  float alive = step(-400.0, center.y);

  // Uma deriva browniana só no desenho: o esporo flutua em volta de onde a
  // simulação o pôs, sem mexer na simulação.
  center += 0.05 * vec3(
    sin(uTime * 0.71 + lot * 40.0),
    sin(uTime * 0.53 + lot * 23.0),
    sin(uTime * 0.61 + lot * 31.0)
  );
  vWorld = center;
  vPulse = 0.72 + 0.28 * sin(uTime * (0.5 + 0.9 * sizeLot) + lot * 20.0);

  vec4 view = viewMatrix * vec4(center, 1.0);
  float depth = max(-view.z, 0.05);
  vViewDepth = depth;
  vec4 clip = projectionMatrix * view;

  float big = step(0.94, sizeLot);
  float radius = uSporeScale * mix(0.5, 1.0, sizeLot) * mix(1.0, 2.6, big);
  float focalPx = projectionMatrix[1][1] * 0.5 * uResolution.y;
  float corePx = max(radius * focalPx / depth, 1.1);

  // O círculo de confusão, pela mesma forma de cocFromDepth (shaders/post.ts).
  float far = clamp(abs(depth - uFocus) / uFocusRange, 0.0, 1.0) * uAperture;
  float nearC = 0.3 * uNearBlur * (1.0 - smoothstep(0.6, 2.5, depth));
  float cocPx = max(far, nearC) * 0.045 * uResolution.y;
  float px = min(max(corePx, cocPx), 0.07 * uResolution.y);
  vSharp = clamp(corePx / px, 0.0, 1.0);

  // A energia se espalha pela área do disco, com um piso: o disco grande de
  // bokeh continua lá, fraco, como no activetheory.net.
  float spread = clamp(pow(vSharp, 1.6), 0.06, 1.0);
  vAmount = spread * admit * alive * smoothstep(0.35, 1.6, depth);

  vQuad = position.xy;
  vec2 offset = position.xy * px * 2.0 / uResolution * clip.w;
  gl_Position = clip + vec4(offset * step(1e-4, vAmount), 0.0, 0.0);
}
`;

export const SPORE_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}

uniform vec3  uTeal;
uniform vec3  uCyan;
uniform vec3  uRose;
uniform vec3  uCoral;
uniform vec3  uMist;
uniform vec3  uViolet;
uniform vec3  uMagenta;
uniform vec4  uPointer;
uniform vec3  uPointerColor;
uniform float uSpecimenZ;
uniform float uGain;
uniform float uFormingFrag;
uniform sampler2D uSceneDepth;
uniform float uCameraNear;
uniform float uCameraFar;

in vec2  vQuad;
in vec3  vWorld;
in float vViewDepth;
in float vEnergy;
in float vDensity;
in float vSharp;
in float vAmount;
in float vPulse;
flat in float vHue;

out vec4 fragColor;

${OUTSIDE_GLSL}
${SPORE_HUE_GLSL}

float sceneDepthAt(vec2 uv) {
  float d = texture(uSceneDepth, uv).x;
  float ndc = d * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - ndc * (uCameraFar - uCameraNear));
}

void main() {
  float r = length(vQuad);
  if (r > 1.0 || vAmount <= 0.0) discard;

  // Em foco: núcleo gaussiano. Fora de foco: disco com a borda um pouco mais
  // acesa. A mistura é pela nitidez do próprio esporo.
  float gauss = exp(-r * r * 5.0);
  float disc = (1.0 - smoothstep(0.82, 1.0, r)) * (0.7 + 0.45 * smoothstep(0.5, 0.95, r));
  float shape = mix(disc, gauss, vSharp);

  // O teste de profundidade contra a cena, suave: atrás de uma peça, o esporo
  // some em alguns centímetros, não num recorte.
  float scene = sceneDepthAt(gl_FragCoord.xy / uResolution);
  float visible = smoothstep(-0.25, 0.15, scene - vViewDepth);
  if (visible <= 0.0) discard;

  // A cor: o matiz do esporo, com o núcleo puxado para o peach quando está em
  // foco — a brasa no centro de um orbe.
  vec3 hue = sporeHue(vHue);
  hue = mix(hue, mix(hue, uMist, 0.35), smoothstep(0.18, 0.85, vEnergy));
  vec3 color = mix(hue, mix(hue, uPeach, 0.55), vSharp * (1.0 - smoothstep(0.0, 0.45, r)));

  // Coral só na turbulência da esteira do LRC, como sempre foi.
  float downstream = vWorld.z - uSpecimenZ;
  float wake = smoothstep(0.0, 2.2, downstream) * (1.0 - smoothstep(2.2, 16.0, downstream));
  color = mix(color, uCoral, wake * smoothstep(0.30, 0.75, vEnergy) * 0.7);

  // O brilho segue a densidade (a onda do bando) e pulsa devagar.
  // Aditivo, o esporo soma com os vizinhos: a rampa de densidade é mais curta
  // que a das lascas, senão o poleiro satura em branco.
  float crowd = mix(2.4, 0.5 + 0.55 * smoothstep(0.02, 0.10, vDensity), smoothstep(0.15, 0.6, uFormingFrag));
  float energy = uGain * (0.6 + 0.8 * vEnergy) * crowd * vPulse;
  vec3 lit = color * energy * (1.0 + 1.2 * uOutside);

  if (uOutside > 0.0) {
    lit += uPeach * louverOpen(vWorld) * uOutside * 1.6;
  }
  if (uPointer.w > 0.0) {
    float near = 1.0 - smoothstep(0.0, 6.0, distance(vWorld, uPointer.xyz));
    lit = mix(lit, lit * 0.5 + uPointerColor * 2.4, uPointer.w * near * near);
  }

  // Através da névoa: a parte não velada chega à lente.
  float density = uFogDensity * mix(1.0, 0.55, uDawn);
  lit *= exp(-density * vViewDepth * 0.8);

  fragColor = vec4(lit * shape * vAmount * visible, 1.0);
}
`;
