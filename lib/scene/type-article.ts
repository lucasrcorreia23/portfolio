import {
  MONOGRAM_VARIANT,
  SPECIMEN_BEVEL,
  SPECIMEN_CAP_HEIGHT,
  SPECIMEN_DEPTH,
  SPECIMEN_SIZE,
  SPECIMEN_Z,
} from "./world";

/**
 * `TypeArticle` — o dono do corpo de prova.
 *
 * DIRECTION.md §5: "Um módulo único é dono de **arquivo de fonte, string,
 * corpo, tracking, âncora e transform** da peça. Nada mais no projeto escreve
 * esses valores." Este é ele — e desde o descolamento ele é também o dono da
 * **geometria do campo de distância** (`TYPE_FIELD`), assado do mesmo mesh em
 * `lib/scene/type-field.ts`.
 *
 * ## Rodada 17: a peça é a assinatura LRC
 *
 * Até a rodada 16 a peça era a palavra CORREIA, desenhada pelo troika em
 * espessura zero. Agora é o monograma LRC (decisão do Lucas, 2026-09-30),
 * **extrudado de leve** e com chanfro: o contorno vem do mesmo
 * `ArchivoExpanded-ExtraBold.ttf` (extraído por `scripts/monogram.mjs` para
 * `monogram-data.ts`) e vira `ExtrudeGeometry` em `Specimen.tsx`. Mesma família,
 * mesmo peso; a regra do PROJECT.md §3.2 continua inteira. O troika saiu da
 * peça — o `<h1>` do DOM continua sendo o texto acessível.
 */
export const TYPE_ARTICLE = {
  /** A composição do monograma (`plinth` ou `tight`). */
  variant: MONOGRAM_VARIANT,

  /** Corpo em unidades de mundo por em. Resolvido em `world.ts` contra a regra dos 80%. */
  size: SPECIMEN_SIZE,

  /** Altura de caixa alta. O assado do SDF do 3b se amarra a ela, não à viewport. */
  capHeight: SPECIMEN_CAP_HEIGHT,

  /** A extrusão e o chanfro, em unidades de mundo. */
  depth: SPECIMEN_DEPTH,
  bevel: SPECIMEN_BEVEL,

  /** Onde ela está montada. O monograma é centrado no próprio traço. */
  position: [0, 0, SPECIMEN_Z] as const,
} as const;

/**
 * A geometria do assado — DIRECTION.md §5, "Uma fonte de verdade só, e os dois
 * finos".
 *
 * **Resolução amarrada à caixa alta, nunca à viewport**, para o campo não
 * depender de onde a câmera está: são ~114 texels por `capHeight`. O que fixa
 * o número não é gosto, é o envelope de raspagem do documento
 * (`d = 0.015 · H`): a 114 texels/H ele tem 1.7 texels de largura, e é por isso
 * que a semente do jump flood guarda a posição **sub-texel** da fronteira. Sem
 * ela o erro de quantização seria ±0.5 texel — 30% do envelope — e os corpos
 * raspariam a letra a uma distância inventada pelo assado.
 *
 * **A margem tem um piso, e ele é uma conta.** A força de separação decai até
 * `graze + 0.5 · H ≈ 0.51 · H` fora da silhueta, e o atrator da esteira até
 * `0.45 · H`. Se a margem fosse menor que o maior dos dois, a força seria
 * cortada na borda do retângulo em vez de morrer sozinha, e o bando ganharia um
 * degrau invisível a meia altura da peça. `0.6 · H` cobre os dois com folga.
 *
 * A altura sai da largura pela razão da textura, e não do texto: **os texels
 * precisam ser quadrados**, senão a distância medida na horizontal e na
 * vertical não são a mesma grandeza e o gradiente aponta para o lado errado nas
 * diagonais. Sobra margem vertical, que é barata — a peça é larga e baixa.
 */
export const TYPE_FIELD = {
  /**
   * Lados da textura do campo. 2:1 desde a rodada 17: o monograma tem ~2.1:1
   * de traço, e com a margem a caixa fica perto de 1.6:1. Era 4:1 para as
   * sete letras de CORREIA.
   */
  width: 1024,
  height: 512,

  /** Folga em volta da silhueta, em unidades de caixa alta. Ver acima. */
  margin: 0.6,

  /**
   * O enclausuramento roda em quarto de resolução: contra-forma é feição larga
   * (o olho da letra tem ~0.3 · H), e 16 raios × 40 passos em 1024×256 seriam
   * 168 milhões de amostras para descrever uma coisa que 256×64 já descreve.
   */
  enclosureScale: 4,

  /**
   * Alcance dos raios, em caixas altas. Longo de propósito: abaixo de ~2 · H o
   * vão entre duas letras e a borda de cima da peça medem a mesma coisa, e a
   * turbulência acenderia na aresta de ataque — que é justamente onde o
   * escoamento tem que chegar ordenado.
   */
  enclosureReach: 2.5,

  /**
   * A janela que separa contra-forma de aresta. Medido no campo assado:
   * contra-forma ~1.0, vão entre letras ~0.55, borda externa ~0.35, longe
   * ~0.15. A janela deixa a contra-forma inteira, dá um toque no vão e zera o
   * resto.
   */
  enclosureShape: [0.5, 0.9],
} as const;
