import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * As placas da parede da vitrine: telas pequenas numa malha só. São indústria,
 * como os painéis dos cases — não emitem, a não ser o ponto de cada
 * placeholder. Apagadas de longe, acendem uma a uma quando a câmera olha para
 * o desvio (`uFork`): é o convite, sem texto. A tela debaixo do ponteiro
 * (`uPoint`) acende um pouco; a tela em foco (`uFocus`) fica inteira e as
 * outras apagam.
 */
export const WALL_VERT = /* glsl */ `
attribute vec2 aLocal;
attribute vec3 aDot;
attribute float aOrder;
attribute float aCell;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vDot;
varying float vOrder;
varying float vCell;
varying vec3 vWorld;
varying float vDepth;

void main() {
  vUv = uv;
  vCell = aCell;
  vLocal = aLocal;
  vDot = aDot;
  vOrder = aOrder;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export function wallFrag(aspect: number): string {
  const ratio = aspect.toFixed(2);
  return /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform sampler2D uMap;
uniform vec3 uMist;
uniform float uFork;
uniform vec2 uPoint;
uniform vec2 uFocus;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vDot;
varying float vOrder;
varying float vCell;
varying vec3 vWorld;
varying float vDepth;

${FOG_GLSL}

void main() {
  vec3 light = 0.5 + 0.35 * clamp(floraGlow(vWorld), 0.0, 1.5);
  // As costas da placa: chapa escura.
  if (!gl_FrontFacing) {
    gl_FragColor = vec4(applyFog(uDeep * light, vDepth, vWorld), 1.0);
    return;
  }

  // A onda que acende as placas, da primeira à última.
  float on = smoothstep(0.0, 1.0, clamp(uFork * 2.0 - vOrder, 0.0, 1.0));
  vec3 plate = texture(uMap, vUv).rgb;
  // A tela debaixo do ponteiro: x = qual, y = quanto.
  float point = (abs(vCell - uPoint.x) < 0.5 ? 1.0 : 0.0) * uPoint.y;
  // A tela em foco (x = qual, y = quanto) e o apagar das outras.
  float mine = abs(vCell - uFocus.x) < 0.5 ? 1.0 : 0.0;
  float focus = mine * uFocus.y;
  // Acesa, a tela tem o pouco brilho dos painéis dos cases; o ponteiro a
  // levanta um pouco, o foco a deixa inteira.
  float lit = max(on, point);
  float gain = mix(0.62, 0.78, point);
  gain = mix(gain, 0.88, focus) * (1.0 - 0.75 * (1.0 - mine) * uFocus.y);
  vec3 color = mix(uDeep * light, plate * gain, 0.2 + 0.8 * lit);

  // O ponto de emissão do placeholder: aceso de longe, mais forte de frente.
  // Tela com imagem não tem ponto (raio zero).
  vec2 d = (vLocal - vDot.xy) * vec2(${ratio}, 1.0);
  float glow = exp(-dot(d, d) / max(vDot.z * vDot.z, 1e-5)) * step(1e-3, vDot.z);
  color += uCyan * 2.2 * glow * uGlow * (0.35 + 0.65 * on);

  // O ponteiro acende a borda da tela dele.
  vec2 edge = min(vLocal, 1.0 - vLocal) * vec2(${ratio}, 1.0);
  float rim = 1.0 - smoothstep(0.0, 0.015, min(edge.x, edge.y));
  color += uMist * 0.5 * rim * point * (1.0 - focus);

  // A tela em foco fica fora da névoa: é para ler.
  gl_FragColor = vec4(mix(applyFog(color, vDepth, vWorld), color, focus), 1.0);
}
`;
}
