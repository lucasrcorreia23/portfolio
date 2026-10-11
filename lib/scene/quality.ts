import { sceneSettings } from "./settings";

/**
 * O nível de qualidade da cena. Fora do React: a cena o lê por quadro.
 *
 * As contagens são frações do que as geometrias alocam, então trocar de nível
 * é escrever `instanceCount`, sem recriar nada.
 */
export type QualityTier = "high" | "medium" | "low";

export type Quality = {
  tier: QualityTier;
  /** Teto de DPR do canvas. */
  dpr: number;
  /** Fração das instâncias de relva, de flores e de esporos. */
  grass: number;
  flowers: number;
  spores: number;
  /** Fração das partículas de estado (esporos e pólen juntos) que são desenhadas. */
  pollen: number;
  dof: boolean;
  /** O vidro das placas, a paralaxe de altura da chapa e a porta que se move. */
  glass: boolean;
  parallax: boolean;
  door: boolean;
  /** O rastro que a câmera e o ponteiro deixam na vegetação. */
  wake: boolean;
};

export const QUALITY: Readonly<Record<QualityTier, Quality>> = {
  high: { tier: "high", dpr: 2, grass: 1, flowers: 1, spores: 1, pollen: 1, dof: true, glass: true, parallax: true, door: true, wake: true },
  medium: { tier: "medium", dpr: 1.5, grass: 0.24, flowers: 0.5, spores: 0.75, pollen: 0.25, dof: true, glass: true, parallax: true, door: true, wake: true },
  low: { tier: "low", dpr: 1, grass: 0.28, flowers: 0.55, spores: 0.4, pollen: 0.0625, dof: false, glass: false, parallax: false, door: false, wake: false },
};

/** O que as geometrias alocam: é a contagem do nível alto. */
export const GRASS_MAX = 128_000;
/** Os esporos soltos no ar: os primeiros da textura de estado. */
export const SPORES_MAX = 2400;
/** Todas as partículas de estado: uma textura de 256 × 256. O resto é pólen. */
export const POLLEN_MAX = 65_536;

/**
 * Onde a cena nasce. Num computador ela já começa no nível alto, e a medição
 * só a derruba: subir depois dobraria as plantas no meio do Impacto, à vista.
 * Em tela pequena ou máquina de poucos núcleos ela nasce no médio.
 */
function initialTier(): QualityTier {
  if (typeof window === "undefined") return "medium";
  const forced = sceneSettings().tier;
  if (forced !== null) return forced;
  const compact = window.matchMedia("(max-width: 767px)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  return !compact && cores >= 8 ? "high" : "medium";
}

let current: Quality = QUALITY[initialTier()];
const listeners = new Set<(quality: Quality) => void>();

export function getQuality(): Quality {
  return current;
}

export function setQuality(tier: QualityTier): void {
  if (current.tier === tier) return;
  current = QUALITY[tier];
  for (const listener of listeners) listener(current);
}

/** A mediana de quadro da última janela medida, em ms; 0 antes da primeira. */
let frameMs = 0;

export function getFrameMs(): number {
  return frameMs;
}

export function setFrameMs(ms: number): void {
  frameMs = ms;
}

export function subscribeToQuality(listener: (quality: Quality) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
