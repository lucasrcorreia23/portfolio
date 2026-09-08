import { CatmullRomCurve3, MathUtils, Vector3 } from "three";
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
};

/**
 * Os pontos de controle da descida inteira.
 *
 * De 0.00 a 0.85 eles são dirigidos: a aproximação, o quadro do descolamento em
 * 0.18, a passagem raspando a peça no fim da Identidade, a **derivada para a
 * parede graduada** em Quem sou e o **corredor do rio**. De 0.85 em diante
 * continua **provisório** — existe para a curva ser uma curva só quando a
 * Superfície entrar, e para a câmera não parar no meio do duto.
 *
 * ## O corredor do rio
 *
 * De 0.45 a 0.85 a câmera percorre **44 unidades**, de `z = −42` a `z = −86`.
 * São 5.24 u/vh no desktop, dentro da faixa que os dois beats já fechados
 * praticam (Identidade a 4.2, Quem sou a 5.6) — a estimativa do DIRECTION.md §4
 * era ~5 u/vh, e ela se confirma.
 *
 * **A deriva é lenta, e não um slalom.** Os cards alternam de lado a cada 4.7
 * unidades (`lib/scene/cards.ts`), e uma câmera que desviasse de cada um leria
 * como pista de obstáculos. Ela não precisa desviar: o vão livre entre a borda
 * interna de um card e o eixo do duto é de 1.5 unidade, e a estação central
 * passa por baixo da lente. O que a curva faz são três "S" largos, de amplitude
 * pouco maior que uma unidade — o suficiente para a paralaxe mudar de sinal
 * algumas vezes e o corredor não virar um trilho.
 *
 * **O olhar vai para o eixo, ~13 unidades à frente.** É a mesma distância de
 * leitura para a qual o corpo do card foi resolvido, e é ela que a profundidade
 * de campo usa como plano de foco: o card à distância de leitura fica na
 * navalha, os de trás desfocam. A separação em profundidade do DIRECTION.md §3
 * ("parcial, só para separar cards em profundidade") é literalmente isso.
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
const STOPS: readonly Stop[] = [
  // Emergência: ar parado, longe de tudo. Não dá para saber o tamanho do
  // espaço, e a câmera mal se move.
  { at: 0.0, position: [0.0, 0.9, 8.0], target: [0.0, 0.3, -14.0] },
  { at: 0.1, position: [1.6, 0.5, -6.0], target: [0.2, 0.1, -24.0] },
  // O quadro. A 14 unidades da peça, que é a distância para a qual
  // SPECIMEN_SIZE foi resolvido.
  { at: 0.18, position: [1.0, 0.1, SPECIMEN_Z + 14], target: [0.0, 0.0, SPECIMEN_Z] },
  // Fim da Identidade: quase encostando, as letras varrendo o quadro.
  { at: 0.28, position: [-0.7, -0.2, SPECIMEN_Z + 4], target: [0.0, 0.0, SPECIMEN_Z - 2] },
  // Quem sou: a câmera deriva para a parede de estibordo e vira o olhar de
  // volta para o eixo. A régua fica no quadro o beat inteiro.
  { at: 0.34, position: [5.0, -0.2, -28.5], target: [1.8, 0.0, -42.0] },
  { at: 0.4, position: [6.8, -0.05, -35.0], target: [3.2, 0.0, -48.0] },
  { at: 0.45, position: [8.0, 0.05, -42.0], target: [4.5, 0.0, -55.0] },
  // O rio: a câmera volta da parede para o eixo do duto e desce o corredor em
  // três "S" largos, com o olhar preso ao eixo à distância de leitura.
  { at: 0.51, position: [3.6, -0.15, -48.3], target: [0.9, 0.0, -61.0] },
  { at: 0.59, position: [-1.2, 0.2, -56.7], target: [-0.2, 0.05, -69.5] },
  { at: 0.68, position: [1.1, -0.2, -66.2], target: [0.3, 0.0, -79.0] },
  { at: 0.77, position: [-1.0, 0.25, -75.6], target: [-0.2, 0.05, -88.0] },
  { at: 0.85, position: [0.4, 0.35, -86.0], target: [0.0, 0.3, -98.0] },
  // Daqui para baixo é provisório — ver o docblock.
  { at: 1.0, position: [0.0, 1.0, -93.0], target: [0.0, 0.6, -105.0] },
];

const toVectors = (key: "position" | "target") =>
  STOPS.map((stop) => new Vector3(...stop[key]));

const positionCurve = new CatmullRomCurve3(toVectors("position"), false, "catmullrom", 0.5);
const targetCurve = new CatmullRomCurve3(toVectors("target"), false, "catmullrom", 0.5);

/**
 * Remapeia progresso normalizado para o parâmetro do spline, respeitando o
 * progresso declarado de cada ponto de controle.
 */
function curveParam(progress: number): number {
  const p = clamp01(progress);
  const last = STOPS.length - 1;

  for (let i = 0; i < last; i += 1) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (a === undefined || b === undefined) break;
    if (p > b.at) continue;

    const span = b.at - a.at;
    const local = span <= 0 ? 0 : (p - a.at) / span;
    return (i + local) / last;
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
  const t = curveParam(progress);
  positionCurve.getPoint(t, out.position);
  targetCurve.getPoint(t, out.target);
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
  return (
    FLOCK_TUBE_NARROW + (FLOCK_TUBE_WIDE - FLOCK_TUBE_NARROW) * easeStrong(local)
  );
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

export function apertureAt(progress: number): number {
  if (progress <= 0.06) return 1;
  if (progress < 0.11) {
    // Fechando devagar durante a Emergência, mas ainda bem aberta.
    return 1 - 0.25 * easeStrong(clamp01((progress - 0.06) / 0.05));
  }
  if (progress < 0.155) {
    // O corte de navalha.
    return 0.75 * (1 - easeStrong(clamp01((progress - 0.11) / 0.045)));
  }
  // Parcial no rio, e fechada de novo na saída: a Superfície reabre "só na
  // fresta de luz" (DIRECTION.md §3), e esse beat ainda não existe.
  return RIVER_APERTURE * riverAmount(progress);
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
 * põe. O valor de topo é **provisório**, como os pontos de controle de 0.85 em
 * diante: quem o resolve é o beat da Superfície, que ainda não existe.
 */
const SOURCE_SURFACE = 0.55;

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

export function focusRangeAt(progress: number): number {
  return (
    FOCUS_RANGE_WIDE +
    (FOCUS_RANGE_RIVER - FOCUS_RANGE_WIDE) * riverAmount(progress)
  );
}
