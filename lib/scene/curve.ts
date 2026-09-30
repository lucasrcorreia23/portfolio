import { CatmullRomCurve3, type Color, MathUtils, Vector3 } from "three";
import { clamp01, damp, easeStrong } from "@/lib/motion";
import {
  CAMERA_FOV,
  FLOCK_TUBE_HEIGHT,
  FLOCK_TUBE_NARROW,
  FLOCK_TUBE_TALL,
  FLOCK_TUBE_WIDE,
  ROOST_X_MAX,
  SPECIMEN_Z,
} from "./world";
import { CARD_WIDTH, resolveRiver } from "./cards";
import { readingAt } from "./river-readings";

/**
 * A coreografia da descida: onde a câmera está, para onde ela olha, e com que
 * ângulo o corpo de prova encara o escoamento — tudo derivado do **mesmo**
 * progresso normalizado (PROJECT.md §3.3, "uma variável só").
 *
 * As três coisas moram juntas porque são uma coisa só. Separar a posição da
 * câmera do ângulo da peça daria dois donos para um enquadramento, e o
 * enquadramento é o beat.
 *
 * ## Por que dois `CatmullRomCurve3` e não a tangente
 *
 * Usar a tangente da curva de posição como direção do olhar entrega o
 * enquadramento à derivada do spline: a câmera chicoteia em cada inflexão e o
 * corpo de prova sai do quadro justamente onde precisa estar centrado. Uma
 * segunda curva, de alvo, é um par de olhos dirigido — custa oito vetores e
 * devolve o enquadramento para quem está compondo.
 *
 * ## Por que o progresso não é o parâmetro da curva
 *
 * `getPointAt(u)` reparametriza por comprimento de arco e `getPoint(t)`
 * distribui `t` uniformemente entre os pontos de controle. Nenhum dos dois
 * coincide com os progressos que interessam — 0.10 é uma fronteira de beat,
 * 0.18 é o quadro do descolamento. Então cada ponto de controle **declara** em
 * que progresso ele acontece, e `curveParam` remapeia. Os números da tabela de
 * beats continuam significando o que significam.
 */

type Stop = {
  /** Progresso normalizado em que a câmera passa por este ponto. */
  at: number;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  /** Uma leitura do rio: a câmera repousa aqui (ver `RIVER_HOLD`). */
  river?: true;
};

/**
 * Os pontos de controle da descida inteira.
 *
 * De 0.00 a 0.85 eles são dirigidos: a aproximação, o quadro do descolamento em
 * 0.18, a passagem raspando a peça no fim da Identidade, a **derivada para a
 * parede graduada** em Quem sou, o **corredor do rio** e, de 0.85 a 1.00, a
 * **chegada à tomada de ar** — a Superfície.
 *
 * ## O corredor do rio
 *
 * De 0.45 a 0.85 a câmera percorre ~35 unidades, de `z = −42` a `z = −76.5`.
 *
 * **Uma parada por card, gerada da corrente** (`riverStops()`), e não uma
 * tabela escrita à mão. Até a rodada 11 a câmera descia o eixo em três "S"
 * largos com o olhar a ~13 unidades, e o card só era "lido" a 14 unidades —
 * onde ocupava 20% da largura. Quem enchia a tela eram as passagens, a 1.5
 * unidade de cada peça. Agora cada card tem a sua leitura: a câmera vai até ele,
 * para à distância em que ele ocupa `READING_FILL` da largura, e o olha no
 * centro. Entre duas leituras a curva faz a passagem, e o card lido sai pela
 * borda enquanto o seguinte entra.
 *
 * **É um slalom, e é de propósito.** As estações alternam de lado
 * (`CARD_STATIONS`); a câmera acompanha 45% do desvio de cada uma, então ela
 * continua passando **por entre** as peças, e o corredor inteiro vira uma
 * sequência de leituras em vez de um trilho com retângulos passando rente.
 *
 * O alvo de cada leitura é o centro do card, e é essa distância que a DOF usa
 * como plano de foco: o card lido fica na navalha, os de trás desfocam — a
 * separação em profundidade do DIRECTION.md §3 continua sendo isso.
 *
 * ## O desvio de Quem sou
 *
 * O DIRECTION.md §4 pede que "aqui a estrutura chegue mais perto da câmera do
 * que em qualquer outro momento — a câmera passa rente a uma parede que é uma
 * régua graduada, e a densidade do bando é medida contra ela". A parede é o
 * plano `x = +12`, e o "rente" é medido: a câmera fecha em 3.2 unidades dela em
 * 0.45, contra 12 no eixo do duto.
 *
 * Ela não vai reto para a parede: vai **para o lado dela**, com o olhar virando
 * de volta para o eixo (~20°). Isso põe a régua correndo do canto direito até
 * um ponto de fuga a 77% da largura, e é o que faz a gravação ser lida como
 * perspectiva de parede em vez de textura de fundo.
 *
 * **A parede é a de estibordo, e o lado importa.** O poleiro fica a 42% da
 * meia-largura visível para a direita (ver `roostCenter`), então bando e parede
 * caem na mesma metade do quadro: a coluna fica **contra a régua**, que é o que
 * o documento pede, e a gravação acende porque tem um cacho a seis unidades
 * dela — a luz prática é rasante, e uma parede sem ninguém por perto continua
 * escura. A outra metade fica para o manifesto e para a HUD, que são as duas
 * caixas de texto do beat e as que precisam de fundo escuro.
 */
