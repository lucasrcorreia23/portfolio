import type { RiverLayout } from "./cards";
import { SPECIMEN_CAP_HEIGHT, SPECIMEN_Z } from "./world";

/**
 * A planta da câmara — o perfil da seção ao longo do eixo, os quadros
 * estruturais, os nichos das estações do rio e onde cada gravação numerada
 * fica. É a **fonte única** da geometria: a malha (`Chamber.tsx`), as placas
 * gravadas (`Structure.tsx`), o proxy da CPU e a sonda leem daqui.
 *
 * ## Por que ela existe
 *
 * Até a rodada 7 a câmara era um `boxGeometry` de 24 × 14 × 108 com `BackSide`:
 * uma seção constante por 108 unidades, seis faces com o mesmo material. O que
 * faz um corredor ler como corredor é a **paralaxe entre coisas a distâncias
 * diferentes** quando a câmera anda — e numa caixa lisa não há duas distâncias.
 * Então a seção varia:
 *
 * - **uma garganta** antes do corpo de prova (z −5…−13): a câmara aperta para
 *   ±8.8 de largura e 5.0 de teto, e a câmera a atravessa no começo da
 *   Identidade. O título é visto *através* dela, a quatorze unidades, com as
 *   paredes já de volta a ±12 atrás dele;
 * - **um alargamento no rio** (a partir de z −46 a bombordo e −51 a
 *   estibordo, assimétrico de propósito — dois lados simétricos leem como
 *   caixa de novo): 14.2 e 13.8, teto a 8.6 e piso descendo para −7.6. Mais
 *   largo que isso a parede some na névoa do corredor — medido na primeira
 *   versão, a ±15 a densidade de feições no rio caiu abaixo da da caixa antiga;
 * - **nichos** — baias recessadas de 2 unidades na parede, uma por card, do
 *   lado em que o card está montado. É a estação do rio, e é nela que o número
 *   dela fica gravado;
 * - **quadros estruturais** a intervalo irregular, anéis com chanfro que
 *   avançam 0.5 para dentro da seção. São eles que pegam luz de raspão quando o
 *   bando passa, e são a feição mais próxima da lente quando a câmera anda rente.
 *
 * ## Restrições que a planta respeita, e quem as mede
 *
 * - A parede de estibordo continua em x = 12 entre z −15 e −51: o poleiro de
 *   Quem sou encosta nela (`ROOST_X_MAX` = 8.8 + raio 2.6) e a câmera passa a
 *   quatro unidades dela em 0.45. Mexer nisso é remedir Quem sou.
 * - Nenhum quadro invade o tubo do bando nem a trajetória da câmera: o anel
 *   interno fica em |x| ≥ 11.5 e |y| ≥ 4.5.
 * - O piso fica em −7 até o rio: a cota do piso é gravada nele.
 */

export type Section = {
  /** Meia-largura a bombordo (x negativo), positiva. */
  left: number;
  /** Meia-largura a estibordo (x positivo). */
  right: number;
  /** Profundidade do piso, positiva: o piso está em y = −floor. */
  floor: number;
  /** Altura do teto, positiva. */
  ceiling: number;
};

/** Chave de perfil: `[z, valor]`, em z decrescente (de montante… para jusante). */
type Key = readonly [number, number];

const LEFT: readonly Key[] = [
  [12, 12],
  [-3, 12],
  [-5, 8.8],
  [-13, 8.8],
  [-15.5, 12],
  [-46, 12],
  [-50, 14.2],
  [-88, 14.2],
  [-92, 12],
  [-96, 12],
];

const RIGHT: readonly Key[] = [
  [12, 12],
  [-3, 12],
  [-5, 8.8],
  [-13, 8.8],
  [-15.5, 12],
  [-51, 12],
  [-55, 13.8],
  [-88, 13.8],
  [-92, 12],
  [-96, 12],
];

const CEILING: readonly Key[] = [
  [12, 7],
  [-3, 7],
  [-5, 5],
  [-13, 5],
  [-15.5, 7],
  [-47, 7],
  [-52, 8.6],
  [-86, 8.6],
  [-92, 7],
  [-96, 7],
];

const FLOOR: readonly Key[] = [
  [12, 7],
  [-48, 7],
  [-52, 7.6],
  [-86, 7.6],
  [-92, 7],
  [-96, 7],
];

/** O comprimento do duto. As tampas continuam onde sempre estiveram. */
export const PLAN_NEAR = 12;
export const PLAN_FAR = -96;

/**
 * A abertura no fundo do duto — a fonte distante é **ela**, e não a parede
 * inteira do fundo.
 *
 * A tampa antiga era um plano emissivo do tamanho da seção, e em 0.85 a câmera
 * está a dez unidades dela: a tampa enchia o quadro inteiro, e a medida de
 * presença da estrutura dava **zero** ali, na câmara nova e na caixa antiga.
 * Uma parede de concreto com uma abertura no meio devolve estrutura em volta da
 * luz. É também o que a Superfície vai precisar — a tomada de ar é uma abertura
 * numa parede, não uma parede acesa —, mas a forma final dela é daquele beat.
 */
