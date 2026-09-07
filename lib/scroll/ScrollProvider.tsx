"use client";

import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { loadScrollDriver } from "./load-driver";

/**
 * A casca do driver de scroll. Fica no layout, renderiza os filhos na hora e
 * monta o `ScrollDriver` — gsap e lenis, 48 kB comprimidos — só depois do
 * primeiro quadro útil.
 *
 * **Por que isso existe.** O orçamento do PROJECT.md §5 é por momento de
 * carregamento: a rota inicial tem 200 kB para chegar ao primeiro quadro, e o
 * piso do framework já come 175. O scroll não participa desse quadro — o
 * portão é DOM, não rola, e a descida só começa no clique de entrada. Com o
 * driver aqui dentro a rota inicial media 223 kB; com ele num chunk à parte
 * volta para a faixa dos 175.
 *
 * Os dois `requestAnimationFrame` encadeados são a definição operacional de
 * "depois do primeiro quadro": o primeiro roda antes do paint, o segundo
 * depois dele. Na home o portão pede o mesmo chunk antes disso, e a promessa
 * memoizada faz os dois convergirem num download só.
 *
 * Se o chunk não chegar, o scroll continua nativo e o progresso fica em 0:
 * a descida perde a cena e a régua da HUD, não o conteúdo.
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
  const [Driver, setDriver] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    let second = 0;

    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        void loadScrollDriver()
          .then((component) => {
            // `setState` com função trata o componente como updater; a arrow
            // extra é o que faz o React guardá-lo em vez de chamá-lo.
            if (alive) setDriver(() => component);
          })
          .catch(() => {});
      });
    });

    return () => {
      alive = false;
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  return (
    <>
      {Driver === null ? null : <Driver />}
      {children}
    </>
  );
}
