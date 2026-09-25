import { MathUtils, Vector3, type Vector4 } from "three";
import { readingProgress, type CameraPose } from "./curve";
import {
  CARD_COVER_ASPECT,
  CARD_COVER_UV,
  CARD_HEIGHT,
} from "./card-layout";
import { CAMERA_FOV } from "./world";

/**
 * As duas poses do case, e o progresso para onde a volta leva.
 *
 * O DIRECTION.md §4: "o card se aproxima da câmera e vira a capa; o bando
 * continua escoando atrás dele… Sem tela branca. Dentro do case: DOF desligada,
 * névoa parada, texto plano e imóvel."
 *
 * São **duas** poses e não uma, e a diferença entre elas é o beat inteiro:
 *
 * - `dockPose` é o encaixe. A câmera vai parar exatamente onde a região de capa
 *   do card projeta em cima do retângulo que a capa em DOM ocupa. É esse
 *   encaixe que permite trocar uma pela outra sem ninguém ver a costura.
 * - `restPose` é o recuo. Entregue a capa, a câmera dá um passo atrás para o
 *   meio da câmara e olha corredor acima: a cena deixa de ser o assunto e vira
 *   fundo, que é o que uma página de leitura pede.
 *
 * ## Por que a distância é resolvida do retângulo, e não de uma constante
 *
 * Um "encher 84% da tela" seria um número bonito que erra por alguns pixels, e
 * alguns pixels de desencontro na troca é exatamente a costura que este
 * mecanismo existe para não ter. O retângulo que manda é o **entregue** — o
 * `getBoundingClientRect()` do `<img>` que o navegador acabou de posicionar —,
 * e não a regra de CSS que o produziu. É a mesma disciplina do PROJECT.md §7: a
 * medição é no ponto de entrega.
 *
 * A conta é a projeção em perspectiva resolvida para a distância. Com FOV
 * vertical `f`, uma altura de mundo `h` a uma distância `D` ocupa
 * `h / (2·D·tan(f/2))` da altura visível; igualando isso à fração que o
 * retângulo ocupa da viewport:
 *
 *   D = h · alturaViewport / (2 · alturaDoRetângulo · tan(f/2))
 *
 * O deslocamento lateral é a mesma projeção lida ao contrário: o centro do
 * retângulo raramente é o centro da tela (há a coluna da HUD à esquerda e a
 * capa não começa no topo), então a câmera anda no próprio plano até o centro
 * da capa cair onde o DOM a pôs.
 */

/** Meia-tangente do FOV vertical. Constante da câmera, não da cena. */
const TAN_HALF_FOV = Math.tan(MathUtils.degToRad(CAMERA_FOV / 2));

/**
 * Deslocamento em Y do centro da região de capa em relação ao centro do card.
 *
 * A capa não é o card: ela ocupa de `v = 0.2` a `v = 0.975`, porque a faixa de
 * baixo é a placa de cota. Mirar o centro do card deixaria a capa alta na tela
 * por ~0.21 unidade de mundo — na distância de encaixe, dezenas de pixels.
 */
const COVER_CENTER_Y =
  ((CARD_COVER_UV[1] + CARD_COVER_UV[3]) / 2 - 0.5) * CARD_HEIGHT;

/** Altura da região de capa, em unidades de mundo. */
const COVER_HEIGHT = (CARD_COVER_UV[3] - CARD_COVER_UV[1]) * CARD_HEIGHT;

/**
 * A fração da largura da viewport que o alvo provisório ocupa.
 *
 * O voo começa no clique e a rota do case só existe alguns quadros depois, então
 * o primeiro trecho precisa de um alvo que não dependa de DOM nenhum. 0.84 é o
 * mesmo `--display-fill` de `styles/tokens.css` e de `SPECIMEN_SIZE`: a mesma
 * régua de "ocupa a tela sem encostar nas bordas" que o resto do site usa.
 *
 * Ele não precisa estar certo, precisa estar **perto**: quando o retângulo real
 * chega, a câmera já está amortecendo para lá e a correção é pequena o bastante
 * para não ser um segundo movimento.
 */
const PROVISIONAL_FILL = 0.84;

/** Distância de repouso depois da entrega, em unidades de mundo. */
const REST_DISTANCE = 15;

/** Quanto à frente do card a câmera olha, no repouso. */
const REST_LOOK_AHEAD = 22;

/**
 * Onde a câmera de repouso fica, lateralmente — e ela fica **fora do tubo do
 * bando**.
 *
 * Este número saiu de uma reprovação. A primeira versão punha o repouso no eixo
 * da câmara, e o eixo é por onde o bando escoa: com a reciclagem em
 * `uCameraZ + 2`, os corpos vinham **atravessar a lente**. Um corpo emissivo a
 * duas unidades da câmera é um borrão claro do tamanho de meia tela, e a
 * varredura de contraste do artigo o pegou — luminância de 0.139 sob uma linha
 * de metadados, contraste **3.47:1** contra o piso de 4.5 do PROJECT.md §5, num
 * quadro em que o resto da tela media 0.01.
 *
 * Não é trabalho do véu. O DIRECTION.md §4 pede que dentro do case a cena seja
 * atmosfera, e atravessar o bando não é observá-lo: é continuar dentro dele.
 * 10.2 põe a câmera entre o tubo (meia-largura 8.6) e a parede (12) — 1.6
 * unidade de folga do escoamento, 1.8 da parede. O bando passa a **cruzar** o
 * quadro em vez de vir contra ele, e a parede cotada entra de raspão do outro
 * lado, que é a composição que o §2 descreve.
 *
 * Negativo porque a coluna de leitura fica na margem esquerda: com a câmera à
 * esquerda do eixo, o corredor e o bando aparecem à **direita** do quadro, atrás
 * da parte da página que não tem texto.
 */