export const APERTURE_HALF_WIDTH = 4.2;
export const APERTURE_HALF_HEIGHT = 2.6;
export const APERTURE_Y = 0.4;

/** Quanto o nicho recua, e o comprimento dele ao longo do eixo. */
export const NICHE_DEPTH = 2;
const NICHE_HALF_LENGTH = 1.2;
const NICHE_RAMP = 0.4;

/**
 * Os quadros estruturais. Irregulares: a diferença entre vizinhos nunca se
 * repete duas vezes, porque um anel a cada N unidades é uma grade andando.
 */
export type Rib = {
  z: number;
  /** Quanto o anel avança para dentro da seção. */
  inset: number;
  /** Espessura no eixo. */
  depth: number;
};

/**
 * No rio os quadros são **portais**: avançam 2.2 para dentro de uma seção que
 * alargou, e são o que a câmera atravessa rente. Medido na primeira versão, com
 * o anel de 0.5 das paredes estreitas, o corredor alargado sumia na névoa — a
 * parede fica a catorze unidades da lente e o anel junto com ela.
 */
const RIBS: readonly Rib[] = [
  // **Poucos, e nunca em cadência.** A primeira versão tinha onze anéis, e no
  // rio eles se enfileiravam em retângulos concêntricos — o túnel de molduras,
  // uma grade infinita em perspectiva, que o PROJECT.md §2 veta. Cinco, com
  // intervalos de 19, 16.5, 21.5 e 15: nunca mais de dois legíveis de uma vez,
  // o resto engolido pela névoa.
  { z: -17, inset: 0.5, depth: 0.4 },
  { z: -36, inset: 0.5, depth: 0.4 },
  { z: -52.5, inset: 2.2, depth: 0.8 },
  { z: -74, inset: 2.2, depth: 0.8 },
  { z: -89, inset: 0.8, depth: 0.5 },
];
/** O anel das paredes estreitas — a sonda usa como referência. */
export const RIB_INSET = 0.5;
export const RIB_CHAMFER = 0.12;