const DIRECTED: readonly Stop[] = [
  // Emergência: ar parado, longe de tudo. Não dá para saber o tamanho do
  // espaço, e a câmera mal se move.
  // O alvo fica no **centro da palavra** (z −26), na mesma direção de antes:
  // a distância até ele é o plano de foco da DOF, e com o alvo em −14 "CORR"
  // ficava na navalha e "EIA", quinze unidades atrás, no borrão cheio. No meio,
  // as duas pontas recebem o mesmo desfoque (rodada 12).
  { at: 0.0, position: [0.0, 0.9, 8.0], target: [0.0, -0.03, -26.0] },
  { at: 0.1, position: [1.6, 0.5, -6.0], target: [0.2, 0.1, -24.0] },
  // A aproximação continua no eixo: a peça entra de perfil e o bando vem contra
  // a câmera.
  { at: 0.145, position: [2.6, 0.35, -10.2], target: [0.1, 0.05, SPECIMEN_Z] },
  // **O quadro, fora do eixo** — decisão do Lucas, 2026-09-25 (DIRECTION.md
  // §4, Identidade). Olhando ao longo do escoamento o descolamento é invisível
  // por geometria: os corpos vêm radialmente contra a lente e o desvio é
  // lateral, no plano das letras. A 33° do eixo, do lado para onde a peça já
  // está girada (~6° em 0.18), a face é vista a ~27° da normal e o escoamento
  // **cruza** o quadro. A 14 unidades, que é a distância para a qual
  // SPECIMEN_SIZE foi resolvido.
  { at: 0.175, position: [7.2, 0.4, SPECIMEN_Z + 12.1], target: [0.2, 0.0, SPECIMEN_Z] },
  { at: 0.21, position: [7.62, 0.35, SPECIMEN_Z + 11.74], target: [0.3, 0.0, SPECIMEN_Z - 0.3] },
  { at: 0.235, position: [6.2, 0.2, SPECIMEN_Z + 9.5], target: [0.0, 0.0, SPECIMEN_Z - 1.0] },
  // Fim da Identidade: as letras varrendo o quadro **de lado**, pela ponta da
  // palavra — e não por dentro dela. Até a rodada 11 a câmera atravessava o
  // plano da peça em 0.32 dentro do contorno das letras, e em 0.31 uma face lisa
  // de letra cobria 59–64% do quadro (medido, `__probe.flatRegions`). Agora ela
  // desliza para estibordo com o olhar na palavra e cruza o plano depois do
  // "A", fora do contorno de ±7.8, onde a peça é uma lâmina vista de perfil.
  { at: 0.28, position: [8.0, 0.0, SPECIMEN_Z + 5], target: [-1.0, 0.0, SPECIMEN_Z - 2] },
  { at: 0.31, position: [9.6, -0.1, SPECIMEN_Z + 0.5], target: [3.0, 0.0, SPECIMEN_Z - 10] },
  // Quem sou: a câmera deriva para a parede de estibordo e vira o olhar de
  // volta para o eixo. A régua fica no quadro o beat inteiro.
  { at: 0.34, position: [5.0, -0.2, -28.5], target: [1.8, 0.0, -42.0] },
  { at: 0.4, position: [6.8, -0.05, -35.0], target: [3.2, 0.0, -48.0] },
  { at: 0.45, position: [8.0, 0.05, -42.0], target: [4.5, 0.0, -55.0] },
  // **O rio não mora nesta tabela.** As paradas de 0.45 a 0.85 são geradas da
  // corrente montada neste aparelho — uma por card, à distância de leitura —,
  // ver `riverStops()` logo abaixo. Esta parada de 0.85 é o fim do corredor:
  // a câmera **não passa** o último card antes dela; ela desacelera e vira o
  // olhar para bombordo, e o último posto é a última coisa que o beat mostra.
  // Os dois cortes do rio (7 e 4 cards) terminam em −82 a bombordo, então a
  // virada serve aos dois.
  { at: 0.85, position: [-0.6, 0.2, -76.5], target: [-4.2, -0.8, -88.0] },
  // **A Superfície.** A câmera deixa o último card a bombordo e vira para a
  // tomada de ar. Ela passa o card do corte do mobile (−3.4, 2.0, −82) pelo
  // eixo, e só depois dele sobe e sai para bombordo: é de cima e de lado que a
  // soleira se lê e que as lâminas de luz se separam uma da outra — de frente
  // elas se empilhariam num véu só. A abertura cai à direita do centro, e a
  // coluna do contato em DOM fica à esquerda, sobre o concreto escuro.
  { at: 0.9, position: [-0.5, 0.9, -80.5], target: [0.8, -0.3, -96.0] },
  { at: 0.95, position: [-2.6, 1.6, -83.0], target: [-1.8, -1.0, -96.0] },
  // O último quadro (DIRECTION.md §4): parado, e é aqui que ele fica no
  // viewport terminal, depois de o progresso travar em 1.00.
  { at: 1.0, position: [-4.0, 1.8, -83.6], target: [-2.9, -1.2, -96.0] },
];

