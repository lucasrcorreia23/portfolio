import { MONOGRAM, MONOGRAM_CAP } from "./monogram-data";

/**
 * As medidas da câmara. Uma unidade de mundo ≈ um metro.
 *
 * Tudo aqui é lido por mais de um componente — a névoa precisa saber onde
 * ficam as paredes, o bando precisa saber onde nasce e para onde escoa, a
 * estrutura precisa saber onde gravar as cotas, e o corpo de prova precisa
 * estar num lugar que a curva da câmera conhece. Deixar esses números
 * espalhados por cinco arquivos garantiria que um deles saísse de sincronia.
 *
 * A câmara é um duto comprido no eixo Z. A câmera entra por +Z e desce para
 * −Z; o escoamento vem de −Z e vem contra ela, que é o "o bando vem na sua
 * direção" do DIRECTION.md §4.
 */

/** Meia-largura do duto. As paredes ficam em ±X. */
export const CHAMBER_HALF_WIDTH = 12;

/** Meia-altura do duto. Piso e teto em ±Y. */
export const CHAMBER_HALF_HEIGHT = 7;

/** Onde a câmara começa (a montante, longe) e termina (a jusante, atrás). */
export const CHAMBER_FAR = -96;
export const CHAMBER_NEAR = 12;

/** O corpo de prova fica montado aqui, no meio do duto. */
export const SPECIMEN_Z = -26;

/**
 * A composição da assinatura: `plinth` (o L emoldurando R e C) ou `tight`
 * (lado a lado). Ver `scripts/monogram.mjs`.
 */
export const MONOGRAM_VARIANT = "plinth" as const;

/**
 * Corpo do corpo de prova, em unidades de mundo por em.
 *
 * Desde a rodada 17 a peça é a assinatura LRC, não a palavra CORREIA. A conta
 * é a mesma de sempre, pela largura do traço: no progresso 0.18 a câmera está
 * a 14 unidades da peça, e com FOV de 45° a 16:10 isso dá `18.6` de largura
 * visível. A palavra ocupava 0.84 dela (o `--display-fill` de
 * `styles/tokens.css`); o monograma ocupa **0.62**:
 *
 *   corpo = 0.62 × 18.6 ÷ (largura do monograma em em)
 *
 * Com o `plinth` (1.903 em de largura) isso dá ~6.1, caixa alta ~4.2 e altura
 * total ~5.4. A 0.84 a peça tinha 7.4 de altura e, vista fora do eixo no quadro
 * do descolamento, transbordava a tela pelos dois lados (`.screens/17-descida`):
 * uma marca de 2:1 não precisa da largura de uma palavra de sete letras para
 * ser a coisa mais importante do quadro.
 */
const MONOGRAM_WIDTH_EM = (MONOGRAM[MONOGRAM_VARIANT].bounds[2] - MONOGRAM[MONOGRAM_VARIANT].bounds[0]) / 1000;
const MONOGRAM_HEIGHT_EM = (MONOGRAM[MONOGRAM_VARIANT].bounds[3] - MONOGRAM[MONOGRAM_VARIANT].bounds[1]) / 1000;
export const SPECIMEN_SIZE = (0.62 * 18.6) / MONOGRAM_WIDTH_EM;

/** Altura de caixa alta da peça. O SDF fino do 3b se mede contra ela. */
export const SPECIMEN_CAP_HEIGHT = SPECIMEN_SIZE * (MONOGRAM_CAP / 1000);

/**
 * Meia-extensão da peça no plano dela, lida do contorno do monograma: é a
 * caixa do traço, não uma estimativa por avanço de letra como era com o troika.
 */
export const SPECIMEN_HALF_WIDTH = (MONOGRAM_WIDTH_EM * SPECIMEN_SIZE) / 2;
export const SPECIMEN_HALF_HEIGHT = (MONOGRAM_HEIGHT_EM * SPECIMEN_SIZE) / 2;

/**
 * A espessura da peça (rodada 17, decisão do Lucas de 2026-09-30): a
 * assinatura é extrudada **de leve**, com chanfro. O campo de descolamento
 * continua fino (DIRECTION.md §5, "os dois finos"): a banda do sólido cobre a
 * profundidade da extrusão, e nada mais.
 */
export const SPECIMEN_DEPTH = 0.15 * SPECIMEN_CAP_HEIGHT;
export const SPECIMEN_BEVEL = 0.03 * SPECIMEN_CAP_HEIGHT;

/** Campo de visão vertical da câmera, em graus. Entra na conta acima. */
export const CAMERA_FOV = 45;

/** Onde o bando nasce, a montante da peça. */
export const FLOCK_SPAWN_Z = -78;

/** Onde ele é reciclado, depois de passar pela lente. */
export const FLOCK_RECYCLE_Z = 14;

/**
 * O tubo do bando é uma **elipse que abre com a descida**, não um cilindro.
 *
 * Ele começa estreito — 4.6 de meia-largura, menor que o duto, que é o "o bando
 * é laminar" do DIRECTION.md §5 e o "uns poucos corpos isolados" da Emergência —
 * e abre em X até cobrir o corpo de prova antes do quadro do descolamento. A
 * meia-altura não muda: o bando continua mais baixo que o duto, e é isso que o
 * faz ler como uma corrente e não como um preenchimento.
 *
 * **O motivo é uma medição, não um gosto.** Com o tubo cilíndrico de 4.6 contra
 * uma peça de meia-largura 7.97, os corpos que cruzavam o plano por quinto do
 * título eram `[0, 96, 308, 114, 0]`: o C e o A não recebiam **um único corpo**,
 * em nenhum quadro. As letras das pontas eram cenário.
 *
 * O preço está medido junto: a área da seção quase dobra (47.8 → 89.4
 * unidades²), então a densidade no plano cai quase pela metade com a mesma
 * população. É uma corrente mais fina cobrindo a peça inteira, em vez de uma
 * mais densa cobrindo o meio dela.
 */
