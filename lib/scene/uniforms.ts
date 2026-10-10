import { Color, Vector2, Vector4, type Texture } from "three";
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
export const MAX_EMITTERS = 12;

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
    /** Ganho geral da emissão, 0 a 1: sobe na revelação do Impacto. */
    glow: { value: 1 },

    /** Os painéis dos cases: xyz do centro em mundo, w = giro em torno de Y. */
    panels: { value: Array.from({ length: STOP_COUNT }, () => new Vector4()) },
    panelCount: { value: 0 },

    /** As caixas de texto do DOM, em UV de tela, e se cada uma existe. */
    veilBox: {
      value: Array.from({ length: MAX_VEIL_BOXES }, () => new Vector4()),
    },
    veilF: { value: Array.from({ length: MAX_VEIL_BOXES }, () => 0) },

    /** Quanto a cena recuou para virar fundo de leitura de um case, 0 a 1. */
    caseRecess: { value: 0 },
  };
}

/** O mapa que `FOG_UNIFORMS_GLSL` espera. */
export function fogUniforms(shared: SharedUniforms) {
  return {
    uVoid: shared.void,
    uAbyss: shared.abyss,
    uDeep: shared.deep,
    uCyan: shared.cyan,
    uFogDensity: shared.fogDensity,
    uTime: shared.time,
    uEmitters: shared.emitters,
    uGlow: shared.glow,
  };
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
