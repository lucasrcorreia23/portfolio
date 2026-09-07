"use client";

import type { SceneMode } from "@/lib/capabilities/scene-mode";
import { useSceneMode } from "@/lib/capabilities/use-scene-mode";

/**
 * Leitura de qual versão da cena está rodando. É andaime: sai da HUD quando
 * a cena existir. Enquanto isso, é o que torna `useReducedMotion` e
 * `useWebGLSupport` visíveis sem abrir o devtools.
 *
 * Recebe os rótulos já traduzidos do servidor — nenhum componente de cliente
 * deste projeto importa o next-intl.
 */
export function SceneReadout({ labels }: { labels: Record<SceneMode, string> }) {
  const mode = useSceneMode();

  return (
    <p className="type-mono text-hud-sm" data-scene-mode={mode}>
      {labels[mode]}
    </p>
  );
}
