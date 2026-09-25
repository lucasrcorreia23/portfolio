import { Color, Vector2, Vector4, type Texture } from "three";
import { readPalette, type Palette } from "@/lib/palette";
import {
  CARD_CORNER,
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
  MAX_CARDS,
} from "./cards";
import { MAX_VEIL_BOXES } from "./veil";
import { CHAMBER_FAR, SPECIMEN_Z } from "./world";

/**
 * Os uniforms que mais de um material precisa ver — e que precisam ser **o
 * mesmo objeto** em todos eles.
 *
 * O three lê `uniform.value` na hora de desenhar, então dois materiais que
 * recebem o mesmo objeto `{ value }` compartilham o valor de verdade: escrever
 * `shared.time.value = t` uma vez atualiza a névoa das paredes, dos corpos, da
 * estrutura e do corpo de prova. A alternativa — quatro cópias atualizadas num
 * laço — é a forma mais fácil de a atmosfera divergir entre os materiais no dia
 * em que alguém esquecer uma linha.
 *
 * As cores saem de `readPalette()`, que lê os custom properties de volta do
 * `<html>`. Nenhum hexadecimal em TypeScript: os uniforms dos shaders consomem
 * a mesma verdade que o Tailwind consome (`styles/tokens.css`).
 *
 * O `Color` converte de sRGB para o espaço linear de trabalho na construção,
 * que é onde toda a conta de luz e a do véu acontecem. A volta para sRGB é a
 * última linha do composite.
 */

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;

