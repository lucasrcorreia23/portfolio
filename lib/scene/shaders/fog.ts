import { MAX_EMITTERS } from "../uniforms";

/**
 * A névoa e a luz da flora: o chunk que todo material da cena cola.
 *
 * Nenhum material aqui é padrão do three, então a atmosfera não vem do
 * `scene.fog`: é este texto. Um chunk, vários consumidores, nenhuma chance de
 * o ar divergir entre o terreno e a relva.
 *
 * A névoa é escura e tem altura: fecha perto do chão e abre para cima. A única
 * coisa que a acende é a flora, pelo espalhamento ao longo do raio.
 */

export const FOG_UNIFORMS_GLSL = /* glsl */ `
uniform vec3  uVoid;
uniform vec3  uAbyss;
uniform vec3  uDeep;
uniform vec3  uCyan;
uniform vec3  uRose;
uniform float uEmitterWarm[${MAX_EMITTERS}];
uniform float uFlash;
uniform float uFogDensity;
uniform float uTime;
uniform vec4  uEmitters[${MAX_EMITTERS}];
uniform float uGlow;
uniform float uAstro;
uniform vec3  uAstroDir;
`;

/** O ruído da cena. Sem uniforms: serve também às passadas de simulação. */
export const NOISE_GLSL = /* glsl */ `
float sceneHash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float sceneNoise(vec3 q) {
  // A rede é girada para fora dos eixos do mundo: ruído de valor mostra a
  // própria rede em superfícies alinhadas a ela.
  vec3 p = vec3(
    dot(q, vec3( 0.80, 0.36, -0.48)),
    dot(q, vec3(-0.42, 0.90,  0.12)),
    dot(q, vec3( 0.43, 0.24,  0.87))
  );
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = sceneHash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = sceneHash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = sceneHash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = sceneHash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = sceneHash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = sceneHash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = sceneHash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = sceneHash13(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
`;

