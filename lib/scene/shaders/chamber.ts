import {
  APERTURE_HALF_HEIGHT,
  APERTURE_HALF_WIDTH,
  APERTURE_Y,
  LOUVER_Z,
  louverPitch,
  louverShadowHalf,
  OUTSIDE_LIGHT,
  PLAN_FAR,
  WATER_LEVEL,
} from "../chamber-plan";
import { SPECIMEN_Z } from "../world";
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
 * ## A natureza que mora no concreto (rodada 16)
 *
 * Até a rodada 15 as paredes tinham réguas, marcas de intervalo, a seta de
 * escala e a cota do piso gravadas aqui, analiticamente. A câmara trocou a
 * medida pela natureza (decisão do Lucas, 2026-09-30), e três coisas moram
 * neste arquivo agora:
 *
 * - **a água** saiu daqui na rodada 22: o piso é coberto por um rio contínuo
 *   com reflexo de verdade (`components/scene/Water.tsx`);
 * - **o musgo e o líquen** (em `shadeConcrete`): manchas nas quinas baixas das
 *   paredes e nas bordas do piso que **acendem** quando o bando ou uma
 *   lanterna passa perto. É o organismo que emite, não a estrutura;
 * - os fósseis gravados são placas à parte (`Structure.tsx`) com o mesmo
 *   sombreamento, lido deste arquivo.
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
/** 1 no quadro (KIND_RIB), 0 no resto — escrito por quem chama, antes. */
float shadeKind = 0.0;
/** Quanto musgo há neste ponto — escrito pelo bloco do musgo, lido pelo amanhecer. */
float mossAmount = 0.0;

