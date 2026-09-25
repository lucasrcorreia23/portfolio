import {
  APERTURE_Y,
  LONE_MARK_Z,
  RULE_FROM,
  RULE_TO,
  RULES,
} from "../chamber-plan";
import { SPECIMEN_CAP_HEIGHT, SPECIMEN_Z } from "../world";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "./lights";

/**
 * O concreto da câmara, as gravações dele, e a fonte distante a montante.
 *
 * ## Nada aqui emite
 *
 * DIRECTION.md §5, "Estrutura": planos foscos, base `--abyss`, gravações em
 * normal e height map, **nunca** emissivo próprio — existem como realce de
 * raspão quando o bando passa. O único termo que não vem de luz é um ambiente
 * baixo proporcional ao próprio albedo (a luz que o bando já jogou nas outras
 * paredes voltando), e ele é menor no teto, que não recebe luz de ninguém.
 *
 * ## Piso, parede e teto não são o mesmo material
 *
 * A caixa antiga pintava as seis faces igual, e uma câmara real lê porque não é
 * assim: o piso recebe a luz do bando que passa por cima dele (incidência
 * direta, lambertiana), a parede a recebe de raspão, e o teto quase não a
 * recebe. O papel sai da normal da geometria, então os quadros e os nichos
 * herdam a regra sem precisar de atributo.
 *
 * ## As gravações são um campo de altura, não linhas
 *
 * A estrutura antiga era `lineSegments` em blending aditivo — o oposto de
 * recessado: aditivo acende a face. Aqui cada régua, marca de intervalo, cota
 * do piso e seta de escala é uma **vala** com chanfro, descrita por distância
 * ao eixo dela. O shader deriva a normal do gradiente do campo, então o chanfro
 * pega a luz rasante e o fundo da vala escurece — "o brilho pega a quina da
 * gravação, não a face" (DIRECTION.md §2). Os números gravados são placas à
 * parte (`Structure.tsx`) com o mesmo sombreamento, lido deste mesmo arquivo.
 *
 * Os dois períodos das marcas continuam 7 e 11: primos entre si, voltam a
 * coincidir a cada 77 unidades, mais do que cabe num quadro.
 */

const f = (n: number) => n.toFixed(4);

