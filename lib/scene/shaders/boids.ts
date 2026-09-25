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
 *
 * ## As esteiras do rio
 *
 * O beat de Trabalho monta outros corpos de prova ao longo da câmara, e o
 * DIRECTION.md §4 diz o que eles fazem ao escoamento: "Cada card tem sua própria
 * esteira: ao se aproximar, o bando se descola nele também. É a mesma física do
 * beat de identidade, em escala menor, e é o que impede o rio de virar uma
 * galeria."
 *
 * **Mesma física, campo diferente.** Os três efeitos são os mesmos — aresta de
 * ataque, turbulência, recolamento — e as janelas são as mesmas frações da
 * altura da peça. O que muda é de onde sai a distância com sinal: para o corpo
 * de prova ela é **assada** com jump flood, porque glifo tem forma arbitrária;
 * para um card ela é **analítica**, cinco linhas de retângulo de cantos
 * arredondados, exata em qualquer ponto e com o gradiente de brinde. Assar um
 * campo por card seria trocar precisão infinita por sete texturas.
 *
 * A única diferença de desenho está na turbulência. No corpo de prova ela mora
 * nas **contra-formas** — os olhos das letras, que o enclausuramento do assado
 * sabe achar. Um card não tem contra-forma; o lugar onde um escoamento fica
 * turbulento atrás de uma placa é a **camada de cisalhamento**, a fronteira
 * entre a esteira parada e o escoamento que passou raspando. É ali que a força
 * age, e é a mesma leitura física que pôs a do glifo dentro do olho da letra.
 */

import { MAX_CARDS } from "../cards";
import {
  APERTURE_HALF_HEIGHT,
  APERTURE_HALF_WIDTH,
  APERTURE_Y,
  PLAN_FAR,
} from "../chamber-plan";
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
/**
 * A Superfície: quanto o bando já está saindo pela tomada de ar, 0 a 1 (ver
 * exitAt em lib/scene/curve.ts). Com ele acima de zero o escoamento vira, os
 * corpos são afunilados para a abertura, se dispersam do lado de fora e
 * **estacionam** — ficam fora do quadro, sem renascer, até o progresso voltar.
 */
uniform float uExit;

const int NEIGHBORS = 24;

/** O lugar dos corpos que saíram. Longe de tudo e fora de qualquer quadro. */
const vec3 PARKED = vec3(0.0, -500.0, -500.0);
bool isParked(vec3 p) { return p.y < -400.0; }

const float EXIT_WALL = ${PLAN_FAR.toFixed(3)};
const vec2  EXIT_CENTER = vec2(0.0, ${APERTURE_Y.toFixed(3)});
/** O funil mira dentro da abertura, com folga do requadro. */
const vec2  EXIT_BOX = vec2(${(APERTURE_HALF_WIDTH * 0.8).toFixed(3)}, ${(APERTURE_HALF_HEIGHT * 0.75).toFixed(3)});

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
 * O que o descolamento do corpo de prova e as esteiras do rio compartilham: a
 * volta do referencial da peça para o mundo, e o campo de ruído da turbulência.
 *
 * Ele entra quando **qualquer um dos dois** entra. Duas cópias seriam duas
 * turbulências, e a segunda divergiria da primeira no primeiro ajuste.
 */
const DEFLECTION_COMMON = /* glsl */ `
/**
 * Frequência espacial e deriva do campo de turbulência — ver o docblock em
 * TURB_SCALE, logo abaixo do bloco do campo assado. Elas moram aqui porque as
 * duas peças que agitam o escoamento amostram **o mesmo campo**.
 */
const float TURB_SCALE = 0.85;
const float TURB_DRIFT = 0.9;

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
 *
 * As duas constantes moram em DEFLECTION_COMMON, porque as esteiras do rio
 * amostram o mesmo campo.
 */
float solidBand(float z) {
  return 1.0 - smoothstep(SOLID_IN * uTypeH, SOLID_OUT * uTypeH, abs(z));
}
`;

