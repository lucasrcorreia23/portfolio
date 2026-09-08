/**
 * A simulação do bando, em FBO ping-pong — DIRECTION.md §5, "Corpos".
 *
 * Duas texturas RGBA de ponto flutuante, posição e velocidade, atualizadas por
 * um triângulo de tela cheia. **Nada volta da GPU**: quem informa luz, véu e
 * realce de estrutura é a simulação proxy na CPU (`lib/scene/proxy-sim.ts`).
 *
 * ## Vizinhança por passo rotativo
 *
 * Boids ingênuos são O(N²): a 4096 corpos são 16 milhões de leituras de textura
 * por quadro, e o quadro morre. Hash espacial resolveria, ao custo de duas
 * passadas extras e de um bucket que precisa caber num texel.
 *
 * O que este shader faz é mais barato e, para murmuração, indistinguível: cada
 * corpo amostra 24 vizinhos por um **passo que gira a cada quadro**. Nenhum
 * corpo vê o bando inteiro, mas ao longo de alguns quadros ele vê uma amostra
 * bem distribuída dele — e o que a murmuração precisa é justamente disso, uma
 * estimativa boa o bastante da vizinhança, atualizada rápido. É de onde saem as
 * ondas de densidade correndo pelo bando "como sombra atravessando trigo".
 *
 * Custo: 4096 × 24 ≈ 98 mil leituras por quadro, contra 16 milhões.
 *
 * ## O descolamento
 *
 * A versão anterior deste arquivo desviava o bando de uma **caixa de cantos
 * macios** do tamanho do bloco de texto — campo distante, silhueta estimada,
 * gaussiana de σ ≈ 2.4 em Z. Ela sumiu. No lugar entram os três efeitos do
 * DIRECTION.md §1, todos amostrando o **campo de distância assado do próprio
 * mesh** (`lib/scene/type-field.ts`):
 *
 * 1. **Aresta de ataque.** A força de separação é o gradiente do SDF, e é
 *    lateral: o escoamento vem pelo eixo da câmara e as letras estão de face
 *    para ele, então a fuga acontece no plano das letras.
 * 2. **Turbulência nas contra-formas.** Dentro dos vazios dos glifos, uma força
 *    **perpendicular à velocidade** desmancha a ordem sem mexer na vazão.
 * 3. **Recolamento.** Um atrator de baixa pressão logo fora da sombra puxa o
 *    escoamento de volta ao eixo e fecha o buraco que as letras deixaram.
 *
 * ### Duas correções que vieram junto
 *
 * **A volta do referencial local para o mundo estava com o sinal trocado.** O
 * bloco antigo montava a deflexão como `vec3(c * x, y, -s * x)`, mas a inversa
 * de `Ry(-yaw)` é `w.x = c*l.x - s*l.z`, `w.z = s*l.x + c*l.z`. O erro ficava
 * invisível no quadro do descolamento, onde o ângulo de ataque já caiu para 6°
 * e `s` vale −0.1; na entrada de perfil, a 78°, ele empurrava os corpos para o
 * lado errado em Z. Agora existe uma função só, `articleToWorld`.
 *
 * **A banda sólida é integrada pelo segmento varrido, não pela ponta.** Os
 * `±0.05·H` do documento são 0.20 unidade de mundo; a 6 u/s e 1/60 de quadro um
 * corpo anda 0.10 por passo, ou seja atravessa a banda inteira em dois quadros
 * — e num quadro lento, em nenhum. Amostrar só a posição final faria o desvio
 * depender da taxa de quadros e deixaria corpos passarem batido. Simpson em três
 * pontos ao longo do deslocamento do quadro resolve os dois: o resultado é o
 * impulso `∫F ds / |vz|`, que não tem `dt` nenhum dentro.
 *
 * A rampa de aproximação a montante (`APPROACH`) é a leitura de "em escoamento
 * real a separação começa **antes** do corpo" do mesmo §5 — os `±0.05·H`
 * continuam sendo a espessura do **sólido**, os dois finos, e não o alcance da
 * força.
 */