/** O concreto: papel da superfície, ambiente, luz do bando, fonte, névoa. */
export const CONCRETE_GLSL = /* glsl */ `
uniform vec3 uWallColor;
uniform vec3 uCyan;

/**
 * geomNormal decide o papel (piso, parede, teto); shadingNormal é a normal já
 * perturbada pela gravação; cavity é quanto o ponto está dentro de uma vala,
 * de 0 a 1.
 */
vec3 shadeConcrete(vec3 world, vec3 geomNormal, vec3 shadingNormal, float cavity, float viewDepth) {
#ifdef PROBE_BLACK
  // Só a sonda define isto (probe-chamber.ts): o concreto sai preto antes da
  // névoa, e a diferença para o quadro normal é a estrutura que atravessa a
  // névoa até a lente. Em produção o bloco não existe no programa compilado.
  return applyFog(vec3(0.0), viewDepth, world);
#endif
  float floorness = smoothstep(0.55, 0.85, geomNormal.y);
  float ceilingness = smoothstep(0.55, 0.85, -geomNormal.y);

  // O concreto tem grão. A oitava fina cai com a distância: sem isso ela alias
  // a partir de umas trinta unidades e a parede vira moiré de grade, que o
  // PROJECT.md §2 veta.
  float near = exp(-viewDepth * 0.05);
  float grain = sceneNoise(world * 0.62) * near * 0.45 + sceneNoise(world * 0.18) * 0.55;
  // O piso é mais áspero e tem manchas largas: foi pisado.
  float stain = sceneNoise(world * vec3(0.11, 0.0, 0.07) + vec3(3.1, 0.0, 1.7));
  grain = mix(grain, grain * (0.7 + 0.6 * stain), floorness);

  // **Nenhum termo ambiente.** A rodada 7 acendeu a câmara inteira para provar
  // que ela existia, e o resultado foi a parede ser a maior superfície clara do
  // quadro — dava para ler a câmara inteira em todo quadro, que é exatamente o
  // "a névoa está fina demais" do DIRECTION.md §2. Agora o albedo só modula a
  // luz que chega; longe do bando a parede é preta debaixo da névoa, ou seja é
  // a névoa.
  vec3 albedo = uWallColor * (0.55 + 0.9 * grain * mix(1.0, 0.45, ceilingness));

  // A luz do bando, **de alcance curto**. A estrutura aparece de relance, onde
  // um aglomerado passa rente, e some quando ele vai embora. Parede: rasante.
  // Piso: direta, porque o bando passa por cima dele. Teto: quase nada.
  float grazing = mix(mix(0.78, 0.30, floorness), 0.78, ceilingness);
  float lit = practicalLightNear(world, shadingNormal, grazing, 7.5);
  float gain = mix(mix(2.6, 2.4, floorness), 0.5, ceilingness);
  vec3 color = (albedo * 2.0 + uCyan * 0.35) * lit * gain;
  // A fonte a montante, com incidência. Ela entra pela abertura do fundo, então
  // uma superfície tem que estar **de frente** para a abertura para recebê-la —
  // sem este termo a parede do fundo, coplanar à abertura, recebia a luz
  // inteira e saía mais clara que a própria fonte (medido na primeira folha da
  // rodada 7, em 0.85). O piso de 0.15 é o espalhamento da névoa.
  // As paredes laterais recebem a mesma luz **de raspão**: ela corre rente a
  // elas pelo duto inteiro. Só perto da abertura (menos de dez unidades) o
  // raspão some — ali a parede do fundo está no plano da fonte.
  vec3 toSourceRaw = vec3(0.0, ${f(APERTURE_Y)}, uSourceZ - 1.0) - world;
  vec3 toSource = normalize(toSourceRaw);
  float along = dot(shadingNormal, toSource);
  // O raspão só existe em superfície **paralela** ao eixo (parede, piso, teto).
  // A parede do fundo é perpendicular a ele e coplanar à abertura: sem o
  // (1 − |n.z|) ela recebia raspão em tudo que estivesse a mais de seis
  // unidades da abertura, e virava um retângulo aceso no fim do duto.
  float rake = (1.0 - abs(along)) * smoothstep(6.0, 14.0, length(toSourceRaw))
    * (1.0 - abs(geomNormal.z));
  float facing = 0.15 + 0.85 * max(along, 0.0) + 0.75 * rake;
  // Fraquíssima, como o DIRECTION.md §4 pede da Emergência até 0.85.
  color += uSourceColor * upstreamLight(world) * 0.3 * facing * mix(1.0, 0.4, ceilingness);

  // O fundo da vala não recebe nada de ninguém.
  color *= 1.0 - 0.62 * cavity;

  return applyFog(color, viewDepth, world);
}
`;

/**
 * As gravações analíticas. Constantes do `chamber-plan.ts` coladas como número:
 * a planta é a fonte única, e o shader lê dela na compilação.
 */
const rulesGLSL = RULES.map(
  (rule) =>
    `  if (side * ${f(rule.side)} > 0.0) h = max(h, ruleGroove(z, y, ${f(rule.y)}));`,
).join("\n");

