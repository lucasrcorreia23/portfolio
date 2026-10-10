import { HEIGHT_GLSL } from "../terrain";
import { TERRAIN } from "../world";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * A flora: a relva, as flores e os esporos. É a única coisa da cena que emite.
 *
 * Tudo é iluminado **por vértice**, com a névoa incluída: o fragmento de uma
 * lâmina de relva é uma cor só, e é isso que deixa cem mil delas baratas.
 */

/** O lado do ladrilho de relva que acompanha a câmera, em metros. */
export const GRASS_TILE = 72;

const WIND_GLSL = /* glsl */ `
/**
 * O vento: duas ondas que atravessam o campo e uma rajada lenta por cima.
 * Devolve o deslocamento em XZ da ponta de uma haste de um metro.
 */
vec2 windAt(vec3 worldPos, float time) {
  float a = sin(worldPos.x * 0.11 + worldPos.z * 0.07 + time * 0.9);
  float b = sin(worldPos.x * 0.31 - worldPos.z * 0.23 + time * 1.7);
  float gust = sceneNoise(vec3(worldPos.xz * 0.035, time * 0.12));
  return vec2(0.75, 0.4) * (a * 0.14 + b * 0.05) * (0.4 + 1.3 * gust);
}
`;

export const GRASS_VERT = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${HEIGHT_GLSL}
uniform vec3 uTeal;
uniform vec3 uMist;
uniform vec2 uFocus;
attribute vec3 aOffset;
attribute vec4 aSeed;
varying vec3 vColor;

${FOG_GLSL}
${WIND_GLSL}

void main() {
  // O ladrilho acompanha a câmera: cada lâmina tem um lugar fixo no mundo, e o
  // que muda é qual cópia dela, a cada ${GRASS_TILE} metros, está perto.
  vec2 cell = mod(aOffset.xz - uFocus, ${GRASS_TILE.toFixed(1)}) - ${(GRASS_TILE / 2).toFixed(1)};
  vec2 xz = uFocus + cell;
  // Some na borda do ladrilho, em vez de aparecer de repente.
  float edge = 1.0 - smoothstep(${(GRASS_TILE * 0.36).toFixed(1)}, ${(GRASS_TILE * 0.5).toFixed(1)}, length(cell));
  // E não cresce fora do terreno: depois da borda não há chão embaixo dela.
  vec2 lo = vec2(${TERRAIN.minX.toFixed(1)}, ${TERRAIN.minZ.toFixed(1)});
  vec2 hi = vec2(${TERRAIN.maxX.toFixed(1)}, ${TERRAIN.maxZ.toFixed(1)});
  vec2 inside = smoothstep(lo, lo + 2.0, xz) * (1.0 - smoothstep(hi - 2.0, hi, xz));
  edge *= inside.x * inside.y;

  vec3 base = vec3(xz.x, terrainHeight(xz), xz.y);
  float height = aSeed.x * edge;
  float c = cos(aSeed.y);
  float s = sin(aSeed.y);
  float along = position.y;

  vec3 local = vec3(position.x * 0.028 * c, along * height, position.x * 0.028 * s);
  // A lâmina já nasce inclinada, e o vento a dobra mais na ponta.
  vec2 lean = vec2(-s, c) * 0.22 * aSeed.z;
  local.xz += (lean + windAt(base, uTime)) * along * along * height;

  vec3 world = base + local;
  vec4 view = viewMatrix * vec4(world, 1.0);

  // Escura na base, estrutura na ponta; a flora a tinge onde chega.
  vec3 color = mix(uDeep * 0.06, uTeal * 0.2, along) * (0.6 + 0.6 * aSeed.w);
  vec3 glow = floraGlow(base + vec3(0.0, 0.5, 0.0));
  float light = dot(glow, vec3(0.3333));
  color += glow * (0.03 + 0.2 * along * along);
  // O brilho fino da relva: poucas pontas, mudando devagar.
  float glint = step(0.955, fract(aSeed.w * 43.7 + floor(uTime * 0.5 + aSeed.z * 7.0) * 0.137));
  color += uMist * 0.05 * glint * along * (0.3 + light);

  vColor = applyFog(color, -view.z, world);
  gl_Position = projectionMatrix * view;
}
`;

export const GRASS_FRAG = /* glsl */ `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

/**
 * As flores: o modelo da planta com a textura dele. A forma é a de verdade; a
 * cor é a da cena — a pétala emite, em ciano ou rosa, com o desenho da textura
 * por baixo, e a folha fica escura como a relva. O alfa recorta as folhas.
 */
export const FLOWER_VERT = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${HEIGHT_GLSL}
attribute vec3 aOffset;
attribute vec4 aSeed;
uniform float uTall;
uniform float uEmit;
uniform float uSway;
attribute float aWarm;
varying vec2 vUv;
varying vec3 vTint;
varying vec3 vHue;
varying float vAlong;
varying vec3 vGlow;
varying float vFog;
varying vec3 vFogColor;

${FOG_GLSL}
${WIND_GLSL}