import {
  ROOST_CAPTURE,
  ROOST_HOLD,
  ROOST_PULL,
  ROOST_RADIUS,
  ROOST_SPIN,
  ROOST_Z_IN,
  ROOST_Z_OUT,
} from "../world";

/**
 * As constantes do poleiro vêm de `world.ts`, e não de literais no GLSL.
 *
 * Três simulações precisam concordar sobre a mesma coluna — este shader, o
 * proxy da CPU e a leitura de densidade da HUD. Um número digitado em três
 * lugares é a forma mais fácil de a luz acabar apontando para onde o bando não
 * está. Interpolar é seguro porque são constantes de módulo, resolvidas uma vez
 * na montagem do shader.
 */
const ROOST_CONSTANTS = /* glsl */ `
const float ROOST_RADIUS  = ${ROOST_RADIUS.toFixed(3)};
const float ROOST_CAPTURE = ${ROOST_CAPTURE.toFixed(3)};
const float ROOST_Z_IN    = ${ROOST_Z_IN.toFixed(3)};
const float ROOST_Z_OUT   = ${ROOST_Z_OUT.toFixed(3)};
const float ROOST_PULL    = ${ROOST_PULL.toFixed(3)};
const float ROOST_SPIN    = ${ROOST_SPIN.toFixed(3)};
const float ROOST_HOLD    = ${ROOST_HOLD.toFixed(3)};
`;

const COMMON = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform vec2  uTexSize;
uniform float uDt;
uniform float uTime;
uniform float uProgress;
uniform float uStride;
uniform vec3  uSpecimen;
uniform float uSpecimenYaw;
/** Meia-largura e meia-altura do tubo. A largura abre com o progresso. */
uniform vec2  uTube;
uniform float uCameraZ;
/**
 * O poleiro de Quem sou: xz é o eixo da coluna (y não entra — a coluna é
 * vertical), uRoostAmount é quanto ele está ligado e uRoostDrift é a
 * velocidade em Z do próprio eixo, que é o que os corpos capturados passam a
 * acompanhar. Ver roostCenter e roostAmount em lib/scene/curve.ts.
 */
uniform vec3  uRoost;
uniform float uRoostAmount;
uniform float uRoostDrift;

const int NEIGHBORS = 24;

/**
 * O bando é reciclado em relação à câmera, não a coordenadas fixas do duto.
 *
 * A câmera desce a câmara inteira; um intervalo fixo faria o bando ficar para
 * trás e a Identidade acabar sem ninguém no quadro. Reciclando a jusante da
 * lente e renascendo bem a montante, o tubo de corpos acompanha a descida — e
 * é o que dá "o bando vem na sua direção" em qualquer ponto do percurso.
 */
float recycleZ() { return uCameraZ + 2.0; }
float spawnZ()   { return uCameraZ - 64.0; }

float boidHash(float n) {
  return fract(sin(n * 127.1 + 311.7) * 43758.5453);
}

vec2 indexToUv(float index) {
  float w = uTexSize.x;
  return (vec2(mod(index, w), floor(index / w)) + 0.5) / uTexSize;
}

float selfIndex() {
  return floor(gl_FragCoord.y) * uTexSize.x + floor(gl_FragCoord.x);
}
`;

/**
 * O campo assado e as constantes que o leem. Só entra no passo de velocidade, e
 * só com o descolamento ligado — `?detach=0` compila tudo isto fora, e é por
 * isso que a medição A/B mede o custo do efeito e não o custo de multiplicar
 * por zero.
 *
 * Todas as distâncias são frações da altura de caixa alta, como no
 * DIRECTION.md §5, e o campo guarda a distância na mesma unidade. Nenhuma
 * conversão no meio.
 */
const FIELD_CHUNK = /* glsl */ `
uniform sampler2D uTypeField;
uniform vec4  uTypeRect;
uniform float uTypeH;
uniform float uTypeReady;

