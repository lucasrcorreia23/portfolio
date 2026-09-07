"use client";

import { useSceneMode } from "@/lib/capabilities/use-scene-mode";

/**
 * O portão da cena: decide, em um lugar só, qual das três versões do site
 * roda. É o consumidor de `useReducedMotion` e `useWebGLSupport` — nenhum
 * outro componente chama os dois direto.
 *
 * Hoje é uma camada vazia: a cena 3D ainda não existe. O que já está certo é
 * o contrato — a câmara é escura antes de qualquer coisa carregar
 * (`--void` é o começo e o fim), o canvas futuro nasce `aria-hidden`, e o
 * modo escolhido fica no DOM em `data-scene-mode` para o CSS e os testes
 * conseguirem ver qual caminho está ativo.
 *
 * Quando a cena entrar, é aqui que os três galhos divergem:
 *   driven   → canvas R3F, câmera dirigida pelo progresso do scroll
 *   composed → uma composição fixa por beat, corte de 120 ms entre elas
 *   poster   → poster estático por seção, renderizado dessas composições
 */
export function SceneGate() {
  const mode = useSceneMode();

  return (
    <div
      aria-hidden="true"
      data-scene-mode={mode}
      className="pointer-events-none fixed inset-0 -z-10 bg-void"
    />
  );
}
