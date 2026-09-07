"use client";

import { useSyncExternalStore } from "react";

let probed: boolean | undefined;

/**
 * WebGL2, não WebGL1: é o que three e o React Three Fiber 9 usam.
 * Sondado uma vez por sessão e memoizado — criar contexto é caro e os
 * navegadores limitam quantos podem existir ao mesmo tempo, então o
 * contexto de teste é devolvido na hora.
 */
function probe(): boolean {
  if (probed !== undefined) return probed;

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    probed = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    probed = false;
  }

  return probed;
}

/** Suporte a WebGL não muda no meio da sessão: não há o que assinar. */
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): null {
  return null;
}

/**
 * `null` enquanto ainda não foi sondado (servidor e primeiro paint).
 * Sem WebGL o site não degrada para nada: entra um poster estático por
 * seção e o conteúdo continua inteiro (PROJECT.md §5).
 */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    probe,
    getServerSnapshot,
  );
}
