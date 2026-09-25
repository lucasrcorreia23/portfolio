import { MAX_CARDS } from "../cards";
import { OUTSIDE_GLSL } from "./chamber";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * Os corpos do bando — DIRECTION.md §5, "Corpos".
 *
 * Corpo lenticular de poucos triângulos, sem asa animada, sem silhueta
 * ornitológica. A orientação segue a velocidade e o brilho segue a aceleração.
 *
 * **Opacos, com escrita de profundidade.** É o ponto que decide o beat inteiro.
 * O caminho intuitivo para um corpo emissivo é `AdditiveBlending`, e ele é uma
 * armadilha: o three só honra uma equação de blend quando `transparent` é
 * `true`, e material transparente sai da lista opaca e passa a ser ordenado por
 * objeto, com `depthWrite: false` na prática. Um `InstancedBufferGeometry`
 * inteiro tem um centroide só — ou seja, ou o bando todo fica na frente das
 * letras, ou o bando todo fica atrás. **Nenhum corpo poderia estar dos dois
 * lados**, que é exatamente o critério de aceite deste prompt, e nenhum ajuste
 * de `renderOrder` conserta: a divisão opaco/transparente acontece antes de
 * qualquer ordenação.
 *
 * O brilho vem de outro lugar: a cor sai em HDR linear (2 a 4×) num alvo de
 * meio-float, e o bloom pega o que passa de 1.0. É o que o DIRECTION.md §5
 * quer dizer com "bloom apertado e com threshold alto" — bloom é o transbordo,
 * não o efeito.
 */
/**
 * **Nenhum indivíduo é legível** (DIRECTION.md §2) — o teto de tamanho na tela.
 *
 * Até a rodada 11 o corpo tinha tamanho fixo em mundo e só encolhia nos
 * últimos três metros (`lensGuard`), e o comprimento projetado crescia com
 * 1/d: ~18 px a dez unidades, ~69 px a 2.25 (~110 px esticado), num 1440×900.
 * Perto da lente cada corpo virava um losango nítido, e o bando lia como
 * confete. Agora o comprimento na tela tem teto, em **pixels de CSS**: o corpo
 * é encolhido para caber nele a qualquer distância, e além disso apaga e some
 * perto da lente (`BODY_NEAR_GONE` a `BODY_NEAR_FULL`). 3.5 × 2 e não 6: o
 * critério do Lucas é "nenhum corpo acima de 6 px", e o que a medição lê é o
 * corpo **mais** o antisserrilhado, o desfoque e o halo de bloom de um corpo
 * denso — com 5 px de comprimento ela deu 6.3, com 4 × 2.5 deu 8.6 no poleiro.
 */
export const BODY_MAX_PX = 3.5;
/** A largura na tela, em pixels de CSS — o grão tem corpo, não é um fio. */
export const BODY_MAX_WIDTH_PX = 2;
/** Abaixo disto o corpo não existe; acima de FULL ele tem o brilho inteiro. */
export const BODY_NEAR_GONE = 1;
export const BODY_NEAR_FULL = 3.5;

export const BODY_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uBodyScale;
uniform float uForming;
/** A distância focal em pixels de CSS: altura da janela ÷ (2 · tan(fov/2)). */
uniform float uFocalPx;

in vec2 aRef;

out vec3  vWorld;
out float vViewDepth;
out float vEnergy;
out float vDensity;
out float vAlong;
out float vNear;

