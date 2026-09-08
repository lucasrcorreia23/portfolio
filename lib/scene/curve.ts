import { CatmullRomCurve3, MathUtils, Vector3 } from "three";
import { clamp01, easeStrong } from "@/lib/motion";
import { SPECIMEN_Z } from "./world";

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
 * De 0.00 a 0.28 eles são dirigidos: a aproximação, o quadro do descolamento
 * em 0.18 e a passagem raspando a peça no fim da Identidade. De 0.45 em diante
 * são **provisórios** — existem para a curva ser uma curva só quando os outros
 * beats entrarem, e para a câmera não parar no meio do duto. Trocar esses
 * quatro é o trabalho dos prompts seguintes.
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
  // Daqui para baixo é provisório — ver o docblock.
  { at: 0.45, position: [0.5, -0.3, -40.0], target: [0.0, 0.0, -52.0] },
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
