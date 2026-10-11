"use client";

import { useEffect, useState } from "react";

type HudToggleProps = {
  label: string;
  onLabel: string;
  offLabel: string;
};

/**
 * Liga e desliga tudo o que está por cima da cena — a HUD e o conteúdo da
 * página —, para a descida ser vista limpa, só o cenário na rolagem.
 *
 * O estado vai para o `<html>` como `data-hud-view="off"`, e quem esconde é o
 * CSS (`styles/globals.css`): tudo some, menos este botão — o caminho de
 * volta. Não guarda a escolha: cada visita começa com a HUD ligada.
 */
export function HudToggle({ label, onLabel, offLabel }: HudToggleProps) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.removeAttribute("data-hud-view");
    else root.setAttribute("data-hud-view", "off");
    return () => {
      root.removeAttribute("data-hud-view");
    };
  }, [on]);

  return (
    <button
      type="button"
      data-hud-toggle
      aria-pressed={on ? "true" : "false"}
      onClick={() => setOn((value) => !value)}
      className="type-mono text-hud text-mist w-fit"
    >
      {label} {on ? onLabel : offLabel}
    </button>
  );
}
