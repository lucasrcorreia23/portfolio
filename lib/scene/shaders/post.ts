/**
 * O compositor.
 *
 * ## Por que ele é escrito à mão, e não é o `@react-three/postprocessing`
 *
 * O PROJECT.md §5 lista essa biblioteca na stack, e o mesmo §5 fixa o teto de
 * **350 kB comprimidos** para o chunk da cena. Os dois não cabem juntos, e onde
 * a §5 briga consigo mesma ganha o lado que tem número.
 *
 * O `@react-three/postprocessing@3.1.1` exporta um barril só —
 * `"exports": "./dist/index.js"`, sem importação profunda — e esse arquivo
 * importa `n8ao` no topo. O `n8ao` não declara `sideEffects`, então o bundler
 * não pode descartá-lo com segurança: são ~50 kB comprimidos de SSAO que esta
 * cena nunca usa, mais ~110 kB do `postprocessing` inteiro. Verificado no
 * `node_modules`, não estimado.
 *
 * O que está aqui substitui isso por ~200 linhas, reaproveitando o triângulo de
 * tela cheia que a simulação do bando já exigia. E resolve um problema que a
 * biblioteca não resolveria: o véu de legibilidade do DIRECTION.md §5 é uma
 * conta em **luz linear** (`L_saída = (1 − f)·L_cena + f·L_névoa`), e ela
 * precisa acontecer antes do tonemap. Numa pilha de efeitos encadeados o véu
 * resolveria para uma luminância que a passada seguinte muda.
 *
 * Ordem das passadas: cena → DOF → bloom → composite.
 */

import { MAX_VEIL_BOXES, VEIL_FALLOFF } from "../veil";

const HASH_GLSL = /* glsl */ `
float postHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
`;

const DEPTH_GLSL = /* glsl */ `
uniform sampler2D uDepth;
uniform float uNear;
uniform float uFar;

/** Profundidade de vista em unidades de mundo, a partir do buffer não-linear. */
float viewDepthAt(vec2 uv) {
  float d = texture(uDepth, uv).x;
  float ndc = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
}

/**
 * O círculo de confusão. DIRECTION.md §3: "círculo de confusão + kernel duplo,
 * não bokeh completo" — o kernel duplo são as duas passadas separáveis abaixo.
 */
uniform float uFocus;
uniform float uFocusRange;
uniform float uAperture;
uniform float uNearBlur;
/**
 * Quanto a peça nítida é impedida de sangrar no fundo borrado, 0 a 1 (rodada
 * 13). O gather é pelo CoC do centro: um pixel do fundo desfocado ao lado de
 * um card em foco puxava a cor do card para fora da borda — um halo em volta
 * de cada peça do rio, medido como anel 20 px mais claro que a parede ao lado
 * só com a DOF ligada. Com a guarda, uma amostra **mais perto e mais nítida**
 * que o centro perde o peso. Ligada pela rampa do rio, para o desfoque da
 * Emergência não mudar.
 */
uniform float uLeakGuard;

float cocFromDepth(float depth) {
  float far = clamp(abs(depth - uFocus) / uFocusRange, 0.0, 1.0) * uAperture;
  // **O campo próximo desfoca sempre** (rodada 12), com a abertura aberta ou
  // fechada: o que passa a menos de 2.5 unidades da lente é mancha, não forma.
  // Com a abertura em zero de 0.155 a ~0.44, um corpo perto da lente saía
  // nítido na Identidade e em Quem sou. Nada mais chega tão perto da câmera
  // nesta descida: a parede graduada de Quem sou fica a 3.2 unidades.
  float near = 0.3 * uNearBlur * (1.0 - smoothstep(0.6, 2.5, depth));
  return max(far, near);
}

float cocAt(vec2 uv) {
  return cocFromDepth(viewDepthAt(uv));
}
`;

/**
 * Uma das duas passadas de borrão. A direção vem por uniform, então o mesmo
 * material roda horizontal e vertical — é o "kernel duplo".
 */
export const DOF_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uDirection;

${DEPTH_GLSL}

in vec2 vUv;
out vec4 fragColor;