/** Envelope de raspagem: os corpos passam a esta distância da letra. */
const float GRAZE = 0.015;
/** Os dois finos: a peça é uma lâmina, e é esta a espessura dela. */
const float SOLID_IN  = 0.02;
const float SOLID_OUT = 0.05;
/** Alcance da rampa a montante. Ver o docblock do arquivo. */
const float APPROACH = 1.5;
/**
 * Quanto a força lateral decai para fora do envelope.
 *
 * Curto: a pilha de corpos expulsos tem que ficar **encostada** na letra, senão
 * ela se espalha por meia caixa alta e a compressão medida no anel some na
 * média. Com 0.5 e o tubo aberto o anel media 1.20 vez o fluxo livre; com 0.32
 * a mesma população se acumula mais perto e o número volta a descrever o que se
 * vê — duas lâminas raspando a silhueta.
 */
const float SEP_FADE = 0.32;
/** Janela da turbulência: em Z em volta do plano, e em distância da tinta. */
const float TURB_Z = 0.25;
const float TURB_D = 0.25;
/**
 * A esteira, em caixas altas. Uma letra avança 0.8 em e a caixa alta é 0.72 do
 * corpo, então uma largura de letra são 1.111 caixas altas — a mesma unidade
 * do critério de aceite ("a uma, duas e quatro larguras de letra a jusante").
 * Expressar em H e não em unidades de mundo é o que faz a esteira acompanhar
 * uma troca de corpo por breakpoint sozinha.
 */
const float WAKE_RISE = 1.111;
/**
 * O atrator alcança onze larguras de letra, e não seis.
 *
 * Com seis, a sombra enchia a uma e duas larguras e **voltava a esvaziar** na
 * quarta (0.90 do fluxo livre): os corpos recebiam o puxão cedo, cruzavam o
 * eixo por inércia e saíam do outro lado sem nada para segurá-los. Recolamento
 * não é um empurrão, é uma convergência — precisa continuar agindo enquanto o
 * escoamento se reorganiza.
 */
const float WAKE_FALL = 12.0;
/** O atrator é um **anel** logo fora da sombra, não um poço no eixo dela. */
const float PULL_IN  = 0.06;
const float PULL_OUT = 0.45;

const float SEP_GAIN  = 11.0;
const float CORE_GAIN = 34.0;
const float TURB_GAIN = 26.0;
/**
 * O atrator da esteira. Medido: a 5.0 a sombra das letras chegava a 1.28 vez o
 * fluxo livre a duas larguras de letra, e a 3.0 ainda ficava em 1.15 — ou seja
 * o escoamento não voltava ao eixo, ele passava do ponto e empilhava.
 * Recolamento é a densidade **subindo até** o fluxo livre, não além dele.
 *
 * Depois que o tubo passou a abrir com o progresso, o ganho caiu de novo — de
 * 2.0 para 1.3. A conta é simples: a seção do tubo quase dobrou, então quase o
 * dobro de corpos passa pelo anel de captura por segundo, e o mesmo ganho
 * entrega quase o dobro de fluxo para dentro da sombra. A 2.0 com o tubo aberto
 * a esteira voltou a passar do ponto (1.12 e 1.19 a duas e quatro larguras).
 */
const float WAKE_GAIN = 1.3;

