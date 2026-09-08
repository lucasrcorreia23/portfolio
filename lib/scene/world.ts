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

/** Raio da nuvem no nascimento. Menor que o duto: o bando é laminar. */
export const FLOCK_SPAWN_RADIUS = 4.6;
