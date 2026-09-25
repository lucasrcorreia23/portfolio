import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";
import { AHEAD_HALF_WIDTH } from "./ahead";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "./lights";

/**
 * O corpo de prova — DIRECTION.md §5, "Corpo de prova (a tipografia)".
 *
 * **GLSL 1.00, não 3.00, e é obrigatório.** Este é o único material da cena que
 * não pode declarar o próprio `out`: o `troika-three-text` deriva o material
 * base e **injeta código que lê e escreve `gl_FragColor`**, além de declarar
 * `attribute vec4 aTroikaGlyphBounds` e `varying vec2 vTroikaGlyphUV` em
 * sintaxe antiga. Com `glslVersion: GLSL3` o three deixa de emitir o
 * `#define gl_FragColor pc_fragColor` e o texto injetado passa a referenciar um
 * símbolo que não existe. Então aqui se escreve `varying` e `gl_FragColor`, e
 * o three cuida da tradução para WebGL2.
 *
 * O troika também renomeia toda ocorrência de `position`, `normal` e `uv` para
 * poder rodar a transformada do quad do glifo antes da nossa — inclusive em
 * variáveis locais. Nenhum nome aqui colide com os três de propósito.
 *
 * **Fosco e não emissivo.** Base `--deep`, um passo só acima do valor da névoa.
 * Ele é a coisa sólida da cena: tudo o mais é luz ou ar.
 *
 * **O rim de fresnel é o beat inteiro em uma linha.** A intensidade dele vem da
 * densidade local do bando à frente da peça (do proxy da CPU), não de um
 * temporizador: as letras clareiam **porque o bando está perto**, e é isso que
 * faz a luz nascer de dentro da cena em vez de vir de um `box-shadow`.
 */
export const SPECIMEN_VERT = /* glsl */ `
varying vec3  vWorld;
varying vec3  vNormal;
varying vec3  vView;
varying float vViewDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);

  vec4 view = viewMatrix * world;
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const SPECIMEN_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

// uDeep já vem de FOG_UNIFORMS_GLSL — redeclarar é erro de compilação.
uniform vec3  uCyan;
/** Densidade do bando imediatamente a montante da peça, 0 a 1, vinda do proxy. */
uniform float uFlockAhead;
/** Corpos diante da face, por coluna, contados na GPU (shaders/ahead.ts). */
uniform sampler2D uAheadField;
uniform float uAheadReady;
/** A névoa da palavra inteira na Emergência — ver specimenFogFlat em uniforms.ts. */
uniform float uSpecimenFogDepth;
uniform float uSpecimenFogFlat;

varying vec3  vWorld;
varying vec3  vNormal;
varying vec3  vView;
varying float vViewDepth;

${FOG_GLSL}
${LIGHTS_GLSL}

void main() {
  vec3 normal = normalize(vNormal);
  // A peça tem espessura zero e é DoubleSide: a face de trás precisa da normal
  // virada, senão a esteira mostra um lado apagado.
  if (!gl_FrontFacing) normal = -normal;

  // Fosca: quase toda a resposta é difusa e fraca, sem realce especular.
  float diffuse = practicalLight(vWorld, normal, 0.15);
  // "Um passo só acima do valor da névoa" (DIRECTION.md §5): a névoa perto da
  // lente escurece para --void, então a base precisa passar de --deep para a
  // face não ler como buraco contra o fundo, que é névoa clara.
  vec3 base = uDeep * (1.1 + 1.4 * diffuse);

  // O rim, e por que ele não pode ser **só** fresnel.
  //
  // A peça é um plano de espessura zero. De face, dot(normal, vista) vale
  // quase 1 e o fresnel vale quase zero — ou seja, exatamente no quadro que
  // importa o rim não acenderia. Fresnel sozinho é a fórmula certa para um
  // volume e a errada para uma lâmina.
  //
  // Então são dois termos com papéis distintos, e os dois dirigidos pela mesma
  // densidade do bando: o fresnel manda na **entrada de perfil**, onde o ângulo
  // é rasante e a aresta é tudo que se vê; o termo plano manda de face, e é o
  // que faz as letras clarearem **porque o bando está perto** — que é como o
  // DIRECTION.md §5 quer que a luz nasça de dentro da cena.
  float fresnel = pow(1.0 - clamp(abs(dot(normal, normalize(vView))), 0.0, 1.0), 3.0);

  // **Por letra, e da GPU.** A contagem de corpos diante da face, na coluna
  // desta letra (shaders/ahead.ts). Satura suave: dez corpos encostados já são
  // "o bando está aqui". Sem o campo pronto, cai para a leitura agregada do
  // proxy, que era a única até a rodada 8.
  float u = clamp((vWorld.x + ${AHEAD_HALF_WIDTH.toFixed(3)}) / ${(2 * AHEAD_HALF_WIDTH).toFixed(3)}, 0.0, 1.0);
  float column = texture2D(uAheadField, vec2(u, 0.5)).r;
  // Medido na rodada 8, por coluna: 0 a 10 corpos diante da face em 0.18, 20 a
  // 100 em 0.24, zero nas pontas (C e A ficam fora do tubo do bando). Cinco
  // corpos já acendem dois terços do rim.
  float ahead = mix(uFlockAhead, 1.0 - exp(-column / 5.0), uAheadReady);

  base += uCyan * (fresnel * 1.1 + 0.18) * (0.14 + 1.9 * ahead);

  base += uSourceColor * upstreamLight(vWorld) * 0.35;

#ifdef PROBE_BLACK
  // Só a sonda define isto (probe-round12.ts, flatRegions): a face sai preta
  // antes da névoa. Em produção o bloco não existe no programa compilado.
  base = vec3(0.0);
#endif
  base = applyFog(base, mix(vViewDepth, uSpecimenFogDepth, uSpecimenFogFlat), vWorld);

  // Alfa 1.0: quem o multiplica pela borda macia do glifo é o troika, no
  // trecho que ele injeta depois desta linha.
  gl_FragColor = vec4(base, 1.0);
}
`;