/**
 * Frequência espacial do ruído: uma célula de 1/0.85 = 1.18 unidades, ou seja
 * 0.59 caixas altas.
 *
 * **Este número quase não importa, e isso foi medido.** A célula foi de 0.29
 * para 0.59 e depois para 1.0 caixa alta, e o comprimento de correlação da
 * direção dentro das contra-formas ficou em 0.16 a 0.20 nas três — não é a
 * célula do ruído que fixa a escala do vórtice.
 *
 * O que fixa são duas coisas que o ruído não controla. A primeira é o tempo de
 * trânsito: um corpo cruza a contra-forma a ~6 u/s em pouco mais de um décimo
 * de segundo, andando 0.3 caixa alta, então ele amostra células diferentes
 * mesmo que elas sejam grandes. A segunda é o próprio SDF: dentro de um olho de
 * letra o gradiente aponta para o centro, e corpos em lados opostos recebem
 * empurrões opostos.
 *
 * Fica em 0.85 porque subir mais só torna a força espacialmente mais uniforme
 * sem mudar o que se mede — e uniformidade demais é o caminho para o campo
 * virar uma lufada que balança a contra-forma inteira, que é o oposto de
 * vórtice.
 */
const float TURB_SCALE = 0.85;
const float TURB_DRIFT = 0.9;

float solidBand(float z) {
  return 1.0 - smoothstep(SOLID_IN * uTypeH, SOLID_OUT * uTypeH, abs(z));
}

/** Vetor no plano da peça de volta para o mundo. Inversa de Ry(-yaw). */
vec3 articleToWorld(vec2 planar, float c, float s) {
  return vec3(c * planar.x, planar.y, s * planar.x);
}

float eddyHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

/**
 * Ruído de valor, com a **rede girada para fora dos eixos do mundo**.
 *
 * A rede alinhada aos eixos já apareceu neste projeto como moiré retangular no
 * fundo da câmara, e grade é vetada pelo PROJECT.md §2. Aqui o sintoma seria
 * outro e pior: os vórtices da contra-forma nascendo em fileiras paralelas a X
 * e a Y, ou seja o bando desenhando uma grade — a proibição da §6.
 */
