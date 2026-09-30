import { MAX_CARDS } from "../cards";
import {
  CARD_BEZEL,
  CARD_CORNER,
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
  CARD_COVER_UV,
  CARD_PLATE_FAR,
  CARD_PLATE_NEAR,
  CARD_PLATE_UV,
} from "../card-layout";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "./lights";

/**
 * Os cards do rio — DIRECTION.md §5: "Os cards usam o mesmo substrato fosco,
 * com a capa do case como textura unlit, levemente recuada atrás da placa de
 * cota."
 *
 * Três materiais numa peça só, e a divisão é por UV:
 *
 * - **O substrato** é a moldura e o fundo. É o mesmo concreto das paredes —
 *   base `--abyss`, fosco, sem emissivo próprio, aceso só pelo rig prático que
 *   segue os aglomerados do bando. Um card sem bando por perto é escuro, como
 *   tudo nesta câmara.
 * - **A capa** é unlit: ela é a imagem, não uma superfície iluminada. Nesta
 *   rodada ela é **a capa real do case**, amostrada de uma
 *   `sampler2DArray` — ver `card-atlas.ts` para por que camadas e não atlas em
 *   tira. O campo procedural continua no arquivo e continua sendo desenhado:
 *   ele é o que cobre a espera até a imagem decodificar, e é da paleta, não um
 *   placeholder cinza (PROJECT.md §6).
 * - **A placa de cota** é gravação, e agora carrega **cliente, título e ano**.
 *   Ela usa a mesma física de raspão da `Structure`: incidência quase rasante,
 *   brilho na quina e não na face. E ela tem dois níveis — ver `uPlateArray`.
 *
 * ## Instanciado, com uma máscara — e por que ela não é a mesma coisa que
 * estacionar
 *
 * Os sete cards são uma malha só, com `InstancedBufferGeometry`: o corpo é
 * idêntico, o que muda é centro, ângulo, acento e semente.
 *
 * A medição tira cards de duas maneiras, e elas respondem a perguntas
 * diferentes. `uCardMask` tira **do quadro** e deixa a força no escoamento: é o
 * que a pegada precisa, porque ali o bando tem que seguir a mesma trajetória nas
 * duas condições para que a diferença de pixel seja a peça e não a esteira dela.
 * Estacionar o card — a sonda escrevendo `uCards[i]` cinco mil unidades fora do
 * duto — tira **do escoamento** também, e é o que a medição de esteira precisa,
 * porque ali o controle é justamente "sem esta força".
 *
 * Uma linha de vertex shader existe só para medir, e ela custa uma divisão e um
 * `mod` em vinte e oito vértices. O que ela compra está no docblock de
 * `probe-cards.ts`.
 *
 * ## Opacos, escrevendo profundidade
 *
 * Pelo mesmo motivo que os corpos do bando: é o que faz um card ocluir e ser
 * ocluído de verdade, e é o que faz o bando passar na frente de um e atrás de
 * outro. Card transparente sairia da lista opaca e seria ordenado por objeto,
 * e a corrente inteira ficaria na frente ou atrás do bando.
 *
 * ## `flat` nos dois varyings de instância, e não é estilo
 *
 * `vIndex` e `vAccent` são constantes por instância, então interpolar não muda
 * o valor — **mas muda os bits**. Um `vIndex` de 3 chega como 2.9999997 no meio
 * do triângulo, e `int(vIndex)` trunca para 2: o card leria a capa e a placa do
 * vizinho. Com `flat` o valor atravessa exato, e a indexação de `uCoverBlend`
 * fica correta sem `+ 0.5` de gambiarra.
 */

const COVER_MIN = `vec2(${CARD_COVER_UV[0].toFixed(4)}, ${CARD_COVER_UV[1].toFixed(4)})`;
const COVER_MAX = `vec2(${CARD_COVER_UV[2].toFixed(4)}, ${CARD_COVER_UV[3].toFixed(4)})`;
const PLATE_MIN = `vec2(${CARD_PLATE_UV[0].toFixed(4)}, ${CARD_PLATE_UV[1].toFixed(4)})`;
const PLATE_MAX = `vec2(${CARD_PLATE_UV[2].toFixed(4)}, ${CARD_PLATE_UV[3].toFixed(4)})`;