export const FOG_GLSL = /* glsl */ `
${NOISE_GLSL}
/**
 * A luz que a flora joga num ponto: soma dos aglomerados, com queda suave e
 * alcance curto. Sem sombra e sem normal: é luz de campo, difusa.
 */
float floraLight(vec3 worldPos) {
  float total = 0.0;
  for (int i = 0; i < ${MAX_EMITTERS}; i++) {
    vec4 e = uEmitters[i];
    if (e.w <= 0.0) continue;
    vec3 d = e.xyz - worldPos;
    total += e.w / (1.0 + dot(d, d) * 0.035);
  }
  return total * uGlow;
}

/** A mesma luz, com a cor de cada mancha: do ciano ao rosa. */
vec3 floraGlow(vec3 worldPos) {
  vec3 total = vec3(0.0);
  for (int i = 0; i < ${MAX_EMITTERS}; i++) {
    vec4 e = uEmitters[i];
    if (e.w <= 0.0) continue;
    vec3 d = e.xyz - worldPos;
    total += mix(uCyan, uRose, uEmitterWarm[i]) * (e.w / (1.0 + dot(d, d) * 0.035));
  }
  return total * uGlow;
}

/**
 * A flora vista através da névoa: quanto do raio da câmera até o ponto passa
 * perto de um aglomerado. É o halo no ar em volta de cada mancha de flores.
 */
vec3 floraScatter(vec3 worldPos) {
  vec3 ray = worldPos - cameraPosition;
  float len = max(length(ray), 1e-3);
  vec3 dir = ray / len;
  vec3 total = vec3(0.0);
  for (int i = 0; i < ${MAX_EMITTERS}; i++) {
    vec4 e = uEmitters[i];
    if (e.w <= 0.0) continue;
    vec3 toE = e.xyz - cameraPosition;
    float t = clamp(dot(toE, dir), 0.0, len);
    vec3 d = toE - dir * t;
    total += mix(uCyan, uRose, uEmitterWarm[i]) * e.w * exp(-dot(d, d) * 0.012) * smoothstep(0.0, 14.0, t);
  }
  return total * uGlow;
}

/**
 * O ar que o planeta acende no fim da trilha: rosa em volta dele, cedendo
 * para o ciano ao longo do horizonte. É a mesma cor no céu e na névoa distante
 * do terreno. uAstroDir é para onde o planeta fica (planetPlace, em rail.ts).
 */
vec3 astroAir(vec3 dir) {
  float near = max(dot(dir, uAstroDir), 0.0);
  float low = exp(-abs(dir.y) * 5.5);
  vec3 air = uRose * (0.2 * pow(near, 26.0) + 0.012 * pow(near, 5.0));
  air += uCyan * 0.015 * pow(near, 1.5) * low;
  return air * uAstro;
}

/** A névoa rente ao horizonte: é dela que o céu parte (SKY_FRAG). */
vec3 fogBaseAt(float viewDepth, vec3 worldPos) {
  float depth01 = clamp(viewDepth / 120.0, 0.0, 1.0);
  // Três paradas: o fundo, a profundidade média e a linha do horizonte.
  vec3 fogColor = mix(uVoid, uAbyss, smoothstep(0.0, 0.25, depth01));
  fogColor = mix(fogColor, uDeep * 0.55, smoothstep(0.35, 1.0, depth01) * 0.6);
  fogColor += 0.06 * floraScatter(worldPos);
  fogColor += astroAir(normalize(worldPos - cameraPosition)) * smoothstep(0.35, 1.0, depth01);
  // As descargas acendem o ar inteiro por um instante, mais longe do que perto.
  fogColor += mix(uRose, vec3(1.0), 0.45) * 0.025 * uFlash * smoothstep(0.05, 0.6, depth01);
  return fogColor;
}

/**
 * A cor para onde a névoa leva um ponto. Longe e acima do horizonte ela fecha
 * junto com o céu (as mesmas paradas de SKY_FRAG): o que está longe some no
 * fundo que tem atrás, e não numa faixa mais clara que ele.
 */
vec3 fogColorAt(float viewDepth, vec3 worldPos) {
  vec3 fogColor = fogBaseAt(viewDepth, worldPos);
  float rise = normalize(worldPos - cameraPosition).y;
  vec3 above = mix(mix(uAbyss, uVoid, 0.55), uVoid, smoothstep(0.3, 0.9, rise));
  float far = smoothstep(0.35, 1.0, clamp(viewDepth / 120.0, 0.0, 1.0));
  return mix(fogColor, above, smoothstep(-0.04, 0.42, rise) * far);
}

/** Quanto da névoa fica entre a câmera e o ponto, 0 a 1. */
float fogAmount(float viewDepth, vec3 worldPos) {
  float n = sceneNoise(worldPos * 0.045 + vec3(0.0, 0.0, uTime * 0.02));
  n = n * 0.7 + sceneNoise(worldPos * 0.17) * 0.3;
  // Névoa de chão: mais densa embaixo, medida no meio do raio.
  float midY = mix(cameraPosition.y, worldPos.y, 0.5);
  float low = exp(-max(midY, 0.0) * 0.16);
  float density = uFogDensity * (0.35 + 0.9 * low) * (0.6 + 0.8 * n);
  return clamp(1.0 - exp(-density * max(viewDepth, 0.0)), 0.0, 1.0);
}

vec3 applyFog(vec3 color, float viewDepth, vec3 worldPos) {
  return mix(color, fogColorAt(viewDepth, worldPos), fogAmount(viewDepth, worldPos));
}

/**
 * As placas dos cases acendem com a chegada. De longe elas estão lá, mas
 * escuras: uma silhueta na névoa, como as torres, e não um objeto claro no
 * fundo. plateFar é quanto a placa está longe, 0 a 1; a luz dela cai com isso.
 */
float plateFar(float viewDepth) {
  return smoothstep(14.0, 60.0, viewDepth);
}

float plateDim(float viewDepth) {
  return 1.0 - 0.72 * plateFar(viewDepth);
}

vec3 applyPlateFog(vec3 color, float viewDepth, vec3 worldPos) {
  return applyFog(color * plateDim(viewDepth), viewDepth, worldPos);
}
`;