float eddy(vec3 p) {
  const mat3 turn = mat3(
     0.00,  0.80,  0.60,
    -0.80,  0.36, -0.48,
    -0.60, -0.48,  0.64
  );
  vec3 q = turn * p;
  vec3 i = floor(q);
  vec3 f = fract(q);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = eddyHash(i + vec3(0.0, 0.0, 0.0));
  float n100 = eddyHash(i + vec3(1.0, 0.0, 0.0));
  float n010 = eddyHash(i + vec3(0.0, 1.0, 0.0));
  float n110 = eddyHash(i + vec3(1.0, 1.0, 0.0));
  float n001 = eddyHash(i + vec3(0.0, 0.0, 1.0));
  float n101 = eddyHash(i + vec3(1.0, 0.0, 1.0));
  float n011 = eddyHash(i + vec3(0.0, 1.0, 1.0));
  float n111 = eddyHash(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  ) * 2.0 - 1.0;
}
`;

/**
 * Os três efeitos, sem um único `if`.
 *
 * O ramo óbvio seria pular tudo para quem está fora do retângulo do campo — a
 * maioria dos corpos, quase sempre. Ele não é feito porque a textura de
 * simulação é indexada por corpo e não por posição: dois corpos vizinhos no
 * texel são vizinhos em nada, então nenhuma warp concorda sobre o ramo e a
 * divergência custa mais que as contas que ela evita.
 */
const FIELD_FORCE = /* glsl */ `
  // --- o descolamento -----------------------------------------------------
  float c = cos(-uSpecimenYaw);
  float s = sin(-uSpecimenYaw);
  vec3  rel = pos - uSpecimen;
  vec3  local = vec3(c * rel.x + s * rel.z, rel.y, -s * rel.x + c * rel.z);

  vec2 fieldUv = (local.xy - uTypeRect.xy) / uTypeRect.zw;
  float within = uTypeReady
    * step(0.0, fieldUv.x) * step(fieldUv.x, 1.0)
    * step(0.0, fieldUv.y) * step(fieldUv.y, 1.0);

  vec4  field = texture(uTypeField, clamp(fieldUv, 0.0, 1.0));
  vec2  away  = field.xy;
  float dist  = field.z * uTypeH;
  float enc   = field.w;

  float lz  = local.z;
  float lvz = -s * vel.x + c * vel.z;
  float lz0 = lz - lvz * uDt;
  float lzM = 0.5 * (lz0 + lz);
  // Simpson ao longo do deslocamento do quadro: impulso, não amostra da ponta.
  float solid = (solidBand(lz0) + 4.0 * solidBand(lzM) + solidBand(lz)) / 6.0;

  // 1. aresta de ataque
  float zsep = smoothstep(-APPROACH * uTypeH, -SOLID_OUT * uTypeH, lz)
             * (1.0 - smoothstep(SOLID_OUT * uTypeH, 0.35 * uTypeH, lz));
  float lat  = 1.0 - smoothstep(GRAZE * uTypeH, (GRAZE + SEP_FADE) * uTypeH, dist);
  float core = 1.0 - smoothstep(-0.30 * uTypeH, GRAZE * uTypeH, dist);
  force += articleToWorld(
    away * (SEP_GAIN * lat * zsep + CORE_GAIN * core * solid), c, s
  ) * within;

  // 2. turbulência nas contra-formas
  //
  // **O campo é do mundo, e a projeção é que o torna perpendicular.** A versão
  // anterior montava uma base ortonormal a partir da velocidade **de cada
  // corpo** e sorteava dois ruídos nela. Parecia a mesma coisa e não era: dois
  // corpos vizinhos com velocidades ligeiramente diferentes têm bases
  // diferentes, então o mesmo valor de ruído virava força em direções
  // diferentes. O resultado tinha muita variância angular e nenhuma estrutura —
  // tremor, não vórtice.
  //
  // Isso não foi deduzido, foi medido: o comprimento de correlação espacial da
  // direção dentro das contra-formas saiu **abaixo de 1/e já na primeira
  // faixa** (C = 0.26 a 0.05 · H, contra 0.77 no fluxo livre), ou seja corpos a
  // um décimo de unidade um do outro mal concordavam. Vórtice tem escala; aquilo
  // não tinha nenhuma. A variância angular passava com folga assim mesmo — ela
  // mede exatamente a grandeza que a força foi desenhada para produzir, e por
  // isso sozinha não prova nada aqui.
  //
  // Agora o ruído é um campo vetorial do espaço: vizinhos amostram quase o
  // mesmo valor. Tirar a componente ao longo da velocidade mantém a força
  // girando o corpo em vez de acelerá-lo, que é o que preserva a vazão pela
  // contra-forma.
  float zturb = 1.0 - smoothstep(0.0, TURB_Z * uTypeH, abs(lz));
  float turb  = enc * zturb * (1.0 - smoothstep(0.0, TURB_D * uTypeH, max(dist, 0.0)));
  vec3  swirl = pos * TURB_SCALE + uTime * TURB_DRIFT;
  vec3  gust  = vec3(
    eddy(swirl),
    eddy(swirl + vec3(31.4, 17.9, 5.6)),
    eddy(swirl + vec3(-11.2, 43.7, 27.3))
  );
  vec3  along = normalize(vel + vec3(0.0, 1e-4, 1e-4));
  force += (gust - along * dot(gust, along)) * (TURB_GAIN * turb * within);

  // 3. recolamento
  float zwake = smoothstep(0.0, WAKE_RISE * uTypeH, lz)
              * (1.0 - smoothstep(WAKE_RISE * uTypeH, WAKE_FALL * uTypeH, lz));
  float pull  = smoothstep(0.0, PULL_IN * uTypeH, dist)
              * (1.0 - smoothstep(PULL_IN * uTypeH, PULL_OUT * uTypeH, dist));
  force += articleToWorld(-away * (WAKE_GAIN * zwake * pull), c, s) * within;
  // ------------------------------------------------------------------------
