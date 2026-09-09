/**
 * O corpo do card e onde a capa e a placa de cota ficam **dentro** dele.
 *
 * Este módulo existe porque três coisas precisam concordar sobre a mesma
 * geometria e uma delas é GLSL:
 *
 * - o material dos cards (`shaders/cards.ts`), que recorta as duas regiões em
 *   UV e amostra a camada certa;
 * - o construtor das texturas (`card-atlas.ts`), que precisa desenhar numa
 *   camada com **a mesma razão** da região onde ela vai pousar, senão os
 *   glifos da placa saem esticados;
 * - a medição, que projeta a placa para conferir se o texto entregue é legível.
 *
 * As razões são **derivadas** do corpo do card e das frações de UV, nunca
 * digitadas: mexer no corpo do card ou na altura da placa move a resolução da
 * camada sozinho. É a mesma disciplina de `world.ts` e de `beats.ts` — número em
 * três arquivos é número que um dia diverge.
 *
 * ## Por que ele não importa nada, e por que isso importa
 *
 * Um quarto consumidor entrou: a **página do case**, que dimensiona a capa em
 * DOM com `CARD_COVER_ASPECT` para o card poder casar com ela no fim do voo
 * (ver `app/[locale]/(scene)/work/[slug]/page.tsx`). Uma razão de aspecto
 * digitada de novo lá seria a segunda fonte de verdade que este arquivo existe
 * para não ter — e a costura apareceria como alguns pixels de desencontro na
 * entrega, que é justamente o que a medição M3 procura.
 *
 * Por isso o corpo do card mora **aqui** e não em `cards.ts`: aquele módulo
 * importa `settings.ts`, que tem estado de módulo e lê `window.location`, e
 * arrastá-lo para a rota inicial por causa de uma constante seria pagar um
 * import de cena para desenhar um retângulo. `cards.ts` reexporta o que sempre
 * exportou, então nenhum consumidor antigo mudou de linha.
 */

/**
 * Corpo do card, em unidades de mundo. Razão 16:10, a das capas.
 *
 * **3.8 não é gosto: é o maior corpo que fecha a conta da esteira.** O critério
 * de aceite mede a densidade na sombra da tinta a uma, duas e **quatro larguras
 * de card** a jusante, e para esse número significar "a esteira deste card" a
 * coluna precisa estar livre de outros cards ao longo dessas quatro larguras.
 * A conta, com a corrente de estações de `cards.ts`:
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
 * A escala do rio acontece na passagem: a 5 unidades o mesmo card ocupa 57%, e
 * no fim do voo até o case ele ocupa a capa inteira.
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
 * A quina da peça, em fração do card. **Não é uma moldura**: é o chanfro que
 * pega luz de raspão, e o material o desenha como gradiente de borda, não como
 * retângulo. Ver o docblock de `BEZEL` original em `shaders/cards.ts`.
 */
export const CARD_BEZEL = 0.025;

/**
 * Onde a capa começa em `v` — ou seja, a altura da placa de cota.
 *
 * **Era 0.11, e subiu para 0.20 quando a placa passou a carregar texto.** Com
 * 11% a faixa tinha 0.26 unidade de mundo de altura: à distância de leitura
 * isso são 30 px de tela, e três informações (cliente, título, ano) não cabem
 * ali sem virar borrão. Com 20% a placa tem 0.475 unidade — 48 px à distância
 * de leitura e 74 px na aproximação, que é onde o prompt pede que ela "ganhe
 * detalhe".
 *
 * O teto é a capa: acima de ~0.25 o retângulo deixa de ler como peça com placa
 * e passa a ler como duas faixas empilhadas, que é o "televisor" que a versão
 * anterior deste arquivo já tinha descartado por olhar o quadro.
 */
export const CARD_PLATE_TOP = 0.2;

/** A região da capa, em UV do card: `[x0, y0, x1, y1]`. */
export const CARD_COVER_UV = [
  CARD_BEZEL,
  CARD_PLATE_TOP,
  1 - CARD_BEZEL,
  1 - CARD_BEZEL,
] as const;

/** A região da placa de cota, em UV do card. */
export const CARD_PLATE_UV = [
  CARD_BEZEL,
  CARD_BEZEL,
  1 - CARD_BEZEL,
  CARD_PLATE_TOP,
] as const;

const uvAspect = (uv: readonly [number, number, number, number]) =>
  ((uv[2] - uv[0]) * CARD_WIDTH) / ((uv[3] - uv[1]) * CARD_HEIGHT);

/** Razão largura/altura da região da capa, em mundo. ~1.96. */
export const CARD_COVER_ASPECT = uvAspect(CARD_COVER_UV);

/** Idem para a placa. ~8.7 — uma faixa, e é por isso que ela é uma cota. */
export const CARD_PLATE_ASPECT = uvAspect(CARD_PLATE_UV);

/**
 * Resolução de uma camada de capa.
 *
 * **640, e a conta é o pixel entregue.** A largura projetada do card mais
 * próximo, medida no quadro composto a 2160×1254, é **682 px**
 * (MEASUREMENTS.md, "Os cards leem como camadas em profundidade"). A região da
 * capa é 95% disso, ou seja ~648 px: 640 é praticamente 1:1 no card em que a
 * nitidez importa, e o card mais distante entrega 175 px — 3.7× de minificação,
 * que a profundidade de campo do beat já borra mais do que isso.
 *
 * Sete camadas de 640×326 são 5.7 MB de VRAM. É textura, não pacote: nada disso
 * entra na conta do chunk da cena.
 */
export const COVER_LAYER_WIDTH = 640;
export const COVER_LAYER_HEIGHT = Math.round(
  COVER_LAYER_WIDTH / CARD_COVER_ASPECT,
);

/**
 * Resolução de uma camada de placa.
 *
 * Mais larga que a da capa de propósito: a placa é uma faixa de 8.7:1 com texto
 * mono pequeno, e o que ela precisa é de resolução **horizontal** — 1024 px
 * para 3.61 unidades de mundo dão 284 px por unidade, contra 177 da capa.
 */
export const PLATE_LAYER_WIDTH = 1024;
export const PLATE_LAYER_HEIGHT = Math.round(
  PLATE_LAYER_WIDTH / CARD_PLATE_ASPECT,
);

/**
 * A janela de aproximação da placa, em unidades de mundo de profundidade.
 *
 * O prompt pede que o card "ao aproximar, ganhe detalhe". Isso é uma rampa em
 * `vViewDepth`, e os dois números saem das distâncias medidas do corredor
 * (MEASUREMENTS.md, mesma tabela): os sete cards ficam entre **8.2 e 36.4
 * unidades** da câmera no meio da travessia.
 *
 * - Além de `PLATE_FAR` a placa é só gravação: aparece quando um cacho do bando
 *   raspa nela e desaparece depois, como as cotas das paredes. 24 unidades põem
 *   esse regime nos quatro cards mais distantes.
 * - Dentro de `PLATE_NEAR` o nível de detalhe está inteiro. 9 unidades é pouco
 *   mais que a distância do card mais próximo (8.2), então o detalhe pertence a
 *   **um** card por vez — o que a câmera está passando.
 */
export const CARD_PLATE_FAR = 24;
export const CARD_PLATE_NEAR = 9;
