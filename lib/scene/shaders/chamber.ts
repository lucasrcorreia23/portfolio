import {
  APERTURE_HALF_HEIGHT,
  APERTURE_HALF_WIDTH,
  APERTURE_Y,
  LONE_MARK_Z,
  LOUVER_Z,
  louverPitch,
  louverShadowHalf,
  OUTSIDE_LIGHT,
  PLAN_FAR,
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

/**
 * A luz de fora — a Superfície (DIRECTION.md §4). Dois termos, e os dois só
 * existem com `uOutside` acima de zero:
 *
 * - **a lâmina**: luz direta, entrando pelas frestas das venezianas. Um ponto
 *   é aceso se, voltando ao longo da luz até o plano das lâminas, ele cai numa
 *   fresta — as mesmas bordas de `louverGaps()`, então a faixa acesa na soleira
 *   e o feixe no ar (`BEAM_*` abaixo) saem do mesmo recorte;
 * - **o céu**: a abertura inteira como luz de área, fraca e difusa. É o que faz
 *   a câmara do último quadro ser "vazia, com luz" e não um recorte aceso numa
 *   parede preta.
 */
export const OUTSIDE_GLSL = /* glsl */ `
const vec3 OUTSIDE_L = vec3(${f(OUTSIDE_LIGHT[0])}, ${f(OUTSIDE_LIGHT[1])}, ${f(OUTSIDE_LIGHT[2])});

float louverOpen(vec3 p) {
  // No requadro a própria aleta decide: quem está virado para a luz a recebe.
  if (p.z < ${f(PLAN_FAR + 0.02)}) return 1.0;
  float t = (p.z - ${f(LOUVER_Z)}) / OUTSIDE_L.z;
  vec3 back = p - OUTSIDE_L * t;
  // A penumbra cresce com a distância: a fresta projetada a oito unidades não
  // tem a borda que tem na soleira.
  float soft = 0.015 + 0.012 * t;
  float x0 = ${f(-APERTURE_HALF_WIDTH)};
  float inX = smoothstep(x0 - soft, x0 + soft, back.x) * (1.0 - smoothstep(-x0 - soft, -x0 + soft, back.x));
  float y0 = ${f(APERTURE_Y - APERTURE_HALF_HEIGHT)};
  float y1 = ${f(APERTURE_Y + APERTURE_HALF_HEIGHT)};
  float inY = smoothstep(y0 - soft, y0 + soft, back.y) * (1.0 - smoothstep(y1 - soft, y1 + soft, back.y));
  float pitch = ${f(louverPitch())};
  float k = clamp(floor((back.x - x0) / pitch), 0.0, ${f(Math.round((APERTURE_HALF_WIDTH * 2) / louverPitch()) - 1)});
  float d = abs(back.x - (x0 + pitch * (k + 0.5)));
  float open = smoothstep(${f(louverShadowHalf())} - soft, ${f(louverShadowHalf())} + soft, d);
  return inX * inY * open;
}

/** Luz de fora que chega a um ponto, já com incidência. */
float outsideLight(vec3 p, vec3 n) {
  if (uOutside <= 0.0) return 0.0;
  float direct = louverOpen(p) * max(dot(n, -OUTSIDE_L), 0.0);
  vec3 toSky = vec3(0.0, ${f(APERTURE_Y)}, ${f(LOUVER_Z)}) - p;
  float d2 = dot(toSky, toSky);
  vec3 dir = toSky * inversesqrt(max(d2, 1e-4));
  // A abertura olha para dentro (+z); a área é a das frestas, não a do
  // requadro inteiro.
  float sky = max(dot(n, dir), 0.0) * max(-dir.z, 0.0) * 18.0 / (3.14159 * d2 + 18.0);
  return uOutside * (direct * 1.6 + sky * 0.45);
}
`;

/** O concreto: papel da superfície, ambiente, luz do bando, fonte, névoa. */
export const CONCRETE_GLSL = /* glsl */ `
${OUTSIDE_GLSL}
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

  // A luz de fora (Superfície). Mesmo albedo, cor dela, e um piso que não é
  // ambiente: é o concreto claro de uma soleira ao sol, que continua concreto.
  // A vala sob a luz de fora escurece mais que sob a do bando: é luz de cima,
  // e o fundo de um sulco não a vê. É o que torna a cota da soleira legível
  // atravessada pelas faixas das frestas.
  color += uPeach * (albedo * 6.0 + 0.012) * outsideLight(world, shadingNormal) * (1.0 - 0.75 * cavity);

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
  // **Na descida, um brilho que não chega à borda da abertura.** A versão
  // anterior caía a zero a 7.5 unidades do eixo, num requadro de 4.2 × 2.6: a
  // borda da abertura ficava acesa e, vista de longe através do título, lia
  // como um quadrilátero translúcido — o crítico da rodada 9.5 apontou em
  // 0.14–0.167. Agora a elipse morre antes do requadro, e o que se vê de longe
  // é névoa acesa sem aresta.
  vec2 q = (vWorld.xy - vec2(0.0, ${f(APERTURE_Y)})) / vec2(1.5, 1.0);
  float radial = 1.0 - smoothstep(0.0, 2.8, length(q));
  // Duas oitavas de ruído para a fonte não ser um disco perfeito: o que se vê
  // a essa distância é névoa acesa, não uma lâmpada.
  float broken = 0.55 + 0.45 * sceneNoise(vWorld * 0.09 + vec3(0.0, 0.0, uTime * 0.04));
  vec3 glow = uSourceColor * radial * radial * broken * (0.05 + uSourceStrength);

  // **Na Superfície, o céu.** O que está do lado de fora da tomada de ar não
  // tem foco (DIRECTION.md §3: "o fora ainda não tem foco") — é por isso que
  // este plano fica cinco unidades atrás das venezianas, onde a abertura da DOF
  // o desmancha. Mais claro em cima, como um céu visto de baixo, e acima de 1.0
  // para o bloom pegar a fresta: é a outra coisa, além dos corpos, que o
  // DIRECTION.md §5 deixa florescer.
  float up = smoothstep(-4.0, 7.0, vWorld.y);
  vec3 sky = uPeach * (1.3 + 1.6 * up) * (0.85 + 0.3 * broken);
  // **Na descida o plano não tem luz própria** (rodada 12): o brilho da fonte
  // mora na névoa agora (sourceHalo, em shaders/fog.ts), e um plano aceso a
  // cem unidades atrás da abertura lia como um retângulo atrás da palavra da
  // Emergência. O glow fica calculado só para a Superfície não mudar.
  vec3 color = mix(glow * 0.0, sky, uOutside);
  color = applyFog(color, vViewDepth, vWorld);

  fragColor = vec4(color, 1.0);
}
`;

/**
 * As lâminas de luz no ar — "luz de fora entrando em lâminas, com `--peach`
 * atravessando a névoa" (DIRECTION.md §4).
 *
 * Uma por fresta, e cada uma é um **prisma**: a fresta extrudada ao longo da
 * luz até onde ela bate (piso ou soleira, resolvido na montagem). O fragmento
 * não pinta a face do prisma: ele resolve analiticamente quanto do raio de
 * visão atravessa o prisma e acende proporcional a isso. É o que faz uma
 * lâmina vista de lado ser um fio claro e vista de frente um véu fraco — que é
 * como luz em névoa se comporta, e o oposto de um quad aditivo, que teria o
 * mesmo brilho de qualquer ângulo.
 *
 * Não é fumaça (DIRECTION.md §6): nada aqui é advectado, a lâmina não se move,
 * e o grão dela é o mesmo ruído parado da névoa.
 */
export const BEAM_VERT = /* glsl */ `
in vec3 aOrigin;
in float aWidth;
in float aLength;

out vec3 vWorld;
out float vViewDepth;
flat out vec3 vOrigin;
flat out float vWidth;
flat out float vLength;

uniform float uOutside;

const vec3 OUTSIDE_L = vec3(${f(OUTSIDE_LIGHT[0])}, ${f(OUTSIDE_LIGHT[1])}, ${f(OUTSIDE_LIGHT[2])});
const float BEAM_HEIGHT = ${f(APERTURE_HALF_HEIGHT * 2)};

void main() {
  vOrigin = aOrigin;
  vWidth = aWidth;
  vLength = aLength;
  // position é o cubo unitário: x através da fresta, y ao longo dela (a
  // altura da abertura), z ao longo da luz.
  vec3 world = aOrigin
    + vec3(position.x * aWidth, position.y * BEAM_HEIGHT, 0.0)
    + OUTSIDE_L * (position.z * aLength);
  vWorld = world;
  vec4 view = viewMatrix * vec4(world, 1.0);
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
  // Sem luz de fora, nenhum fragmento: o prisma colapsa fora do volume de recorte.
  if (uOutside <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

export const BEAM_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}

in vec3 vWorld;
in float vViewDepth;
flat in vec3 vOrigin;
flat in float vWidth;
flat in float vLength;

out vec4 fragColor;

${FOG_GLSL}

const vec3 OUTSIDE_L = vec3(${f(OUTSIDE_LIGHT[0])}, ${f(OUTSIDE_LIGHT[1])}, ${f(OUTSIDE_LIGHT[2])});
const float BEAM_HEIGHT = ${f(APERTURE_HALF_HEIGHT * 2)};

/** Mundo → coordenadas do prisma, em que ele é o cubo [0, 1]³. Afim. */
vec3 toLocal(vec3 d) {
  float w = d.z / (OUTSIDE_L.z * vLength);
  float u = (d.x - w * vLength * OUTSIDE_L.x) / vWidth;
  float v = (d.y - w * vLength * OUTSIDE_L.y) / BEAM_HEIGHT;
  return vec3(u, v, w);
}

void main() {
  vec3 ro = toLocal(cameraPosition - vOrigin);
  vec3 rdWorld = normalize(vWorld - cameraPosition);
  vec3 rd = toLocal(rdWorld);
  vec3 inv = 1.0 / rd;
  vec3 a = (vec3(0.0) - ro) * inv;
  vec3 b = (vec3(1.0) - ro) * inv;
  vec3 lo = min(a, b);
  vec3 hi = max(a, b);
  float t0 = max(max(max(lo.x, lo.y), lo.z), 0.0);
  float t1 = min(min(hi.x, hi.y), hi.z);
  // t está em unidades de mundo: a transformação é afim e rdWorld é unitário.
  float path = max(t1 - t0, 0.0);
  vec3 mid = ro + rd * (0.5 * (t0 + t1));

  // Bordas macias nas quatro faces longas, e a lâmina se apagando ao longo do
  // caminho: ela espalha luz na névoa conforme avança.
  float edge = smoothstep(0.0, 0.3, mid.x) * smoothstep(1.0, 0.7, mid.x)
             * smoothstep(0.1, 0.55, mid.y) * smoothstep(1.0, 0.85, mid.y);
  float fall = exp(-mid.z * 2.4) * smoothstep(0.0, 0.05, mid.z);
  vec3 midWorld = cameraPosition + rdWorld * (0.5 * (t0 + t1));
  float dust = 0.6 + 0.8 * sceneNoise(midWorld * 0.9);

  float lit = (1.0 - exp(-path * 0.9)) * edge * fall * dust * uOutside;
  // O caminho entre a lente e a lâmina também tem névoa.
  float seen = exp(-uFogDensity * 0.5 * t0);
  fragColor = vec4(uPeach * lit * 0.32 * seen, 1.0);
}
`;
