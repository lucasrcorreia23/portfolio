import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "./lights";

/**
 * As paredes da câmara e a fonte distante a montante.
 *
 * **Elas nunca têm emissivo próprio** (DIRECTION.md §5, "Estrutura"): existem
 * só como realce de raspão quando o bando passa. Se em algum quadro dá para
 * ler a câmara inteira, a névoa está fina demais — então a névoa aqui não é
 * decoração, é o que mantém a estrutura sendo vista *de relance*.
 *
 * Base `--abyss`, foscas, com o realce entrando quase todo por incidência
 * rasante. A parede de frente para um cacho quase não acende; a que ele
 * atravessa de raspão acende por um instante e some.
 */
export const CHAMBER_VERT = /* glsl */ `
out vec3 vWorld;
out vec3 vNormal;
out float vViewDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);

  vec4 view = viewMatrix * world;
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const CHAMBER_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

uniform vec3 uWallColor;
uniform vec3 uCyan;

in vec3 vWorld;
in vec3 vNormal;
in float vViewDepth;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}

void main() {
  // O concreto tem grão. Sem ele a parede é um plano de cor chapado, e um
  // plano chapado num duto longo lê como cenário de jogo.
  // A oitava fina cai com a distância. Sem isso ela alias a partir de umas
  // trinta unidades e a parede vira um moiré de grade — e grade é vetada pelo
  // PROJECT.md §2.
  float near = exp(-vViewDepth * 0.05);
  float grain = sceneNoise(vWorld * 0.62) * near * 0.45 + sceneNoise(vWorld * 0.18) * 0.55;

  // A caixa é vista por dentro (BackSide), e as normais da geometria apontam
  // para fora. Iluminar com elas viradas ao contrário acenderia exatamente as
  // paredes que o cacho não está tocando.
  float lit = practicalLight(vWorld, normalize(-vNormal), 0.78);
  vec3 color = uWallColor * (0.16 + 0.42 * grain) + uCyan * lit * 0.42;
  color += uSourceColor * upstreamLight(vWorld) * 0.5;

  color = applyFog(color, vViewDepth, vWorld);
  color = applyVeil(color, gl_FragCoord.xy);

  fragColor = vec4(color, 1.0);
}
`;

/**
 * A fonte distante a montante — a tampa do fundo do duto.
 *
 * "Uma fonte distante a montante, fraquíssima, `--teal`" (DIRECTION.md §4,
 * Emergência). É o que dá ao duto um fim que não é um buraco preto, e é a luz
 * para a qual a descida inteira está andando. A cor viaja `--teal` → `--cyan`
 * → `--peach` ao longo da descida; entre 0.00 e 0.28 ela mal saiu do teal.
 */
export const SOURCE_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

in vec3 vWorld;
in vec3 vNormal;
in float vViewDepth;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}

void main() {
  float radial = 1.0 - smoothstep(0.0, 7.5, length(vWorld.xy));
  // Duas oitavas de ruído para a fonte não ser um disco perfeito: o que se vê
  // a essa distância é névoa acesa, não uma lâmpada.
  float broken = 0.55 + 0.45 * sceneNoise(vWorld * 0.09 + vec3(0.0, 0.0, uTime * 0.04));

  vec3 color = uSourceColor * radial * radial * broken * (0.05 + uSourceStrength);
  color = applyFog(color, vViewDepth, vWorld);
  color = applyVeil(color, gl_FragCoord.xy);

  fragColor = vec4(color, 1.0);
}
`;