/**
 * A distância de leitura do rio, em unidades de mundo — **resolvida da largura
 * que o card deve ocupar**, e não o contrário.
 *
 * Até a rodada 11 ela era 14, a mesma de `SPECIMEN_SIZE`, e o card lido
 * ocupava **17 a 23%** da largura: uma peça pequena no fundo de uma câmara
 * escura. O que enchia a tela eram as **passagens** — a câmera descia o eixo e
 * raspava cada card a 1.5 unidade, e a estação central passava 0.81 abaixo da
 * lente, chegando a 74–97% da largura como um retângulo escuro cortado pela
 * borda. A rodada 12 inverte: o card é lido de perto, inteiro e centrado, com a
 * câmara em volta, e a passagem deixa de ser o momento em que ele aparece.
 *
 * `READING_FILL` é a fração da largura na leitura (o Lucas pediu de 35 a 60%).
 * A distância sai dela e da razão de aspecto: num 16:10 são 6.2 unidades; num
 * telefone em pé a mesma fração pediria 20, e o teto de 16 a deixa em ~0.6 —
 * o corte do mobile tem 9 unidades entre cards, e ler de mais longe poria o
 * card anterior entre a câmera e o lido.
 */
export const READING_FILL = 0.48;
const READING_MIN = 6.2;
const READING_MAX = 16;

/**
 * Quanto da posição lateral e vertical do card a câmera acompanha na leitura.
 * Menos que 1 de propósito: a câmera fica **entre o eixo e o card**, e o card é
 * visto um pouco de dentro do corredor — é o que faz a peça estar de face
 * (ela gira para o eixo, `CARD_TOE_IN`) e a parede e os vizinhos aparecerem
 * em volta.
 */
const READING_LATERAL = 0.45;
const READING_VERTICAL = 0.35;

function readingDistance(aspect: number): number {
  const halfWidth = Math.tan(MathUtils.degToRad(CAMERA_FOV / 2)) * aspect;
  const wanted = CARD_WIDTH / (2 * READING_FILL * halfWidth);
  return Math.min(READING_MAX, Math.max(READING_MIN, wanted));
}

/**
 * As paradas do rio: uma por card da corrente **deste aparelho**, no progresso
 * em que ele é lido. A câmera fica à distância de leitura dele, e o alvo é o
 * centro da peça — o plano de foco da DOF cai nela, e os vizinhos desfocam.
 *
 * Entre duas leituras a curva faz a passagem sozinha: o card lido sai pela
 * borda enquanto o próximo já está no quadro. Medido na montagem (1440×900):
 * leitura em 0.48 da largura nos sete, e o pico **visível** de um card na
 * passagem em 0.63.
 */
function riverStops(): Stop[] {
  const river = resolveRiver();
  const aspect =
    typeof window === "undefined" ? 1.6 : window.innerWidth / Math.max(window.innerHeight, 1);
  const distance = readingDistance(aspect);
  return river.cards.map((card, index) => {
    const dx = card.x * (1 - READING_LATERAL);
    const dy = card.y * (1 - READING_VERTICAL);
    const dz = Math.sqrt(Math.max(distance * distance - dx * dx - dy * dy, 1));
    return {
      at: readingAt(index, river.count),
      river: true,
      position: [card.x * READING_LATERAL, card.y * READING_VERTICAL, card.z + dz],
      target: [card.x, card.y, card.z],
    };
  });
}

type Track = {
  stops: readonly Stop[];
  position: CatmullRomCurve3;
  target: CatmullRomCurve3;
};

let track: Track | null = null;

/**
 * A curva inteira, montada uma vez — com a corrente resolvida, pelo mesmo
 * motivo de `resolveRiver()`: remontar a curva no meio da descida moveria a
 * câmera de lugar sem ninguém rolar.
 */
function resolveTrack(): Track {
  if (track !== null) return track;
  const before = DIRECTED.filter((stop) => stop.at <= 0.45);
  const after = DIRECTED.filter((stop) => stop.at >= 0.85);
  const stops = [...before, ...riverStops(), ...after];
  const toVectors = (key: "position" | "target") =>
    stops.map((stop) => new Vector3(...stop[key]));
  track = {
    stops,
    position: new CatmullRomCurve3(toVectors("position"), false, "catmullrom", 0.5),
    target: new CatmullRomCurve3(toVectors("target"), false, "catmullrom", 0.5),
  };
  return track;
}

/**
 * O progresso em que o card montado em `cardZ` é lido — a parada dele na
 * curva. É para onde a volta de um case leva quando não houve clique, e para
 * onde o foco de teclado rola (`stationProgress`, em `case-pose.ts`).
 */
export function readingProgress(cardZ: number): number {
  const river = resolveRiver();
  let best = 0;
  let bestGap = Infinity;
  river.cards.forEach((card, index) => {
    const gap = Math.abs(card.z - cardZ);
    if (gap < bestGap) {
      bestGap = gap;
      best = index;
    }
  });
  return readingAt(best, river.count);
}

/**
 * Quanto a câmera desacelera em cada leitura do rio (rodada 14, revista).
 *
 * Até a rodada 13 a câmera cruzava cada card na mesma velocidade da passagem,
 * e um gesto de roda atravessava vários cases. A primeira resposta foi um
 * repouso chapado — a câmera parava de vez em 56% da rolagem — e o Lucas o leu
 * como travada: radical e não natural. Agora não há parada: a velocidade da
 * câmera ao longo da curva é `1 − k·cos(2π·local)`, ou seja **0.35×** em cima de
 * cada card e **1.65×** no meio da passagem, sem degrau e sem platô. É a
 * desaceleração de quem chega perto de uma coisa para olhar, não um trilho que
 * trava.
 */
const RIVER_SLOW = 0.65;

