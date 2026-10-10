"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/config";
import { getCaseState } from "@/lib/work/case-transition";
import { loadScrollDriver } from "./load-driver";
import { hasScrollRequest, requestScrollTo, setScrollRole } from "./scroll-store";

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
 *
 * **Ele também é quem diz o que a rolagem significa.** O papel sai do
 * `pathname`, num lugar só, em vez de cada página ter que se lembrar de
 * declará-lo: `/` é a descida, qualquer outra rota é rolagem de documento. Ver
 * `scroll-store.ts` para o que muda entre os dois.
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
  const [Driver, setDriver] = useState<ComponentType | null>(null);
  const pathname = usePathname();

  // Em efeito de layout, e não em efeito comum: a troca precisa acontecer antes
  // do primeiro quadro pintado da rota nova, senão esse quadro publica a
  // rolagem do case como se fosse a variável da descida.
  useLayoutEffect(() => {
    const descent = stripLocale(pathname) === "/";
    setScrollRole(descent ? "descent" : "page");

    // **A volta ao rio acontece aqui, e não no controle que a pediu.**
    //
    // A primeira versão confiava na restauração do navegador: a entrada de
    // histórico da home guarda o `scrollY` do rio, e `router.back()` deveria
    // devolvê-lo. Medido, ela caía no topo — `progress` 0, câmera em `z = 8`,
    // ou seja o começo da descida. A causa é o Lenis: a troca de rota o obriga
    // a remedir, e ele reassenta a janela na posição interna dele, que é a do
    // documento curto que acabou de sair. A restauração do navegador acontece e
    // é desfeita no quadro seguinte.
    //
    // Pedir a rolagem daqui resolve os dois caminhos com um mecanismo só: o
    // controle de volta e o **botão voltar do navegador** passam ambos por uma
    // mudança de `pathname`, e nenhum dos dois passa pelo mesmo clique. O
    // destino é o progresso gravado no instante da saída, e o pedido fica
    // retido até o driver remedir (ver `consumeScrollRequest`).
    if (!descent) return;
    const state = getCaseState();
    // Um pedido explícito (um link da navegação) vale mais que a volta à
    // parada de onde se saiu.
    if (hasScrollRequest()) return;
    if (state.phase !== "river" && state.returnProgress !== null) {
      requestScrollTo(state.returnProgress);
    }
  }, [pathname]);

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