/**
 * A corrente de cards e o SDF analítico deles — DIRECTION.md §4, "Cada card tem
 * sua própria esteira".
 *
 * As dimensões entram por **uniform** e não por constante interpolada: a
 * capacidade do rio muda com o aparelho (sete no desktop, quatro no mobile) e a
 * corrente é remontada em tempo de execução, então o shader precisa ler o corpo
 * e a contagem em vez de tê-los assados na compilação. Ver `lib/scene/cards.ts`.
 *
 * As frações são as mesmas do corpo de prova, medidas contra a **altura do
 * card** em vez da altura de caixa alta — é o que faz "a mesma física em escala
 * menor" ser literal. As duas exceções, e as duas têm motivo:
 *
 * - `CWAKE_RISE` é `1.6` e não `1.111`: a unidade do critério de recolamento é
 *   uma **largura de peça**, e um card é 1.6 alturas de largura enquanto uma
 *   letra é 1.111 caixas altas. O número muda para a grandeza continuar a mesma.
 * - `CSHEAR`/`CTURB_Z` substituem a janela de contra-forma. Um card não tem
 *   olho de letra; o que ele tem é uma camada de cisalhamento logo atrás da
 *   borda, e é ali que a esteira fica turbulenta.
 */
const CARD_CHUNK = /* glsl */ `
uniform vec4  uCards[${MAX_CARDS}];
uniform float uCardCount;
/** Quanto as esteiras agem. Ver cardAmount em lib/scene/curve.ts. */
uniform float uCardAmount;
uniform vec2  uCardHalf;
uniform float uCardCorner;

const float CGRAZE     = 0.015;
const float CSOLID_IN  = 0.02;
const float CSOLID_OUT = 0.05;
const float CAPPROACH  = 1.5;
const float CSEP_FADE  = 0.32;
/** Uma largura de card, em alturas de card: 3.8 / 2.375. */
const float CWAKE_RISE = 1.6;
/**
 * O atrator morre em **cinco alturas de card** — 11.9 unidades, pouco mais de
 * três larguras de peça —, e não nas doze que o corpo de prova usa.
 *
 * As doze do glifo são 24 unidades para uma silhueta de 15.9 de largura: uma
 * vez e meia a peça. Copiadas para o card elas viram **sete larguras e meia**,
 * e um atrator que continua puxando muito depois de o buraco ter fechado não
 * recola nada — ele empilha. Medido, com a janela longa a sombra da tinta a
 * quatro larguras batia em 1.41 vez o mesmo trecho sem o efeito, e baixar o
 * ganho de 1.3 para 0.45 só levou de 1.56 para 1.41: o problema nunca foi a
 * intensidade, foi a duração.
 *
 * A razão de a mesma janela servir ao glifo e não ao card é o tamanho da
 * sombra. A silhueta de sete letras é larga e cheia de vãos, e o fluxo que o
 * anel de captura entrega não dá conta de enchê-la; a de um card é pequena e
 * fecha rápido. Depois de fechada, força continuada é excesso.
 */
const float CWAKE_FALL = 5.0;
const float CPULL_IN   = 0.06;
const float CPULL_OUT  = 0.45;
/** A camada de cisalhamento: quão longe da borda ela ainda agita, e até onde. */
const float CSHEAR     = 0.30;
const float CTURB_Z    = 2.0;

const float CSEP_GAIN  = 11.0;
const float CCORE_GAIN = 34.0;
const float CTURB_GAIN = 26.0;
/**
 * O atrator da esteira, e ele é **um terço** do que o corpo de prova usa.
 *
 * Medido, com 1.3 — o mesmo número do glifo — a sombra da tinta a quatro
 * larguras de card fechava em **1.56 vez** o mesmo trecho sem o efeito
 * (?cards=0): o escoamento não voltava ao eixo, ele passava do ponto e
 * empilhava. É exatamente a falha que o atrator do corpo de prova já teve, e o
 * critério é o mesmo — recolamento é a densidade subindo **até** o escoamento
 * não perturbado, não além dele.
 *
 * O card precisa de menos ganho que o glifo pelo motivo geométrico: a silhueta
 * de sete letras é larga e cheia de vãos, então o escoamento atravessa ela e o
 * atrator só precisa fechar as hastes; um card é sólido e estreito, e o buraco
 * que ele deixa é fundo e pequeno. Mesma força enche esse buraco muito mais
 * rápido.
 */
const float CWAKE_GAIN = 0.45;

float cardBand(float z, float h) {
  return 1.0 - smoothstep(CSOLID_IN * h, CSOLID_OUT * h, abs(z));
}

/**
 * Distância com sinal a um retângulo de cantos arredondados, e o gradiente
 * dela — as duas coisas que o assado com jump flood produz para o glifo, aqui
 * em forma fechada.
 *
 * Devolve vec3(gradiente.xy, distância). A distância é negativa dentro da
 * peça e o gradiente aponta **para fora**, que é a mesma convenção do campo
 * assado (field.xy = para longe da tinta).
 */
vec3 cardField(vec2 p) {
  vec2 q = abs(p) - uCardHalf + uCardCorner;
  vec2 w = max(q, 0.0);
  float d = length(w) + min(max(q.x, q.y), 0.0) - uCardCorner;
  // Fora, o gradiente é a direção do canto; dentro, é o eixo mais próximo da
  // borda. As duas concordam na fronteira, então não há degrau na força.
  vec2 g = (w.x + w.y) > 0.0
    ? normalize(w + vec2(1e-6))
    : (q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  vec2 s = vec2(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0);
  return vec3(g * s, d);
}
`;