/**
 * O `local` de um segmento, desacelerando nas pontas que são leituras do rio.
 * Um segmento que só tem o rio de um lado (a entrada, de Quem sou, e a saída,
 * para a Superfície) desacelera só desse lado.
 */
function holdLocal(local: number, fromRiver: boolean, toRiver: boolean): number {
  const k = RIVER_SLOW;
  const tau = Math.PI * 2;
  if (fromRiver && toRiver) return local - (k * Math.sin(tau * local)) / tau;
  // Um lado só: velocidade 1 − k na ponta do rio e cheia (1) na outra, sem
  // degrau com o segmento vizinho.
  if (toRiver) return local + k * local * local * (1 - local);
  if (fromRiver) return local - k * local * (1 - local) * (1 - local);
  return local;
}

/**
 * Remapeia progresso normalizado para o parâmetro do spline, respeitando o
 * progresso declarado de cada ponto de controle.
 */
function curveParam(stops: readonly Stop[], progress: number): number {
  const p = clamp01(progress);
  const last = stops.length - 1;

  for (let i = 0; i < last; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (a === undefined || b === undefined) break;
    if (p > b.at) continue;

    const span = b.at - a.at;
    const local = span <= 0 ? 0 : (p - a.at) / span;
    return (i + holdLocal(local, a.river === true, b.river === true)) / last;
  }

  return 1;
}

export type CameraPose = {
  position: Vector3;
  target: Vector3;
};

/**
 * Escreve a pose no objeto recebido em vez de alocar — isto roda por quadro.
 */
export function cameraPose(progress: number, out: CameraPose): CameraPose {
  const { stops, position, target } = resolveTrack();
  const t = curveParam(stops, progress);
  position.getPoint(t, out.position);
  target.getPoint(t, out.target);
  return out;
}

export function createCameraPose(): CameraPose {
  return { position: new Vector3(), target: new Vector3() };
}

/**
 * O ângulo de ataque do corpo de prova, em radianos.
 *
 * O DIRECTION.md §4 quer a peça entrando "de perfil ... uma lâmina fina" e a
 * paralaxe abrindo as letras de face. Paralaxe pura não consegue: para ver um
 * plano de perfil é preciso estar quase no plano dele, e num duto de 24 de
 * largura a câmera teria que sair pela parede. Quem gira é a peça — e isso não
 * é um logotipo animado, é a coisa mais comum de um túnel de vento: o corpo de
 * prova está numa haste e a haste muda o ângulo de ataque.
 *
 * Vai de 78° a 6° entre 0.10 e 0.21, com `easeStrong`, e não passa do piso: o
 * DIRECTION.md §5 fixa ~4° de nesga mínima porque a peça tem espessura zero e
 * em 90° exatos ela **desaparece** — o bando se descolaria em volta de nada.
 * O teto de 78°, e não 90°, é a mesma regra pelo outro lado.
 */
const ATTACK_MAX = MathUtils.degToRad(78);
const ATTACK_MIN = MathUtils.degToRad(6);
const ATTACK_FROM = 0.1;
const ATTACK_TO = 0.21;

export function specimenAttackAngle(progress: number): number {
  const local = clamp01((progress - ATTACK_FROM) / (ATTACK_TO - ATTACK_FROM));
  return ATTACK_MAX + (ATTACK_MIN - ATTACK_MAX) * easeStrong(local);
}

/**
 * A meia-largura do tubo do bando, em unidades de mundo.
 *
 * Abre de `FLOCK_TUBE_NARROW` para `FLOCK_TUBE_WIDE` entre 0.05 e 0.16 — ou
 * seja, **termina de abrir antes do quadro do descolamento**, em 0.18, e começa
 * depois que a Emergência já mostrou o que tinha para mostrar.
 *
 * A Emergência precisa do tubo estreito: "uns poucos corpos isolados,
 * suspensos" num duto de 24 de largura só lê como escala indefinida se os
 * corpos estiverem concentrados perto do eixo. A Identidade precisa do tubo
 * largo, e por um motivo medido: com 4.6 fixo, as letras das pontas do título
 * não recebiam corpo nenhum (ver `FLOCK_TUBE_NARROW` em `world.ts`).
 *
 * A meia-altura não entra: ela é constante. Um tubo que abrisse nos dois eixos
 * viraria preenchimento de câmara, e o bando tem que continuar sendo uma
 * corrente com bordas visíveis.
 */
const TUBE_FROM = 0.05;
const TUBE_TO = 0.16;

export function flockTubeHalfWidth(progress: number): number {
  const local = clamp01((progress - TUBE_FROM) / (TUBE_TO - TUBE_FROM));
  // **E abre mais no quadro do descolamento.** Com 8.6 a borda da elipse quase
  // não recebe corpo, e o C e o A — as pontas do título, a ~7 unidades do eixo
  // — tinham contagem zero diante da face: nunca acendiam (rodada 8). Vista da
  // pose oblíqua, a peça inteira precisa estar dentro do escoamento.
  const frame =
    smoothstep01((progress - 0.13) / 0.03) * (1 - smoothstep01((progress - 0.25) / 0.03));
  return (
    FLOCK_TUBE_NARROW +
    (FLOCK_TUBE_WIDE - FLOCK_TUBE_NARROW) * easeStrong(local) +
    IDENTITY_TUBE_EXTRA * frame
  );
}

/** Quanto o tubo abre a mais no quadro do descolamento. */
const IDENTITY_TUBE_EXTRA = 1.8;

