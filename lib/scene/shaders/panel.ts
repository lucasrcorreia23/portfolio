import { PANEL_ASPECT } from "../stops";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * O painel de um case: uma placa que mostra a capa. Ele pertence à indústria,
 * então não emite — a não ser o pequeno ponto do placeholder, que é a única
 * coisa nele que cruza o limiar do bloom.
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
  // Uma tela apagada: a placa se lê pela luz da flora em volta e por um
  // mínimo próprio, para o texto dela não sumir no escuro.
  vec3 color = plate * (0.5 + 0.35 * clamp(floraLight(vWorld), 0.0, 1.5));

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