`;

/**
 * Passo de velocidade. Coesão, alinhamento, separação, escoamento pelo eixo,
 * retorno ao eixo e — com `detach` — os três efeitos do descolamento.
 *
 * É uma função e não uma constante porque `?detach=0` precisa produzir um
 * shader **sem** o bloco, e não um shader com o bloco multiplicado por zero.
 * Mesmo motivo da DOF em `Composer.tsx`: uma regra de corte só é acionável se
 * der para medir os dois lados no mesmo binário.
 */
export function boidsVelocityFrag(detach: boolean): string {
  return /* glsl */ `
${COMMON}
${ROOST_CONSTANTS}
${detach ? FIELD_CHUNK : ""}

out vec4 fragColor;

void main() {
  float self = selfIndex();
  vec2  uv   = gl_FragCoord.xy / uTexSize;

  vec4 posSample = texture(uPos, uv);
  vec4 velSample = texture(uVel, uv);
  vec3 pos = posSample.xyz;
  vec3 vel = velSample.xyz;

  float count  = float(uTexSize.x * uTexSize.y);
  float stride = max(1.0, floor(uStride));

  vec3 flockward = vec3(0.0);
  vec3 heading   = vec3(0.0);
  vec3 separate  = vec3(0.0);
  float neighbours = 0.0;

  for (int k = 0; k < NEIGHBORS; k++) {
    float other = mod(self + stride * float(k + 1), count);
    vec3 op = texture(uPos, indexToUv(other)).xyz;
    vec3 ov = texture(uVel, indexToUv(other)).xyz;

    vec3 d  = op - pos;
    float d2 = dot(d, d);
    // Raio de vizinhança curto — 3 unidades. Com o espaçamento médio do bando
    // em ~1.3, isso são de fato os vizinhos; um raio largo transformaria a
    // amostra por passo rotativo, que sorteia do bando **inteiro**, numa média
    // global, e coesão contra a média global não é murmuração, é gravidade.
    if (d2 > 9.0) continue;

    neighbours += 1.0;
    flockward += d;
    heading  += ov;

    if (d2 < 1.7 && d2 > 1e-4) separate -= d / d2;
  }

  // O bando só existe a partir da Identidade. Na Emergência são "uns poucos
  // corpos isolados, suspensos, quase sem deriva" — então a coesão e o
  // escoamento sobem com o progresso, não com o tempo.
  float forming = clamp(uProgress / 0.16, 0.0, 1.0);
  float drive   = 0.6 + 5.6 * forming;

  // Separação domina, coesão é fraca, alinhamento entra com o bando formado.
  // É essa ordem que produz onda de densidade em vez de aglomerado: cada corpo
  // segue quem está do lado, e o que corre pelo bando é a mudança, não a massa.
  vec3 force = separate * 2.4;
  if (neighbours > 0.0) {
    force += (flockward / neighbours) * (0.10 + 0.26 * forming);
    force += ((heading / neighbours) - vel) * (0.30 + 0.70 * forming);
  }

  // Contenção em **tubo**, não em ponto. Uma mola para o eixo puxa todo mundo
  // para a mesma reta e o bando colapsa num fio; aqui a força só existe fora da
  // parede, e dentro dela o bando é livre.
  //
  // O tubo é uma **elipse**, e a direção de fora dela é o gradiente da norma
  // p sobre T — não a radial do círculo, que numa elipse achatada aponta para o
  // lado errado em tudo que não está nos eixos. A intensidade continua sendo a
  // distância em unidades de mundo, para a contenção não ficar mais dura quando
  // o tubo abre.
  //
  // **E ela cede para o poleiro.** Em Quem sou a coluna fica encostada na
  // parede graduada, ou seja **fora** do tubo (ver ROOST_X_MAX em world.ts):
  // uma contenção que continuasse valendo ali puxaria os corpos de volta para o
  // eixo do duto e a coluna nunca se formaria contra a parede. O tubo é uma
  // regra de escoamento, e no poleiro não há escoamento — há um bando parado.
  float roostGate = 1.0 - smoothstep(ROOST_Z_IN, ROOST_Z_OUT, abs(pos.z - uRoost.z));
  float roost = uRoostAmount * roostGate;

  vec2  q = pos.xy / uTube;
  float r = length(q);
  if (r > 1.0) {
    vec2 wallOut = normalize(q / uTube);
    float outside = (r - 1.0) * length(pos.xy) / max(r, 1e-4);
    force.xy -= wallOut * outside * (3.4 * (1.0 - 0.85 * roost));
  }

  // Corrente ambiente, para o tubo não virar um cano.
  //
  // A frequência espacial é alta de propósito. Numa frequência baixa todos os
  // corpos de uma mesma fatia recebem a mesma fase, e o campo deixa de agitar o
  // bando para **transladá-lo**: o tubo inteiro encosta numa parede e fica lá.
  // Com o período curto em x, y e z, corpos vizinhos recebem fases diferentes,
  // e o que corre pelo bando é uma onda — que é a murmuração do DIRECTION.md §2,
  // "ondas de densidade correndo como sombra atravessando trigo".
  force.xy += vec2(
    sin(pos.z * 0.55 + pos.y * 0.9 + uTime * 0.5),
    cos(pos.z * 0.47 - pos.x * 0.8 - uTime * 0.4)
  ) * (0.3 + 0.5 * forming);

  // --- o poleiro colunar de Quem sou --------------------------------------
  //
  // DIRECTION.md §4: "O bando se organiza: assenta num poleiro colunar de
  // rotação lenta, densidade estável... velocidade dos corpos caindo para
  // planeio longo."
  //
  // Três termos e uma janela. O radial captura, o tangencial gira, e o axial
  // troca o alvo de velocidade: quem entra deixa de escoar pelo duto e passa a
  // acompanhar o eixo da coluna, que é ancorado à câmera. Quando a pessoa para
  // de rolar, o eixo para, e o bando para com ele — é daí que sai a "densidade
  // estável", sem congelar nada.
  //
  // **A janela em Z é o que impede o duto inteiro de congelar.** Segurando
  // todos os corpos, o bando pararia de chegar e o quadro viraria uma nuvem
  // parada com uma coluna dentro; com a janela, ele continua vindo de montante,
  // freia ao encontrar o poleiro e assenta. Frear é aceleração, e aceleração é
  // brilho (vEnergy): os corpos acendem ao entrar, que é o que faz a
  // organização ser vista acontecendo em vez de já ter acontecido.
  vec2  toAxis = uRoost.xz - pos.xz;
  float axisR  = length(toAxis) + 1e-4;
  vec2  inward = toAxis / axisR;
  // Fora do alcance da captura o corpo continua escoando pelo duto: o poleiro
  // recolhe quem passa perto, não o bando inteiro de uma vez.
  float band  = 1.0 - smoothstep(ROOST_CAPTURE, ROOST_CAPTURE * 1.6, axisR);

  // Puxa para o **raio**, não para o centro: quem está fora vem, quem está
  // dentro é empurrado de volta. Com 16 mil corpos, um poço no eixo equilibra
  // com a separação só depois de virar uma bola de cinco unidades de raio —
  // medido, e na tela isso é um borrão redondo, não uma coluna. Numa casca a
  // mesma população se distribui por uma superfície, o limbo fica mais denso
  // que o miolo, e é esse limbo que se lê como cilindro girando.
  float toShell = clamp((axisR - ROOST_RADIUS) / ROOST_RADIUS, -1.0, 1.0);
  force.xz += inward * (ROOST_PULL * toShell * band) * roost;

  // A tangencial cresce com o raio, e não é enfeite de fórmula: com módulo
  // constante a velocidade angular seria maior no miolo do que na borda, a
  // coluna se desfiaria em espiral e o que se leria seria um redemoinho. Com
  // a proporcional a r e o arrasto que já existe, v também — rotação de corpo
  // rígido, que é o que "rotação lenta" quer dizer. Uma volta a cada ~10 s na
  // borda.
  force.xz += vec2(-inward.y, inward.x)
            * (ROOST_SPIN * min(axisR / ROOST_RADIUS, 1.0) * band) * roost;

  // Planeio longo: o alvo de velocidade axial se aproxima do arrasto do eixo,
  // sem chegar nele — ver ROOST_HOLD em world.ts. Um poleiro que segurasse tudo
  // acumularia a população inteira; este desacelera e deixa passar.
  float vzTarget = mix(drive, uRoostDrift, ROOST_HOLD * roost * band);
  force.z += (vzTarget - vel.z) * 1.7;
${detach ? FIELD_FORCE : ""}
  vec3 next = vel + force * uDt;
  next *= 0.985;

  float speed = length(next);
  if (speed > 9.0) next *= 9.0 / speed;

  // w guarda a energia: quanto o corpo acabou de ser acelerado. O DIRECTION.md
  // §5 diz que "o brilho segue a aceleração", e é este número que a rampa
  // emissiva lê.
  //
  // **Ataque rápido, decaimento lento**, e não a mesma constante nos dois
  // sentidos. Com o mix simétrico de 0.24 a energia caía com constante de
  // tempo de quatro quadros — 0.07 s, ou 0.4 unidade de deslocamento. Um corpo
  // jogado pela turbulência da contra-forma já estava frio antes de chegar à
  // esteira, e o --coral do DIRECTION.md §5, que existe **só** ali, não tinha
  // como acender: medido, a energia na esteira tinha p99 de 0.19 contra o 0.35
  // que o limiar pedia.
  //
  // Com 0.03 na descida a constante vira 33 quadros, 0.55 s, ~3.4 unidades —
  // o corpo esfria ao longo da esteira em vez de dentro dela. Não é licença
  // poética: é a diferença entre "o brilho segue a aceleração" e "o brilho
  // pisca na aceleração".
  float energy = clamp(length(next - vel) / (uDt * 9.0 + 1e-5), 0.0, 1.0);
  float cooling = velSample.w;
  energy = energy > cooling ? mix(cooling, energy, 0.5) : mix(cooling, energy, 0.03);

  fragColor = vec4(next, energy);
}
`;
}

/** Passo de posição. Integra, recicla e guarda a densidade local em `w`. */
export const BOIDS_POSITION_FRAG = /* glsl */ `
${COMMON}

