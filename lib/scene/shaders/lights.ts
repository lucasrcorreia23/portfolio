import { LAMP_COUNT, LAMP_REACH } from "../lamps";

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
// A cor da luz de cada aglomerado (rodada 15).
uniform vec3 uClusterColor[4];
// As lanternas (lib/scene/lamps.ts): xyz em mundo, w = intensidade; e a cor.
uniform vec4 uLamps[${LAMP_COUNT}];
uniform vec3 uLampColor[${LAMP_COUNT}];
// O cursor: xyz em mundo, w = força; e a cor quente dele.
uniform vec4 uPointer;
uniform vec3 uPointerColor;
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

/**
 * A mesma luz, com **alcance curto**: cai a zero em reach unidades.
 *
 * É a luz da estrutura desde a rodada 9.5. A queda inversa do quadrado da
 * versão longa nunca chega a zero — com quatro aglomerados no eixo do duto,
 * toda parede recebia alguma coisa o tempo todo, e a câmara inteira ficava
 * legível. Aqui a parede só acende quando um aglomerado passa rente a ela.
 */
float practicalLightNear(vec3 worldPos, vec3 normal, float grazing, float reach) {
  float total = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 cluster = uClusters[i];
    vec3 delta = cluster.xyz - worldPos;
    float dist = length(delta);
    float fall = 1.0 - smoothstep(0.0, reach, dist);
    fall *= fall;
    float incidence = mix(
      max(dot(normal, delta / max(dist, 1e-4)), 0.0),
      1.0 - abs(dot(normal, delta / max(dist, 1e-4))),
      grazing
    );
    total += cluster.w * fall * incidence;
  }
  return total;
}

/**
 * A mesma luz de alcance curto, **com a cor de cada aglomerado** (rodada 15).
 * É o termo que tinge o concreto; a intensidade continua sendo a escalar acima.
 */
vec3 practicalTintNear(vec3 worldPos, vec3 normal, float grazing, float reach) {
  vec3 total = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 cluster = uClusters[i];
    vec3 delta = cluster.xyz - worldPos;
    float dist = length(delta);
    float fall = 1.0 - smoothstep(0.0, reach, dist);
    fall *= fall;
    float incidence = mix(
      max(dot(normal, delta / max(dist, 1e-4)), 0.0),
      1.0 - abs(dot(normal, delta / max(dist, 1e-4))),
      grazing
    );
    total += uClusterColor[i] * cluster.w * fall * incidence;
  }
  return total;
}

/**
 * A luz das lanternas, colorida. Sem termo de incidência: a lanterna mora na
 * própria superfície, e o que ela faz é uma poça de luz em volta de si — o
 * termo de raspão zeraria justamente o piso em que ela anda.
 */
vec3 lampLight(vec3 worldPos) {
  vec3 total = vec3(0.0);
  for (int i = 0; i < ${LAMP_COUNT}; i++) {
    vec4 lamp = uLamps[i];
    if (lamp.w <= 0.0) continue;
    float dist = distance(lamp.xyz, worldPos);
    float fall = 1.0 - smoothstep(0.0, ${LAMP_REACH.toFixed(1)}, dist);
    total += uLampColor[i] * lamp.w * fall * fall;
  }
  // O cursor entra como mais uma lanterna, de alcance um pouco maior.
  if (uPointer.w > 0.0) {
    float fall = 1.0 - smoothstep(0.0, 11.0, distance(uPointer.xyz, worldPos));
    total += uPointerColor * uPointer.w * fall * fall * 1.3;
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
