/**
 * O rig de luz prática — DIRECTION.md §5, "Luz".
 *
 * "O bando é a única luz prática entre 0.00 e 0.85." Não há key, não há fill,
 * não há HDRI. O que ilumina a câmara são quatro luzes que seguem os
 * aglomerados mais densos, e as posições delas vêm da simulação proxy na CPU
 * (`lib/scene/proxy-sim.ts`), nunca de uma leitura do FBO.
 *
 * Quatro, e não uma por corpo: o DIRECTION.md pede de 3 a 5, e o proxy entrega
 * exatamente os centroides que fazem sentido iluminar. Um cacho denso e rápido
 * acende; um corpo isolado à deriva quase não.
 */
export const LIGHTS_UNIFORMS_GLSL = /* glsl */ `
// xyz = posição do aglomerado em mundo, w = energia 0..1.
uniform vec4 uClusters[4];
// A fonte distante a montante. Sobe de quase zero para o máximo só entre
// 0.85 e 1.00 — é a luz para a qual você está andando.
uniform vec3  uSourceColor;
uniform float uSourceStrength;
uniform float uSourceZ;
`;

export const LIGHTS_GLSL = /* glsl */ `
/**
 * Quanto os aglomerados iluminam um ponto, com um termo de incidência.
 *
 * O parâmetro grazing separa estrutura de cenário: com ele alto, uma superfície
 * de frente para a luz quase não acende e uma quina de raspão acende — que é
 * como o DIRECTION.md §2 descreve a gravação, "o brilho pega a quina da
 * gravação, não a face".
 */
float practicalLight(vec3 worldPos, vec3 normal, float grazing) {
  float total = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 cluster = uClusters[i];
    vec3 delta = cluster.xyz - worldPos;
    float dist = length(delta);
    // Queda inversa do quadrado, com um piso para não estourar de perto.
    float fall = 1.0 / (1.0 + dist * dist * 0.012);
    float incidence = mix(
      max(dot(normal, delta / max(dist, 1e-4)), 0.0),
      1.0 - abs(dot(normal, delta / max(dist, 1e-4))),
      grazing
    );
    total += cluster.w * fall * incidence;
  }
  return total;
}

/** A fonte a montante, como um termo de distância ao longo do eixo. */
float upstreamLight(vec3 worldPos) {
  float axial = 1.0 - clamp((worldPos.z - uSourceZ) / 90.0, 0.0, 1.0);
  float radial = 1.0 - smoothstep(0.0, 26.0, length(worldPos.xy));
  return uSourceStrength * axial * axial * radial;
}
`;
