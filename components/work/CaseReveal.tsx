"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useSceneMode } from "@/lib/capabilities/use-scene-mode";
import { emitCue } from "@/lib/audio/field-store";
import { runReadouts } from "@/lib/text/readout";
import {
  getCaseState,
  getIdleCaseState,
  subscribeToCase,
} from "@/lib/work/case-transition";

/**
 * A chegada do case: o conteúdo espera a câmera atracar, e não o contrário.
 *
 * Quando se entra por um card, a rota do case monta **durante** o voo — o
 * payload chega antes de a câmera terminar. Se o DOM aparecesse nesse instante,
 * o texto do case estaria na tela por cima de uma câmara ainda em movimento, e a
 * capa em DOM apareceria antes de a peça chegar no lugar dela. Então o conteúdo
 * fica retido até `docked`, que é a cena avisando que o encaixe fechou.
 *
 * **A capa é a exceção, e ela é o mecanismo inteiro.** Ela continua no fluxo,
 * com o tamanho que vai ter, desde o primeiro quadro: é o
 * `getBoundingClientRect()` dela que a cena lê para saber onde parar. O que ela
 * não tem, enquanto o voo acontece, é opacidade. Ver `lib/scene/case-drive.ts`.
 *
 * Quando o encaixe fecha, o texto entra como nos beats: o título acende, os
 * metadados são leitura e o resumo sai da névoa (`data-lit`, em
 * `styles/globals.css`). Só com a cena em movimento e só depois de um voo.
 *
 * ## Três saídas, e nenhuma delas depende da cena ter dado certo
 *
 * 1. **Chegada direta** (link, acervo, reload): a fase nunca é `entering`, e o
 *    servidor já renderiza aberto. Nenhum quadro escondido, nenhum salto.
 * 2. **Sem cena** (`poster`, ou o chunk não chegou): não há voo para esperar, e
 *    esperar seria esconder a página por nada.
 * 3. **Cão de guarda de 1.2 s.** Se a cena existe mas nunca atraca — WebGL
 *    perdido, uma exceção no laço, um card fora do corte —, o conteúdo entra
 *    assim mesmo. Uma página de leitura escondida por causa de um efeito é uma
 *    página quebrada, e o degradado tem que ser sempre para o lado do conteúdo.
 */
export function CaseReveal({ children }: { children: ReactNode }) {
  const mode = useSceneMode();
  const state = useSyncExternalStore(
    subscribeToCase,
    getCaseState,
    getIdleCaseState,
  );
  const [expired, setExpired] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(false);

  useEffect(() => {
    const id = window.setTimeout(() => setExpired(true), 1200);
    return () => {
      window.clearTimeout(id);
    };
  }, []);

  const hasScene = mode === "driven" || mode === "composed";
  const arriving =
    hasScene && state.phase === "entering" && !state.docked && !expired;

  useEffect(() => {
    const node = ref.current;
    if (node === null || mode !== "driven") return;
    if (arriving) {
      held.current = true;
      node.setAttribute("data-lit", "false");
      return;
    }
    if (!held.current) return;
    node.setAttribute("data-lit", "true");
    runReadouts(node, true);
    emitCue("text");
  }, [arriving, mode]);

  return (
    <div ref={ref} data-case={arriving ? "arriving" : "open"}>
      {children}
    </div>
  );
}
