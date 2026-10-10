import { PANEL_ASPECT } from "../stops";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * A imagem de um case, atrás do vidro da placa: uma tela de pouco brilho,
 * constante, que a névoa atenua com a distância. Só o pequeno ponto do
 * placeholder cruza o limiar do bloom. A moldura em volta está em `frame.ts`.
 */
export const PANEL_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying float vDepth;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const PANEL_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform sampler2D uMap;
uniform vec3 uDot;
uniform vec3 uMist;
uniform float uHover;
varying vec2 vUv;
varying vec3 vWorld;
varying float vDepth;

${FOG_GLSL}

void main() {
  vec3 plate = texture(uMap, vUv).rgb;
  // Uma tela de pouco brilho: a luz é dela e não muda com a flora em volta.
  vec3 color = plate * 0.72;

  // O ponto de emissão do placeholder.
  vec2 d = (vUv - uDot.xy) * vec2(${PANEL_ASPECT.toFixed(2)}, 1.0);
  color += uCyan * 2.2 * exp(-dot(d, d) / (uDot.z * uDot.z)) * uGlow;

  // O foco e o ponteiro acendem a borda: é o estado de foco do link.
  vec2 edge = min(vUv, 1.0 - vUv) * vec2(${PANEL_ASPECT.toFixed(2)}, 1.0);
  float rim = 1.0 - smoothstep(0.0, 0.012, min(edge.x, edge.y));
  color += uMist * 0.5 * rim * uHover;

  gl_FragColor = vec4(applyFog(color, vDepth, vWorld), 1.0);
}
`;

/**
 * O vidro por cima da imagem. Ele só acrescenta luz (mistura aditiva), então
 * nunca esconde a imagem: um reflexo fraco do ar da cena e um fresnel leve nas
 * bordas, que a névoa leva a zero com a distância.
 */
export const GLASS_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDepth;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(modelMatrix) * normal;
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const GLASS_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform float uRecess;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDepth;

${FOG_GLSL}

void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(cameraPosition - vWorld);
  vec3 mirror = reflect(-view, n);
  float facing = clamp(dot(n, view), 0.0, 1.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);

  // O que o vidro devolve: o ar ao longe na direção refletida e a flora que
  // está do lado de cá da placa. De frente quase nada; de esguelha, mais.
  // O ar é a cor da névoa distante, sem o halo da flora ao longo do raio: o
  // vidro cobre a placa inteira, e esse laço por pixel não se vê aqui.
  vec3 air = mix(uAbyss, uDeep * 0.55, 0.6) + astroAir(mirror);
  vec3 flora = floraGlow(vWorld + mirror * 5.0);
  vec3 color = (air + flora * 0.08) * fresnel;

  // As bordas pegam um pouco mais de luz, como a aresta de uma chapa de vidro.
  vec2 edge = min(vUv, 1.0 - vUv) * vec2(${PANEL_ASPECT.toFixed(2)}, 1.0);
  float rim = 1.0 - smoothstep(0.0, 0.035, min(edge.x, edge.y));
  color += (air + flora * 0.08) * rim * 0.25;

  // Aditivo: a névoa não tinge, ela apaga. E na leitura do case o vidro some.
  color *= (1.0 - fogAmount(vDepth, vWorld)) * (1.0 - uRecess);
  gl_FragColor = vec4(min(color, vec3(0.5)), 1.0);
}
`;