export const ENGRAVING_GLSL = /* glsl */ `
float groove(float d, float halfWidth, float chamfer) {
  return 1.0 - smoothstep(halfWidth, halfWidth + chamfer, d);
}

float segDistance(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}

/** Uma régua: a vala longa e as marcas de intervalo em 7 e 11. */
float ruleGroove(float z, float y, float ruleY) {
  if (z > ${f(RULE_FROM)} || z < ${f(RULE_TO)}) return 0.0;
  float h = groove(abs(y - ruleY), 0.028, 0.034);
  float d7 = abs(mod(z + 3.5, 7.0) - 3.5);
  float d11 = abs(mod(z + 5.5, 11.0) - 5.5);
  float dy = y - ruleY;
  float t7 = dy >= 0.0 && dy <= 0.42 ? d7 : 1e3;
  float t11 = dy >= 0.0 && dy <= 0.95 ? d11 : 1e3;
  h = max(h, groove(min(t7, t11), 0.022, 0.03));
  return h;
}

/**
 * O campo de altura das paredes laterais: 0 na face, 1 no fundo da vala.
 * side é −1 a bombordo, +1 a estibordo; (z, y) são as coordenadas na parede.
 */
float wallEngraving(float side, float z, float y) {
  float h = 0.0;
${rulesGLSL}

  // A marca solitária da Emergência — uma só, a bombordo.
  if (side < 0.0) {
    h = max(h, groove(segDistance(vec2(z, y), vec2(${f(LONE_MARK_Z)}, -1.1), vec2(${f(LONE_MARK_Z)}, -0.2)), 0.024, 0.03));

    // A seta de escala do corpo de prova: haste na altura de caixa alta, as
    // duas pontas abertas e as linhas de chamada. "O título é dimensionado
    // como peça de ensaio" (DIRECTION.md §4).
    float zc = ${f(SPECIMEN_Z + 1.4)};
    float top = ${f(SPECIMEN_CAP_HEIGHT / 2)};
    vec2 p = vec2(z, y);
    float d = segDistance(p, vec2(zc, -top), vec2(zc, top));
    d = min(d, segDistance(p, vec2(zc, top), vec2(zc - 0.16, top - 0.34)));
    d = min(d, segDistance(p, vec2(zc, top), vec2(zc + 0.16, top - 0.34)));
    d = min(d, segDistance(p, vec2(zc, -top), vec2(zc - 0.16, -top + 0.34)));
    d = min(d, segDistance(p, vec2(zc, -top), vec2(zc + 0.16, -top + 0.34)));
    d = min(d, segDistance(p, vec2(zc - 0.6, top), vec2(zc + 1.6, top)));
    d = min(d, segDistance(p, vec2(zc - 0.6, -top), vec2(zc + 1.6, -top)));
    h = max(h, groove(d, 0.022, 0.03));
  }
  return h;
}

/** O piso: a cota correndo pelo eixo, com as marcas de estação a cada 11. */
float floorEngraving(float x, float z) {
  if (z > ${f(RULE_FROM)} || z < ${f(RULE_TO)}) return 0.0;
  float h = groove(abs(x + 2.6), 0.03, 0.04);
  float d11 = abs(mod(z + 5.5, 11.0) - 5.5);
  h = max(h, abs(x + 2.6) < 0.375 ? groove(d11, 0.026, 0.035) : 0.0);
  return h;
}

/** A profundidade física da vala, em unidades — o que vira inclinação da normal. */
const float ENGRAVING_DEPTH = 0.035;

/**
 * Perturba a normal pela gravação. Diferenças finitas do campo: três avaliações
 * de um campo analítico barato, contra uma textura que precisaria de resolução
 * de parede inteira.
 */
vec3 engrave(vec3 world, vec3 n, float kind, out float cavity) {
  cavity = 0.0;
  if (kind > 0.5) return n;
  const float e = 0.008;
  if (abs(n.x) > 0.9) {
    float side = sign(n.x) * -1.0;
    float h = wallEngraving(side, world.z, world.y);
    if (h <= 0.0 && wallEngraving(side, world.z + 0.06, world.y) <= 0.0
        && wallEngraving(side, world.z, world.y + 0.06) <= 0.0) return n;
    float hz = (wallEngraving(side, world.z + e, world.y) - h) / e;
    float hy = (wallEngraving(side, world.z, world.y + e) - h) / e;
    cavity = h;
    return normalize(n + ENGRAVING_DEPTH * vec3(0.0, hy, hz));
  }
  if (n.y > 0.9) {
    float h = floorEngraving(world.x, world.z);
    if (h <= 0.0 && floorEngraving(world.x + 0.06, world.z) <= 0.0
        && floorEngraving(world.x, world.z + 0.06) <= 0.0) return n;
    float hx = (floorEngraving(world.x + e, world.z) - h) / e;
    float hz = (floorEngraving(world.x, world.z + e) - h) / e;
    cavity = h;
    return normalize(n + ENGRAVING_DEPTH * vec3(hx, 0.0, hz));
  }
  return n;
}
`;

export const CHAMBER_VERT = /* glsl */ `
in float aKind;

out vec3 vWorld;
out vec3 vNormal;
out float vViewDepth;
out float vKind;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vKind = aKind;

  vec4 view = viewMatrix * world;
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const CHAMBER_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

in vec3 vWorld;
in vec3 vNormal;
in float vViewDepth;
in float vKind;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}
${CONCRETE_GLSL}
${ENGRAVING_GLSL}

void main() {
  vec3 n = normalize(vNormal);
  float cavity;
  vec3 shading = engrave(vWorld, n, vKind, cavity);
  fragColor = vec4(shadeConcrete(vWorld, n, shading, cavity, vViewDepth), 1.0);
}
`;

/**
 * A fonte distante a montante — a tampa do fundo do duto.
 *
 * "Uma fonte distante a montante, fraquíssima, `--teal`" (DIRECTION.md §4,
 * Emergência). É o que dá ao duto um fim que não é um buraco preto, e é a luz
 * para a qual a descida inteira está andando.
 */
export const SOURCE_VERT = /* glsl */ `
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

  fragColor = vec4(color, 1.0);
}
`;