// Dez amostras e não seis: mesmo raio (10 × 8.4 ≈ 6 × 14 texels; desde a rodada 12, 13.4 com a gaussiana mais estreita) e a mesma
// gaussiana em unidades de raio, com vãos 40% menores. Ver o comentário do
// deslocamento, abaixo.
const int TAPS = 10;

void main() {
  float centerDepth = viewDepthAt(vUv);
  float coc = cocFromDepth(centerDepth);
  if (coc <= 0.001) {
    fragColor = texture(uSource, vUv);
    return;
  }

  // Raio em texels, proporcional ao CoC do centro. É a aproximação que troca
  // bokeh por velocidade: não há vazamento correto entre planos, e a essa
  // intensidade ninguém vê a diferença.
  vec2 step = uDirection * uTexel * coc * 13.4;

  vec4 total = texture(uSource, vUv) * 0.196;
  float weightSum = 0.196;

  // **O deslocamento das amostras varia por pixel.** Com o passo fixo, as seis
  // amostras ficam a até catorze texels uma da outra, e um corpo pequeno e claro
  // cai entre elas: o borrão vira um pente de riscas paralelas à direção da
  // passada — medido na rodada 9.5, quando o portão passou a mostrar a cena com
  // a abertura aberta, como uma trama vertical que lia como grade. Um ruído de
  // gradiente intercalado espalha as amostras pelos vãos; o pente vira ruído
  // fino, que o grão cobre.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  for (int i = 1; i <= TAPS; i++) {
    float offset = float(i) - 0.5 + jitter;
    // Gaussiana amostrada; normalizada pelo peso somado, então o número de
    // taps pode mudar sem recalibrar nada.
    // **Truncada em ~3σ** (rodada 12). Com σ = 5 amostras a gaussiana parava em
    // exp(−2) na décima, e o produto das duas passadas separáveis de uma
    // gaussiana cortada é um **quadrado** de canto arredondado: todo corpo claro
    // desfocado virava uma caixa (visível no portão e na Emergência). Com σ =
    // 3.13 ela chega a 0.6% na borda e o produto volta a ser redondo; o passo
    // subiu na mesma razão, então o raio do borrão não mudou.
    float w = exp(-offset * offset / 19.6);
    vec2 a = vUv + step * offset;
    vec2 b = vUv - step * offset;
    float wa = w;
    float wb = w;
    if (uLeakGuard > 0.0) {
      float da = viewDepthAt(a);
      float db = viewDepthAt(b);
      wa *= 1.0 - uLeakGuard * step(da, centerDepth - 0.5)
        * (1.0 - clamp(cocFromDepth(da) / coc, 0.0, 1.0));
      wb *= 1.0 - uLeakGuard * step(db, centerDepth - 0.5)
        * (1.0 - clamp(cocFromDepth(db) / coc, 0.0, 1.0));
    }
    total += texture(uSource, a) * wa;
    total += texture(uSource, b) * wb;
    weightSum += wa + wb;
  }

  fragColor = total / weightSum;
}
`;

/**
 * O passe de brilho. Threshold alto, com média de Karis para um pixel isolado
 * muito quente não virar cintilação.
 *
 * "Bloom sim, mas apertado e com threshold alto: só corpos emissivos e a fresta
 * da tomada de ar. Bloom não é o efeito, é o transbordo dele" — DIRECTION.md §5.
 * Como a cena escreve HDR linear num alvo de meio-float, "só os pontos mais
 * quentes" é literalmente o que passa de 1.0: as paredes ficam em 0.05, os
 * corpos em cruzeiro em 0.4, e só um cacho comprimido cruza o limiar.
 */
export const BLOOM_THRESHOLD_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform float uThreshold;
uniform float uSoftKnee;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec3 c = texture(uSource, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));

  float knee = uThreshold * uSoftKnee + 1e-5;
  float soft = clamp(luma - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee);
  float contribution = max(soft, luma - uThreshold) / max(luma, 1e-5);

  // Karis: pesa pelo inverso da luminância, o que segura o cintilar de um
  // corpo isolado atravessando um pixel.
  float karis = 1.0 / (1.0 + luma);
  fragColor = vec4(c * contribution * karis, 1.0);
}
`;

