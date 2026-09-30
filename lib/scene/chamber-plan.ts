import type { RiverLayout } from "./cards";

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

/* ---------------------------------------------------------------------------
 * A tomada de ar — o fim da descida (DIRECTION.md §4, Superfície)
 *
 * "A câmera chega à tomada de ar. Venezianas, a última cota gravada na soleira,
 * e luz de fora entrando em lâminas." Três peças, e as três moram aqui porque a
 * malha, o concreto, as lâminas de luz e o bando precisam concordar sobre onde
 * elas estão: uma lâmina que não saísse de uma fresta de verdade seria um
 * feixe desenhado, e um corpo que saísse por onde não há fresta atravessaria
 * concreto.
 * ------------------------------------------------------------------------ */

/**
 * A direção da luz de fora, **para dentro** do duto: quase ao longo do eixo,
 * descendo 0.55 por unidade que avança e com um desvio lateral pequeno. Quase
 * axial de propósito: as lâminas de luz são planos verticais, e só uma luz que
 * corre quase paralela ao olhar da câmera deixa esses planos **de perfil** para
 * ela — de frente eles se empilhariam num cone só de névoa acesa, que foi o que
 * a primeira versão (venezianas horizontais) entregou.
 */
export const OUTSIDE_LIGHT: readonly [number, number, number] = (() => {
  const x = 0.22;
  const y = -0.55;
  const z = 1;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length] as const;
})();

/**
 * As venezianas: aletas **verticais** no requadro da abertura, giradas em torno
 * do próprio eixo — nem alinhadas com a luz (sombra de espessura zero, a
 * abertura viraria um retângulo aceso) nem atravessadas a ela (fechariam a
 * tomada). Com este giro cada aleta come 48% do passo e deixa uma fresta de
 * 52%: é a luz em lâminas, e não em bloco.
 */
export const LOUVER_COUNT = 9;
/** O plano médio das aletas, no meio do requadro de uma unidade. */
export const LOUVER_Z = PLAN_FAR - 0.5;
/** Largura da aleta ao longo do próprio giro. */
export const LOUVER_WIDTH = 0.8;
export const LOUVER_THICKNESS = 0.05;
/** O giro da aleta: avança 0.8 em x por unidade que entra no duto. */
export const LOUVER_SLOPE = 0.8;

export function louverPitch(): number {
  return (APERTURE_HALF_WIDTH * 2) / LOUVER_COUNT;
}

/** Posição em x do centro da aleta `k`, contada de bombordo. */
export function louverX(k: number): number {
  return -APERTURE_HALF_WIDTH + louverPitch() * (k + 0.5);
}

/**
 * Meia-largura da faixa que uma aleta bloqueia, projetada **ao longo da luz**
 * no plano médio. É o que decide a fresta: a faixa acesa na soleira e o feixe
 * no ar saem das mesmas duas bordas.
 */
export function louverShadowHalf(): number {
  const dLength = Math.hypot(LOUVER_SLOPE, 1);
  const dx = LOUVER_SLOPE / dLength;
  const dz = 1 / dLength;
  const [lx, , lz] = OUTSIDE_LIGHT;
  return (LOUVER_WIDTH / 2) * Math.abs(dx - (dz * lx) / lz) + LOUVER_THICKNESS;
}

/**
 * As frestas, de bombordo para estibordo, como faixas `[x0, x1]` no plano
 * médio das aletas: oito entre aletas e as duas das pontas.
 */
export function louverGaps(): readonly (readonly [number, number])[] {
  const half = louverShadowHalf();
  const gaps: [number, number][] = [];
  let from = -APERTURE_HALF_WIDTH;
  for (let k = 0; k < LOUVER_COUNT; k += 1) {
    const x = louverX(k);
    if (x - half > from + 0.02) gaps.push([from, x - half]);
    from = x + half;
  }
  if (APERTURE_HALF_WIDTH > from + 0.02) gaps.push([from, APERTURE_HALF_WIDTH]);
  return gaps;
}

/**
 * A soleira: um bloco de concreto que sobe do piso até a borda de baixo da
 * abertura e avança para dentro do duto. É nele que a última cota fica
 * gravada — no topo, virada para cima, onde a luz de fora bate.
 */
export const SILL_DEPTH = 2.2;
export const SILL_HALF_WIDTH = APERTURE_HALF_WIDTH + 0.6;
export const SILL_TOP = APERTURE_Y - APERTURE_HALF_HEIGHT;

/**
 * O nível do rio (rodada 22): a lâmina d'água corre a esta altura, logo
 * abaixo do bando, dos cards e do plinto do LRC. O concreto usa para molhar a
 * faixa da parede junto à água.
 */
