"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { leaveCase, resetLeave } from "@/lib/work/leave-case";

/**
 * O que é **vazio** na rota de case: o fundo por onde a cena aparece. Um clique
 * cujo alvo é um destes elementos caiu fora de qualquer bloco de conteúdo — a
 * capa, o cabeçalho, um parágrafo, uma figura, o rodapé, a HUD. Todo bloco de
 * leitura tem a largura da coluna (`.measure`, `--case-wide`), então o alvo já
 * é a geometria: à direita de um parágrafo o que está sob o ponteiro é o
 * artigo, não o parágrafo.
 */
const BLANK = "html, body, main.case, [data-case], .case-body, .case-head";

/** Os blocos da coluna, para a conferência do vão entre eles. */
const BLOCKS =
  ".case-cover, .case-head > *, .case-body > :not(.case-veil), .case-foot";

/**
 * Até quanto de vão vertical entre dois blocos ainda é "dentro da coluna".
 * Os maiores intervalos do CSS do case são o rodapé (8rem acima dele), a régua
 * e a abertura do corpo (7rem cada): 160 px cobre os três.
 */
const GAP_PX = 160;

/**
 * O ponto está no vão entre dois blocos que o cobrem na horizontal?
 *
 * É a única parte do "fora da coluna" que o alvo do evento não resolve: o
 * espaço entre dois parágrafos tem como alvo o artigo, igual ao espaço à
 * direita deles, mas ele está **dentro** da coluna — clicar ali para
 * desmarcar uma seleção não pode tirar ninguém do case.
 */
function inColumnGap(x: number, y: number): boolean {
  let above: DOMRect | null = null;
  let below: DOMRect | null = null;
  for (const block of document.querySelectorAll(BLOCKS)) {
    const rect = block.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.bottom <= y && (above === null || rect.bottom > above.bottom)) {
      above = rect;
    }
    if (rect.top >= y && (below === null || rect.top < below.top)) {
      below = rect;
    }
  }
  if (above === null || below === null) return false;
  if (below.top - above.bottom > GAP_PX) return false;
  const within = (rect: DOMRect) => x >= rect.left && x <= rect.right;
  return within(above) && within(below);
}

function isExit(target: EventTarget | null, x: number, y: number): boolean {
  if (!(target instanceof Element)) return false;
  if (!target.matches(BLANK)) return false;
  return !inColumnGap(x, y);
}

/**
 * As duas saídas do case que não são um controle: **o clique fora da coluna**
 * e o **`Esc`**. As duas chamam `leaveCase`, a mesma função do `← RIO`, então
 * caem no mesmo lugar do rio pelo mesmo mecanismo (o `pathname` muda e o
 * `ScrollProvider` repõe o progresso).
 *
 * **Nada desenhado.** A única afordância é o cursor: sobre o vazio ele vira a
 * mão do clique, e é o **mesmo** teste do clique que o decide — escrito em
 * `data-case-exit` no `<html>`, que o CSS lê. Um cursor de CSS puro diria
 * "clicável" também no vão entre dois parágrafos, onde o clique não sai.
 *
 * O card-pick da cena fica desligado na rota de case (`Cards.tsx`, pela rampa
 * `caseRecess`): sem isso, um clique no vazio sobre a projeção de um card atrás
 * do artigo abriria **outro** case no mesmo gesto em que este fecha.
 */
export function CaseExit() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    resetLeave();
    const root = document.documentElement;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Um arrasto que selecionou texto termina num clique; ele é seleção.
      const selection = window.getSelection();
      if (selection !== null && selection.toString().length > 0) return;
      if (!isExit(event.target, event.clientX, event.clientY)) return;
      leaveCase(router, pathname);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // No mobile o `Esc` fecha o painel da HUD primeiro (`HudPanel`).
      if (document.querySelector('[data-hud="open"]') !== null) return;
      leaveCase(router, pathname);
    };

    let frame = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTarget: EventTarget | null = null;
    const onMove = (event: PointerEvent) => {
      lastX = event.clientX;
      lastY = event.clientY;
      lastTarget = event.target;
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (isExit(lastTarget, lastX, lastY)) root.dataset["caseExit"] = "on";
        else delete root.dataset["caseExit"];
      });
    };

    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      if (frame !== 0) cancelAnimationFrame(frame);
      delete root.dataset["caseExit"];
    };
  }, [router, pathname]);

  return null;
}