/** Downsample de 13 taps. */
export const BLOOM_DOWN_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uTexel;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 t = uTexel;
  vec3 a = texture(uSource, vUv + vec2(-2.0, 2.0) * t).rgb;
  vec3 b = texture(uSource, vUv + vec2( 0.0, 2.0) * t).rgb;
  vec3 c = texture(uSource, vUv + vec2( 2.0, 2.0) * t).rgb;
  vec3 d = texture(uSource, vUv + vec2(-2.0, 0.0) * t).rgb;
  vec3 e = texture(uSource, vUv).rgb;
  vec3 f = texture(uSource, vUv + vec2( 2.0, 0.0) * t).rgb;
  vec3 g = texture(uSource, vUv + vec2(-2.0,-2.0) * t).rgb;
  vec3 h = texture(uSource, vUv + vec2( 0.0,-2.0) * t).rgb;
  vec3 i = texture(uSource, vUv + vec2( 2.0,-2.0) * t).rgb;
  vec3 j = texture(uSource, vUv + vec2(-1.0, 1.0) * t).rgb;
  vec3 k = texture(uSource, vUv + vec2( 1.0, 1.0) * t).rgb;
  vec3 l = texture(uSource, vUv + vec2(-1.0,-1.0) * t).rgb;
  vec3 m = texture(uSource, vUv + vec2( 1.0,-1.0) * t).rgb;

  vec3 result = e * 0.125;
  result += (a + c + g + i) * 0.03125;
  result += (b + d + f + h) * 0.0625;
  result += (j + k + l + m) * 0.125;

  fragColor = vec4(result, 1.0);
}
`;

/**
 * Upsample em tenda 3×3.
 *
 * Não lê o nível maior: ele é **somado por blend aditivo** ao desenhar. Ler e
 * escrever o mesmo alvo na mesma passada é indefinido, e a alternativa — uma
 * terceira cadeia de alvos para o resultado — custaria memória para não fazer
 * nada além do que o blend já faz.
 */
export const BLOOM_UP_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uRadius;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 t = uTexel * uRadius;
  vec3 s = texture(uSource, vUv + vec2(-1.0,  1.0) * t).rgb * 1.0;
  s     += texture(uSource, vUv + vec2( 0.0,  1.0) * t).rgb * 2.0;
  s     += texture(uSource, vUv + vec2( 1.0,  1.0) * t).rgb * 1.0;
  s     += texture(uSource, vUv + vec2(-1.0,  0.0) * t).rgb * 2.0;
  s     += texture(uSource, vUv).rgb * 4.0;
  s     += texture(uSource, vUv + vec2( 1.0,  0.0) * t).rgb * 2.0;
  s     += texture(uSource, vUv + vec2(-1.0, -1.0) * t).rgb * 1.0;
  s     += texture(uSource, vUv + vec2( 0.0, -1.0) * t).rgb * 2.0;
  s     += texture(uSource, vUv + vec2( 1.0, -1.0) * t).rgb * 1.0;

  fragColor = vec4(s / 16.0, 1.0);
}
`;

