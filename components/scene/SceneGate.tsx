"use client";

import { useEffect, useState } from "react";
import { useSceneMode } from "@/lib/capabilities/use-scene-mode";
import { loadScene, type SceneComponent } from "@/lib/scene/load-scene";

type SceneGateProps = {
  /** A string do corpo de prova, resolvida no servidor e descida como prop. */
  specimen: string;
};

/**
 * O portão da cena: decide, em um lugar só, qual das três versões do site roda.
 *
 *   driven   → a cena, com a câmera na curva dirigida pelo progresso do scroll
 *   composed → a mesma cena, com a câmera cortando entre composições fixas
 *   poster   → sem WebGL: câmara escura, e o conteúdo em DOM inteiro
 *
 * É o único consumidor de `useSceneMode()`, que por sua vez é o único
 * consumidor de `useReducedMotion` e `useWebGLSupport` juntos. Sem esse funil,
 * cada componente inventaria a própria combinação das duas capacidades.
 *
 * **Não existe `import` estático da cena aqui, e isso é o orçamento falando.**
 * O `loadScene()` é o mesmo módulo de promessa memoizada que o preloader do
 * portão chama, então os dois convergem num download só — e um `import`
 * estático que escapasse para este arquivo não custaria 350 kB de chunk de
 * cena, custaria 350 kB de **rota inicial**, que tem teto de 200.
 *
 * **O modo vai para o `<html>`**, e não só para esta `div`. É o mesmo contrato
 * do `data-gate`: o CSS precisa saber se existe cena desenhando o título
 * display para decidir se o `h1` do DOM é o título visível ou só o texto
 * indexável (ver `styles/globals.css`).
 */
export function SceneGate({ specimen }: SceneGateProps) {
  const mode = useSceneMode();
  const [Scene, setScene] = useState<SceneComponent | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-scene-mode", mode);
    return () => {
      root.removeAttribute("data-scene-mode");
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "driven" && mode !== "composed") return;

    let cancelled = false;
    // O `.then(…, …)` com dois braços: uma falha de rede deixa a câmara escura
    // e o conteúdo inteiro, que é o degradado certo — não uma tela de erro.
    loadScene().then(
      (component) => {
        if (!cancelled) setScene(() => component);
      },
      () => {},
    );

    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div
      aria-hidden="true"
      data-scene-mode={mode}
      className="pointer-events-none fixed inset-0 -z-10 bg-void"
    >
      {Scene === null ? null : (
        <Scene specimen={specimen} composed={mode === "composed"} />
      )}
    </div>
  );
}
