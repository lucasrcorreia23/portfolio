import { sceneSettings } from "./settings";
import { FLOCK_TUBE_HEIGHT, FLOCK_TUBE_WIDE } from "./world";

/**
 * O rio — a geometria do beat de Trabalho, DIRECTION.md §4.
 *
 * "Os cards são outros corpos de prova montados ao longo da câmara, em
 * perspectiva real, e a câmera atravessa por entre eles." Este módulo é o dono
 * de **onde** eles estão montados: corpo, corrente de estações, espaçamento e
 * ângulo de montagem. Três consumidores precisam concordar com ele — o material
 * dos cards (`components/scene/Cards.tsx`), o passo de velocidade do bando
 * (`shaders/boids.ts`, que amostra o SDF analítico de cada card) e a sonda, que
 * mede a esteira na sombra da tinta de um card específico. É a mesma disciplina
 * de `world.ts`: número em três arquivos é número que um dia diverge.
 *
 * ## O SDF do card é analítico, e não assado
 *
 * O campo de distância do corpo de prova é assado com jump flood
 * (`type-field.ts`) porque **glifo tem forma arbitrária**: sete letras com
 * contra-formas, vãos e uma silhueta que só o troika conhece. Card não tem esse
 * problema — é um retângulo de cantos arredondados, e um retângulo de cantos
 * arredondados tem distância com sinal em cinco linhas de GLSL, exata em
 * qualquer ponto, com o gradiente de brinde. Assar um campo por card seria
 * trocar precisão infinita por 1024×256 texels e uma passagem de render por
 * card, para descrever uma forma que cabe numa fórmula.
 *
 * ## Por que a capacidade caiu de ~8 para 7
 *
 * O DIRECTION.md §4 declara a capacidade do rio como **valor derivado**,
 * calculado antes de o beat existir, e manda reconferi-la "quando o card e a
 * curva definitiva existirem — ele entra como piso de planejamento, não como
 * medição". A reconferência é esta, e ela move o número em um:
 *
 * - A curva definitiva (`curve.ts`) percorre **44 unidades** entre 0.45 e 0.85,
 *   de `z = −42` a `z = −86` — 5.24 u/vh, dentro da faixa de 4.2 a 5.6 u/vh que
 *   os dois beats já fechados praticam.
 * - O **primeiro** card tem que entrar à distância de leitura, não colado: 13
 *   unidades à frente da câmera em 0.45, ou seja `z = −55`. É praticamente a
 *   distância para a qual `SPECIMEN_SIZE` foi resolvido, e é o que impede o rio
 *   de começar com um card explodindo em cima de quem acabou de sair do
 *   manifesto.
 * - O **último** tem que ser não só ultrapassado antes de 0.85 como **lido**
 *   antes: a leitura acontece catorze unidades antes da passagem, então um card
 *   em `z = −84` seria lido em 0.71 e a última décima do beat ficaria sem nada
 *   à frente. Foi o que a primeira contact sheet mostrou — dois quadros de doze,
 *   `p = 0.814` e `p = 0.850`, com a câmara vazia. Em `z = −82` o último card é
 *   lido em 0.69 e passado em 0.814, e o que sobra é a saída do rio, não um
 *   vazio.
 *
 * Sobram 27 unidades para distribuir. Com o piso de 4.5 unidades entre centros
 * (§4, e ele não é negociável — abaixo dele dois cards se atropelam na
 * perspectiva), `27 ÷ 6 = 4.5`: **7 cards, exatamente no piso**. Oito exigiriam
 * 3.86, abaixo dele.
 *
 * Estar exatamente no piso é apertado de propósito e não é chute: o piso saiu de
 * arredondar 4.2 para cima, então o arredondamento **é** a margem. E a razão de
 * largura projetada do par mais próximo, medida no quadro entregue, é 1.53 —
 * bem acima do 1.30 que o piso existe para garantir.
 *
 * Isso **não** contraria a meta de curadoria do §4: o motivo declarado para
 * "~8 no desktop" é que "o desktop comporta o acervo inteiro se a curadoria
 * decidir por isso", e o acervo tem sete cases (PROJECT.md §6). Sete cabem.
 *
 * ## O mobile não ganha um corredor mais curto em mundo
 *
 * O §4 estimava ~26 unidades de corredor no mobile, encolhendo o mundo na mesma
 * proporção do vh. A curva definitiva não pode fazer isso: ela é uma função do
 * **progresso**, e progresso não sabe de breakpoint — dois corredores em mundo
 * seriam duas curvas, e a regra da variável única (PROJECT.md §3.3) tem uma só.
 *
 * O que encolhe no mobile é o **custo em rolagem**: os mesmos 44 unidades em
 * 5.1 vh em vez de 8.4. É a "travessia mais curta" do PROJECT.md §5 lida como
 * tempo, que é como uma pessoa a sente. E a contagem cai para quatro pelo mesmo
 * motivo de ritmo: 8.4 ÷ 7 = 1.20 vh por card no desktop, 5.1 ÷ 4 = 1.28 no
 * mobile — a mesma respiração por card, que é o que a §4 protege quando fixa o
 * comprimento do beat.
 */