export const CARD_VERT = /* glsl */ `
in vec4 aCard;
in vec3 aTone;
in vec3 aAccent;
in float aSeed;
in float aIndex;

/**
 * Máscara de bits das instâncias escondidas: o bit i ligado tira o card i do
 * quadro. Zero é a corrente inteira, que é o que a cena roda sempre.
 *
 * Ela esconde **só do quadro** — o card continua desviando o escoamento, porque
 * o shader dos boids lê uCards e não esta máscara. Isso é o ponto: a medição de
 * pegada precisa que o bando siga exatamente a mesma trajetória nas duas
 * condições, senão a diferença de pixel passa a incluir a esteira em vez de só
 * a peça. Quem tira um card do escoamento é a sonda, escrevendo uCards direto
 * (ver park, em probe-cards.ts), e isso é outra pergunta.
 */
uniform float uCardMask;

/**
 * A peça que a travessia levou até a lente, e se o DOM já assumiu a capa dela.
 *
 * Ela some do quadro quando uDockHandoff passa de 0.5 — nunca antes. O que fica
 * na tela naquele instante é o <img> da rota do case, no mesmo retângulo e com
 * os mesmos bytes, então o desaparecimento não é visível: é uma troca de quem
 * desenha, não de o que se vê.
 *
 * Não é um bit de uCardMask de propósito: a máscara é da sonda, que a usa com a
 * cena parada. Dois escritores por quadro desfariam o que a medição montou. Ver
 * o docblock de dockCard em lib/scene/uniforms.ts.
 */
uniform float uDockCard;
uniform float uDockHandoff;
uniform float uTime;
uniform float uCaseRecess;

out vec3  vWorld;
out vec3  vNormal;
out vec2  vUv;
out vec3  vTone;
out float vSeed;
out float vViewDepth;
flat out float vIndex;
flat out vec3  vAccent;

void main() {
  // **A peça flutua** (rodada 16). Até aqui cada card era um retângulo
  // pregado no ar, imóvel enquanto o bando e a névoa se moviam em volta — e o
  // Lucas o leu como banner artificial. Agora ele está suspenso na corrente:
  // sobe e desce alguns centímetros, balança um grau e pouco, com fase própria
  // (aSeed), em períodos de 8 a 30 segundos. É a escala de uma placa pendurada
  // num ar que se move, não uma animação.
  //
  // A deriva zera na travessia para o case (uCaseRecess): a peça atracada tem
  // que casar com o retângulo da capa em DOM ao décimo de pixel.
  float drift = 1.0 - uCaseRecess;
  float t = uTime * 0.21 + aSeed * 37.0;
  float bob = (sin(t) * 0.06 + sin(t * 2.3 + 1.7) * 0.02) * drift;
  float sway = sin(t * 0.77 + 0.6) * 0.024 * drift;
  float roll = sin(t * 0.61 + 2.1) * 0.013 * drift;

  float c = cos(aCard.w + sway);
  float s = sin(aCard.w + sway);
  vec2 rolled = vec2(
    cos(roll) * position.x - sin(roll) * position.y,
    sin(roll) * position.x + cos(roll) * position.y
  );

  // Rotação em torno de Y: a mesma convenção do corpo de prova, e a mesma que o
  // shader dos boids inverte para entrar no referencial do card.
  vec3 local = vec3(
    c * rolled.x + s * position.z,
    rolled.y + bob,
    -s * rolled.x + c * position.z
  );

  // A instância escondida colapsa no próprio centro: nenhum fragmento, nenhuma
  // mudança de profundidade, e o resto da corrente intacto.
  float bit = mod(floor(uCardMask / exp2(aIndex)), 2.0);
  float handed = step(0.5, uDockHandoff) * (1.0 - step(0.5, abs(aIndex - uDockCard)));
  float hidden = max(step(0.5, bit), handed);
  vec3 world = aCard.xyz + local * (1.0 - hidden);

  vWorld  = world;
  vNormal = vec3(s, 0.0, c);
  vUv     = uv;
  vTone   = aTone;
  vSeed   = aSeed;
  vIndex  = aIndex;
  vAccent = aAccent;

  vec4 view = viewMatrix * vec4(world, 1.0);
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

/**
 * A capa procedural — agora o **estado de espera**, não o conteúdo.
 *
 * Ela continua aqui, e continua sendo desenhada em todo quadro em que a imagem
 * do case ainda não decodificou. O PROJECT.md §6 proíbe retângulo cinza no
 * lugar de imagem que falta, e a saída não é um cinza mais bonito: é um campo da
 * própria paleta e da própria metáfora, que o `uCoverBlend` atravessa para a
 * fotografia quando ela chega. Numa rede lenta o rio nunca fica vazio; numa rede
 * rápida ninguém vê isto.
 *
 * As duas regras que a governam continuam valendo, e agora valem para a
 * fotografia também:
 *
 * 1. **Ela não pode virar caixa de luz.** Desde a rodada 12 a capa tem luz
 *    própria baixa (ver `COVER_SELF_TARGET`) e um joelho de valor
 *    (`COVER_KNEE`/`COVER_CEILING`): ela lê como imagem no escuro, não como
 *    a segunda fonte de luz da câmara.
 * 2. **Ela não gasta o orçamento de calor.** `--rose` e `--coral` são eventos do
 *    bando (§2), então a rampa procedural fica no lado frio: `--void` →
 *    `--deep` → o tom do card, que é uma mistura de `--teal` e `--cyan`.
 */
/**
 * **A capa tem luz própria, baixa e constante** — rodada 12.
 *
 * Da rodada 9 à 11 ela era placa fosca: albedo × (0.16 + 1.1 × luz dos
 * aglomerados), com teto em L 0.2. O objetivo era a capa não virar caixa de
 * luz branca, e ele foi cumprido ao preço de a capa sumir: medido na leitura
 * (6.2 unidades, bando escondido), a média entregue ficava entre **0.003 e
 * 0.054** — as três capas geradas praticamente pretas, as fotografias em um
 * quarto do próprio valor. A névoa come ~40% na leitura, e o que sobrava era
 * a luz do bando, que não está sempre lá.
 *
 * Agora a capa é uma impressão iluminada por trás, com pouco brilho: cada
 * imagem é multiplicada por um **ganho próprio** (`coverGain`, calculado da
 * luminância média dela quando a camada chega — `card-atlas.ts`), escolhido
 * para a imagem chegar à névoa com média perto de `COVER_SELF_TARGET`. É
 * linear por imagem, então a imagem continua sendo a imagem (a correlação
 * com o original é o critério). Um ganho único não serviria: a capa do ZOOM
 * tem L média 0.03 e a da Decision Suite 0.29 — o mesmo número apagaria uma
 * ou estouraria a outra.
 *
 * O bando **soma** por cima (`COVER_FLOCK_GAIN`): perto dele a capa acende um
 * pouco mais, longe dele ela continua lá.
 */
export const COVER_SELF_TARGET = 0.23;
/**
 * Faixa do ganho — nem uma capa escura vira farol, nem uma clara some. O teto
 * era 16 na rodada 12, e as capas geradas (L média 0.013 a 0.022) chegavam a
 * 9× o próprio valor: telas acesas, mais claras que qualquer trabalho real do
 * rio. Com 3.3, a razão entregue ÷ original das três fica em 2.1–2.4 (o
 * Lucas fixou 2.5): uma imagem escura continua escura, só legível. As capas
 * reais têm ganho de 0.7 a 1.1 e não mudam.
 */
export const COVER_GAIN_MIN = 0.4;
export const COVER_GAIN_MAX = 3.3;
/** O ganho do campo procedural enquanto a imagem não chega. */
export const COVER_FIELD_GAIN = 1;
/** Quanto a luz dos aglomerados soma por cima da luz própria. */
const COVER_FLOCK_GAIN = 0.6;

/**
 * O joelho de valor da capa, em HDR linear, **antes** do tonemap.
 *
 * Só comprime o que passa de `COVER_KNEE`, e se aproxima de `COVER_CEILING`
 * sem cruzá-lo: um fundo branco de site lê como claro e não estoura em caixa
 * de luz. Abaixo do joelho a capa é linear — que é onde a média mora.
 */
const COVER_KNEE = 0.3;
const COVER_CEILING = 0.6;

const COVER_GLSL = /* glsl */ `
vec3 coverField(vec2 uv, vec3 world, vec3 tone, float seed) {
  vec3 grid = world + vec3(seed * 41.0, seed * 17.0, seed * 63.0);
  float n = sceneNoise(grid * 0.55);
  n = n * 0.62 + sceneNoise(grid * 2.1) * 0.38;

  // Um horizonte, e o ruído quebrando a rampa. Três paradas, nunca duas.
  float band = smoothstep(0.05, 0.95, uv.y);
  float t = clamp(band * 0.62 + n * 0.58 - 0.12, 0.0, 1.0);

  vec3 field = mix(uVoid, uDeep, smoothstep(0.0, 0.44, t));
  field = mix(field, tone, smoothstep(0.44, 1.0, t));
  return field * 1.35;
}