export function createSharedUniforms(palette: Palette = readPalette()) {
  return {
    time: { value: 0 },
    resolution: { value: new Vector2(1, 1) },

    // Paleta — PROJECT.md §3.1.
    void: { value: new Color(palette.void) },
    abyss: { value: new Color(palette.abyss) },
    deep: { value: new Color(palette.deep) },
    teal: { value: new Color(palette.teal) },
    cyan: { value: new Color(palette.cyan) },
    rose: { value: new Color(palette.rose) },
    coral: { value: new Color(palette.coral) },
    peach: { value: new Color(palette.peach) },
    mist: { value: new Color(palette.mist) },

    /** Densidade da névoa. Espessa na Emergência, abrindo com a descida. */
    fogDensity: { value: 0.05 },

    /**
     * Quanto o bando já se formou, 0 a 1.
     *
     * Na Emergência o DIRECTION.md §4 é literal: "Ainda não há bando: uns
     * poucos corpos isolados, suspensos, quase sem deriva." Isso é uma rampa de
     * **população**, não de velocidade — desacelerar dezesseis mil corpos ainda
     * dá dezesseis mil corpos na tela. Quem não entrou colapsa num ponto e não
     * gera fragmento nenhum.
     */
    forming: { value: 0 },

    /** Os quatro aglomerados do proxy: xyz em mundo, w = energia. */
    clusters: {
      value: [new Vector4(), new Vector4(), new Vector4(), new Vector4()],
    },

    /**
     * A fonte distante a montante. A cor viaja `--teal` → `--cyan` →
     * `--peach` com a descida (`sourceColorAt` em `curve.ts`).
     */
    sourceColor: { value: new Color(palette.teal) },
    sourceStrength: { value: 0 },
    sourceZ: { value: CHAMBER_FAR },

    /**
     * A luz de fora, 0 a 1 — a Superfície (DIRECTION.md §4). Zero pela descida
     * inteira: até 0.85 o bando é a única luz prática, e a fonte a montante é
     * um brilho fraquíssimo **dentro** da abertura. Daqui em diante a abertura
     * vira céu, a névoa perto dela esquenta para `--peach`, e a luz entra pelas
     * frestas das venezianas (ver `outsideAt` em `curve.ts`).
     */
    outside: { value: 0 },

    /**
     * As caixas de texto que o véu de legibilidade protege, em UV de tela, e a
     * força de cada uma (1 = existe). Quem as lê do DOM é `lib/scene/veil.ts`;
     * quem as usa é o compositor, por pixel.
     */
    veilBox: {
      value: Array.from({ length: MAX_VEIL_BOXES }, () => new Vector4()),
    },
    veilF: { value: Array.from({ length: MAX_VEIL_BOXES }, () => 0) },

    /** Onde a peça está montada, para a rampa de esteira dos corpos. */
    specimenZ: { value: SPECIMEN_Z },

    /**
     * Densidade do bando logo a montante da peça, 0 a 1, vinda do proxy.
     *
     * É o que liga o rim de fresnel do corpo de prova. Vive aqui, e não dentro
     * do material dele, porque quem sabe onde está a massa é o laço mestre — e
     * porque é o mesmo número que decide a altura do véu.
     */
    flockAhead: { value: 0 },
    /**
     * A mesma pergunta, contada na GPU e por coluna: quantos corpos estão entre
     * a face da peça e a câmera, ao longo da largura dela (`shaders/ahead.ts`).
     * É o que acende o rim **letra por letra**; `flockAhead` fica como leitura
     * agregada do proxy.
     */
    flockAheadField: { value: null as Texture | null },
    flockAheadReady: { value: 0 },

    /**
     * O campo de distância assado do corpo de prova, e o retângulo dele.
     *
     * Quem escreve os três é o assado, uma vez, do `onSync` do troika
     * (`lib/scene/type-field.ts`); quem lê é o passo de velocidade do bando.
     * Eles moram aqui pela mesma razão que a névoa mora: o `Specimen` e o
     * `Flock` recebem **o mesmo objeto**, então o assado não precisa de prop,
     * de contexto nem de callback para atravessar a árvore.
     *
     * `typeFieldReady` existe porque um sampler nulo não é um erro no three —
     * ele amarra uma textura vazia e a amostragem devolve zero, o que o campo
     * leria como "distância zero", ou seja **a peça inteira**. O bando pularia
     * o bloco de qualquer jeito nos primeiros quadros; o que este booleano
     * evita é o modo de falha silencioso se o assado falhar de vez.
     */
    typeField: { value: null as Texture | null },
    typeFieldRect: { value: new Vector4(0, 0, 1, 1) },
    typeFieldReady: { value: 0 },

    /**
     * A corrente de cards do rio: `xyz` é o centro em mundo e `w` é o ângulo de
     * montagem em torno de Y.
     *
     * Compartilhados pelo mesmo motivo que o campo do corpo de prova: quem
     * escreve é um só (`SceneWorld`, a partir de `lib/scene/cards.ts`), e quem
     * lê são dois — o material dos cards e o passo de velocidade do bando. Uma
     * cópia em cada um seria a garantia de que um dia a esteira se descole ao
     * lado de onde o card está desenhado.
     *
     * `cardCount` é a capacidade do aparelho, não o tamanho do array: o array é
     * `MAX_CARDS` porque uniform array é compile-time, e o laço do shader sai em
     * `cardCount`.
     */
    cards: {
      value: Array.from({ length: MAX_CARDS }, () => new Vector4()),
    },
    cardCount: { value: 0 },
    /**
     * Quanto as esteiras dos cards agem, 0 a 1 — ver `cardAmount` em
     * `lib/scene/curve.ts` para a medição que a tornou necessária.
     */
    cardAmount: { value: 0 },
    /**
     * Máscara de bits dos cards escondidos **do quadro**. Zero na cena, sempre.
     *
     * Só a sonda escreve isto. Ela esconde do render e não do escoamento: quem
     * tira um card da simulação é a própria sonda, reescrevendo `cards`. Ver
     * `probe-cards.ts` para por que as duas coisas são perguntas diferentes.
     */
    cardMask: { value: 0 },
    cardHalf: { value: new Vector2(CARD_HALF_WIDTH, CARD_HALF_HEIGHT) },
    cardCorner: { value: CARD_CORNER },

    /**
     * O card que a travessia levou até a lente, e o estado da entrega.
     *
     * **Por que isto não é um bit no `cardMask`.** A máscara já tem uma dona — a
     * sonda —, e ela a usa para uma pergunta diferente: esconder do quadro sem
     * tirar do escoamento, num regime em que a cena está parada e cada `advance()`
     * é uma medição. Um segundo escritor por quadro desfaria o que a medição
     * acabou de montar, e o sintoma seria uma pegada medida com o card de volta
     * na tela. São dois estados, então são dois uniforms.
     *
     * - `dockCard` é o índice da peça, ou −1. Ela é escondida quando o DOM assume
     *   a capa (`dockHandoff` em 1), não antes.
     * - `dockBlend` faz a capa daquele card sair da camada de 640 px do atlas e
     *   entrar na textura em resolução de entrega. Sem isso a peça chegaria à
     *   lente com a capa ampliada quase o dobro, e a troca para o `<img>` leria
     *   como um pulo de foco — um efeito acidental vestido de decisão.
     * - `dockCover` é essa textura, carregada do **`currentSrc` do próprio
     *   `<img>`**: a URL que o navegador escolheu, não a que o código pediu. É o
     *   que garante que os dois mundos desenhem os mesmos bytes e que o download
     *   seja um só.
     */
    dockCard: { value: -1 },
    dockBlend: { value: 0 },
    dockHandoff: { value: 0 },
    dockCover: { value: null as Texture | null },
    /**
     * O recorte `cover` da textura de entrega, em fração de UV.
     *
     * A camada do atlas já chega recortada — quem a desenha é um canvas 2D, com
     * enquadramento `cover` (`drawCover`, em `card-atlas.ts`). A textura de
     * entrega é o arquivo cru, então o mesmo recorte precisa acontecer na
     * amostragem, senão a capa aparece **esticada** justamente no quadro em que
     * ela vai ser comparada com um `<img>` que usa `object-fit: cover`.
     */
    dockCoverCrop: { value: new Vector2(1, 1) },
    /**
     * Quanto a cena já recuou para virar fundo de leitura, 0 a 1.
     *
     * Ele apaga a **capa das outras peças** — não a da que virou a página. O
     * motivo é medido: dentro do case a câmera para no meio do corredor, e as
     * capas vizinhas continuavam sendo fotografia de produto a plena luz atrás
     * da coluna de texto. Uma delas cruzando uma linha derrubou o contraste para
     * **3.01:1**, contra o piso de 4.5 do PROJECT.md §5.
     *
     * Isto não é trabalho do véu, e insistir nele seria pedir para ele apagar uma
     * coisa que **não precisa estar acesa**: o DIRECTION.md §4 diz que dentro do
     * case a cena é atmosfera, e um corredor de capas iluminadas é o rio ainda
     * sendo o assunto. As peças continuam montadas e continuam se vendo — como
     * substrato e chanfro na névoa, que é como o §5 descreve uma peça vista de
     * relance.
     */
    caseRecess: { value: 0 },
  };
}