/**
 * O campo de turbulência deste corpo neste quadro, amostrado **uma vez**.
 *
 * Ele não depende de qual peça está desviando o escoamento: é um campo vetorial
 * do espaço, e a projeção perpendicular à velocidade é o que o torna um giro em
 * vez de uma lufada. Amostrá-lo dentro do laço dos cards custaria três `eddy()`
 * por card — vinte e uma leituras de ruído por corpo, para obter sete vezes o
 * mesmo vetor.
 *
 * Quem escolhe **onde** ele age continua sendo cada peça, pelo seu próprio
 * campo de distância: a contra-forma no corpo de prova, a camada de
 * cisalhamento nos cards.
 */
const TURB_SAMPLE = /* glsl */ `
  vec3 swirl = pos * TURB_SCALE + uTime * TURB_DRIFT;
  vec3 gust  = vec3(
    eddy(swirl),
    eddy(swirl + vec3(31.4, 17.9, 5.6)),
    eddy(swirl + vec3(-11.2, 43.7, 27.3))
  );
  vec3 along = normalize(vel + vec3(0.0, 1e-4, 1e-4));
  vec3 swirlForce = gust - along * dot(gust, along);
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
  force += swirlForce * (TURB_GAIN * turb * within);

  // 3. recolamento
  float zwake = smoothstep(0.0, WAKE_RISE * uTypeH, lz)
              * (1.0 - smoothstep(WAKE_RISE * uTypeH, WAKE_FALL * uTypeH, lz));
  float pull  = smoothstep(0.0, PULL_IN * uTypeH, dist)
              * (1.0 - smoothstep(PULL_IN * uTypeH, PULL_OUT * uTypeH, dist));
  force += articleToWorld(-away * (WAKE_GAIN * zwake * pull), c, s) * within;
  // ------------------------------------------------------------------------
`;

/**
 * As esteiras do rio: o mesmo bloco de cima, uma vez por card, com o campo
 * analítico no lugar do assado.
 *
 * **O laço tem um `break`, e ele não é o ramo que a nota do `FIELD_FORCE`
 * proíbe.** Aquele seria por posição do corpo — divergente por construção,
 * porque corpos vizinhos no texel são vizinhos em nada. Este é por `uCardCount`,
 * um **uniform**: toda warp concorda, o hardware sai do laço junta, e o que ele
 * economiza é a corrente inteira que não existe (quatro cards no mobile, zero
 * slots vazios computados).
 *
 * Dentro do laço não há ramo nenhum, pelo mesmo motivo de sempre: o corpo que
 * está longe deste card paga as contas e recebe força zero das janelas.
 */