export const WATER_LEVEL = -3.6;

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

/**
 * Os motivos gravados (rodada 16, decisão do Lucas de 2026-09-30): a câmara
 * trocou a medida pela natureza. Onde havia `EST. 047` e `COTA +03.10` há
 * fósseis e folhas em baixo-relevo, pelo mesmo mecanismo — a vala só aparece no
 * raspão da luz. Desenhados proceduralmente em `engraving-atlas.ts`.
 */
export type FossilMotif = "fern" | "leaf" | "ammonite" | "shell" | "seed" | "fish";

export type Fossil = {
  /**
   * `wall` é parede lateral; `floor` é o piso; `sill` é o topo da soleira —
   * horizontal como o piso, mas na altura `y` do próprio fóssil.
   */
  surface: "wall" | "floor" | "sill";
  /** Para parede: −1 bombordo, +1 estibordo. Para piso, ignorado. */
  side: -1 | 1;
  /** Centro, em mundo. Para parede, `x` é resolvido da seção. */
  x: number;
  y: number;
  z: number;
  /** Lado da placa, em unidades de mundo. */
  size: number;
  /** Giro no plano da superfície, em radianos. */
  angle: number;
  motif: FossilMotif;
  /** Semente do desenho: dois fósseis do mesmo motivo nunca são iguais. */
  seed: number;
};

export type ChamberPlan = {
  section: (z: number) => Section;
  /** Todas as quebras de perfil, em z decrescente. A malha é lofteada nelas. */
  breaks: readonly number[];
  ribs: readonly Rib[];
  niches: readonly Niche[];
  fossils: readonly Fossil[];
};

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

  // Os fósseis: de relance, onde a luz passa rente. Poucos e nunca em
  // cadência — espalhados como se o concreto tivesse sido derramado sobre um
  // leito antigo. A Identidade tem só um, longe da peça: nada disputa com o
  // descolamento (DIRECTION.md §6).
  const fossils: Fossil[] = [
    // Identidade: uma folha só, a estibordo, atrás da câmera do descolamento.
    { surface: "wall", side: 1, x: 0, y: 1.6, z: -22.5, size: 1.3, angle: 0.4, motif: "leaf", seed: 3 },
    { surface: "wall", side: -1, x: 0, y: -2.2, z: -33, size: 1.6, angle: -0.25, motif: "ammonite", seed: 7 },
    // Quem sou: a parede que a câmera raspa ganha a samambaia e o peixe.
    { surface: "wall", side: 1, x: 0, y: -1.1, z: -41, size: 2.2, angle: 0.12, motif: "fern", seed: 11 },
    { surface: "wall", side: 1, x: 0, y: 3.1, z: -45.5, size: 1.4, angle: -0.6, motif: "shell", seed: 5 },
    { surface: "wall", side: 1, x: 0, y: 0.6, z: -50, size: 2.6, angle: 1.45, motif: "fish", seed: 2 },
    // O piso, a caminho do título.
    { surface: "floor", side: 1, x: -3.4, y: 0, z: -30, size: 1.8, angle: 2.2, motif: "seed", seed: 9 },
    { surface: "floor", side: 1, x: 2.8, y: 0, z: -44, size: 1.5, angle: 0.9, motif: "leaf", seed: 13 },
    // O fim do duto.
    { surface: "wall", side: -1, x: 0, y: 1.0, z: -93.5, size: 1.8, angle: 0.3, motif: "fern", seed: 17 },
    // A soleira, sob a luz de fora — à direita, longe da coluna do contato.
    {
      surface: "sill",
      side: 1,
      x: 1.5,
      y: SILL_TOP,
      z: PLAN_FAR + SILL_DEPTH - 0.9,
      size: 1.4,
      angle: 0.7,
      motif: "leaf",
      seed: 21,
    },
  ];
  // Cada nicho do rio guarda um fóssil pequeno acima do card.
  const nicheMotifs: FossilMotif[] = ["ammonite", "seed", "shell", "leaf", "fern", "fish"];
  for (const niche of niches) {
    fossils.push({
      surface: "wall",
      side: niche.side,
      x: 0,
      y: niche.y + 2.0,
      z: niche.z,
      size: 1.0,
      angle: 0.3 * niche.side,
      motif: nicheMotifs[niche.index % nicheMotifs.length] ?? "leaf",
      seed: 31 + niche.index,
    });
  }

  return { section, breaks, ribs, niches, fossils };

}

/** A parede em `x` numa seção, com sinal: bombordo negativo. */
export function wallX(section: Section, side: -1 | 1): number {
  return side < 0 ? -section.left : section.right;
}