void main() {
  vec4 P = texture(uPos, aRef);
  vec4 V = texture(uVel, aRef);

  vec3 center = P.xyz;
  vDensity = P.w;
  vEnergy  = V.w;

  // Base ortonormal a partir **só** da velocidade — nunca da câmera.
  //
  // A versão anterior orientava a lasca de frente para a câmera, como um
  // billboard, e isso é uma armadilha exata para esta cena: o bando vem *na
  // direção* da câmera, então forward e a direção da vista ficam paralelos, o
  // cross entre os dois degenera, e o plano da lasca passa a conter a
  // direção do olhar. Área projetada zero. Quatro mil corpos desenhados e nem
  // um fragmento rasterizado — a mesma armadilha dos 90° que o DIRECTION.md §5
  // descreve para o corpo de prova, aqui nos corpos.
  //
  // Um corpo lenticular não tem esse problema porque é volume, não plano. A
  // referência para o eixo lateral é o mundo, e só cai para outro eixo quando o
  // voo é exatamente vertical.
  vec3 forward = normalize(V.xyz + vec3(0.0, 1e-4, 1e-4));
  vec3 reference = abs(forward.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(reference, forward));
  vec3 up    = cross(forward, right);

  // Corpos mais rápidos esticam um pouco — é o mesmo que o olho lê como
  // velocidade num rastro curto, sem virar borrão de movimento.
  // Sorteio estável: o mesmo corpo é escolhido em todo quadro, então a
  // população cresce sem ninguém piscar. Três por cento no escuro absoluto,
  // todos com o bando formado.
  float lot = fract(sin(dot(aRef, vec2(12.9898, 78.233))) * 43758.5453);
  // A rampa é cúbica, não linear: na Emergência "uns poucos corpos isolados"
  // são poucos de verdade — a 0.05 de progresso entram ~7% da população, não
  // um terço dela.
  // O piso é 3.5% e não 2%: é ele que dá vida ao portão, que desde a rodada
  // 9.5 mostra a câmara de verdade pelas frestas — "uns poucos corpos isolados"
  // da Emergência, adiantados para trás da veneziana.
  float admit = step(lot, 0.035 + 0.965 * pow(uForming, 2.5));
#ifdef PROBE_SUBSET
  // Só a sonda liga (rodada 12, bodyExtent): desenha 1 corpo em PROBE_SUBSET,
  // para os corpos medidos não se sobreporem no quadro. Em produção o bloco
  // não existe no programa compilado.
  admit *= step(fract(lot * 97.13), 1.0 / float(PROBE_SUBSET));
#endif

  // **Perto da lente o corpo encolhe e apaga até sumir** — o bando passa pela
  // câmera como névoa, não como lascas do tamanho da tela. A mesma rampa
  // escurece o fragmento (vNear), então ele some por tamanho e por brilho.
  vec3 viewCenter = (viewMatrix * vec4(center, 1.0)).xyz;
  float viewDepth = -viewCenter.z;
  float near = smoothstep(${BODY_NEAR_GONE.toFixed(2)}, ${BODY_NEAR_FULL.toFixed(2)}, viewDepth);
  vNear = near;
  // Quem saiu pela tomada de ar está estacionado longe de tudo (ver PARKED em
  // shaders/boids.ts): não desenha nada.
  float alive = step(-400.0, center.y);

  float stretch = 1.0 + vEnergy * 0.6;
  // O teto de tamanho, **por eixo**. O comprimento (nariz a cauda, esticado)
  // não passa de BODY_MAX_PX; a largura não passa de BODY_MAX_WIDTH_PX, e ela
  // **não** encolhe junto com o comprimento. Encolher o corpo inteiro por um
  // fator só deixava um traço de 4 px com 0.6 px de largura — sub-pixel, e o
  // bando sumia da tela (medido: nenhum corpo legível passando pelas letras em
  // 0.18). Capado assim, o corpo perto vira um grão, não um losango.
  // Fora do eixo a perspectiva estica o que está de lado por (1 + tan²) do
  // ângulo: no canto de um 16:10 isso é ~1.3×, e o teto medido pelo centro
  // deixava passar 6.7 px ali.
  float offAxis = 1.0 + dot(viewCenter.xy, viewCenter.xy) / max(viewDepth * viewDepth, 1e-3);
  float lengthPx = 2.0 * uBodyScale * stretch * uFocalPx * offAxis / max(viewDepth, 1e-3);
  float widthPx = 0.32 * uBodyScale * uFocalPx * offAxis / max(viewDepth, 1e-3);
  float capLength = min(1.0, ${BODY_MAX_PX.toFixed(1)} / max(lengthPx, 1e-3));
  float capWidth = min(1.0, ${BODY_MAX_WIDTH_PX.toFixed(1)} / max(widthPx, 1e-3));
  vec3 local = (right * position.x + up * position.y) * capWidth
    + forward * position.z * stretch * capLength;
  vec3 world = center + local * uBodyScale * admit * near * alive;

  vAlong = position.z;
  vWorld = world;

  vec4 view = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const BODY_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}