/* ---------------------------------------------------------------------------
 * O véu de legibilidade
 *
 * ## Ele deixou de estimar a cena e passou a olhar para ela
 *
 * O DIRECTION.md §5 desenhou o véu como um termo de densidade ancorado à caixa
 * do texto, com um `f` por caixa por quadro resolvido a partir da **simulação
 * proxy da CPU**: "o proxy roda adiantado, então o véu sobe antes de o cacho
 * chegar". Implementado assim, e medido no pixel entregue com a varredura de
 * `__probe.contrast()`, o pior contraste sob a coluna de manifesto deu
 * **1.21:1** — com o `f` parado no piso de 0.15 enquanto a luminância real sob
 * o texto batia em **L = 0.65**.
 *
 * A causa não é calibragem. A energia de um aglomerado do proxy é massa ×
 * velocidade, e no poleiro de Quem sou a velocidade **cai de propósito**: o
 * estimador desce exatamente enquanto o bando se junta atrás do texto e fica
 * mais brilhante. Era um modelo da cena decidindo por ela.
 *
 * Isso é o erro que o PROJECT.md §7 já proíbe — "toda medição é feita no ponto
 * de entrega, nunca no ponto de cálculo" —, cometido não por um instrumento mas
 * pelo próprio mecanismo. Consertar o proxy não resolveria: proxy consertado
 * continua sendo palpite.
 *
 * ## O solucionador novo
 *
 * A luminância vem do **alvo da cena reduzido por máximo**, na região atrás de
 * cada caixa. Três passadas levam o quadro a 1/64 guardando o máximo de cada
 * bloco, e uma quarta varre a caixa nesse campo e resolve o `f` do documento —
 * `f = (L − teto) / (L − L_névoa)` — com o L que a cena de fato tem ali.
 *
 * Quatro coisas que isso arruma de uma vez:
 *
 * - **Exato por construção.** O que entra na conta é a luminância que vai para
 *   a tela, não uma proxy dela.
 * - **Já com o bloom dentro.** A primeira passada soma o bloom e aplica o
 *   tonemap antes de reduzir, então o número comparado com o teto é o mesmo
 *   número que a medição lê no pixel.
 * - **Máximo, não média.** O critério do §5 é "nenhum pixel sob a caixa passa
 *   de L", e a redução por máximo é literalmente esse critério.
 * - **Sem readback.** Tudo acontece na GPU; nada volta para a CPU, que é a
 *   proibição do DIRECTION.md §6.
 *
 * O `f` resolvido é **amortecido de forma assimétrica** entre quadros, num
 * ping-pong de dois alvos de três texels: sobe no mesmo quadro e desce devagar.
 * Subir na hora é obrigatório — um quadro sem véu já é um quadro ilegível — e
 * descer devagar é o que faz o véu ler como banco de névoa dissolvendo em vez
 * de caixa apagando.
 * ------------------------------------------------------------------------ */

/**
 * Primeira passada: cena + bloom, tonemap, luminância, e o **máximo** de cada
 * bloco de 4×4. É aqui que o número vira comparável com o teto.
 */
export const VEIL_SEED_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform sampler2D uBloom;
uniform vec2  uTexel;
uniform float uBloomStrength;
uniform float uExposure;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float peak = 0.0;
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      vec2 uv = vUv + (vec2(float(x), float(y)) - 1.5) * uTexel;
      vec3 c = texture(uSource, uv).rgb + texture(uBloom, uv).rgb * uBloomStrength;
      c = vec3(1.0) - exp(-c * uExposure);
      peak = max(peak, dot(c, vec3(0.2126, 0.7152, 0.0722)));
    }
  }
  fragColor = vec4(peak, 0.0, 0.0, 1.0);
}
`;

/** Passadas seguintes: máximo de 4×4 do nível anterior. */
export const VEIL_REDUCE_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uTexel;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float peak = 0.0;
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      vec2 uv = vUv + (vec2(float(x), float(y)) - 1.5) * uTexel;
      peak = max(peak, texture(uSource, uv).r);
    }
  }
  fragColor = vec4(peak, 0.0, 0.0, 1.0);
}
`;

/**
 * A resolução, num alvo de três texels — um por caixa.
 *
 * A varredura é uma grade fixa de 24×16 sobre a caixa, e ela cobre o campo
 * reduzido inteiro por construção: a 1/64 de um quadro de 1440×900 o campo tem
 * 23×15 texels, então a grade é mais densa que ele para **qualquer** tamanho de
 * caixa. Nenhum bloco escapa, e cada bloco já carrega o máximo dos 4096 pixels
 * que ele resume.
 */
export const VEIL_SOLVE_FRAG = /* glsl */ `
uniform sampler2D uField;
uniform sampler2D uPrevious;
uniform vec4  uVeilBox[${MAX_VEIL_BOXES}];
uniform float uVeilF[${MAX_VEIL_BOXES}];
uniform float uCeiling;
uniform float uFogLuma;
uniform float uFall;

out vec4 fragColor;

void main() {
  int index = int(floor(gl_FragCoord.x));
  vec4  box = uVeilBox[index];
  float on  = uVeilF[index];

  float peak = 0.0;
  if (on > 0.0) {
    for (int y = 0; y < 16; y++) {
      for (int x = 0; x < 24; x++) {
        vec2 t = vec2((float(x) + 0.5) / 24.0, (float(y) + 0.5) / 16.0);
        peak = max(peak, texture(uField, clamp(mix(box.xy, box.zw, t), 0.0, 1.0)).r);
      }
    }
  }

  float solved = peak > uCeiling
    ? clamp((peak - uCeiling) / max(peak - uFogLuma, 1e-4), 0.0, 1.0)
    : 0.0;
  solved *= on;

  // Sobe no quadro, desce devagar. Um quadro sem véu é um quadro ilegível;
  // um quadro com véu a mais é só um quadro com névoa.
  float previous = texelFetch(uPrevious, ivec2(index, 0), 0).g;
  float damped = solved > previous ? solved : mix(previous, solved, uFall);

  fragColor = vec4(peak, damped, 0.0, 1.0);
}
`;

