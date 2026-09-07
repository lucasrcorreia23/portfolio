import type { ComponentType } from "react";

/**
 * O ponto único de carregamento do driver de scroll.
 *
 * A promessa é memoizada porque dois lugares a esperam e nenhum deles quer
 * dois chunks: o `ScrollProvider`, que monta o driver assim que ele chega, e
 * o preloader do portão, que conta esse mesmo carregamento como progresso.
 * Quem chamar primeiro dispara o `import()`; o segundo pega carona.
 *
 * Numa falha a memoização é desfeita, para uma queda de rede não deixar o
 * site sem scroll suave pelo resto da sessão.
 */
let pending: Promise<ComponentType> | null = null;

export function loadScrollDriver(): Promise<ComponentType> {
  if (pending !== null) return pending;

  pending = import("./ScrollDriver")
    .then((module) => module.default as ComponentType)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });

  return pending;
}