vec3 shadeConcrete(vec3 world, vec3 geomNormal, vec3 shadingNormal, float cavity, float viewDepth) {
#ifdef PROBE_BLACK
  // Só a sonda define isto (probe-chamber.ts, probe-round12.ts): o concreto sai
  // sem luz nenhuma — que desde a rodada 13 é a própria névoa, ver o piso no
  // fim desta função —, e a diferença para o quadro normal é a estrutura que a
  // luz faz atravessar a névoa até a lente. Em produção o bloco não existe.
  return fogColorAt(viewDepth, world);
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

  // **Água no concreto** (rodada 22). Manchas escorrendo do alto — o ruído é
  // esticado na vertical, então vira risco, não mancha —, e a faixa junto ao
  // rio escura e molhada. É o que faz a parede ser de um lugar úmido, e não uma
  // superfície de render.
  float streak = sceneNoise(vec3(world.z * 1.7 + world.x * 1.7, world.y * 0.11, 4.0));
  streak = smoothstep(0.5, 0.88, streak) * (1.0 - floorness) * (1.0 - ceilingness);
  float wetBand = (1.0 - floorness) * (1.0 - smoothstep(${f(WATER_LEVEL + 0.05)}, ${f(WATER_LEVEL + 1.4)}, world.y));
  albedo *= (1.0 - 0.35 * streak) * (1.0 - 0.5 * wetBand);

  // A luz do bando, **de alcance curto**. A estrutura aparece de relance, onde
  // um aglomerado passa rente, e some quando ele vai embora. Parede: rasante.
  // Piso: direta, porque o bando passa por cima dele. Teto: quase nada.
  float grazing = mix(mix(0.78, 0.30, floorness), 0.78, ceilingness);
  float lit = practicalLightNear(world, shadingNormal, grazing, 7.5);
  // **No quadro, a luz do bando é fraca** (rodada 13). Em Quem sou a coluna
  // do poleiro corre junto à parede de estibordo, rente aos quadros, e a face
  // interna de um deles acendia inteira e uniforme: com o concreto sem luz
  // sendo névoa, lia como um bloco solto aparecendo e sumindo no meio do
  // trajeto (apontado pelo Lucas; confirmado zerando esta luz). O quadro é
  // estrutura fina — ele recebe o relance, não a face acesa.
  lit *= mix(1.0, 0.3, shadeKind);
  float gain = mix(mix(2.6, 2.4, floorness), 0.5, ceilingness);
  // O tom da luz é o do aglomerado que passou (rodada 15): até a 14 era sempre
  // uCyan * 0.35, e com o bando colorido a parede continuava ciano.
  vec3 tint = practicalTintNear(world, shadingNormal, grazing, 7.5) * mix(1.0, 0.3, shadeKind);
  vec3 color = (albedo * 2.0 * lit + tint * 0.35) * gain;
  // As lanternas: poças de luz colorida em volta de quem rasteja pela câmara.
  vec3 lamp = lampLight(world);
  // O albedo do concreto é --abyss (~0.01 linear): multiplicado sozinho, a
  // poça não aparece. O termo constante é a luz espalhada pela umidade da
  // superfície, e é ele que dá a cor à poça.
  color += (albedo * 18.0 + 0.05) * lamp * mix(1.0, 0.5, ceilingness);

  // **O brilho molhado** (rodada 22). Onde a parede está molhada — a faixa
  // junto ao rio e os riscos de escorrimento —, a luz que passa deixa um
  // reflexo especular na superfície em relevo. Seco, o concreto é fosco.
  {
    float gloss = 0.12 + 0.88 * max(wetBand, streak * 0.55);
    vec3 V = normalize(cameraPosition - world);
    vec3 sheen = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec3 d = uClusters[i].xyz - world;
      vec3 H = normalize(normalize(d) + V);
      sheen += uClusterColor[i] * uClusters[i].w * pow(max(dot(shadingNormal, H), 0.0), 48.0)
        / (1.0 + dot(d, d) * 0.03);
    }
    color += sheen * gloss * 0.5;
  }

  // **Musgo e líquen** (rodada 16). Manchas nas quinas baixas das paredes e
  // nas bordas do piso, pontilhadas de líquen; brilho próprio fraquíssimo que
  // sobe quando a luz do bando ou de uma lanterna passa rente. Longe do corpo
  // de prova: na Identidade nada disputa com o descolamento.
  {
    float lowWall = (1.0 - floorness) * (1.0 - ceilingness) * (1.0 - smoothstep(-5.0, -1.0, world.y));
    float floorEdge = floorness * smoothstep(5.0, 9.5, abs(world.x));
    float corner = max(lowWall, floorEdge);
    float patchN = sceneNoise(world * 0.23 + vec3(7.1, 1.3, 4.2));
    float patchMask = smoothstep(0.62 - 0.22 * corner, 0.78 - 0.2 * corner, patchN);
    float speck = smoothstep(0.42, 0.78, sceneNoise(world * 4.3 + vec3(2.0))) * mix(0.55, 1.0, near);
    float quiet = 1.0 - 0.85 * exp(-pow((world.z - ${f(SPECIMEN_Z)}) / 9.0, 2.0));
    float moss = patchMask * (0.3 + 0.7 * speck) * (1.0 - 0.6 * shadeKind) * quiet;
    mossAmount = moss;
    if (moss > 0.0) {
      vec3 hue = mix(uCyan, uPeach, smoothstep(0.35, 0.7, sceneNoise(world * 0.07 + vec3(11.0))));
      // Rodada 22: mais sutil — metade da saturação e um piso quase nulo.
      hue = mix(hue, vec3(dot(hue, vec3(0.3333))), 0.45);
      float excite = 0.012 + 0.45 * lit + 1.2 * dot(lamp, vec3(0.3333));
      color += hue * moss * min(excite, 0.5) * 0.35;
    }
  }
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

  // **O concreto sem luz não é mais escuro que a névoa diante dele** (rodada
  // 13). Sem este piso, uma parede sem luz era preta debaixo da névoa, e a
  // quantidade de névoa — que cresce com a profundidade — pintava cada seção do
  // duto num tom: vista pelo eixo, a câmara virava retângulos concêntricos, o
  // salão do rio um retângulo claro emoldurado pelas paredes mais próximas
  // (apontado pelo Lucas em Quem sou). Com o piso, a parede sem luz é névoa, e
  // a estrutura aparece só onde a luz a toca e nas valas — fina, precisa e
  // discreta, como o PROJECT.md §2 descreve.
  // **O amanhecer** (rodada 18). De manhã o concreto é a própria névoa clara,
  // um passo mais escuro nas faces e no grão — e a luz do bando, das lanternas
  // e do cursor **tinge** a superfície em vez de acendê-la, que é como uma luz
  // colorida se lê sobre uma parede clara. O musgo é mancha verde-azulada, a
  // água escurece e espelha o céu claro.
  if (uDawn > 0.5) {
    vec3 air = fogColorAt(viewDepth, world);
    vec3 base = air * (0.5 + 0.2 * grain) * mix(mix(1.0, 0.85, floorness), 1.08, ceilingness);
    base *= 1.0 - 0.45 * cavity;
    base = mix(base, base * vec3(0.72, 0.84, 0.8), clamp(mossAmount * 1.4, 0.0, 1.0));
    vec3 light = tint * 0.35 * gain + lamp * 1.6;
    base = base * (1.0 + light * 1.6) + light * 0.1;
    return applyFog(base, viewDepth, world);
  }

  color = max(color, fogColorAt(viewDepth, world));

  // O fundo da vala não recebe nada de ninguém.
  color *= 1.0 - 0.62 * cavity;

  return applyFog(color, viewDepth, world);
}
`;

/**
 * O relevo do concreto. Desde a rodada 22 (a água) o piso não tem mais poças:
 * o rio é uma lâmina contínua à parte (`components/scene/Water.tsx`), com
 * reflexo de verdade. A função fica como o ponto em que a normal de
 * sombreamento nasce, e hoje é a da geometria.
 */
export const ENGRAVING_GLSL = /* glsl */ `
/**
 * **O relevo do concreto** (rodada 22). No lugar dos fósseis desenhados, a
 * própria superfície: três escalas de ruído (a ondulação larga de uma parede
 * que envelheceu, a média das emendas, a fina do grão), e pequenas cavidades
 * onde o relevo afunda. É a luz rasante do bando e das lanternas que o revela.
 */
