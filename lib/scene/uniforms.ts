import { Color, Vector2, Vector3, Vector4, type Texture } from "three";
import { readPalette, type Palette } from "@/lib/palette";
import { STOP_COUNT } from "./stops";
import { MAX_VEIL_BOXES } from "./veil";

/**
 * Os uniforms que mais de um material vê, e que precisam ser **o mesmo
 * objeto** em todos: o three lê `uniform.value` na hora de desenhar, então
 * escrever uma vez atualiza o terreno, a flora, a indústria e os esporos.
 *
 * As cores saem de `readPalette()` (os custom properties de `tokens.css`):
 * nenhum hexadecimal em TypeScript.
 */

/** Quantos aglomerados de flora iluminam a cena. Tamanho de array no GLSL. */
export const MAX_EMITTERS = 13;

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;

export function createSharedUniforms(palette: Palette = readPalette()) {
  return {
    time: { value: 0 },
    resolution: { value: new Vector2(1, 1) },

    void: { value: new Color(palette.void) },
    abyss: { value: new Color(palette.abyss) },
    deep: { value: new Color(palette.deep) },
    teal: { value: new Color(palette.teal) },
    cyan: { value: new Color(palette.cyan) },
    rose: { value: new Color(palette.rose) },
    mist: { value: new Color(palette.mist) },

    exposure: { value: 1.15 },
    /** Densidade da névoa. Fechada no começo do Impacto, abrindo com ele. */
    fogDensity: { value: 0.09 },

    /**
     * Os aglomerados de flora: xyz em mundo, w = força. A flora é a única luz
     * da cena, e é isto que o terreno, a relva, a indústria e a névoa leem.
     */
    emitters: {
      value: Array.from({ length: MAX_EMITTERS }, () => new Vector4()),
    },
    /** Quanto de cada mancha é rosa, 0 a 1: é a cor da luz dela. */
    emitterWarm: { value: Array.from({ length: MAX_EMITTERS }, () => 0) },
    /** O clarão das descargas elétricas no ar, 0 a 1. */
    flash: { value: 0 },
    /** Há uma rajada de descargas agora, 0 ou 1. */
    storm: { value: 0 },
    /** Ganho geral da emissão, 0 a 1: sobe na revelação do Impacto. */
    glow: { value: 1 },
    /** Quanto o ar do fim da trilha já abriu, 0 a 1: a claridade do horizonte. */
    astro: { value: 0 },
    /** Para onde o planeta fica no céu, em mundo. Depende da proporção da tela. */
    astroDir: { value: new Vector3(0, 0, -1) },
    /** O planeta: x = quanto a névoa o deixa ver, 0 a 1; y = o raio, em radianos. */
    planet: { value: new Vector2(0, 0.15) },
    /**
     * O segredo do CTA, 0 a 1: a mancha escondida brota e um segundo planeta,
     * pequeno e distante, aparece no alto. Ver `bloomPatch` em `world.ts`.
     */
    bloom: { value: 0 },
    /** Para onde o planeta pequeno fica no céu. */
    moonDir: { value: new Vector3(0, 0.3, -1).normalize() },

    /** Os painéis dos cases: xyz do centro em mundo, w = giro em torno de Y. */
    panels: { value: Array.from({ length: STOP_COUNT }, () => new Vector4()) },
    panelCount: { value: 0 },

    /**
     * O retângulo do painel mais próximo na tela, em UV, ou zerado: os esporos
     * nunca passam na frente dele.
     */
    panelRect: { value: new Vector4() },

    /** As caixas de texto do DOM, em UV de tela, e se cada uma existe. */
    veilBox: {
      value: Array.from({ length: MAX_VEIL_BOXES }, () => new Vector4()),
    },
    veilF: { value: Array.from({ length: MAX_VEIL_BOXES }, () => 0) },

    /** Quanto a porta de enrolar de cada parada está aberta, 0 a 1. */
    doors: { value: Array.from({ length: STOP_COUNT }, () => 1) },

    /** Quanto a câmera está diante da parede da vitrine, 0 a 1: as telas acendem. */
    fork: { value: 0 },

    /** Quanto a cena recuou para virar fundo de leitura de um case, 0 a 1. */
    caseRecess: { value: 0 },

    /**
     * A velocidade da câmera em mundo, em metros por segundo: o ar que ela
     * arrasta. Zero no modo calmo e quando a câmera salta de um lugar a outro.
     */
    eyeVelocity: { value: new Vector3() },

    /**
     * O rastro no campo (`wake.ts`): a textura, e em `wakeOrigin` o centro
     * dela em XZ mais, em z, se o campo existe (1) ou não (0).
     */
    wake: { value: null as Texture | null },
    wakeOrigin: { value: new Vector3() },
  };
}

/** O mapa que `FOG_UNIFORMS_GLSL` espera. */
export function fogUniforms(shared: SharedUniforms) {
  return {
    uVoid: shared.void,
    uAbyss: shared.abyss,
    uDeep: shared.deep,
    uCyan: shared.cyan,
    uRose: shared.rose,
    uEmitterWarm: shared.emitterWarm,
    uFlash: shared.flash,
    uFogDensity: shared.fogDensity,
    uTime: shared.time,
    uEmitters: shared.emitters,
    uGlow: shared.glow,
    uAstro: shared.astro,
    uAstroDir: shared.astroDir,
  };
}

/** O mapa que `WAKE_GLSL` espera. */
export function wakeUniforms(shared: SharedUniforms) {
  return { uWake: shared.wake, uWakeOrigin: shared.wakeOrigin };
}

/** As caixas do véu, para o compositor e para os esporos. */
export function veilUniforms(shared: SharedUniforms) {
  return {
    uVeilBox: shared.veilBox,
    uVeilF: shared.veilF,
    uVeilSolved: { value: null as Texture | null },
    uVoid: shared.void,
  };
}