const CARD_FORCE = /* glsl */ `
  // --- as esteiras do rio ---------------------------------------------------
  //
  // O laço inteiro é pulado fora do beat, e o ramo é de **uniform**: toda warp
  // concorda, e o que ele economiza é a corrente inteira nos dois terços da
  // descida em que ela não age.
  float cardH = uCardHalf.y * 2.0;
  for (int ci = 0; ci < ${MAX_CARDS}; ci++) {
    if (float(ci) >= uCardCount || uCardAmount <= 0.0) break;

    vec4  card = uCards[ci];
    float cc = cos(-card.w);
    float cs = sin(-card.w);
    vec3  crel = pos - card.xyz;
    vec3  cloc = vec3(cc * crel.x + cs * crel.z, crel.y, -cs * crel.x + cc * crel.z);

    vec3  cfield = cardField(cloc.xy);
    vec2  caway  = cfield.xy;
    float cdist  = cfield.z;

    float clz  = cloc.z;
    float clvz = -cs * vel.x + cc * vel.z;
    float clz0 = clz - clvz * uDt;
    float clzM = 0.5 * (clz0 + clz);
    // O mesmo Simpson do corpo de prova, e pela mesma razão: a banda sólida tem
    // 0.03 · H de espessura e um corpo a 6 u/s a atravessa em dois quadros.
    float csolid = (cardBand(clz0, cardH) + 4.0 * cardBand(clzM, cardH) + cardBand(clz, cardH)) / 6.0;

    // 1. aresta de ataque
    float czsep = smoothstep(-CAPPROACH * cardH, -CSOLID_OUT * cardH, clz)
                * (1.0 - smoothstep(CSOLID_OUT * cardH, 0.35 * cardH, clz));
    float clat  = 1.0 - smoothstep(CGRAZE * cardH, (CGRAZE + CSEP_FADE) * cardH, cdist);
    float ccore = 1.0 - smoothstep(-0.30 * cardH, CGRAZE * cardH, cdist);
    force += articleToWorld(
      caway * (CSEP_GAIN * clat * czsep + CCORE_GAIN * ccore * csolid), cc, cs
    ) * uCardAmount;

    // 2. turbulência na camada de cisalhamento
    //
    // Não é a contra-forma do glifo — um card não tem olho de letra. É a
    // fronteira entre a esteira parada e o escoamento que passou raspando a
    // borda, que é onde uma placa larga solta vórtice. A janela é uma faixa em
    // volta de cdist = 0 (dos dois lados da borda) que só existe **a jusante**
    // do plano do card.
    float cshear = (1.0 - smoothstep(0.0, CSHEAR * cardH, abs(cdist)))
                 * smoothstep(0.0, 0.2 * cardH, clz)
                 * (1.0 - smoothstep(0.2 * cardH, CTURB_Z * cardH, clz));
    force += swirlForce * (CTURB_GAIN * cshear * uCardAmount);

    // 3. recolamento
    float czwake = smoothstep(0.0, CWAKE_RISE * cardH, clz)
                 * (1.0 - smoothstep(CWAKE_RISE * cardH, CWAKE_FALL * cardH, clz));
    float cpull  = smoothstep(0.0, CPULL_IN * cardH, cdist)
                 * (1.0 - smoothstep(CPULL_IN * cardH, CPULL_OUT * cardH, cdist));
    force += articleToWorld(-caway * (CWAKE_GAIN * czwake * cpull), cc, cs) * uCardAmount;
  }
  // ------------------------------------------------------------------------
`;

/**
 * Passo de velocidade. Coesão, alinhamento, separação, escoamento pelo eixo,
 * retorno ao eixo, os três efeitos do descolamento (`detach`) e as esteiras do
 * rio (`cards`).
 *
 * É uma função e não uma constante porque `?detach=0` e `?cards=0` precisam
 * produzir um shader **sem** o bloco, e não um shader com o bloco multiplicado
 * por zero. Mesmo motivo da DOF em `Composer.tsx`: uma regra de corte só é
 * acionável se der para medir os dois lados no mesmo binário — e, aqui, o
 * desligado é também o melhor controle possível do critério de aceite: mesma
 * geometria, mesma semente, sem o efeito.
 */