float rockHeight(vec2 q) {
  return sceneNoise(vec3(q * 0.33, 1.7)) * 0.58
    + sceneNoise(vec3(q * 1.25, 5.1)) * 0.3
    + sceneNoise(vec3(q * 4.1, 9.3)) * 0.12;
}

vec3 engrave(vec3 world, vec3 n, float kind, out float cavity) {
  cavity = 0.0;
  if (kind > 0.5) return n;
  vec2 q;
  vec3 tu;
  vec3 tv;
  if (abs(n.x) > 0.7) {
    q = world.zy;
    tu = vec3(0.0, 0.0, 1.0);
    tv = vec3(0.0, 1.0, 0.0);
  } else if (abs(n.y) > 0.7) {
    q = world.xz;
    tu = vec3(1.0, 0.0, 0.0);
    tv = vec3(0.0, 0.0, 1.0);
  } else {
    return n;
  }
  const float e = 0.035;
  float h = rockHeight(q);
  float hu = (rockHeight(q + vec2(e, 0.0)) - h) / e;
  float hv = (rockHeight(q + vec2(0.0, e)) - h) / e;
  cavity = smoothstep(0.42, 0.18, h) * 0.3;
  return normalize(n - (tu * hu + tv * hv) * 0.3);
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
  shadeKind = step(0.5, vKind);
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
  // **Na descida o plano é a própria névoa** (rodadas 12 e 13): o brilho da
  // fonte mora na névoa (sourceHalo, em shaders/fog.ts), e um plano aceso — ou
  // preto — a cem unidades atrás da abertura lia como um retângulo atrás da
  // palavra da Emergência. Com a cor da névoa como cor própria ele some nela
  // em qualquer quantidade de névoa, como o concreto sem luz.
  vec3 color = mix(fogColorAt(vViewDepth, vWorld) + glow * 0.0, sky, uOutside);
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