/**
 * sRGB para linear, feito à mão de propósito.
 *
 * A alternativa era marcar a textura com colorSpace sRGB e deixar o three
 * escolher o formato interno. Numa DataArrayTexture isso depende de qual
 * caminho de texImage3D a versão da biblioteca toma, e uma conversão que
 * aparece ou não conforme a versão do three é a classe de divergência que este
 * projeto paga caro. Aqui a conta está escrita.
 */
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
`;

export const CARD_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

uniform vec3  uSubstrate;
uniform vec3  uCyan;
uniform vec3  uMist;

/**
 * As capas dos cases, uma camada por card, na ordem da curadoria.
 *
 * Camadas e não atlas em tira: o índice da instância chega num varying e por
 * isso **não** é dinamicamente uniforme, o que proíbe uCovers[vIndex] em
 * GLSL ES 3.00. Numa textura em camadas o índice é parte da coordenada, e cada
 * camada filtra sozinha — sem sangramento de vizinho na borda.
 */
uniform sampler2DArray uCoverArray;

/**
 * A placa de cota, uma camada por card, com **dois níveis em dois canais**.
 *
 *   R  cliente, título e ano — o que se lê à distância de leitura
 *   G  número de estação, régua fina e marcas de intervalo — o detalhe que
 *      aparece só na aproximação
 *
 * Dois canais e não duas texturas porque a máscara é binária por natureza e a
 * memória é a mesma. Ver drawPlate, em card-atlas.ts.
 */
uniform sampler2DArray uPlateArray;

/** Um texel da placa, para o realce de bisel sair do gradiente da máscara. */
uniform vec2 uPlateTexel;

/**
 * Quanto da capa real já entrou, por card, 0 a 1 — amortecido na CPU.
 *
 * Indexado por vIndex, que é flat: um array de float indexado por valor não
 * uniforme é legal em GLSL ES 3.00 (ao contrário de um array de samplers).
 */
uniform float uCoverBlend[${MAX_CARDS}];
uniform float uCoverGain[${MAX_CARDS}];

/**
 * A capa do card atracado, em resolução de entrega.
 *
 * A camada do atlas tem 640 px de largura, dimensionada para o card **no
 * corredor** — 682 px projetados no mais próximo, medido. No fim do voo até o
 * case a mesma peça ocupa a capa inteira em DOM, perto do dobro disso: a camada
 * chegaria ampliada, e a troca para o <img> leria como um pulo de foco. Um
 * sampler 2D à parte, com a imagem que o próprio <img> baixou, resolve isso sem
 * mexer nas dimensões da camada — que são compartilhadas por todo o array e não
 * poderiam mudar para um card só.
 */
uniform sampler2D uDockCover;
/** O card atracado, ou -1, e quanto da capa em resolução de entrega já entrou. */
uniform float uDockCard;
uniform float uDockBlend;
/** O recorte cover da textura de entrega, em fração de UV. */
uniform vec2 uDockCoverCrop;
/** Quanto a cena recuou para virar fundo de leitura. Ver uniforms.ts. */
uniform float uCaseRecess;

/** Índice do card sob o ponteiro, ou -1. Ver card-pick.ts. */
uniform float uHoverCard;
/** Quanto a resposta de ponteiro está ligada, 0 a 1 — amortecida na CPU. */
uniform float uHoverAmount;

in vec3  vWorld;
in vec3  vNormal;
in vec2  vUv;
in vec3  vTone;
in float vSeed;
in float vViewDepth;
flat in float vIndex;
flat in vec3  vAccent;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}
${COVER_GLSL}

void main() {
  // O substrato: concreto, e o mesmo grão das paredes. Sem ele o card é um
  // retângulo de cor chapada, que é o que a §2 chama de cenário.
  float near  = exp(-vViewDepth * 0.05);
  float grain = sceneNoise(vWorld * 0.62) * near * 0.45 + sceneNoise(vWorld * 0.18) * 0.55;

  // Incidência baixa: o card é uma **face** virada para o corredor, não uma
  // quina gravada. Ele acende quando um cacho passa na frente dele.
  float lit = practicalLight(vWorld, vNormal, 0.22);
  vec3 color = uSubstrate * (0.10 + 0.24 * grain) + uCyan * lit * 0.18;
  // As lanternas que passam perto também tocam a peça (rodada 16).
  vec3 lamp = lampLight(vWorld);
  color += lamp * (uSubstrate * 6.0 + 0.02);

  // A resposta de ponteiro é por card, e o teste é exato porque vIndex é flat.
  float hover = uHoverAmount * (1.0 - step(0.5, abs(vIndex - uHoverCard)));

  // --- o chanfro da borda --------------------------------------------------
  // A quina da peça, e não uma moldura: incidência quase rasante, do mesmo
  // jeito que as gravações da parede. Ela aparece quando um cacho passa de
  // lado e some quando ele vai embora.
  float glazing = practicalLight(vWorld, vNormal, 0.95);
  vec2  toEdge = min(vUv, 1.0 - vUv);
  float chamfer = 1.0 - smoothstep(0.0, ${CARD_BEZEL.toFixed(3)}, min(toEdge.x, toEdge.y));
  // **Vinte e dois centésimos, e a primeira tentativa foi noventa.** A 0.9 o
  // chanfro virava um contorno claro contínuo em volta de cada card — moldura de
  // quadro, não quina de peça —, e a profundidade de campo o transformava em
  // fantasma: seis cópias deslocadas, que é o que um kernel de seis amostras faz
  // com uma linha fina e clara. A quina precisa aparecer quando um cacho passa
  // de lado, não desenhar o card.
  //
  // O ponteiro entra **por aqui**, e é a única coisa que ele acende sozinho: a
  // peça vira uma nesga para a luz, como um corpo de prova numa haste que
  // alguém tocou. O acento do case tinge a quina, e é o único lugar do rio em
  // que ele aparece — placa e capa não são pintadas por token.
  vec3 chamferTint = mix(mix(uMist, uCyan, clamp(glazing, 0.0, 1.0)), vAccent, 0.35 + 0.4 * hover);
  // Rodada 13: de 0.22 para 0.07. Com a luz do bando passando rente, a quina
  // acesa desenhava uma moldura teal em volta do card inteiro — o brilho que
  // contorna o retângulo, que o Lucas chamou de box-shadow em shader. A quina
  // continua lá como relance; a marcação de foco e ponteiro (hover) não muda.
  color += chamferTint * chamfer * (glazing * 0.07 + hover * 0.30);

  // --- a capa, recuada -----------------------------------------------------
  vec2 coverMin = ${COVER_MIN};
  vec2 coverMax = ${COVER_MAX};
  vec2 inCover = step(coverMin, vUv) * step(vUv, coverMax);
  float cover = inCover.x * inCover.y;

  vec2 coverUv = (vUv - coverMin) / (coverMax - coverMin);

  // O campo procedural é o estado de espera; a fotografia é o conteúdo. A
  // travessia entre os dois é por card, e o eixo v é invertido porque o canvas
  // 2D que desenhou a camada conta de cima para baixo.
  vec3 field = coverField(coverUv, vWorld, vTone, vSeed);
  vec3 shot = srgbToLinear(
    texture(uCoverArray, vec3(coverUv.x, 1.0 - coverUv.y, vIndex)).rgb
  );

  // A capa em resolução de entrega entra só na peça atracada, e por cima da
  // camada do atlas — nunca no lugar dela. Se a imagem ainda não chegou,
  // uDockBlend é zero e o que se vê é exatamente o que se via no corredor.
  float docked = clamp(uDockBlend, 0.0, 1.0) * (1.0 - step(0.5, abs(vIndex - uDockCard)));
  vec2 dockUv = (vec2(coverUv.x, 1.0 - coverUv.y) - 0.5) * uDockCoverCrop + 0.5;
  vec3 delivered = srgbToLinear(texture(uDockCover, dockUv).rgb);
  shot = mix(shot, delivered, docked);

  // A capa atracada também não passa pela porta do atlas: se a camada de 640 px
  // ainda não chegou mas a imagem de entrega chegou, é ela que se vê.
  float shown = max(clamp(uCoverBlend[int(vIndex)], 0.0, 1.0), docked);

  // **A capa é uma impressão iluminada por trás, com pouco brilho** (rodada
  // 12). Luz própria constante, um ganho por imagem (uCoverGain, da luminância
  // média dela), e o bando somando por cima quando passa perto. Da rodada 9 à
  // 11 ela era placa fosca iluminada só pelo bando, e longe dele sumia: medido
  // na leitura, 0.003 a 0.054 de luminância entregue. Ver COVER_SELF_TARGET.
  //
  // O joelho de valor continua: uma captura de site branca lê como papel claro
  // no escuro, não como caixa de luz — o branco de laboratório que o
  // DIRECTION.md §6 proíbe.
  //
  // **Na lente o joelho sai.** A peça atracada é a imagem do case, e um img em
  // DOM não tem luz nem teto: entregar uma placa e trocar pela fotografia seria
  // um degrau de luminância no quadro da troca. Então a peça atracada volta a
  // ser a fotografia crua, pela mesma rampa do voo.
  //
  // **E as peças vizinhas apagam quando a cena vira fundo de leitura** (medido:
  // com elas acesas, uma capa cruzando uma linha do case derrubava o contraste
  // para 3.01:1).
  vec3 albedo = mix(field, shot, shown);
  float selfLight = mix(${COVER_FIELD_GAIN.toFixed(2)}, uCoverGain[int(vIndex)], shown);
  float flockLight = ${COVER_FLOCK_GAIN.toFixed(2)} * practicalLight(vWorld, vNormal, 0.3);
  vec3 matte = (albedo * (selfLight + flockLight) + albedo * lamp * 0.6) * mix(1.0, 0.10, uCaseRecess);
  float matteLum = dot(matte, vec3(0.2126, 0.7152, 0.0722));
  // O joelho: linear até COVER_KNEE, e dali dobrando para o teto sem degrau.
  // A cor é escalada, não substituída — o matiz da imagem não muda.
  if (matteLum > ${COVER_KNEE.toFixed(3)}) {
    float room = ${(COVER_CEILING - COVER_KNEE).toFixed(3)};
    float folded = ${COVER_KNEE.toFixed(3)} + room * (1.0 - exp(-(matteLum - ${COVER_KNEE.toFixed(3)}) / room));
    matte *= folded / matteLum;
  }
  field = mix(matte, shot, docked);

  // "Levemente recuada": a sombra do rebaixo, na borda de cima e na da
  // esquerda. É o que faz a capa ler como encaixada no substrato em vez de
  // impressa nele — e é a segunda coisa que precisa sair na entrega, porque o
  // <img> não tem rebaixo e a faixa escura apareceria como uma borda que some.
  float recess = smoothstep(0.0, 0.035, coverUv.x)
               * (1.0 - smoothstep(0.965, 1.0, coverUv.y));
  field *= mix(mix(0.28, 1.0, clamp(recess, 0.0, 1.0)), 1.0, docked);

  color = mix(color, field, cover);

  // --- a placa de cota -----------------------------------------------------
  // Gravação, não rótulo. A máscara vem da camada da placa e o que chega ao
  // pixel é decidido aqui, por três coisas:
  //
  //   1. o **bisel**: a diferença entre a máscara e ela deslocada um texel dá
  //      a quina do corte, e é ela que pega a luz de raspão. É o que separa
  //      "letra gravada no concreto" de "letra impressa em cima dele".
  //   2. a **aproximação**: longe, a placa é só o lampejo do bisel quando um
  //      cacho raspa nela, como as cotas das paredes; perto, a tinta ganha uma
  //      base e o texto passa a ser legível. Ver CARD_PLATE_FAR/NEAR.
  //   3. o **nível de detalhe** (canal G): estação e marcas de intervalo, que
  //      só entram no fim da rampa de aproximação — ou imediatamente, se o
  //      ponteiro estiver na peça.
  vec2 plateMin = ${PLATE_MIN};
  vec2 plateMax = ${PLATE_MAX};
  vec2 inPlate = step(plateMin, vUv) * step(vUv, plateMax);
  float onPlate = inPlate.x * inPlate.y;

  if (onPlate > 0.5) {
    vec2 plateUv = (vUv - plateMin) / (plateMax - plateMin);
    plateUv.y = 1.0 - plateUv.y;

    vec2 tap = texture(uPlateArray, vec3(plateUv, vIndex)).rg;
    float rightMain = texture(uPlateArray, vec3(plateUv + vec2(uPlateTexel.x, 0.0), vIndex)).r;
    float downMain  = texture(uPlateArray, vec3(plateUv + vec2(0.0, uPlateTexel.y), vIndex)).r;

    // O rebaixo da placa: ela é mais escura que a capa, porque é substrato
    // recessado e não imagem.
    color = mix(color, uSubstrate * (0.06 + 0.10 * grain), 0.85);

    float reveal = smoothstep(
      ${CARD_PLATE_FAR.toFixed(1)},
      ${CARD_PLATE_NEAR.toFixed(1)},
      vViewDepth
    );
    reveal = max(reveal, hover);
    // A gravação recua com a cena, pelo mesmo motivo da capa: dentro do case a
    // câmera para perto de peças vizinhas, e a rampa de aproximação as põe em
    // detalhe cheio — a placa de outro projeto lida por inteiro atrás do título
    // deste. Elas continuam montadas e continuam se vendo, como cota de raspão
    // na névoa, que é como o DIRECTION.md §2 descreve a estrutura.
    reveal *= mix(1.0, 0.12, uCaseRecess * (1.0 - docked));

    // O bisel: positivo de um lado do traço, negativo do outro.
    float bevel = (tap.r - rightMain) + (tap.r - downMain);

    float ink = tap.r * (0.05 + 0.34 * reveal)
              + tap.g * (0.03 + 0.30 * reveal) * reveal;
    float glint = bevel * (0.35 + 0.65 * glazing) * (0.5 + 0.5 * reveal);

    // **Acromático, os dois termos** (rodada 12). A tinta era 28% do acento e
    // o bisel somava mist→cyan de um lado do traço e **subtraía** a mesma cor
    // do outro — e tirar ciano de um pixel escuro é pôr vermelho nele. Com o
    // acento rose (WeCann), cada letra tinha uma franja vermelha em cima e à
    // esquerda e ciano embaixo e à direita: lia como separação de canais, que o
    // PROJECT.md §2 veta como glitch RGB. Agora a tinta é mist, o lado claro do
    // bisel soma mist e o lado escuro **escala** a cor em vez de subtrair uma.
    // O acento do case continua só no chanfro da borda.
    color += uMist * clamp(ink, 0.0, 1.0);
    color += uMist * clamp(glint, 0.0, 0.6);
    color *= 1.0 + clamp(glint, -0.2, 0.0) * 2.5;
  }

  // **A borda se desfaz na névoa** (rodada 16). O plano tinha quina viva e
  // canto reto, e lia como recorte colado no ar. Agora os cantos são
  // arredondados (o mesmo CARD_CORNER do SDF dos boids) e os últimos
  // centímetros da peça cedem para a cor da névoa diante dela: a borda existe,
  // mas é leve. Na peça atracada nada disso vale — ela tem que casar com o
  // retângulo do <img> em DOM.
  {
    vec2 halfSize = vec2(${CARD_HALF_WIDTH.toFixed(4)}, ${CARD_HALF_HEIGHT.toFixed(4)});
    vec2 p = (vUv - 0.5) * halfSize * 2.0;
    float radius = ${CARD_CORNER.toFixed(3)} * (1.0 - docked);
    vec2 q = abs(p) - halfSize + radius;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    if (d > 0.0) discard;
    float soft = smoothstep(-0.12, 0.0, d);
    color = mix(color, fogColorAt(vViewDepth, vWorld), soft * 0.9 * (1.0 - docked));
  }

#ifdef PROBE_BLACK
  // Só a sonda define isto (probe-round12.ts, flatRegions): a peça sai preta
  // antes da névoa. Em produção o bloco não existe no programa compilado.
  color = vec3(0.0);
#endif
  color = applyFog(color, vViewDepth, vWorld);

  fragColor = vec4(color, 1.0);
}
`;