/** O mapa que o material dos cards e o passo de velocidade do bando esperam. */
export function cardUniforms(shared: SharedUniforms) {
  return {
    uCards: shared.cards,
    uCardCount: shared.cardCount,
    uCardAmount: shared.cardAmount,
    uCardHalf: shared.cardHalf,
    uCardCorner: shared.cardCorner,
  };
}

/**
 * O mapa de uniforms que o chunk de névoa espera, montado a partir dos
 * compartilhados. Todo material que colar `FOG_UNIFORMS_GLSL` precisa destes
 * nomes — reunir aqui evita que o quarto material esqueça um deles e falhe na
 * compilação em produção, não em desenvolvimento.
 */
export function fogUniforms(shared: SharedUniforms) {
  return {
    uVoid: shared.void,
    uAbyss: shared.abyss,
    uDeep: shared.deep,
    uFogDensity: shared.fogDensity,
    uTime: shared.time,
    uResolution: shared.resolution,
    uPeach: shared.peach,
    uOutside: shared.outside,
  };
}

/**
 * O véu, que agora é do **compositor** e não dos materiais.
 *
 * Ele é resolvido por pixel depois do bloom e do tonemap — ver o docblock de
 * `COMPOSITE_FRAG` em `shaders/post.ts` e o de `lib/scene/veil.ts`, que contam
 * por que ele saiu do chunk de névoa.
 */
export function veilUniforms(shared: SharedUniforms) {
  return {
    uVeilBox: shared.veilBox,
    uVeilF: shared.veilF,
    // Um texel por caixa, com o `f` resolvido do campo reduzido. Quem o
    // preenche é a passada de resolução, por quadro; aqui ele só precisa
    // existir para o material declarar o sampler.
    uVeilSolved: { value: null as Texture | null },
    uVoid: shared.void,
  };
}

/** Idem, para `LIGHTS_UNIFORMS_GLSL`. */
export function lightUniforms(shared: SharedUniforms) {
  return {
    uClusters: shared.clusters,
    uSourceColor: shared.sourceColor,
    uSourceStrength: shared.sourceStrength,
    uSourceZ: shared.sourceZ,
  };
}