function sample(keys: readonly Key[], z: number): number {
  const first = keys[0];
  if (first === undefined) return 0;
  if (z >= first[0]) return first[1];
  for (let i = 1; i < keys.length; i += 1) {
    const a = keys[i - 1];
    const b = keys[i];
    if (a === undefined || b === undefined) continue;
    if (z >= b[0]) {
      const t = (a[0] - z) / (a[0] - b[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return keys[keys.length - 1]?.[1] ?? 0;
}

export type Niche = {
  /** −1 bombordo, +1 estibordo. */
  side: -1 | 1;
  z: number;
  /** Altura do card da estação — onde a placa com o número vai. */
  y: number;
  /** Índice do card na corrente. */
  index: number;
};

export type EngravingLabel = {
  /** `wall` é parede lateral; `floor` é o piso. */
  surface: "wall" | "floor";
  /** Para parede: −1 bombordo, +1 estibordo. Para piso, ignorado. */
  side: -1 | 1;
  /** Centro do texto, em mundo. Para parede, `x` é resolvido da seção. */
  x: number;
  y: number;
  z: number;
  /** Altura de caixa alta do texto, em unidades de mundo. */
  cap: number;
  text: string;
};

export type ChamberPlan = {
  section: (z: number) => Section;
  /** Todas as quebras de perfil, em z decrescente. A malha é lofteada nelas. */
  breaks: readonly number[];
  ribs: readonly Rib[];
  niches: readonly Niche[];
  labels: readonly EngravingLabel[];
};

/** `EST. 047` — o número de estação é a profundidade, como a leitura `Z` da HUD. */
function stationLabel(z: number): string {
  return `EST. ${String(Math.round(-z)).padStart(3, "0")}`;
}

/** `COTA +03.10` — o léxico do DIRECTION.md §2, com o sinal tipográfico. */
export function cotaLabel(value: number): string {
  const sign = value < 0 ? "−" : "+";
  const abs = Math.abs(value);
  const whole = String(Math.floor(abs)).padStart(2, "0");
  const frac = String(Math.round((abs - Math.floor(abs)) * 100)).padStart(2, "0");
  return `COTA ${sign}${whole}.${frac}`;
}

/**
 * As réguas das paredes laterais — gravadas analiticamente no shader da parede
 * (`shaders/chamber.ts`). Alturas todas diferentes: duas réguas na mesma altura
 * nas duas paredes leriam como grade (PROJECT.md §2). Estibordo tem duas porque
 * é a parede que a câmera raspa em Quem sou.
 */
export const RULES: readonly { y: number; side: -1 | 1 }[] = [
  { y: -3.2, side: -1 },
  { y: 2.4, side: -1 },
  { y: -1.6, side: 1 },
  { y: 3.1, side: 1 },
];
export const RULE_FROM = -18;
export const RULE_TO = -84;
/** A marca solitária da Emergência: uma, no singular (DIRECTION.md §4). */
export const LONE_MARK_Z = -16;

export function createChamberPlan(river: RiverLayout | null): ChamberPlan {
  const niches: Niche[] = [];
  if (river !== null) {
    for (const card of river.cards) {
      // Um card no eixo não tem parede do seu lado.
      if (Math.abs(card.x) < 0.5) continue;
      niches.push({
        side: card.x < 0 ? -1 : 1,
        z: card.z,
        y: card.y,
        index: card.index,
      });
    }
  }

  const nicheOffset = (side: -1 | 1, z: number): number => {
    let offset = 0;
    for (const niche of niches) {
      if (niche.side !== side) continue;
      const d = Math.abs(z - niche.z);
      if (d >= NICHE_HALF_LENGTH + NICHE_RAMP) continue;
      const t =
        d <= NICHE_HALF_LENGTH
          ? 1
          : 1 - (d - NICHE_HALF_LENGTH) / NICHE_RAMP;
      offset = Math.max(offset, NICHE_DEPTH * t);
    }
    return offset;
  };

  const section = (z: number): Section => ({
    left: sample(LEFT, z) + nicheOffset(-1, z),
    right: sample(RIGHT, z) + nicheOffset(1, z),
    floor: sample(FLOOR, z),
    ceiling: sample(CEILING, z),
  });

  // As quebras: todas as chaves de perfil, as dos nichos e as faces dos
  // quadros. Entre duas quebras a seção é linear, então a malha é exata.
  const set = new Set<number>();
  for (const keys of [LEFT, RIGHT, CEILING, FLOOR]) {
    for (const [z] of keys) set.add(z);
  }
  for (const niche of niches) {
    for (const d of [
      NICHE_HALF_LENGTH + NICHE_RAMP,
      NICHE_HALF_LENGTH,
      -NICHE_HALF_LENGTH,
      -(NICHE_HALF_LENGTH + NICHE_RAMP),
    ]) {
      set.add(niche.z + d);
    }
  }
  const breaks = [...set]
    .filter((z) => z <= PLAN_NEAR && z >= PLAN_FAR)
    .sort((a, b) => b - a);

  // Um quadro nunca cai dentro de um nicho: o anel atravessaria a boca da baia.
  const ribs = RIBS.filter((rib) =>
    niches.every(
      (n) => Math.abs(rib.z - n.z) >= NICHE_HALF_LENGTH + NICHE_RAMP + rib.depth / 2,
    ),
  );

  const labels: EngravingLabel[] = [
    // Identidade: a estação da peça, a estibordo, e a cota da altura de caixa
    // alta a bombordo, ao lado da seta de escala gravada. "O título é
    // dimensionado como peça de ensaio" (DIRECTION.md §4).
    { surface: "wall", side: 1, x: 0, y: 1.35, z: -22.5, cap: 0.42, text: stationLabel(-22.5) },
    {
      surface: "wall",
      side: -1,
      x: 0,
      y: SPECIMEN_CAP_HEIGHT / 2 + 0.42,
      z: SPECIMEN_Z + 1.4,
      cap: 0.26,
      text: cotaLabel(SPECIMEN_CAP_HEIGHT),
    },
    { surface: "wall", side: -1, x: 0, y: 0.9, z: -33, cap: 0.45, text: stationLabel(-33) },
    // Quem sou: a parede que a câmera raspa. As cotas das duas réguas, e o
    // número de estação no trecho que entra no quadro em 0.40–0.45.
    { surface: "wall", side: 1, x: 0, y: -1.2, z: -41, cap: 0.3, text: cotaLabel(-1.6) },
    { surface: "wall", side: 1, x: 0, y: 3.5, z: -45.5, cap: 0.3, text: cotaLabel(3.1) },
    // A estação desta parede fica onde ela **entra no quadro**: a câmera corre
    // ao longo dela olhando para a frente e para bombordo, então no ponto mais
    // rente a parede está fora da tela. Em z −50 ela aparece de 0.36 a 0.45,
    // de raspão, e é por isso que o número é grande.
    { surface: "wall", side: 1, x: 0, y: 0.9, z: -50, cap: 0.8, text: stationLabel(-50) },
    // O piso: a cota dele, lida olhando para baixo, a caminho do título.
    { surface: "floor", side: 1, x: -3.4, y: 0, z: -30, cap: 0.5, text: cotaLabel(-7) },
    // O fim do duto, no trecho reto depois do estreitamento.
    { surface: "wall", side: -1, x: 0, y: 1.2, z: -93.5, cap: 0.5, text: stationLabel(-93.5) },
  ];
  // Cada nicho é uma estação do rio, e o número dela fica gravado no fundo da
  // baia, acima do card.
  for (const niche of niches) {
    labels.push({
      surface: "wall",
      side: niche.side,
      x: 0,
      y: niche.y + 1.9,
      z: niche.z,
      cap: 0.42,
      text: stationLabel(niche.z),
    });
  }

  return { section, breaks, ribs, niches, labels };
}

/** A parede em `x` numa seção, com sinal: bombordo negativo. */
export function wallX(section: Section, side: -1 | 1): number {
  return side < 0 ? -section.left : section.right;
}