uniform vec3  uTeal;
uniform vec3  uCyan;
uniform vec3  uRose;
uniform vec3  uCoral;
uniform float uSpecimenZ;
uniform float uGain;
uniform float uFormingFrag;
uniform vec4  uCards[${MAX_CARDS}];
uniform float uCardCount;
uniform float uCardAmount;

/**
 * Quão perto o corpo está da **aresta de ataque** de uma peça montada: a laje a
 * montante do corpo de prova, ou a caixa a montante de um card.
 *
 * É o que o rosa passou a exigir junto com a densidade. Com a densidade
 * sozinha, todo aglomerado denso virava rosa — o poleiro de Quem sou e o bando
 * cruzando o rio pintavam o quadro de rosa de borda a borda (medido: 0.815 na
 * folha do rio). O DIRECTION.md §2 diz "rose só onde o bando comprime", e o
 * bando comprime **contra alguma coisa**.
 */
float nearLeadingEdge(vec3 p) {
  float dz = p.z - uSpecimenZ;
  float specimen = smoothstep(-5.0, -1.5, dz) * (1.0 - smoothstep(0.2, 0.8, dz))
    * (1.0 - smoothstep(8.0, 9.5, abs(p.x))) * (1.0 - smoothstep(1.6, 2.6, abs(p.y)));
  float cards = 0.0;
  for (int i = 0; i < ${MAX_CARDS}; i++) {
    if (float(i) >= uCardCount || uCardAmount <= 0.0) break;
    vec3 c = uCards[i].xyz;
    float cz = p.z - c.z;
    float near = smoothstep(-3.2, -0.8, cz) * (1.0 - smoothstep(0.1, 0.6, cz))
      * (1.0 - smoothstep(2.2, 3.2, abs(p.x - c.x))) * (1.0 - smoothstep(1.4, 2.2, abs(p.y - c.y)));
    cards = max(cards, near * uCardAmount);
  }
  return max(specimen, cards);
}

in vec3  vWorld;
in float vViewDepth;
in float vEnergy;
in float vDensity;
in float vAlong;
in float vNear;

out vec4 fragColor;

${FOG_GLSL}
${OUTSIDE_GLSL}

