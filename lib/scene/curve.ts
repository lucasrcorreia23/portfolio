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
 * De 0.00 a 0.45 eles são dirigidos: a aproximação, o quadro do descolamento em
 * 0.18, a passagem raspando a peça no fim da Identidade e a **derivada para a
 * parede graduada** em Quem sou. De 0.65 em diante são **provisórios** —
 * existem para a curva ser uma curva só quando os outros beats entrarem, e para
 * a câmera não parar no meio do duto. Trocar esses três é o trabalho dos
 * prompts seguintes.
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
  // Daqui para baixo é provisório — ver o docblock.
  { at: 0.65, position: [-0.9, 0.0, -58.0], target: [0.0, 0.0, -70.0] },
  { at: 0.85, position: [0.7, 0.4, -78.0], target: [0.0, 0.2, -90.0] },
  { at: 1.0, position: [0.0, 1.2, -92.0], target: [0.0, 0.6, -104.0] },
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
 * O piso existe por causa do salto: um `scrollTo` ou uma barra arrastada movem
 * a câmera dezenas de unidades num quadro, e a diferença finita devolveria uma
 * velocidade que nenhum corpo alcança — o poleiro cuspiria o bando para trás.
 * −9 é o mesmo teto de velocidade que o shader já impõe aos corpos.
 */
const DRIFT_MIN = -9;
const DRIFT_MAX = 1;

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

  const raw = dt > 0 ? (out.center.z - previousZ) / dt : 0;
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
 */
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
  return 0;
}
