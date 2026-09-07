"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => {
    list.removeEventListener("change", onChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): null {
  return null;
}

/**
 * `null` enquanto ainda não dá para saber — no servidor e no primeiro paint.
 * Não é `false`: assumir "pode mover" e depois corrigir produz exatamente o
 * lampejo de movimento que a preferência existe para evitar. Quem consome
 * espera o valor resolver (ver `useSceneMode`).
 *
 * O modo de movimento reduzido deste projeto não é uma versão quebrada: é
 * uma sequência de composições fixas com corte entre elas (DIRECTION.md §5).
 */
export function useReducedMotion(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}