/**
 * Corpo do card, em unidades de mundo. Razão 16:10, a das capas.
 *
 * **3.8 não é gosto: é o maior corpo que fecha a conta da esteira.** O critério
 * de aceite mede a densidade na sombra da tinta a uma, duas e **quatro larguras
 * de card** a jusante, e para esse número significar "a esteira deste card" a
 * coluna precisa estar livre de outros cards ao longo dessas quatro larguras.
 * A conta, com a corrente de estações abaixo:
 *
 *   4·W + 0.25·W (meia laje) + 1.5·H (a rampa de aproximação do card seguinte
 *   na mesma estação) < 5 · espaçamento
 *
 * Com `H = W/1.6` isso é `5.1875 · W < 22.5`, ou seja `W < 4.34`. O corpo fica
 * abaixo disso, e a folga medida na laje de quatro larguras é de 2.8 unidades —
 * ver `CARD_STATIONS`.
 *
 * Na tela: à distância de leitura de 14 unidades, com FOV 45° a 16:10, a
 * meia-largura visível é 9.28, então o card ocupa **20% da largura**. É
 * subordinado de propósito. O DIRECTION.md §1 é explícito — "nenhum beat pode
 * disputar atenção com o frame do descolamento" —, e o corpo de prova ocupa 84%.
 * A escala do rio acontece na passagem: a 5 unidades o mesmo card ocupa 57%.
 */
export const CARD_WIDTH = 3.8;
export const CARD_HEIGHT = CARD_WIDTH / 1.6;

/** Meias-medidas, que é o que o SDF do retângulo arredondado consome. */
export const CARD_HALF_WIDTH = CARD_WIDTH / 2;
export const CARD_HALF_HEIGHT = CARD_HEIGHT / 2;

/**
 * Raio dos cantos, em unidades de mundo.
 *
 * Pequeno de propósito: um card é uma peça montada, não um botão. O que ele
 * compra é que o SDF não tenha quina infinitamente afiada — a força de separação
 * lê o gradiente do campo, e num canto reto o gradiente gira 90° num ponto.
 */
export const CARD_CORNER = 0.16;

/**
 * Onde o primeiro card está montado, e onde o último.
 *
 * A distância de leitura de 14 unidades é a mesma de `SPECIMEN_SIZE`
 * (`world.ts`) e a mesma que o DIRECTION.md §4 usa para derivar o piso de
 * espaçamento. Ver o docblock do módulo para o resto da conta.
 */
export const CARD_FIRST_Z = -55;
export const CARD_LAST_Z = -82;
export const CARD_SPAN = CARD_FIRST_Z - CARD_LAST_Z;

/** O piso do DIRECTION.md §4: abaixo disto dois cards se atropelam. */
export const CARD_MIN_SPACING = 4.5;

/**
 * Teto da corrente. É o tamanho do array de uniforms no shader dos boids, então
 * ele é compile-time — sete é a capacidade derivada, e o oitavo slot é a folga
 * para a curadoria caber num acervo maior sem recompilar a conta.
 */
export const MAX_CARDS = 8;

/** Capacidade derivada — ver o docblock do módulo. */
export const RIVER_CAPACITY = 7;
export const RIVER_CAPACITY_MOBILE = 4;

/** O mesmo 768 do breakpoint `md:` do Tailwind, que é onde a HUD colapsa. */
const MOBILE_BREAKPOINT = 768;

export function riverCapacity(viewportWidth: number): number {
  return viewportWidth < MOBILE_BREAKPOINT
    ? RIVER_CAPACITY_MOBILE
    : RIVER_CAPACITY;
}

