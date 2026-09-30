import { AHEAD_HALF_WIDTH } from "./ahead";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "./lights";

/**
 * **O LRC de vidro** (rodada 20) — o corpo de prova deixou de ser concreto.
 *
 * Com o activetheory.net como referência, a peça passou a ser vidro
 * iridescente: transmissiva, ela **refrata o que está atrás** — os esporos e a
 * névoa —, tem a borda e o chanfro acesos pelo fresnel e um filme fino que
 * troca de cor com o ângulo de vista. O descolamento continua sendo o mesmo:
 * o campo de distância é assado da malha, não do material.
 *
 * ## Como a transmissão é feita
 *
 * O three só leva objetos **opacos** ao alvo de transmissão do
 * `MeshPhysicalMaterial`, e os esporos são aditivos. Então a transmissão é do
 * compositor: a peça mora na camada do vidro (`GLASS_LAYER`), a cena e os
 * esporos são desenhados antes, somados num alvo (`uBackdrop`), e só então o
 * vidro é desenhado por cima, amostrando esse fundo com o deslocamento da
 * refração. Ver o bloco "vidro" no laço de `Composer.tsx`.
 *
 * GLSL 3, opaco, escrevendo profundidade: a DOF e o véu continuam lendo a
 * peça como a coisa sólida mais próxima.
 */
export const GLASS_VERT = /* glsl */ `
out vec3  vWorld;
out vec3  vNormal;
out vec3  vViewNormal;
out float vViewDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewNormal = normalize(normalMatrix * normal);
  vec4 view = viewMatrix * world;
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const GLASS_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

uniform vec3  uCyan;
uniform vec3  uViolet;
uniform vec3  uMagenta;
uniform vec3  uMist;
uniform sampler2D uBackdrop;
uniform float uFlockAhead;
uniform sampler2D uAheadField;
uniform float uAheadReady;
uniform float uSpecimenFogDepth;
uniform float uSpecimenFogFlat;

in vec3  vWorld;
in vec3  vNormal;
in vec3  vViewNormal;
in float vViewDepth;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float facing = abs(dot(n, v));
  float fresnel = pow(1.0 - facing, 3.0);

  // **A refração.** O fundo é amostrado deslocado pela normal em espaço de
  // vista — mais na borda e no chanfro, onde a face vira —, e cada canal um
  // pouco diferente: a dispersão de um vidro de verdade, pequena o bastante
  // para não ler como separação de canais.
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 bend = vViewNormal.xy * (0.018 + 0.05 * fresnel);
  vec3 back = vec3(
    texture(uBackdrop, uv - bend * 0.92).r,
    texture(uBackdrop, uv - bend).g,
    texture(uBackdrop, uv - bend * 1.08).b
  );
  // O vidro é levemente frio e absorve um pouco — é massa, não ar.
  vec3 glass = back * vec3(0.8, 0.9, 0.95);

  // **O filme fino.** A fase gira com o ângulo de vista e com uma espessura
  // que varia devagar pela peça: o rosa, o ciano e o violeta correm pela face
  // quando a peça gira no ataque, como no logo do activetheory.net.
  float thickness = sceneNoise(vWorld * 0.35 + vec3(0.0, 0.0, uTime * 0.05));
  float phase = thickness * 1.6 + (1.0 - facing) * 2.4;
  vec3 film = 0.5 + 0.5 * cos(6.2832 * (phase + vec3(0.0, 0.33, 0.67)));
  vec3 filmColor = film.r * uMagenta + film.g * uCyan + film.b * uViolet;
  // O filme aparece também de face, fraco e correndo pela espessura: é o que
  // faz a face ler como vidro e não como um vão escuro.
  float sheen = smoothstep(0.35, 0.8, thickness);
  glass += filmColor * (0.015 + 0.05 * sheen + 0.75 * fresnel);

  // O céu refletido: um gradiente da própria névoa, mais claro para cima.
  vec3 sky = mix(uDeep * 0.6, uViolet * 0.25 + uCyan * 0.1, n.y * 0.5 + 0.5);
  glass += sky * (0.02 + fresnel * 1.3);

  // **O brilho especular.** As luzes que existem — os aglomerados de esporos,
  // as lanternas e o cursor — viram pontos de brilho na face e no chanfro.
  // Sem eles o vidro é um vão; com eles, é uma superfície.
  vec3 spec = vec3(0.0);
  // Lobo estreito e queda com a distância: numa face plana um lobo largo
  // acende a face inteira de uma vez (a primeira versão virou ouro).
  for (int i = 0; i < 4; i++) {
    vec3 d = uClusters[i].xyz - vWorld;
    vec3 l = normalize(d);
    float s = pow(max(dot(n, normalize(l + v)), 0.0), 700.0);
    spec += uClusterColor[i] * uClusters[i].w * s / (1.0 + dot(d, d) * 0.02);
  }
  if (uPointer.w > 0.0) {
    vec3 d = uPointer.xyz - vWorld;
    vec3 l = normalize(d);
    spec += uPointerColor * uPointer.w * pow(max(dot(n, normalize(l + v)), 0.0), 300.0)
      * 2.0 / (1.0 + dot(d, d) * 0.03);
  }
  glass += spec * 2.5;

  // **O rim continua sendo o bando.** A contagem de esporos diante da face,
  // por coluna (shaders/ahead.ts): a borda acende porque há vida perto dela.
  float u = clamp((vWorld.x + ${AHEAD_HALF_WIDTH.toFixed(3)}) / ${(2 * AHEAD_HALF_WIDTH).toFixed(3)}, 0.0, 1.0);
  float column = texture(uAheadField, vec2(u, 0.5)).r;
  float ahead = mix(uFlockAhead, 1.0 - exp(-column / 5.0), uAheadReady);
  glass += uMist * pow(fresnel, 1.5) * (0.12 + 0.9 * ahead);

  // A luz que passa perto: aglomerados, lanternas e o cursor.
  glass += lampLight(vWorld) * (0.15 + 0.6 * fresnel);

  // De manhã o vidro escurece um pouco o que refrata, para ler sobre o ar
  // claro, e o fresnel fica.
  glass = mix(glass, glass * 0.82, uDawn);

  glass = applyFog(glass, mix(vViewDepth, uSpecimenFogDepth, uSpecimenFogFlat), vWorld);
  fragColor = vec4(glass, 1.0);
}
`;
