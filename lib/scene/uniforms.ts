import { Color, Vector2, Vector4, type Texture } from "three";
import { readPalette, type Palette } from "@/lib/palette";
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
     * A fonte distante a montante. `--teal` no começo; a cor viaja para
     * `--cyan` e `--peach` nos beats que ainda não existem.
     */
    sourceColor: { value: new Color(palette.teal) },
    sourceStrength: { value: 0 },
    sourceZ: { value: CHAMBER_FAR },

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