void main() {
  // A rampa do DIRECTION.md §5, nesta ordem: teal em cruzeiro, cyan em
  // aceleração, rose em compressão de densidade, coral só na turbulência da
  // esteira.
  //
  // ## Os limiares saem da distribuição medida, e antes não saíam
  //
  // vDensity é a contagem de vizinhos dentro de 3 unidades **dividida por 24
  // amostras**, e o bando é rarefeito: um corpo tem em média meia dúzia de
  // vizinhos entre 16 mil, então o canal vive perto de zero. Medido na cena, em
  // 16.384 corpos: mediana 0.033, p90 0.073, p99 0.111, **máximo 0.170**.
  //
  // Os limiares antigos pediam smoothstep(0.45, 1.0) para o rose e
  // smoothstep(0.30, 0.90) para o coral — ou seja, começavam **acima do
  // máximo que o canal consegue produzir**. Duas das quatro cores da rampa do
  // §5 eram inalcançáveis por construção, e a guarda de coral marcava 0.00% não
  // porque a cena estava dentro do teto, mas porque a cor não existia. Uma
  // guarda que só sabe dizer "pouco demais" e "de menos" com o mesmo número não
  // é guarda.
  // vEnergy, medido em 140 mil amostras depois do decaimento assimétrico:
  // mediana 0.139, p75 0.180, p90 0.243, p99 0.728, máximo 1.000. A rampa do
  // cyan começa em 0.18 — um quarto da população entra nela — e satura em 0.85,
  // que só o topo de ~1% alcança. Cauda longa de calor leve, poucos corpos
  // francamente cyan: é o "cyan em aceleração" do §5 e não um bando cyan.
  vec3 color = uTeal;
  color = mix(color, uCyan, smoothstep(0.18, 0.85, vEnergy));
  color = mix(color, uRose, smoothstep(0.07, 0.13, vDensity) * 0.75 * nearLeadingEdge(vWorld));

  // Coral: **a jusante e quente**, e só isso.
  //
  // A versão anterior também exigia densidade alta, e isso era uma contradição
  // interna: a esteira é justamente onde a densidade **cai** — é o buraco que as
  // letras deixam. Pedir compressão dentro do buraco é pedir as duas coisas ao
  // mesmo tempo. O DIRECTION.md §5 separa os dois casos de propósito: "rose em
  // compressão de densidade, coral só na turbulência da esteira".
  //
  // A janela da esteira sobe em uma largura de letra e morre em sete. Antes
  // subia em nove unidades — quatro larguras —, e a essa altura qualquer corpo
  // já tinha esfriado, mesmo com o decaimento lento.
  //
  // vEnergy **dentro desta janela**, medido: mediana 0.194, p75 0.281, p90
  // 0.429, p99 0.722, máximo 0.971. O limiar de 0.30 pega 21.9% dos corpos da
  // esteira e a saturação em 0.75 é alcançada por 0.74% deles. Os dois números
  // caem dentro da faixa com folga dos dois lados — que é o que o PROJECT.md §7
  // passou a exigir de todo limiar depois deste arquivo.
  float downstream = vWorld.z - uSpecimenZ;
  float wake = smoothstep(0.0, 2.2, downstream) * (1.0 - smoothstep(2.2, 16.0, downstream));
  float turbulence = wake * smoothstep(0.30, 0.75, vEnergy);
  color = mix(color, uCoral, turbulence * 0.85);

  // A ponta do corpo é mais quente que a cauda: dá direção sem desenhar nada.
  float tip = smoothstep(-1.0, 1.0, vAlong);
  // **O brilho segue também a densidade**, e é daí que sai a onda. Um corpo
  // isolado é uma lasca apagada; uma lâmina densa é uma faixa clara — e uma
  // faixa clara correndo pelo bando é a "sombra atravessando trigo" do
  // DIRECTION.md §2, legível de longe, onde nenhum corpo individual é. A faixa
  // sai da distribuição medida de vDensity (mediana 0.033, p90 0.073): a
  // mediana fica em ~0.6, o p90 em ~1.6.
  // Antes de o bando se formar, o corpo isolado é o assunto (a Emergência e o
  // portão): ele não é rebaixado por estar sozinho.
  // E ele é **mais** claro: no portão e na Emergência a abertura é máxima
  // (DIRECTION.md §3, "tudo borrado"), e um corpo borrado espalha a mesma
  // energia por um disco inteiro — medido na rodada 9.5, os ~60 corpos
  // admitidos perto da lente em p = 0 não passavam de pontos no quadro.
  //
  // **Só perto da lente.** O reforço aceso em todos os corpos isolados também
  // acendia os distantes, e o núcleo separável da profundidade de campo os
  // transformava numa trama de riscas verticais — uma grade, que o PROJECT.md
  // §2 veta. O que o portão pede são corpos "passando perto da lente".
  //
  // **Rodada 12: o isolado quase apaga, e o reforço perto da lente saiu.** O
  // corpo perto da lente agora encolhe e some (vNear); o reforço de 7× que o
  // fazia um disco claro no portão não tem mais o que acender. Depois de o
  // bando se formar, o corpo isolado fica em 0.5 e o aglomerado sobe até
  // 1.75 — a rampa da rodada 8, que a 12 tinha baixado para 0.2 e o bando
  // sumiu (a rodada 13 a devolveu). Faixa medida de vDensity: mediana 0.033 →
  // ~0.59; p90 0.073 → ~1.3. Antes de se formar (Emergência, portão) o corpo sozinho
  // continua sendo o assunto: 3.0, porque com o teto de tamanho ele é um grão
  // de 3.5 px, e um grão no brilho de cruzeiro some no escuro da Emergência.
  float crowd = mix(3.0, 0.5 + 1.25 * smoothstep(0.02, 0.10, vDensity), smoothstep(0.15, 0.6, uFormingFrag));
  crowd *= vNear * vNear;
  float energy = uGain * (0.35 + 0.65 * tip) * (0.55 + 0.85 * vEnergy) * crowd;

  // Na Superfície a câmara ganha luz, e o bando no brilho da descida some
  // contra ela — medido: dez mil corpos entre a lente e a tomada de ar em 0.875
  // e nenhum legível no quadro. O ganho sobe com a luz de fora. (A primeira
  // tentativa disto acendeu uma tempestade em volta da lente; o motivo era a
  // virada do bando em cima da câmera, não o ganho — ver uExit nos boids.)
  vec3 lit = color * energy * (1.0 + 1.4 * uOutside);
  // **A Superfície: o corpo que atravessa uma lâmina de luz acende.** É a
  // mesma conta da faixa na soleira (louverOpen), então um corpo só brilha
  // --peach onde a luz de fora de fato passa — poeira contra o sol, e o jeito
  // de o bando saindo ser visto contra a câmara iluminada, onde o --teal dele
  // sumiria. Fora das frestas, e antes de 0.86, o termo é zero.
  if (uOutside > 0.0) {
    lit += uPeach * louverOpen(vWorld) * uOutside * (1.2 + 1.6 * tip);
  }
  lit = applyFog(lit, vViewDepth, vWorld);

  fragColor = vec4(lit, 1.0);
}
`;

/**
 * **O halo do corpo** (rodada 13) — a massa do bando, sem contorno.
 *
 * O núcleo acima é um grão (teto de 3.5 × 2 px) e escreve profundidade, então a
 * oclusão das letras continua exata. O que a rodada 12 tirou junto com o
 * losango foi a **presença**: o corpo da rodada 8 tinha o tamanho do mundo e,
 * perto da lente, dezenas de pixels. O halo devolve esse tamanho como luz — uma
 * gaussiana alongada na direção do voo, do tamanho que o corpo teria, somada
 * por cima (aditiva, testando a profundidade, sem escrevê-la). Uma gaussiana
 * não tem borda: é mancha de luz, nunca forma. Ele só existe quando o corpo
 * seria maior que o núcleo (`GLOW_FROM` px), então o corpo distante continua
 * um grão.
 *
 * Um quad por corpo, orientado na tela; o brilho vem da mesma rampa de
 * densidade do núcleo, e cai com a área para a mancha grande perto da lente
 * não virar uma parede de luz.
 */
export const GLOW_FROM = 3.5;
export const GLOW_FULL = 9;
/** O halo é maior que o corpo que ele substitui: a luz transborda. */
export const GLOW_SCALE = 1.5;
/** Teto do comprimento do halo na tela, em px de CSS. */
export const GLOW_MAX_PX = 90;

export const GLOW_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uBodyScale;
uniform float uForming;
uniform float uFocalPx;
uniform vec2  uViewportPx;

in vec2 aRef;

out vec2  vQuad;
out float vGlow;
out float vEnergy;
out float vDensity;
out float vViewDepth;
out vec3  vWorld;

void main() {
  vec4 P = texture(uPos, aRef);
  vec4 V = texture(uVel, aRef);
  vec3 center = P.xyz;
  vDensity = P.w;
  vEnergy = V.w;
  vWorld = center;

  float lot = fract(sin(dot(aRef, vec2(12.9898, 78.233))) * 43758.5453);
  float admit = step(lot, 0.035 + 0.965 * pow(uForming, 2.5));
#ifdef PROBE_SUBSET
  admit *= step(fract(lot * 97.13), 1.0 / float(PROBE_SUBSET));
#endif
  float lensGuard = smoothstep(0.0, 3.0, distance(cameraPosition, center));
  float alive = step(-400.0, center.y);

  vec4 viewCenter = viewMatrix * vec4(center, 1.0);
  float depth = max(-viewCenter.z, 1e-3);
  vViewDepth = depth;
  float stretch = 1.0 + vEnergy * 0.6;
  float bodyPx = 2.0 * uBodyScale * stretch * uFocalPx / depth;
  float lengthPx = min(bodyPx * ${GLOW_SCALE.toFixed(2)}, ${GLOW_MAX_PX.toFixed(1)});
  float widthPx = max(lengthPx * 0.45, 3.0);
  vGlow = smoothstep(${GLOW_FROM.toFixed(1)}, ${GLOW_FULL.toFixed(1)}, bodyPx) * admit * lensGuard * alive;

  // A direção do voo na tela: o centro e um passo à frente, projetados.
  vec4 clipCenter = projectionMatrix * viewCenter;
  vec3 forward = normalize(V.xyz + vec3(0.0, 1e-4, 1e-4));
  vec4 clipAhead = projectionMatrix * (viewMatrix * vec4(center + forward * 0.05, 1.0));
  vec2 a = clipCenter.xy / clipCenter.w;
  vec2 b = clipAhead.xy / max(clipAhead.w, 1e-3);
  vec2 dirPx = (b - a) * uViewportPx;
  float dirLen = length(dirPx);
  // Voo de frente para a lente: sem direção na tela, o halo fica redondo.
  vec2 dir = dirLen > 1e-3 ? dirPx / dirLen : vec2(1.0, 0.0);
  float round01 = 1.0 - smoothstep(0.5, 3.0, dirLen);
  float along = mix(lengthPx, (lengthPx + widthPx) * 0.5, round01);
  float across = mix(widthPx, (lengthPx + widthPx) * 0.5, round01);
  vec2 perp = vec2(-dir.y, dir.x);

  vQuad = position.xy;
  vec2 offsetPx = dir * position.x * along * 0.5 + perp * position.y * across * 0.5;
  // Pixels de CSS → NDC: 2 / tamanho da tela, vezes w para sair da divisão.
  vec2 offset = offsetPx * 2.0 / uViewportPx * clipCenter.w;
  gl_Position = clipCenter + vec4(offset * step(0.001, vGlow), 0.0, 0.0);
  // A área do halo, contra a do grão: a mancha grande espalha a mesma luz, não
  // multiplica. O teto em 1 deixa o halo pequeno com o brilho inteiro.
  vGlow *= min(1.0, 60.0 / max(along * across, 1.0));
}
`;

export const GLOW_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}

uniform vec3  uTeal;
uniform vec3  uCyan;
uniform float uGain;
uniform float uFormingFrag;

in vec2  vQuad;
in float vGlow;
in float vEnergy;
in float vDensity;
in float vViewDepth;
in vec3  vWorld;

out vec4 fragColor;

${FOG_GLSL}

void main() {
  if (vGlow <= 0.0) discard;
  // Gaussiana: 0.018 na borda do quad — sem aresta.
  float g = exp(-4.0 * dot(vQuad, vQuad));
  vec3 color = mix(uTeal, uCyan, smoothstep(0.18, 0.85, vEnergy));
  float crowd = mix(1.0, 0.5 + 1.25 * smoothstep(0.02, 0.10, vDensity), smoothstep(0.15, 0.6, uFormingFrag));
  float energy = uGain * (0.55 + 0.85 * vEnergy) * crowd * 0.75;
  // Aditivo através da névoa: o que atravessa é a parte não velada.
  float amount = 1.0 - exp(-uFogDensity * max(vViewDepth, 0.0));
  fragColor = vec4(color * energy * g * vGlow * (1.0 - amount), 1.0);
}
`;