void main() {
  vec2 xz = aOffset.xz;
  vec3 base = vec3(xz.x, terrainHeight(xz), xz.y);
  float c = cos(aSeed.y);
  float s = sin(aSeed.y);
  vec3 local = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c) * aSeed.x;
  // O vento dobra a planta a partir da base, mais na ponta.
  float along = clamp(position.y / uTall, 0.0, 1.0);
  // Um pouco enterrada: planta e pedra saem do chão, não pousam nele.
  local.y -= 0.04 * aSeed.x * uTall;
  local.xz += windAt(base, uTime + aSeed.z * 4.0) * along * along * aSeed.x * uTall * 0.7 * uSway;
  vec3 world = base + local;

  vec4 view = viewMatrix * vec4(world, 1.0);
  float depth = -view.z;

  float cluster = uEmitters[int(aOffset.y)].w;
  float bright = (0.6 + 0.4 * aSeed.w) * (0.5 + 0.5 * cluster) * uGlow;
  // Ciano, com algumas mais azuis; e as rosas, que são o calor do campo.
  vec3 tint = mix(uCyan, uCyan * vec3(0.55, 0.78, 1.05), step(0.72, aSeed.z));
  vec3 hue = mix(tint, uRose * vec3(1.0, 0.85, 0.95), aWarm);
  vTint = hue * 5.0 * bright * uEmit;
  // A cor da própria planta, para a folha: fraca, e mais viva na ponta.
  vHue = hue * (0.55 + 0.45 * cluster) * uGlow;
  vAlong = along;
  vGlow = floraGlow(base + vec3(0.0, 0.5, 0.0));
  vUv = uv;

  vec3 fogged = applyFog(vec3(0.0), depth, world);
  vFogColor = fogColorAt(depth, world);
  float lum = dot(vFogColor, vec3(0.3333));
  vFog = lum > 1e-5 ? clamp(dot(fogged, vec3(0.3333)) / lum, 0.0, 1.0) : 0.0;

  gl_Position = projectionMatrix * view;
}
`;

export const FLOWER_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTeal;
uniform vec2 uPetal;
uniform float uLeaf;
varying vec2 vUv;
varying vec3 vTint;
varying vec3 vHue;
varying float vAlong;
varying vec3 vGlow;
varying float vFog;
varying vec3 vFogColor;

void main() {
  vec4 texel = texture(uMap, vUv);
  if (texel.a < 0.5) discard;
  // Em toda espécie a pétala é quente (amarela, laranja) e a folha é verde:
  // o vermelho menos o azul as separa, com o limiar de cada uma.
  float petal = smoothstep(uPetal.x, uPetal.y, texel.r - texel.b);
  float detail = dot(texel.rgb, vec3(0.3333));
  // A folha pega a luz das flores em volta: é o que dá corpo à planta.
  vec3 leaf = uTeal * 0.34 * detail + vGlow * 0.6 * detail;
  // A folha não é só sombra: ela guarda um resto da cor da planta, que sobe
  // da base para a ponta. É o que separa uma planta viva de um galho seco.
  leaf += vHue * uLeaf * detail * (0.07 + 0.42 * vAlong * vAlong);
  vec3 color = mix(leaf, vTint * (0.5 + 1.1 * detail), petal);
  gl_FragColor = vec4(mix(color, vFogColor, vFog), 1.0);
}
`;

export const SPORE_VERT = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform vec2 uResolution;
uniform vec4 uVeilBox[8];
uniform float uVeilF[8];
uniform vec4 uPanelRect;
uniform vec3 uBoxCenter;
attribute vec4 aSeed;
varying float vAlpha;

const vec3 BOX = vec3(64.0, 18.0, 76.0);

void main() {
  // Deriva lenta, sem cauda: cada esporo anda num laço próprio e sobe devagar.
  vec3 p = position;
  p.x += sin(uTime * 0.11 + aSeed.x * 6.28) * 1.6;
  p.z += cos(uTime * 0.09 + aSeed.y * 6.28) * 1.6;
  p.y += uTime * (0.05 + 0.08 * aSeed.z);
  // O volume acompanha a câmera, como o ladrilho de relva.
  vec3 world = uBoxCenter + mod(p - uBoxCenter, BOX) - BOX * 0.5;

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
  alpha *= exp(-uFogDensity * 0.5 * depth) * uGlow * (0.4 + 0.6 * aSeed.w);

  vAlpha = alpha;
  gl_PointSize = clamp(uResolution.y * (0.045 + 0.05 * aSeed.z) / max(depth, 1.0), 1.0, uResolution.y * 0.007);
  gl_Position = alpha <= 0.001 ? vec4(2.0, 2.0, 2.0, 1.0) : clip;
}
`;

export const SPORE_FRAG = /* glsl */ `
uniform vec3 uCyan;
varying float vAlpha;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  // Disco de borda suave.
  float soft = exp(-d * 3.2) * (1.0 - smoothstep(0.7, 1.0, d));
  gl_FragColor = vec4(uCyan * 0.85 * soft * vAlpha, 1.0);
}
`;