const REST_SIDE = -10.2;

/** Altura da câmera de repouso. Um pouco acima do eixo, olhando levemente para baixo. */
const REST_LIFT = 1.4;

/** Densidade de névoa dentro do case. */
export const CASE_FOG = 0.13;

/**
 * Força da fonte a montante dentro do case.
 *
 * Baixa de propósito, e não zero: o DIRECTION.md §5 dá a ela um platô baixo pela
 * descida inteira, e apagá-la faria o fundo do corredor virar um preto chapado —
 * cenário, não câmara.
 */
export const CASE_SOURCE = 0.04;

/**
 * O relógio do bando dentro do case, como fração do normal.
 *
 * "O organismo desacelerado": o bando continua escoando atrás do texto, porque
 * uma câmara com o organismo parado é um cenário, mas a 30% da velocidade ele
 * deixa de puxar o olho de quem está lendo. Não é um congelamento — o
 * DIRECTION.md §5 reserva o congelamento para o modo calmo, e lá ele vale para
 * a cena inteira.
 */
export const CASE_FLOCK_RATE = 0.3;

const AXIS = new Vector3();
const NORMAL = new Vector3();
const RIGHT = new Vector3();
const UP = new Vector3(0, 1, 0);

export type CoverRect = {
  /** Em pixels de CSS, origem no canto superior esquerdo da viewport. */
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * A pose de encaixe: onde a câmera tem que estar para a capa do card cair
 * exatamente em cima de `rect`.
 *
 * `rect` a `null` usa o alvo provisório — o trecho do voo que acontece antes de
 * a rota do case existir.
 *
 * `card` é a entrada **viva** da corrente (`shared.cards`), não a de repouso: o
 * filtro do rio move os cards em x, e voar para onde a peça estava antes de um
 * filtro seria voar para o lugar errado.
 */
export function dockPose(
  card: Vector4,
  rect: CoverRect | null,
  viewportWidth: number,
  viewportHeight: number,
  out: CameraPose,
): CameraPose {
  const height =
    rect === null
      ? (viewportWidth * PROVISIONAL_FILL) / CARD_COVER_ASPECT
      : rect.height;
  const centerX = rect === null ? viewportWidth / 2 : rect.x + rect.width / 2;
  const centerY = rect === null ? viewportHeight / 2 : rect.y + rect.height / 2;

  const distance =
    (COVER_HEIGHT * viewportHeight) / (2 * Math.max(height, 1) * TAN_HALF_FOV);

  // A normal da peça. Mesma convenção do vertex shader dos cards: o quad local
  // é girado por `Ry(yaw)`, então `(0,0,1)` vira `(sin, 0, cos)`.
  NORMAL.set(Math.sin(card.w), 0, Math.cos(card.w));
  // A direita da câmera é `frente × cima`, e a frente é `−normal`. Como a
  // normal não tem componente em Y, o "cima" da câmera é o do mundo — é isso
  // que faz o encaixe ser duas contas escalares em vez de uma base completa.
  RIGHT.copy(NORMAL).multiplyScalar(-1).cross(UP).normalize();

  const halfHeightWorld = distance * TAN_HALF_FOV;
  const halfWidthWorld = (halfHeightWorld * viewportWidth) / viewportHeight;
  const offsetX =
    ((centerX - viewportWidth / 2) / (viewportWidth / 2)) * halfWidthWorld;
  const offsetY =
    ((viewportHeight / 2 - centerY) / (viewportHeight / 2)) * halfHeightWorld;

  // O ponto do eixo do olhar que fica à distância de encaixe: o centro da capa
  // deslocado **para trás** do quanto ele precisa aparecer fora do centro.
  AXIS.set(card.x, card.y + COVER_CENTER_Y, card.z)
    .addScaledVector(RIGHT, -offsetX)
    .addScaledVector(UP, -offsetY);

  out.target.copy(AXIS);
  out.position.copy(AXIS).addScaledVector(NORMAL, distance);
  return out;
}

/**
 * A pose de repouso: entregue a capa, a câmera recua para o meio da câmara e
 * olha corredor acima.
 *
 * Ela não é o encaixe afastado. Ficar no eixo da peça deixaria a câmara sendo
 * "um card grande e escuro ocupando a tela", e o card, a essa altura, nem está
 * mais sendo desenhado — quem desenha a capa é o DOM. O que precisa sobrar
 * atrás do texto é câmara: névoa, parede, e o bando escoando devagar.
 */
export function restPose(card: Vector4, out: CameraPose): CameraPose {
  // A pose de repouso **não depende de onde a peça estava**, só de quão fundo na
  // câmara ela está. Derivá-la do `x` do card daria uma composição diferente por
  // case — cinco enquadramentos para a mesma página —, e o que a rota de case
  // quer é o contrário: sempre a mesma câmara calma atrás do texto.
  out.position.set(REST_SIDE, REST_LIFT, card.z + REST_DISTANCE);
  out.target.set(0, 0, card.z - REST_LOOK_AHEAD);
  return out;
}

/**
 * O progresso em que um card é lido.
 *
 * É para onde a volta leva quando não houve clique — link direto, acervo,
 * reload dentro do case —, e para onde o foco de teclado rola. Com clique,
 * quem manda é o progresso gravado no instante em que a pessoa saiu, e este
 * número não é consultado.
 *
 * Desde a rodada 12 cada card tem uma **parada própria** na curva
 * (`riverStops()`, em `curve.ts`), então o progresso de leitura é o `at` dela,
 * e não uma busca pela distância: a leitura deixou de ser "a câmera a 14
 * unidades em Z" e passou a ser um ponto declarado.
 */
export function stationProgress(cardZ: number): number {
  return readingProgress(cardZ);
}