function smoothstep01(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/**
 * A meia-altura do tubo. Constante em toda a descida **menos** no poleiro de
 * Quem sou, onde ela abre para o bando ter altura de coluna — ver
 * `FLOCK_TUBE_TALL` em `world.ts`. A curva é a do próprio poleiro, então as
 * duas coisas nunca ficam fora de fase.
 */
export function flockTubeHalfHeight(progress: number): number {
  return (
    FLOCK_TUBE_HEIGHT + (FLOCK_TUBE_TALL - FLOCK_TUBE_HEIGHT) * roostAmount(progress)
  );
}

/* ---------------------------------------------------------------------------
 * O poleiro de Quem sou
 * ------------------------------------------------------------------------ */

/**
 * Quanto o poleiro colunar está ligado, 0 a 1 — DIRECTION.md §4: "O bando se
 * organiza: assenta num poleiro colunar de rotação lenta, densidade estável."
 *
 * **Ela começa dentro da Identidade, em 0.26, e não na fronteira do beat.** Um
 * bando não se organiza num quadro: mesmo com a captura forte (ver `ROOST_PULL`
 * em `world.ts`) um corpo na borda do tubo leva cerca de um segundo e meio para
 * chegar à coluna, e o beat inteiro dura 3.6 s a 1 vh/s. Começando na fronteira,
 * a leitura do manifesto acontece enquanto o bando ainda está atravessando o
 * quadro — que foi o que a descida medida mostrou. Em 0.26 o quadro do
 * descolamento (0.18) já passou faz tempo e a peça já saiu de foco.
 *
 * A rampa de subida termina **antes** do meio do beat: a coluna precisa estar
 * formada quando a leitura começa. A descida começa antes do fim do beat pelo motivo simétrico —
 * quem entra no rio precisa do bando escoando de novo, e um poleiro se
 * desmanchando na primeira esteira do rio seria o beat anterior invadindo este.
 */
const ROOST_IN_FROM = 0.26;
const ROOST_IN_TO = 0.32;
const ROOST_OUT_FROM = 0.43;
const ROOST_OUT_TO = 0.47;

export function roostAmount(progress: number): number {
  const rise = easeStrong(
    clamp01((progress - ROOST_IN_FROM) / (ROOST_IN_TO - ROOST_IN_FROM)),
  );
  const fall = easeStrong(
    clamp01((progress - ROOST_OUT_FROM) / (ROOST_OUT_TO - ROOST_OUT_FROM)),
  );
  return rise * (1 - fall);
}

/**
 * Distância do poleiro à câmera, ao longo do eixo do olhar.
 *
 * **Catorze, e a primeira tentativa foi vinte.** A vinte a coluna existe — a
 * sonda contou 4.4 mil corpos na casca — e mesmo assim não se lê: ela ocupa 19%
 * da largura, enquanto os corpos que passam raspando a lente ocupam a metade
 * inferior do quadro inteiro. Perto da lente um corpo cobre ordens de grandeza
 * mais pixels que a vinte unidades, e o assunto do beat perdia para o tráfego.
 * A catorze a coluna passa a 28% da largura e mais alta que a tela.
 */
const ROOST_AHEAD = 14;
/**
 * Quanto o poleiro fica fora do eixo do olhar, em **fração da meia-largura
 * visível** naquela distância — e não em unidades de mundo.
 *
 * Em unidades de mundo o mesmo número serviria a uma razão de tela só: 5.5
 * unidades caem a 71% da largura num 16:10 e **fora do quadro** num telefone em
 * pé, onde a meia-largura visível a 20 unidades é 3.8. A composição do beat é
 * "coluna de texto de um lado, organismo do outro", e ela tem que valer nas
 * duas telas.
 *
 * **0.58 põe o eixo a 79% da largura**, e o número saiu da medida da coluna de
 * texto, não do gosto: a 66ch o manifesto vai até 63% da largura numa viewport
 * de 1440, e a casca do poleiro tem 14 pontos percentuais de meia-largura na
 * tela. Com 0.42 (eixo a 71%) a casca começava em 57% e entrava por cima das
 * últimas palavras de cada linha.
 */
const ROOST_SIDE = 0.58;
/** Teto em unidades de mundo: o poleiro não sai do tubo do bando. */
const ROOST_SIDE_MAX = 7;

const forward = new Vector3();
const right = new Vector3();
const UP = new Vector3(0, 1, 0);

/**
 * Onde a coluna do poleiro fica, em mundo — escrito no vetor recebido.
 *
 * **Ancorado à câmera, não ao duto.** Se o poleiro fosse um lugar fixo da
 * câmara, ele atravessaria o quadro em três segundos de rolagem e o beat de
 * leitura teria um bando entrando e saindo por trás do texto. Ancorado, ele é
 * uma coluna parada na frente de quem lê — e quando a pessoa para de rolar, ele
 * para de vez, que é a "densidade estável" do documento.
 *
 * Só `x` e `z` importam para a força (a coluna é vertical); `y` sai zerado de
 * propósito, para o eixo dela não subir e descer com a câmera.
 */
export function roostCenter(
  pose: CameraPose,
  aspect: number,
  out: Vector3,
): Vector3 {
  forward.copy(pose.target).sub(pose.position).normalize();
  right.crossVectors(forward, UP).normalize();

  const halfHeight = Math.tan(MathUtils.degToRad(CAMERA_FOV / 2)) * ROOST_AHEAD;
  const side = Math.min(halfHeight * aspect * ROOST_SIDE, ROOST_SIDE_MAX);

  out
    .copy(pose.position)
    .addScaledVector(forward, ROOST_AHEAD)
    .addScaledVector(right, side);
  out.y = 0;
  // A coluna encosta na parede, mas não entra nela: ver ROOST_X_MAX.
  out.x = Math.max(-ROOST_X_MAX, Math.min(ROOST_X_MAX, out.x));
  return out;
}

export type Roost = {
  /** Eixo da coluna, em mundo. `y` é sempre 0: a coluna é vertical. */
  center: Vector3;
  /** Quanto o poleiro está ligado, 0 a 1. */
  amount: number;
  /**
   * Velocidade do eixo em Z, unidades por segundo — o que os corpos capturados
   * passam a acompanhar. Negativa na descida, zero com a página parada.
   */
  drift: number;
};

export function createRoost(): Roost {
  return { center: new Vector3(0, 0, SPECIMEN_Z), amount: 0, drift: 0 };
}

/**
 * Teto e piso do arrasto do eixo.
 *
 * −9 é o mesmo teto de velocidade que o shader já impõe aos corpos: nenhum
 * corpo acompanha um eixo mais rápido que ele mesmo.
 */
const DRIFT_MIN = -9;
const DRIFT_MAX = 1;

/**
 * Acima deste passo por quadro, o eixo não **andou**: ele reapareceu.
 *
 * Um corte do modo calmo, um `scrollTo`, uma barra arrastada ou um
 * assentamento da sonda movem a câmera dezenas de unidades de uma vez, e a
 * diferença finita devolveria uma velocidade que nenhum corpo alcança — o
 * poleiro cuspiria o bando para trás e esvaziaria a câmara. Foi o que
 * aconteceu na primeira medição com progresso travado: quadro vazio, sem erro
 * nenhum no console.
 *
 * 1.5 unidade por quadro são 45 u/s a 1/30 s, e a rolagem mais rápida que este
 * site aceita — o polegar a 3 vh/s no mobile — move a câmera 0.62 por quadro.
 * O corte fica de um lado do número e todo escoamento real do outro.
 */
const CUT_STEP = 1.5;

/**
 * Resolve o poleiro deste quadro: eixo, intensidade e arrasto.
 *
 * O arrasto sai da **diferença finita do próprio eixo**, e não de uma constante:
 * o eixo é ancorado à câmera, a câmera é ancorada ao scroll, então quem decide
 * quanto o bando acompanha é a mão de quem está rolando. Amortecido, porque a
 * derivada de um scroll com inércia ainda é ruidosa entre quadros.
 */
export function resolveRoost(
  progress: number,
  pose: CameraPose,
  aspect: number,
  dt: number,
  out: Roost,
): Roost {
  const previousZ = out.center.z;
  roostCenter(pose, aspect, out.center);
  out.amount = roostAmount(progress);

  const step = out.center.z - previousZ;
  const raw = dt > 0 && Math.abs(step) < CUT_STEP ? step / dt : 0;
  const bounded = raw < DRIFT_MIN ? DRIFT_MIN : raw > DRIFT_MAX ? DRIFT_MAX : raw;
  out.drift = damp(out.drift, bounded, 6, Math.max(dt, 1e-4));
  return out;
}

/**
 * A abertura da profundidade de campo, 0 (navalha) a 1 (borrão escancarado) —
 * DIRECTION.md §3.
 *
 * Emergência abre no máximo e fecha devagar: "você não sabe o tamanho do
 * espaço". A entrada da Identidade é o corte de navalha, e é a assinatura do
 * beat: a duração de 600 ms do `--dur-aperture` vira aqui uma janela de
 * progresso — 0.11 a 0.155 é o que 600 ms cobrem à taxa conservadora de
 * 1.0 vh/s do DIRECTION.md §4 (0.6 s × 1.0 vh/s ÷ 21.05 vh ≈ 0.029, arredondado
 * para cima porque a curva forte gasta a maior parte do movimento no começo).
 *
 * Depois de 0.28 fica fechada: Quem sou é beat de leitura.
 *
 * **E reabre parcialmente no rio.** O DIRECTION.md §3 dá a esta abertura um
 * trabalho específico e único no site — "parcial, só para separar cards em
 * profundidade; nunca sobre o título do card" —, e ela é a segunda metade do
 * critério de aceite do beat: os cards têm que ler como camadas distintas, não
 * como uma parede. A largura projetada faz a primeira metade; o círculo de
 * confusão faz a segunda, porque um card fora do plano de foco **não é só menor,
 * é mais macio**, e é isso que o olho lê como distância.
 *
 * `RIVER_APERTURE` é 0.42 e não 1.0 porque a regra é "parcial": com a abertura
 * cheia o corredor inteiro atrás do card em foco vira mingau, e o rio deixa de
 * ter sete peças para ter uma peça e um fundo.
 */
const RIVER_APERTURE = 0.26;

/**
 * Quanto o beat de Trabalho está ligado, 0 a 1 — a mesma curva para as três
 * coisas que ele muda na atmosfera: a abertura, a profundidade do plano nítido e
 * a densidade da névoa.
 *
 * Uma curva só porque as três são o mesmo enquadramento visto de três ângulos.
 * Três rampas independentes entrariam e sairiam de fase no primeiro ajuste de
 * ritmo, e o sintoma seria a névoa engrossando antes de a abertura abrir.
 */
function riverAmount(progress: number): number {
  const rise = clamp01((progress - 0.44) / 0.05);
  const fall = clamp01((progress - 0.8) / 0.06);
  return easeStrong(rise) * (1 - easeStrong(fall));
}

/**
 * A abertura "máxima" do portão e da Emergência (DIRECTION.md §3).
 *
 * **0.5 e não 1.0, e o número é do instrumento, não de gosto.** Enquanto o
 * portão era opaco ninguém via a cena em p = 0. Desde a rodada 9.5 as frestas
 * mostram a câmara real, e em 1.0 o núcleo do desfoque (seis amostras, meia
 * resolução) transforma corpos distantes numa trama de riscas verticais — uma
 * grade, que o PROJECT.md §2 veta. 0.5 é o maior raio que ele entrega como
 * borrão, sem riscar. "Tudo borrado" continua sendo verdade.
 */
const APERTURE_WIDE = 0.5;

export function apertureAt(progress: number): number {
  if (progress <= 0.06) return APERTURE_WIDE;
  if (progress < 0.11) {
    // Fechando devagar durante a Emergência, mas ainda bem aberta.
    return APERTURE_WIDE * (1 - 0.25 * easeStrong(clamp01((progress - 0.06) / 0.05)));
  }
  if (progress < 0.155) {
    // O corte de navalha.
    return APERTURE_WIDE * 0.75 * (1 - easeStrong(clamp01((progress - 0.11) / 0.045)));
  }
  // Parcial no rio, fechada na saída dele, e **reaberta na Superfície** — "só
  // na fresta de luz; o fora ainda não tem foco" (DIRECTION.md §3). O plano de
  // foco é o da soleira e das venezianas; o céu fica cinco unidades atrás delas
  // e é ele que desmancha.
  return RIVER_APERTURE * riverAmount(progress) + SURFACE_APERTURE * surfaceAmount(progress);
}

/** A abertura da Superfície. Menor que a do rio: é só o fora que borra. */
const SURFACE_APERTURE = 0.22;

/**
 * Quanto a Superfície está ligada, 0 a 1 — a mesma curva para a abertura e a
 * profundidade do plano nítido, pelo mesmo motivo de `riverAmount`.
 */
function surfaceAmount(progress: number): number {
  return easeStrong(clamp01((progress - 0.88) / 0.08));
}

/**
 * A luz de fora, 0 a 1 (`uOutside`). Começa depois da virada para a tomada de
 * ar e chega ao topo antes do último quadro: quem para em 0.97 já vê a câmara
 * como ela fica.
 */
export function outsideAt(progress: number): number {
  return easeStrong(clamp01((progress - 0.86) / 0.11));
}

/**
 * Quanto o bando já está saindo, 0 a 1 (`uExit` nos boids e no proxy).
 *
 * "O bando sai pela abertura e se dispersa" (DIRECTION.md §4). A inversão
 * começa em 0.87 — com a câmera já virada para a tomada de ar, então quem vê
 * o bando dar a volta vê para onde ele vai — e fica completa em 0.93. Sair leva
 * tempo de voo, não progresso: o bando precisa de um a dois segundos para
 * atravessar as venezianas, e é isso que deixa o último quadro vazio sem
 * ninguém ver o bando sumir.
 */
export function exitAt(progress: number): number {
  return easeStrong(clamp01((progress - 0.87) / 0.06));
}

/**
 * A cor da fonte a montante, que viaja `--teal` → `--cyan` → `--peach`
 * (DIRECTION.md §5). A primeira troca é lenta e mora no rio, onde a fonte
 * ainda é um brilho fraco no fundo; a segunda é a luz de fora chegando.
 */
export function sourceColorAt(
  progress: number,
  teal: Color,
  cyan: Color,
  peach: Color,
  out: Color,
): Color {
  const toCyan = easeStrong(clamp01((progress - 0.45) / 0.35));
  const toPeach = easeStrong(clamp01((progress - 0.85) / 0.1));
  out.copy(teal).lerp(cyan, toCyan).lerp(peach, toPeach);
  return out;
}

/**
 * A densidade da névoa, por progresso.
 *
 * Espessa na Emergência — "não dá pra saber se a câmara tem três metros ou
 * trezentos" — abrindo conforme a escala se estabelece, e **engrossando de novo
 * no rio**.
 *
 * O engrossamento não é gosto, é a regra do DIRECTION.md §2 aplicada onde ela
 * pegou: "se em algum frame dá pra ler a câmara inteira, a névoa está fina
 * demais". Nos beats de cima a câmera olha para uma peça que ocupa 84% do
 * quadro e as paredes ficam de esguelha; no corredor ela olha para o fundo do
 * duto, e a 0.056 dava para ler a câmara inteira — as quatro paredes, a
 * convergência, o canto. Medido no quadro entregue, 22% dos pixels acima de
 * L = 0.02 contra 9.8% no quadro do descolamento.
 *
 * E ela **também é o terceiro sinal de profundidade** do beat, junto com o
 * tamanho projetado e o círculo de confusão: com a névoa mais espessa os cards
 * do fundo do corredor viram fantasmas e emergem um a um, que é a diferença
 * entre um rio e uma galeria com sete quadros pendurados.
 */
const RIVER_FOG = 0.082;

export function fogDensityAt(progress: number): number {
  const base = 0.098 - 0.042 * clamp01(progress / 0.22);
  return base + (RIVER_FOG - base) * riverAmount(progress);
}

/**
 * A fonte distante a montante — DIRECTION.md §5: "quase zero no começo, subindo
 * para o máximo **só entre 0.85 e 1.00**. É a luz para a qual você está
 * andando."
 *
 * **A rampa antiga chegava ao máximo em 0.28**, e enquanto a câmera ficava a
 * oitenta unidades da tampa do fundo ninguém via: a névoa comia o disco inteiro.
 * No corredor a câmera fecha para quarenta e sete, o disco cresce na tela, e a
 * fonte passa a lavar o meio do quadro justamente onde os cards do fundo
 * precisam ser lidos como silhuetas. O sintoma é do beat novo; o desvio da §5
 * é antigo.
 *
 * O platô fica baixo pela descida inteira e a subida mora onde o documento a
 * põe. O valor de topo foi resolvido pela Superfície — ver MEASUREMENTS.md,
 * "A Superfície, medida".
 */
const SOURCE_SURFACE = 0.06;

/**
 * Quanto as esteiras dos cards agem no escoamento, 0 a 1.
 *
 * **Elas não agem o tempo todo, e isso não é conveniência: é uma correção
 * medida.** Os cards estão montados de `z = −56` a `−84`, e o bando nasce em
 * `uCameraZ − 64` — ou seja, no quadro do descolamento (progresso 0.18, câmera
 * em −12) o escoamento **atravessa o corredor inteiro** antes de chegar ao corpo
 * de prova, trinta a cinquenta e oito unidades a jusante. Medido em 0.18, com as
 * sete peças agindo contra `?cards=0`:
 *
 * | | com o corredor | sem |
 * |---|---|---|
 * | sombra da tinta a 1 / 2 / 4 larguras de letra | 142 / 218 / 265 | 175 / 271 / 287 |
 * | travessia por quinto do título | 56·101·167·68·58 | 58·119·105·114·70 |
 * | discordância cima/baixo do perfil | **26.0%** | 14.8% |
 *
 * A última linha é a que condena. O par de metades do perfil vertical é o
 * **controle** do critério de aceite do descolamento (AGENTS.md, "as duas de
 * fora concordam entre si"): ele existe para descartar "o bando está torto", e
 * com o corredor ligado o bando fica torto. O beat que o DIRECTION.md §1 chama
 * de "o motivo do site existir" não paga essa conta por um beat que só começa
 * duas centenas de progresso depois.
 *
 * A força entra junto com o beat, pela mesma disciplina que o poleiro
 * (`roostAmount`), o tubo do bando (`flockTubeHalfWidth`) e o ângulo de ataque
 * da peça já seguem: nesta cena as forças são coreografadas pela variável única
 * (PROJECT.md §3.3), não simuladas o tempo todo. O que **não** é coreografado é
 * a geometria — os cards estão montados na câmara desde sempre, e se veem de
 * longe, atrás da névoa, como qualquer outra coisa presa nas paredes.
 *
 * A subida termina em 0.46, antes de a câmera alcançar o primeiro card em 0.577,
 * então ninguém vê uma esteira começar. A descida em 0.88 é higiene: a essa
 * altura a corrente inteira está atrás do plano de reciclagem e não há corpo
 * nenhum para desviar.
 */
export function cardAmount(progress: number): number {
  const rise = easeStrong(clamp01((progress - 0.4) / 0.06));
  const fall = easeStrong(clamp01((progress - 0.88) / 0.07));
  return rise * (1 - fall);
}

export function sourceStrengthAt(progress: number): number {
  // O topo, agora que a Superfície existe: é a luz de fora descendo o duto,
  // de raspão pelas paredes — o termo `upstreamLight` do concreto. A abertura
  // em si (o céu e as lâminas) é `outsideAt`, e não passa por aqui.
  const early = 0.05 + 0.05 * clamp01(progress / 0.28);
  const surface = easeStrong(clamp01((progress - 0.85) / 0.15));
  return early + (SOURCE_SURFACE - early) * surface;
}

/**
 * A profundidade do plano nítido, em unidades de mundo — o denominador do
 * círculo de confusão (`cocAt` em `shaders/post.ts`).
 *
 * Fora do rio ela é larga: a abertura só existe na Emergência e no corte de
 * navalha da Identidade, e ali o que se quer é um borrão de ambiente, não um
 * plano de foco recortado.
 *
 * **No rio ela é o instrumento.** Com 26 unidades, dois cards separados por 4.7
 * têm círculos de confusão que diferem em 0.18 · abertura — invisível. Com 13, a
 * mesma separação dá 0.36 · abertura, e o card seguinte lê perceptivelmente mais
 * macio que o card em foco. O plano de foco é a distância ao alvo da câmera
 * (`focusRef`, em `SceneWorld`), que a curva mantém a ~13 unidades à frente — ou
 * seja, na distância de leitura do card.
 */
const FOCUS_RANGE_WIDE = 26;
const FOCUS_RANGE_RIVER = 12;

const FOCUS_RANGE_SURFACE = 9;

export function focusRangeAt(progress: number): number {
  const river =
    FOCUS_RANGE_WIDE + (FOCUS_RANGE_RIVER - FOCUS_RANGE_WIDE) * riverAmount(progress);
  return river + (FOCUS_RANGE_SURFACE - river) * surfaceAmount(progress);
}
