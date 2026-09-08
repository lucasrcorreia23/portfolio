import { SPECIMEN_CAP_HEIGHT, SPECIMEN_SIZE, SPECIMEN_Z } from "./world";

/**
 * `TypeArticle` — o dono do corpo de prova.
 *
 * DIRECTION.md §5: "Um módulo único é dono de **arquivo de fonte, string,
 * corpo, tracking, âncora e transform** da peça. Nada mais no projeto escreve
 * esses valores." Este é ele — e desde o descolamento ele é também o dono da
 * **geometria do campo de distância** (`TYPE_FIELD`), assado do mesmo mesh em
 * `lib/scene/type-field.ts`. O poster de movimento reduzido e a OG image saem
 * daqui depois, pelo mesmo motivo: o quadro congelado tem que ser exatamente o
 * quadro do site.
 *
 * ## O arquivo de fonte, e as duas descobertas que o escolheram
 *
 * O DOM usa o Archivo variável do `next/font` em `wdth: 125` (a classe
 * `.type-display`). O troika **não pode usar o mesmo arquivo**, por dois
 * motivos independentes, os dois verificados na fonte da biblioteca:
 *
 * 1. **`.woff2` não é suportado.** O parser lança `'woff2 fonts not supported'`
 *    ao ver a assinatura `wOF2`. Só `.ttf`, `.otf` e `.woff` v1 entram.
 * 2. **Eixos de fonte variável não são aplicados.** O `fontWeight` do troika só
 *    escolhe a fonte de fallback para caracteres fora do arquivo; não há
 *    caminho para pedir `wdth: 125`. O arquivo variável renderizaria na
 *    instância padrão, ou seja em largura normal — e o papel display do
 *    PROJECT.md §3.2 *é* o Expanded.
 *
 * Então a peça usa uma **instância estática** do Archivo Expanded em ExtraBold,
 * que é o peso 800 de `--text-display-1--font-weight`. Mesmo desenho, mesmo
 * autor, mesma licença (OFL-1.1) — um segundo formato do mesmo tipo, não uma
 * segunda tipografia. A regra do PROJECT.md §3.2 ("nenhuma terceira família")
 * continua inteira.
 */
export const TYPE_ARTICLE = {
  /** Servido de `public/`, porque o troika precisa de uma URL, não de um import. */
  font: "/fonts/ArchivoExpanded-ExtraBold.ttf",

  /** Corpo em unidades de mundo. Resolvido em `world.ts` contra a regra dos 80%. */
  size: SPECIMEN_SIZE,

  /** Altura de caixa alta. O assado do SDF do 3b se amarra a ela, não à viewport. */
  capHeight: SPECIMEN_CAP_HEIGHT,

  /**
   * O mesmo `-0.035em` de `--text-display-1--letter-spacing`. O troika mede
   * tracking em em, igual ao CSS, então o número atravessa sem conversão.
   */
  letterSpacing: -0.035,

  /** Ancorada no centro nos dois eixos: a peça está montada no meio da câmara. */
  anchorX: "center",
  anchorY: "middle",

  /** Onde ela está montada. */
  position: [0, 0, SPECIMEN_Z] as const,

  /**
   * Resolução do atlas de SDF por glifo, do troika.
   *
   * O padrão é 64, e para um título ocupando 84% da viewport isso amolece as
   * quinas — que é justamente o que uma peça de ensaio não pode ter. 128
   * quadruplica a memória de atlas por glifo, e são sete glifos.
   *
   * Nada a ver com o assado do `TYPE_FIELD` abaixo: aquele é um campo de
   * distância do mesh inteiro, para o escoamento amostrar.
   */
  sdfGlyphSize: 128,
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
  /** Lados da textura do campo. 4:1, a razão do bloco de sete letras. */
  width: 1024,
  height: 256,

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

/**
 * A string vem do dicionário (`identity.specimen`), não daqui: ela é conteúdo e
 * é traduzível. O que este módulo garante é que ela seja **desenhada** do mesmo
 * jeito em todo lugar — e que chegue em caixa alta, como a classe
 * `.type-display` faz no DOM.
 */
export function specimenText(raw: string): string {
  return raw.toLocaleUpperCase("pt-BR");
}
