/**
 * Os ajustes da cena lidos da URL, uma vez por carga.
 *
 * `dof`, `veil` e `grain` desligam uma passada cada. `at` e `stats` só existem
 * em desenvolvimento: `at` fixa o progresso e pula o loading (capturas e
 * posters), `stats` imprime tempo de quadro, draw calls e triângulos.
 */
export type SceneSettings = {
  dof: boolean;
  veil: boolean;
  grain: boolean;
  /** Progresso fixo, 0 a 1, ou null. Só em desenvolvimento. */
  at: number | null;
  /** Imprime as estatísticas de quadro no console. Só em desenvolvimento. */
  stats: boolean;
  /** Teto de DPR forçado, ou null para o do nível de qualidade. Só em dev. */
  dprCap: number | null;
};

const DEFAULTS: SceneSettings = {
  dof: true,
  veil: true,
  grain: true,
  at: null,
  stats: false,
  dprCap: null,
};

let resolved: SceneSettings | null = null;

function readFlag(params: URLSearchParams, key: string, fallback: boolean): boolean {
  const raw = params.get(key);
  if (raw === null) return fallback;
  return raw !== "0" && raw !== "off" && raw !== "false";
}

function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function sceneSettings(): SceneSettings {
  if (resolved !== null) return resolved;
  if (typeof window === "undefined") return DEFAULTS;

  const params = new URLSearchParams(window.location.search);
  const dev = process.env.NODE_ENV !== "production";
  resolved = {
    dof: readFlag(params, "dof", DEFAULTS.dof),
    veil: readFlag(params, "veil", DEFAULTS.veil),
    grain: readFlag(params, "grain", DEFAULTS.grain),
    at: dev ? readNumber(params, "at") : null,
    stats: dev && readFlag(params, "stats", false),
    dprCap: dev ? readNumber(params, "dprCap") : null,
  };
  return resolved;
}