/**
 * O composite: mistura o nítido com o borrado pelo CoC, soma o bloom, aplica o
 * tonemap, **o véu de legibilidade** e o grão animado. Sem aberração cromática
 * desde a rodada 12 — ver o comentário no main().
 *
 * **Vinheta: nenhuma.** Nem leve. O pedido é explícito e a câmara já escurece
 * nas bordas por névoa e por queda de luz — uma vinheta por cima disso seria a
 * segunda vez que a mesma coisa é dita.
 *
 * O véu entra **depois do tonemap**, e é a última coisa antes do grão: ali a
 * cor já é a luminância relativa que a conta de contraste usa, e o teto deixa
 * de precisar de conversão. Ver o bloco do véu acima para o mecanismo.
 */
export const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D uScene;
uniform sampler2D uBlurred;
uniform sampler2D uBloom;
uniform vec2  uResolution;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uGrainSeed;
uniform float uExposure;
uniform float uDofEnabled;

// O véu. xy/zw são os cantos da caixa em UV de tela (origem embaixo à
// esquerda); uVeilF é a força dela, 0 quando a caixa não existe; uVeilSolved
// tem um texel por caixa, com o f resolvido do campo reduzido no canal verde.
uniform vec4      uVeilBox[${MAX_VEIL_BOXES}];
uniform float     uVeilF[${MAX_VEIL_BOXES}];
uniform sampler2D uVeilSolved;
uniform vec3      uVoid;
uniform float     uVeilCeiling;

${DEPTH_GLSL}
${HASH_GLSL}

in vec2 vUv;
out vec4 fragColor;

/**
 * O CoC é resolvido **uma vez por fragmento**, e passado adiante.
 *
 * Uma versão antiga chamava cocAt() dentro da amostragem, que rodava uma vez
 * por canal por causa da aberração cromática — três buscas de profundidade por
 * pixel em resolução cheia, 7.53 ms de GPU medidos. A aberração saiu na rodada
 * 12 e a amostragem agora roda uma vez só; o CoC continua resolvido uma vez.
 */
vec3 sampleFocused(vec2 uv, float blend) {
  vec3 sharp = texture(uScene, uv).rgb;
  if (blend <= 0.002) return sharp;
  return mix(sharp, texture(uBlurred, uv).rgb, blend);
}

/**
 * Onde o véu age: 1 dentro de uma caixa que precisa dele, caindo suave para
 * fora dela. O f resolvido deixou de ser a **força** do véu e passou a ser só
 * o portão dele — ele é zero quando nada atrás da caixa passa do teto, sobe no
 * quadro em que alguma coisa passa, e desce devagar (o amortecimento
 * assimétrico continua na passada de resolução).
 */
float veilAmount(vec2 uv) {
  float total = 0.0;
  for (int i = 0; i < ${MAX_VEIL_BOXES}; i++) {
    if (uVeilF[i] <= 0.0) continue;
    float f = texelFetch(uVeilSolved, ivec2(i, 0), 0).g;
    if (f <= 0.0) continue;
    vec2 d = max(uVeilBox[i].xy - uv, uv - uVeilBox[i].zw);
    float fall = 1.0 - smoothstep(0.0, ${VEIL_FALLOFF.toFixed(3)}, length(max(d, vec2(0.0))));
    total = max(total, smoothstep(0.0, 0.05, f) * fall);
  }
  return total;
}