export function boidsVelocityFrag(detach: boolean, cards: boolean): string {
  return /* glsl */ `
${COMMON}
${ROOST_CONSTANTS}
${detach || cards ? DEFLECTION_COMMON : ""}
${detach ? FIELD_CHUNK : ""}
${cards ? CARD_CHUNK : ""}

out vec4 fragColor;

void main() {
  float self = selfIndex();
  vec2  uv   = gl_FragCoord.xy / uTexSize;

  vec4 posSample = texture(uPos, uv);
  vec4 velSample = texture(uVel, uv);
  vec3 pos = posSample.xyz;
  vec3 vel = velSample.xyz;

  // Quem saiu não voa: fica parado no estacionamento, sem energia.
  if (isParked(pos)) {
    fragColor = vec4(0.0);
    return;
  }

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

  // Do lado de fora da tomada de ar não há duto, e portanto não há tubo.
  float beyond = 1.0 - smoothstep(EXIT_WALL - 3.0, EXIT_WALL - 0.5, pos.z);

  vec2  q = pos.xy / uTube;
  float r = length(q);
  if (r > 1.0) {
    vec2 wallOut = normalize(q / uTube);
    float outside = (r - 1.0) * length(pos.xy) / max(r, 1e-4);
    force.xy -= wallOut * outside * (3.4 * (1.0 - 0.85 * roost)) * (1.0 - beyond * uExit);
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
  // **A onda de densidade.** Uma frente de pressão que viaja pelo duto: onde a
  // fase está baixa o escoamento freia, onde está alta ele acelera, e pela
  // continuidade quem freia se acumula — densidade é o inverso da velocidade
  // num escoamento. A frente é oblíqua (tem componente em x), então as faixas
  // atravessam o quadro de lado, "como sombra atravessando trigo"
  // (DIRECTION.md §2), em vez de chegarem de frente como anéis.
  //
  // Baixa frequência de propósito, e é o oposto da corrente ambiente acima: lá
  // a fase precisa variar entre vizinhos para agitar sem transladar; aqui ela
  // precisa ser **coerente** por vários metros, senão não há faixa, há ruído.
  // Período de ~15 unidades no eixo, frente andando a ~2.6 u/s contra o
  // escoamento de ~6: a faixa passa pela câmera a cada ~1.7 s.
  float pressure = sin(pos.z * 0.42 + pos.x * 0.19 - uTime * 1.1);
  float surge = 1.0 + 0.3 * pressure * forming * (1.0 - roost);
#ifdef PROBE_NO_WAVE
  // O controle da medição da onda (rodada 12, __probe.wave): só a sonda liga.
  surge = 1.0;
#endif
  float vzTarget = mix(drive * surge, uRoostDrift, ROOST_HOLD * roost * band);

  // --- a saída pela tomada de ar (Superfície) -----------------------------
  //
  // "O bando sai pela abertura e se dispersa" (DIRECTION.md §4). Três termos:
  // o escoamento **vira** — o alvo axial passa a apontar para o fundo do duto
  // —; perto da
  // parede do fundo os corpos são afunilados para dentro da abertura, senão
  // atravessariam concreto; e do lado de fora não há mais tubo, então eles se
  // abrem e sobem, para o céu que a câmara nunca mostra inteiro.
  if (uExit > 0.0) {
    // **Só vira quem está à frente da lente.** Virando o bando inteiro, os
    // corpos em volta da câmera davam a volta em cima dela, a aceleração da
    // virada acendia todos, e o quadro de 0.89 virou uma tempestade de lascas
    // --cyan de borda a borda. Quem está passando pela câmera segue e estaciona
    // atrás dela; quem está adiante dá a volta longe, e é esse que se vê sair.
    //
    //
    // **A velocidade da saída tem piso e teto, e os dois são medidos.** A
    // −1.25 × drive o bando atravessava as frestas em um segundo, antes de a
    // câmera terminar de virar para a abertura. A −0.4 × drive (2.4 u/s) a
    // câmera, que anda para a abertura a ~3 u/s numa rolagem de 0.8 vh/s,
    // **ultrapassava** o bando, e quem ficava atrás da lente estacionava: 15.7
    // mil de 16.4 mil estacionados em 0.92, nenhum no quadro. A −0.9 × drive
    // (~5.4 u/s) ele anda à frente da câmera e leva ~3 s para sair.
    float ahead = 1.0 - smoothstep(uCameraZ - 7.0, uCameraZ - 2.0, pos.z);
    // A virada é **decisiva**, não proporcional: misturada linearmente pela
    // rampa, com uExit a 0.4 o alvo ainda apontava para a câmera, e o bando
    // passava pela lente (e estacionava) antes de virar — medido, 14 mil de
    // 16 mil estacionados em 0.88, antes de a câmera encarar a abertura.
    float turn = smoothstep(0.0, 0.3, uExit);
    vzTarget = mix(vzTarget, -drive * 0.9, turn * ahead);
    float nearWall = 1.0 - smoothstep(EXIT_WALL + 2.0, EXIT_WALL + 16.0, pos.z);
    vec2 aim = clamp(pos.xy - EXIT_CENTER, -EXIT_BOX, EXIT_BOX) + EXIT_CENTER;
    force.xy += (aim - pos.xy) * 2.5 * nearWall * (1.0 - beyond) * uExit;
    vec2 away = pos.xy - EXIT_CENTER;
    force.xy += away / (length(away) + 0.5) * 6.0 * beyond * uExit;
    force.y += 4.0 * beyond * uExit;
  }
  force.z += (vzTarget - vel.z) * 1.7;
${detach || cards ? TURB_SAMPLE : ""}
${detach ? FIELD_FORCE : ""}
${cards ? CARD_FORCE : ""}
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
  // A virada da saída é uma aceleração enorme e coordenada; sem este freio ela
  // acendia o bando inteiro de uma vez, que é o oposto de ir embora.
  energy *= 1.0 - 0.7 * uExit;
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

  // O estacionamento: quem saiu fica lá enquanto a Superfície durar, e renasce
  // a montante quando o progresso volta para dentro da descida.
  if (isParked(pos)) {
    if (uExit < 0.02) {
      float a = boidHash(self + floor(uTime * 7.0)) * 6.2831853;
      float r = sqrt(boidHash(self + 5.0 + floor(uTime * 7.0)));
      float depth = boidHash(self * 1.37 + 11.0 + floor(uTime * 7.0)) * 28.0;
      pos = vec3(cos(a) * r * uTube.x, sin(a) * r * uTube.y, spawnZ() + depth);
      fragColor = vec4(pos, 0.0);
    } else {
      fragColor = vec4(PARKED, 0.0);
    }
    return;
  }

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
  //
  // **E o anel não é um plano.** Todo corpo renascia exatamente em spawnZ(), e
  // como todos andam na mesma velocidade relativa à câmera, a população virava
  // uma lâmina que atravessava o duto em bloco: um terço do bando num bin de
  // quatro unidades, e o corredor do rio vazio entre as passagens (ver
  // MEASUREMENTS.md, "Três armadilhas do método"). Espalhar o renascimento por
  // 28 unidades de profundidade, todas a mais de 36 da lente — onde a névoa já
  // comeu o corpo —, desmancha a lâmina sem ninguém ver alguém nascer.
  // Com o bando saindo, ninguém renasce: quem já está do lado de fora da
  // tomada de ar estaciona. É isso que deixa o último quadro vazio
  // (DIRECTION.md §4).
  //
  // Quem passou pela lente também estaciona — mas só depois de a virada
  // (abaixo, só para quem está à frente dela) ter deixado os de longe
  // voltando para a abertura.
  if (uExit > 0.6 && (pos.z > recycleZ() || pos.z < EXIT_WALL - 5.0 || pos.y > 14.0)) {
    fragColor = vec4(PARKED, 0.0);
    return;
  }
  if (uExit <= 0.6 && pos.z > recycleZ()) {
    float a = boidHash(self + floor(uTime * 7.0)) * 6.2831853;
    float r = sqrt(boidHash(self + 5.0 + floor(uTime * 7.0)));
    float depth = boidHash(self * 1.37 + 11.0 + floor(uTime * 7.0)) * 28.0;
    pos = vec3(cos(a) * r * uTube.x, sin(a) * r * uTube.y, spawnZ() + depth);
  }
  // E o contrário também: se a câmera passou por eles (um salto de scroll para
  // trás), eles voltam para o começo do tubo em vez de ficarem órfãos atrás.
  if (pos.z < spawnZ() - 24.0) {
    pos.z = recycleZ() - 8.0;
  }

  fragColor = vec4(pos, density);
}
`;
