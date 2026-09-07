"use client";

import type { SceneMode } from "./scene-mode";
import { useReducedMotion } from "./use-reduced-motion";
import { useWebGLSupport } from "./use-webgl-support";

/**
 * Junta as duas capacidades numa decisão só. Todo componente que muda de
 * comportamento por causa delas consulta este hook, nunca os dois separados
 * — senão cada um inventa a sua própria combinação.
 *
 * - `pending`  ainda no servidor ou no primeiro paint; nada de movimento.
 * - `driven`   a descida completa, câmera dirigida pelo progresso do scroll.
 * - `composed` movimento reduzido: uma composição fixa por beat, corte de
 *              120 ms entre elas, scroll nativo (DIRECTION.md §5).
 * - `poster`   sem WebGL: poster estático por seção, conteúdo inteiro.
 */
export function useSceneMode(): SceneMode {
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();

  if (reducedMotion === null || webgl === null) return "pending";
  if (!webgl) return "poster";
  return reducedMotion ? "composed" : "driven";
}
