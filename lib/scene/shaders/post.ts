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

float cocAt(vec2 uv) {
  float depth = viewDepthAt(uv);
  return clamp(abs(depth - uFocus) / uFocusRange, 0.0, 1.0) * uAperture;
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

const int TAPS = 6;

void main() {
  float coc = cocAt(vUv);
  if (coc <= 0.001) {
    fragColor = texture(uSource, vUv);
    return;
  }

  // Raio em texels, proporcional ao CoC do centro. É a aproximação que troca
  // bokeh por velocidade: não há vazamento correto entre planos, e a essa
  // intensidade ninguém vê a diferença.
  vec2 step = uDirection * uTexel * coc * 14.0;

  vec4 total = texture(uSource, vUv) * 0.196;
  float weightSum = 0.196;

  for (int i = 1; i <= TAPS; i++) {
    float offset = float(i);
    // Gaussiana amostrada; normalizada pelo peso somado, então o número de
    // taps pode mudar sem recalibrar nada.
    float w = exp(-offset * offset / 18.0);
    total += texture(uSource, vUv + step * offset) * w;
    total += texture(uSource, vUv - step * offset) * w;
    weightSum += w * 2.0;
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

/**
 * O composite: mistura o nítido com o borrado pelo CoC, soma o bloom, aplica a
 * aberração crômática nas bordas, o grão animado e o tonemap.
 *
 * **Vinheta: nenhuma.** Nem leve. O pedido é explícito e a câmara já escurece
 * nas bordas por névoa e por queda de luz — uma vinheta por cima disso seria a
 * segunda vez que a mesma coisa é dita.
 */
export const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D uScene;
uniform sampler2D uBlurred;
uniform sampler2D uBloom;
uniform vec2  uResolution;
uniform float uBloomStrength;
uniform float uAberration;
uniform float uGrain;
uniform float uGrainSeed;
uniform float uExposure;
uniform float uDofEnabled;

${DEPTH_GLSL}
${HASH_GLSL}

in vec2 vUv;
out vec4 fragColor;

/**
 * O CoC é resolvido **uma vez por fragmento**, e passado adiante.
 *
 * A versão anterior chamava cocAt() dentro da amostragem, e a amostragem roda
 * uma vez por canal por causa da aberração cromática — ou seja, tres buscas de
 * profundidade por pixel em resolucao cheia. Medido: a profundidade de campo
 * custava 7.53 ms de GPU, e o borrao em si respondia por menos de um terco
 * disso. O deslocamento da aberracao e de ~2 px; o circulo de confusao nao
 * muda nada em 2 px, entao calcula-lo tres vezes era so trabalho.
 */
vec3 sampleFocused(vec2 uv, float blend) {
  vec3 sharp = texture(uScene, uv).rgb;
  if (blend <= 0.002) return sharp;
  return mix(sharp, texture(uBlurred, uv).rgb, blend);
}

void main() {
  vec2 uv = vUv;

  // Aberração radial: zero no centro, crescendo com o quadrado do raio. Só nas
  // bordas, que é onde uma lente real a tem — no meio do quadro ela leria como
  // glitch RGB, que o PROJECT.md §2 veta pelo nome.
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);
  vec2 shift = centered * r2 * uAberration;

  float blend = uDofEnabled < 0.5 ? 0.0 : smoothstep(0.0, 0.35, cocAt(uv));

  vec3 color;
  color.r = sampleFocused(uv + shift, blend).r;
  color.g = sampleFocused(uv, blend).g;
  color.b = sampleFocused(uv - shift, blend).b;

  color += texture(uBloom, uv).rgb * uBloomStrength;

  // Tonemap exponencial: preserva o pé da curva, que é onde esta cena vive, e
  // segura os cachos quentes sem lavar a cor deles.
  color = vec3(1.0) - exp(-color * uExposure);

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
