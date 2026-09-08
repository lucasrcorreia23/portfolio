import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "./lights";

/**
 * A estrutura: cotas, réguas, estações e marcas de intervalo — DIRECTION.md §2,
 * "Medida gravada, nunca instrumento numerado."
 *
 * **Ela não tem brilho fixo.** A quina de cada gravação responde a quem está
 * passando perto dela naquele quadro, amortecido, crescendo e sumindo. Isso não
 * é enfeite: linhas idênticas e **imóveis** atravessando a tela em intervalos
 * exatos leem como grade desenhada ou HUD de videogame, e grade é vetada pelo
 * PROJECT.md §2. O que separa estrutura de grade é o tempo — "de relance" é uma
 * coisa que acontece, não uma opacidade.
 *
 * Pelo mesmo motivo as marcas de intervalo correm em **dois períodos primos
 * entre si**, que nunca batem em fase dentro de uma tela: gravação em concreto
 * não é papel milimetrado.
 *
 * Opacidade baixa é permitida aqui — e só aqui. O DIRECTION.md §5 proíbe alpha
 * em qualquer coisa que carregue informação; estas linhas são ornamento, e se
 * sumirem ninguém perde um dado.
 */
export const STRUCTURE_VERT = /* glsl */ `
in vec3 aNormal;
in float aSeed;

out vec3  vWorld;
out vec3  vNormal;
out float vSeed;
out float vViewDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = aNormal;
  vSeed = aSeed;

  vec4 view = viewMatrix * world;
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const STRUCTURE_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

uniform vec3  uMist;
uniform vec3  uCyan;
uniform float uStructureBase;

in vec3  vWorld;
in vec3  vNormal;
in float vSeed;
in float vViewDepth;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}

void main() {
  // Rasante em 0.95: uma gravação de frente para o cacho quase não acende, e
  // uma pega de raspão acende. É a diferença entre uma marca no concreto e uma
  // linha desenhada por cima da imagem.
  float lit = practicalLight(vWorld, normalize(vNormal), 0.95);

  // Dois períodos primos: 7 e 11. Eles voltam a coincidir a cada 77 unidades,
  // que é mais do que cabe num quadro — então o olho nunca pega a fase.
  float beat = 0.5 + 0.5 * sin(vWorld.z * 0.9 + vSeed * 7.0)
                   * sin(vWorld.z * 0.63 + vSeed * 11.0);

  float glint = lit * (0.35 + 0.65 * beat);
  vec3 color = mix(uMist, uCyan, clamp(glint, 0.0, 1.0)) * (uStructureBase + glint * 1.9);

  color = applyFog(color, vViewDepth, vWorld);

  // O alfa também cai com a névoa: uma linha longe não deve furar o banco de
  // névoa que a esconde.
  float depthFade = exp(-vViewDepth * 0.018);
  float alpha = clamp((uStructureBase * 1.4 + glint) * depthFade, 0.0, 1.0);

  fragColor = vec4(color, alpha);
}
`;
