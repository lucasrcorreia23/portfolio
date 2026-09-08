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
 * Corpo do corpo de prova, em unidades de mundo.
 *
 * Escolhido para fechar a regra dos 80% do PROJECT.md §3.2 **dentro da cena**,
 * no quadro que importa. No progresso 0.18 a câmera está a 14 unidades da
 * peça; com FOV de 45° isso dá `2 · 14 · tan(22.5°) = 11.6` de altura visível
 * e, a 16:10, `18.6` de largura. A peça tem sete caracteres com avanço de
 * ~0.80 em no Archivo Expanded, ou seja `7 × 0.80 × corpo` de largura. Para
 * ocupar 0.84 dessa largura:
 *
 *   corpo = 0.84 × 18.6 ÷ (7 × 0.80) ≈ 2.79
 *
 * O mesmo 0.84 do `--display-fill` em `styles/tokens.css`, e pela mesma razão:
 * quatro pontos de folga sobre o mínimo de 80%.
 */
export const SPECIMEN_SIZE = 2.79;

/** Altura de caixa alta da peça. O SDF fino do 3b se mede contra ela. */
export const SPECIMEN_CAP_HEIGHT = SPECIMEN_SIZE * 0.72;

/**
 * Meia-extensão da peça no plano dela, para o desvio de campo distante do
 * bando. Sete caracteres com avanço de ~0.80 em.
 *
 * É uma **estimativa**, e ela basta para o que usa: o escoamento a essa
 * distância sente um bloco, não uma letra. A silhueta de verdade chega no 3b,
 * assada do próprio mesh. Medir aqui a caixa real do troika só poderia ser
 * feito depois do `sync()`, e amarraria a simulação ao ciclo de carregamento da
 * fonte por nenhum ganho visível.
 */
export const SPECIMEN_HALF_WIDTH = (7 * 0.8 * SPECIMEN_SIZE) / 2;
export const SPECIMEN_HALF_HEIGHT = SPECIMEN_CAP_HEIGHT / 2;

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
 * Meia-altura, constante. É o 0.72 que o anel de nascimento sempre teve, agora
 * escrito como medida em vez de como fator.
 */
export const FLOCK_TUBE_HEIGHT = FLOCK_TUBE_NARROW * 0.72;
