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
  dof: boolean;
};

export const QUALITY: Readonly<Record<QualityTier, Quality>> = {
  high: { tier: "high", dpr: 2, grass: 1, flowers: 1, spores: 1, dof: true },
  medium: { tier: "medium", dpr: 1.5, grass: 0.24, flowers: 0.72, spores: 0.75, dof: true },
  low: { tier: "low", dpr: 1, grass: 0.28, flowers: 0.55, spores: 0.4, dof: false },
};

/** O que as geometrias alocam: é a contagem do nível alto. */
export const GRASS_MAX = 128_000;
export const SPORES_MAX = 2400;

let current: Quality = QUALITY.medium;
const listeners = new Set<(quality: Quality) => void>();

export function getQuality(): Quality {
  return current;
}

export function setQuality(tier: QualityTier): void {
  if (current.tier === tier) return;
  current = QUALITY[tier];
  for (const listener of listeners) listener(current);
}

export function subscribeToQuality(listener: (quality: Quality) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