/**
 * As estações de montagem, em (x, y) de mundo.
 *
 * **Cinco, e a corrente é o que torna a esteira de um card mensurável.** Cada
 * card é montado na estação seguinte da lista, então dois cards só voltam a
 * dividir a mesma coluna de escoamento cinco slots adiante — 22.5 unidades com
 * o espaçamento de 4.5, contra as 15.2 que a laje de quatro larguras alcança e
 * as 3.56 da rampa de aproximação que o card de trás projeta a montante. Sobram
 * 2.8 unidades de água limpa entre a laje mais distante e a primeira influência
 * do próximo card da mesma coluna.
 *
 * Com **quatro** estações a recorrência cairia para 18.0 e essa margem viraria
 * −1.7: a laje de quatro larguras estaria dentro da rampa do card seguinte, e o
 * número medido não seria mais "a esteira deste card". Isso não é uma exigência
 * do instrumento — é a exigência do beat. Se as esteiras se fundem, o rio tem
 * uma esteira, não sete, e "cada card tem a sua" deixa de ser verdade.
 *
 * **A separação entre estações também é uma conta, não um arranjo.** Duas
 * estações não podem se ver: a força lateral de um card alcança `~0.5 · H` para
 * fora da silhueta dele, então elas precisam estar separadas por
 * `1.31 · W = 4.98` em x **ou** por `1.31 · H = 3.11` em y. As três de baixo
 * ficam a 6.0 uma da outra; as duas de cima e as de baixo, a 4.0 em y.
 *
 * **E o teto em y é o tubo do bando.** Um card acima de `3.31 − H/2 = 2.12` sai
 * do escoamento e vira cenário: nada se descola nele. Daí `±2.0`.
 *
 * A ordem alterna os lados — direita, esquerda-longe, direita-longe, esquerda,
 * eixo — para a câmera passar **por entre** eles, e não por fora. O vão livre
 * no eixo é de 1.5 unidade em x de cada lado nas estações internas, e a estação
 * central (0, −2.0) passa por baixo da lente: a borda de cima dela fica 0.81
 * abaixo do eixo do olhar.
 *
 * ## A estação decide quão rápido a esteira fecha, e isso é medido
 *
 * A esteira de um card fecha em ritmos diferentes conforme onde ele está no
 * tubo do bando, e a diferença é grande. Medido no mesmo método (sombra da tinta
 * a uma, duas e quatro larguras, sinal `solo` sobre controle `off`, 2600
 * quadros):
 *
 * | card | estação | 1 W | 2 W | 4 W |
 * |---|---|---|---|---|
 * | 3 | `(−3.4, +2.0)` | 0.13 | 0.58 | **0.92** |
 * | 4 | `(0, −2.0)` | 0.00 | 0.06 | **0.07** |
 *
 * A estação 4 está encostada no chão do tubo: a meia-altura da elipse em `x = 0`
 * é 3.31 e a borda de baixo do card fica em −3.19, ou seja **0.12 unidade da
 * parede**. A sombra dele só pode ser reabastecida por cima, e não é. A estação
 * 3 tem escoamento dos dois lados, e a esteira fecha em 92% do não perturbado.
 *
 * Isto é o comportamento certo lido pelo lado errado da moeda: um card colado na
 * borda do escoamento **deve** deixar um vazio atrás dele. O que ele não deve é
 * ser a peça a partir da qual se afirma que "cada card tem esteira própria" — e
 * por isso a sonda mede o card 3 por padrão (ver `WAKE_CARD_INDEX`). Quem mexer
 * na altura do tubo do bando ou na altura das estações remede os dois.
 */
export const CARD_STATIONS: readonly (readonly [number, number])[] = [
  [3.4, 2.0],
  [-6.0, -2.0],
  [6.0, -2.0],
  [-3.4, 2.0],
  [0.0, -2.0],
];

/**
 * Distância nominal ao eixo da câmara para o ângulo de montagem.
 *
 * O card não fica de face para o duto: ele gira para o eixo, como uma peça numa
 * haste com ângulo de ataque. `yaw = −atan(x / CARD_TOE_IN)` põe a normal
 * apontando para o corredor a doze unidades — perto da distância de leitura,
 * então o card está quase de face justamente quando dá para lê-lo, e escapa de
 * perfil quando a câmera passa por ele.
 *
 * Doze e não catorze: a peça vira um pouco mais do que o estritamente de face, e
 * é o que dá paralaxe na passagem em vez de um retângulo chapado deslizando.
 */
const CARD_TOE_IN = 12;

export type Card = {
  /** Índice na corrente, 0 é o mais a jusante (o primeiro que se vê). */
  index: number;
  x: number;
  y: number;
  z: number;
  /** Rotação em torno de Y, radianos. Mesma convenção do corpo de prova. */
  yaw: number;
  /** Semente estável do card, 0 a 1 — variação da capa de teste. */
  seed: number;
};

export type RiverLayout = {
  count: number;
  spacing: number;
  cards: readonly Card[];
};