export const FLOCK_TUBE_NARROW = 4.6;

/**
 * Meia-largura aberta. A peça tem 7.97 de meia-largura (sete letras de avanço
 * 0.8 em num corpo de 2.79); 8.6 cobre ela mais a margem em que a força de
 * separação ainda age.
 */
export const FLOCK_TUBE_WIDE = 8.6;

/**
 * Meia-altura de cruzeiro. É o 0.72 que o anel de nascimento sempre teve, agora
 * escrito como medida em vez de como fator.
 */
export const FLOCK_TUBE_HEIGHT = FLOCK_TUBE_NARROW * 0.72;

/**
 * Meia-altura durante o poleiro de Quem sou — e só ali.
 *
 * O tubo abre em X na Identidade e **não** abria em Y, porque um tubo que
 * crescesse nos dois eixos viraria preenchimento de câmara e o bando deixaria
 * de ler como corrente. Em Quem sou a exigência é outra: o DIRECTION.md §4 pede
 * um **poleiro colunar**, e coluna é uma coisa mais alta que larga. Com a
 * meia-altura de cruzeiro (3.31) e o raio do poleiro (1.7), a pilha media 6.6
 * de altura por ~5 de largura — quadrada, ou seja um aglomerado, não uma coluna.
 *
 * 6.0 contra um duto de 7 de meia-altura deixa a coluna com 12 de altura por ~4
 * de largura (3:1) e ainda uma unidade de folga até o teto, para ela não
 * encostar na parede e virar parte do cenário. Ela abre e fecha junto com o
 * poleiro (`roostAmount`), então fora deste beat o tubo é o de sempre.
 */
export const FLOCK_TUBE_TALL = 6;

/* ---------------------------------------------------------------------------
 * O poleiro de Quem sou
 *
 * Estes seis números são lidos por **três** simulações que precisam concordar:
 * o shader dos boids (`shaders/boids.ts`), o proxy da CPU (`proxy-sim.ts`) e a
 * leitura de densidade que vai para a HUD (`SceneWorld`). Uma cópia em cada um
 * é a garantia de que um dia dois deles descrevam colunas diferentes — e o
 * sintoma seria a luz apontando para um lugar onde o bando não está.
 * ------------------------------------------------------------------------ */

/**
 * Raio da coluna, em unidades de mundo — e ela é uma **casca**, não um poço.
 *
 * A primeira versão puxava para o eixo, e o resultado medido foi um caroço: com
 * 16.384 corpos, a pressão de separação equilibra o puxão só depois de a pilha
 * virar uma bola de ~5 de raio, que na tela é um borrão redondo de 30% da
 * largura. Não é coluna, e a densidade dentro dela acende `--rose` na tela
 * inteira — o oposto de "rose é evento".
 *
 * Puxando para um **raio**, e não para o centro, os corpos se organizam numa
 * casca cilíndrica: a mesma população se espalha por uma superfície em vez de
 * encher um volume, o limbo fica mais denso que o miolo (é o que dá a leitura de
 * cilindro) e a rotação lenta passa a ser visível, porque o que gira tem borda.
 */
export const ROOST_RADIUS = 2.6;
/** Alcance da captura: fora daqui o corpo continua escoando pelo duto. */
export const ROOST_CAPTURE = 8;
/** Janela em Z: captura cheia até `IN`, nenhuma além de `OUT`. */
export const ROOST_Z_IN = 9;
export const ROOST_Z_OUT = 24;
/**
 * Aceleração radial de captura, e a tangencial que faz a rotação lenta.
 *
 * **Seis, e a primeira tentativa foi 2.5.** O número não é de gosto, é de
 * relógio: com o arrasto que os corpos já têm, 2.5 dá uma velocidade de captura
 * terminal de ~2.8 u/s, e um corpo na borda do tubo está a dez unidades do eixo
 * da coluna — três segundos e meio para chegar. O beat inteiro dura 3.6 s a
 * 1 vh/s. Medido na descida real (`__probe.descend`), o poleiro simplesmente
 * **não existia**: o que se via em 0.36 era o bando da Identidade ainda
 * escoando, agora atravessado na frente da coluna de texto.
 *
 * A 6.0 a captura terminal fica em ~6.7 u/s e as mesmas dez unidades levam 1.5 s
 * — o poleiro está formado antes do meio do beat, que é onde a leitura começa.
 */
export const ROOST_PULL = 6;
export const ROOST_SPIN = 1;
/**
 * Quanto do escoamento axial o poleiro segura, 0 a 1.
 *
 * **Não é 1, e isso é o beat.** Segurando tudo, o poleiro acumula o bando
 * inteiro — todo corpo que entra na janela fica, e em poucos segundos a coluna
 * é a população toda. Com 0.65 os corpos desaceleram para um terço da
 * velocidade de cruzeiro, giram algumas voltas e seguem: a coluna tem
 * população de regime, alimentada por quem chega e esvaziada por quem sai. É o
 * "planeio longo" do DIRECTION.md §4, e é o que mantém a densidade estável em
 * vez de crescente.
 */
export const ROOST_HOLD = 0.92;
/**
 * Até onde o eixo da coluna pode ir para o lado, em X.
 *
 * O poleiro fica **contra a parede graduada**, então ele sai do tubo do bando
 * (meia-largura 8.6) de propósito — a contenção do tubo cede enquanto ele age.
 * O que não pode é a coluna atravessar o concreto: 8.8 mais o raio de 2.6
 * deixam 0.6 unidade entre a casca e a parede em 12.
 */
export const ROOST_X_MAX = 8.8;