out vec4 fragColor;

void main() {
  float self = selfIndex();
  vec2  uv   = gl_FragCoord.xy / uTexSize;

  vec4 posSample = texture(uPos, uv);
  vec3 pos = posSample.xyz;
  vec3 vel = texture(uVel, uv).xyz;

  pos += vel * uDt;

  float count  = float(uTexSize.x * uTexSize.y);
  float stride = max(1.0, floor(uStride));
  float neighbours = 0.0;
  for (int k = 0; k < NEIGHBORS; k++) {
    float other = mod(self + stride * float(k + 1), count);
    vec3 d = texture(uPos, indexToUv(other)).xyz - pos;
    if (dot(d, d) < 9.0) neighbours += 1.0;
  }
  float density = clamp(neighbours / float(NEIGHBORS), 0.0, 1.0);
  density = mix(posSample.w, density, 0.2);

  // Quem passou pela lente volta a montante, num anel novo. O bando é
  // contínuo: nada aparece nem some no meio do quadro.
  if (pos.z > recycleZ()) {
    float a = boidHash(self + floor(uTime * 7.0)) * 6.2831853;
    float r = sqrt(boidHash(self + 5.0 + floor(uTime * 7.0)));
    pos = vec3(cos(a) * r * uTube.x, sin(a) * r * uTube.y, spawnZ());
  }
  // E o contrário também: se a câmera passou por eles (um salto de scroll para
  // trás), eles voltam para o começo do tubo em vez de ficarem órfãos atrás.
  if (pos.z < spawnZ() - 24.0) {
    pos.z = recycleZ() - 8.0;
  }

  fragColor = vec4(pos, density);
}
`;