function hash(i: number): number {
  const x = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A corrente, resolvida de uma contagem.
 *
 * `span` existe para a medição, não para a composição: `?span=3` colapsa o
 * corredor num plano quase único, e é o **controle** da medida de separação em
 * profundidade — sem ele, "as larguras projetadas caem de card para card" não
 * distingue "há profundidade" de "o instrumento sempre diz isso". Ver
 * `probe-cards.ts`.
 */
export function riverLayout(count: number, span = CARD_SPAN): RiverLayout {
  const clamped = Math.max(2, Math.min(MAX_CARDS, Math.round(count)));
  const spacing = span / (clamped - 1);
  const cards: Card[] = [];

  for (let index = 0; index < clamped; index += 1) {
    const station =
      CARD_STATIONS[index % CARD_STATIONS.length] ?? CARD_STATIONS[0];
    if (station === undefined) continue;
    const x = station[0];
    cards.push({
      index,
      x,
      y: station[1],
      z: CARD_FIRST_Z - index * spacing,
      yaw: -Math.atan2(x, CARD_TOE_IN),
      seed: hash(index + 1),
    });
  }

  return { count: clamped, spacing, cards };
}

let resolved: RiverLayout | null = null;

/**
 * A corrente desta sessão, resolvida uma vez.
 *
 * **Uma vez, e não por redimensionamento**, pelo mesmo motivo de
 * `sceneSettings()`: remontar o rio no meio da descida moveria sete peças de
 * lugar enquanto a câmera passa entre elas, e invalidaria qualquer medição em
 * curso. Quem gira o telefone recarrega a página, que é o que já acontece com a
 * contagem do bando e com a DOF.
 *
 * Os dois consumidores são o material dos cards e a sonda, e eles **precisam**
 * ver a mesma corrente: a sonda mede a esteira na sombra da tinta de um card
 * específico, e uma segunda resolução com outra semente mediria a sombra de um
 * card que não está lá.
 */
export function resolveRiver(): RiverLayout {
  if (resolved !== null) return resolved;
  const settings = sceneSettings();
  const width = typeof window === "undefined" ? 1440 : window.innerWidth;
  resolved = riverLayout(
    settings.river ?? riverCapacity(width),
    settings.span ?? CARD_SPAN,
  );
  return resolved;
}

/**
 * O card cuja esteira a sonda mede por padrão, e o progresso em que ela mede.
 *
 * **Card 3 a 0.523, e as duas escolhas são geométricas.**
 *
 * A primeira é a estação. Com sete cards e cinco estações, a corrente usa a
 * sequência `0 1 2 3 4 0 1` — e as estações 3 e 4 aparecem **uma vez só**. A
 * coluna de escoamento do card 3 é uma das duas que nenhum outro card divide,
 * em nenhuma distância: a sombra dele a jusante é água limpa por construção, e
 * não por folga calculada.
 *
 * A segunda é o plano de reciclagem. Corpos renascem em `uCameraZ − 64` e são
 * reciclados em `uCameraZ + 2`, então a laje de quatro larguras a jusante só tem
 * população se o card estiver pelo menos `4·W + 0.25·W ≈ 16` unidades **à
 * frente** da câmera. O card 3 está em `z = −68.5`; a 0.523 a câmera está em
 * `−49.5` e a reciclagem em `−47.5`, com as três lajes (−64.7, −60.9, −53.3)
 * todas a montante dela, a mais próxima com 5.8 unidades de folga.
 *
 * As duas primeiras tentativas foram o card 5 a 0.63 — laje mais distante a 1.4
 * unidade da lente, dentro do trecho em que a população já está sendo reciclada,
 * e por isso a razão mais barulhenta das três (1.09 numa rodada, 1.58 na
 * seguinte) — e o card 4, cuja esteira **não fecha** e cujo motivo está em
 * `CARD_STATIONS`.
 */
export const WAKE_CARD_INDEX = 3;
export const WAKE_CARD_PROGRESS = 0.523;

/**
 * Conferência das duas garantias geométricas do módulo, em unidades de mundo.
 *
 * Não é um teste — não há suíte neste repositório — é o cálculo que a sonda
 * imprime junto com os números, para quem ler o relatório ver de onde a margem
 * saiu em vez de acreditar no docblock.
 */
export function riverClearance(layout: RiverLayout) {
  const recurrence = CARD_STATIONS.length * layout.spacing;
  const farthestSlab = 4 * CARD_WIDTH + 0.25 * CARD_WIDTH;
  const approach = 1.5 * CARD_HEIGHT;
  return {
    spacing: layout.spacing,
    minSpacing: CARD_MIN_SPACING,
    spacingOk: layout.spacing >= CARD_MIN_SPACING,
    /** Quantas unidades separam dois cards da mesma coluna de escoamento. */
    stationRecurrence: recurrence,
    /** Água limpa entre a laje mais distante e o card seguinte da coluna. */
    wakeClearance: recurrence - farthestSlab - approach,
    /** O card mais alto ainda dentro do tubo do bando? */
    insideTube:
      Math.max(...CARD_STATIONS.map(([, y]) => Math.abs(y))) +
        CARD_HALF_HEIGHT <=
        FLOCK_TUBE_HEIGHT &&
      Math.max(...CARD_STATIONS.map(([x]) => Math.abs(x))) + CARD_HALF_WIDTH <=
        FLOCK_TUBE_WIDE,
  };
}