/**
 * **O véu comprime a luz; ele não pinta sombra.**
 *
 * A versão anterior misturava o quadro inteiro para --void dentro da caixa, na
 * força que a luminância mais alta atrás dela exigia. Um único corpo aceso
 * atrás de uma palavra escurecia a caixa **inteira** — inclusive a névoa e o
 * concreto que já estavam escuros —, e o resultado era um retângulo preto de
 * borda borrada atrás do texto: uma sombra projetada, e com cara de sombra
 * projetada. O Lucas apontou na Superfície, e a mesma coisa acontecia em todo
 * beat com texto sobre luz.
 *
 * Agora cada pixel é comprimido **pela própria luminância**: abaixo de 55% do
 * teto nada muda, e acima disso a luz é dobrada por um joelho exponencial que
 * se aproxima do teto sem cruzá-lo. O escuro continua exatamente o que era, então
 * não existe caixa para ver; o que cede é só o que é claro — o corpo que passa
 * atrás da coluna fica mais baixo enquanto passa, a fresta acesa atrás da
 * frase perde o brilho, e a textura inteira continua lá. A cor é escalada, não
 * substituída: o matiz não muda.
 *
 * O critério do DIRECTION.md §5 ("nenhum pixel sob a caixa passa de L")
 * continua garantido, e agora **por construção** em cada pixel, e não pela
 * estimativa do pior deles.
 */
vec3 applyVeil(vec3 color, vec2 uv) {
  float amount = veilAmount(uv);
  if (amount <= 0.0) return color;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float knee = uVeilCeiling * 0.55;
  if (luma <= knee) return color;
  float room = uVeilCeiling - knee;
  float folded = knee + room * (1.0 - exp(-(luma - knee) / room));
  return mix(color, color * (folded / luma), amount);
}

void main() {
  vec2 uv = vUv;

  // **Sem aberração cromática** (rodada 12). Ela existia aqui — radial,
  // 1.7 a 3.4 px nas bordas —, e deslocar canais é separação RGB, que o
  // PROJECT.md §2 veta pelo nome. O Lucas pediu a remoção quando a placa dos
  // cards mostrou franja; a franja era outra coisa (ver o bisel em
  // shaders/cards.ts), mas o deslocamento era real e saiu junto.
  float blend = uDofEnabled < 0.5 ? 0.0 : smoothstep(0.0, 0.35, cocAt(uv));

  vec3 color = sampleFocused(uv, blend).rgb;

  color += texture(uBloom, uv).rgb * uBloomStrength;

  // Tonemap exponencial: preserva o pé da curva, que é onde esta cena vive, e
  // segura os cachos quentes sem lavar a cor deles.
  color = vec3(1.0) - exp(-color * uExposure);

  // O véu, **depois** do tonemap: aqui a cor já é a luminância relativa que a
  // conta de contraste do DIRECTION.md §5 usa, e o teto é o próprio número que
  // a medição lê no pixel entregue. Antes do tonemap ele resolveria para uma
  // luminância que a linha seguinte muda.
  color = applyVeil(color, uv);

  // Grão de filme, animado por quadro. uGrainSeed muda todo quadro, então não
  // existe padrão estático — o PROJECT.md §3.1 veta PNG de ruído repetido pelo
  // nome. Aplicado depois do tonemap, sobre 100% do quadro composto.
  //
  // **Pesado pela luminância**, e não somado plano. Grão de filme mora nos
  // meios-tons: é a prata revelada que granula, e onde não houve exposição não
  // há grão. Somar 0.045 plano num quadro cuja média é 0.08 faz o ruído virar
  // a coisa mais brilhante da tela — e, pior, empurra a luminância do fundo
  // para cima justo onde o DIRECTION.md §5 diz que "o grão não conta como
  // fundo" para o cálculo de contraste. Com o peso, a intensidade continua na
  // faixa de 0.03 a 0.06 onde há imagem, e o vazio continua vazio.
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float grain = postHash(gl_FragCoord.xy + uGrainSeed) - 0.5;
  color += grain * uGrain * (0.12 + 0.88 * sqrt(clamp(luma, 0.0, 1.0)));

  // Linear → sRGB. O three não converte por nós: um ShaderMaterial sem o
  // include de colorspace escreve exatamente o que o shader produz.
  vec3 srgb = mix(
    color * 12.92,
    1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(vec3(0.0031308), color)
  );

  fragColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`;
