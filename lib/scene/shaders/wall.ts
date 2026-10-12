import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * As telas da parede da vitrine. Cada quadro é uma chapa escura com a imagem
 * inteira dentro, no formato dela, com margem até a borda. São indústria, como
 * os painéis dos cases: não emitem. Apagadas de longe, acendem uma a uma
 * quando a câmera olha para o desvio (`uFork`): é o convite, sem texto. A tela
 * debaixo do ponteiro (`uPoint`) acende um pouco; a tela em foco (`uFocus`)
 * fica inteira e as outras apagam.
 *
 * A mesma conta serve à parede (o atlas, todas as telas numa malha) e às
 * placas por cima dela (`LIVE`: o vídeo, ou a imagem grande da tela em foco),
 * que só desenham a imagem. O vídeo chega sem decodificar o sRGB (`VIDEO`).
 */
export const WALL_VERT = /* glsl */ `
attribute vec2 aLocal;
attribute vec2 aFit;
attribute vec2 aCenter;
attribute vec2 aSpan;
attribute float aOrder;
attribute float aCell;
varying vec2 vLocal;
varying vec2 vFit;
varying vec2 vCenter;
varying vec2 vSpan;
varying float vOrder;
varying float vCell;
varying vec3 vWorld;
varying float vDepth;

void main() {
  vLocal = aLocal;
  vFit = aFit;
  vCenter = aCenter;
  vSpan = aSpan;
  vOrder = aOrder;
  vCell = aCell;
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
varying vec2 vLocal;
varying vec2 vFit;
varying vec2 vCenter;
varying vec2 vSpan;
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

  // A imagem no quadro: q vai de −0.5 a 0.5 dentro dela. A borda é suave em
  // um pixel, para não serrilhar de longe.
  vec2 q = (vLocal - 0.5) / vFit;
  vec2 room = (0.5 - abs(q)) * vFit * vec2(${ratio}, 1.0);
  float edge = min(room.x, room.y);
  float inside = clamp(edge / max(fwidth(edge), 1e-5) + 0.5, 0.0, 1.0);
#ifdef LIVE
  if (inside < 0.5) discard;
#endif
  vec3 image = texture(uMap, vCenter + q * vSpan).rgb;
#ifdef VIDEO
  image = sRGBTransferEOTF(vec4(image, 1.0)).rgb;
#endif

  // A onda que acende as placas, da primeira à última.
  float on = smoothstep(0.0, 1.0, clamp(uFork * 2.0 - vOrder, 0.0, 1.0));
  // A tela debaixo do ponteiro: x = qual, y = quanto.
  float point = (abs(vCell - uPoint.x) < 0.5 ? 1.0 : 0.0) * uPoint.y;
  // A tela em foco (x = qual, y = quanto) e o apagar das outras.
  float mine = abs(vCell - uFocus.x) < 0.5 ? 1.0 : 0.0;
  float focus = mine * uFocus.y;
  // Acesa, a tela tem o pouco brilho dos painéis dos cases; o ponteiro a
  // levanta um pouco. No foco ela sobe até o branco ler como branco: o bloom
  // e o grão somem junto (\`Composer\`), então ela não estoura.
  float lit = max(on, point);
  float gain = mix(0.62, 0.78, point);
  gain = mix(gain, 1.45, focus) * (1.0 - 0.75 * (1.0 - mine) * uFocus.y);
  // A margem é a chapa, um pouco acima do fundo para o quadro se ler.
  vec3 plate = mix(uDeep * light * 1.6, image * gain, inside);
  vec3 color = mix(uDeep * light, plate, 0.2 + 0.8 * lit);

  // O ponteiro acende a borda da tela dele.
  vec2 border = min(vLocal, 1.0 - vLocal) * vec2(${ratio}, 1.0);
  float rim = 1.0 - smoothstep(0.0, 0.012, min(border.x, border.y));
  color += uMist * 0.5 * rim * point * (1.0 - focus);

  // A tela em foco fica fora da névoa: é para ler.
  gl_FragColor = vec4(mix(applyFog(color, vDepth, vWorld), color, focus), 1.0);
}
`;
}
