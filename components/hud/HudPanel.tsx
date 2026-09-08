"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";

type HudPanelProps = {
  /** Nome acessível da região inteira. */
  label: string;
  openLabel: string;
  closeLabel: string;
  /** `EST.` — o acionador continua sendo um instrumento, não um menu. */
  stationLabel: string;
  children: ReactNode;
};

/**
 * A casca da HUD: coluna permanente no desktop, **acionador no topo no mobile**
 * (PROJECT.md §5, DIRECTION.md §4).
 *
 * **Um markup só, dois estados.** O painel não é duplicado por breakpoint: o
 * mesmo `<div>` é `hidden` no mobile fechado e `md:flex` sempre. Duas cópias do
 * conteúdo dariam dois lugares para o foco pousar e dois lugares para o leitor
 * de tela anunciar a mesma coisa.
 *
 * **O acionador não é um hambúrguer com rótulo.** Ele mostra a estação atual —
 * a mesma leitura que a régua mostra aberta —, então o mobile fechado continua
 * dizendo onde a descida está. O sinal de `+`/`−` é a única coisa decorativa
 * dele, e é `aria-hidden`: quem navega por leitor de tela ouve "Abrir painel".
 *
 * **`data-veil` no acionador e no painel, sempre.** O DIRECTION.md §5 chama a
 * HUD de "a caixa mais exposta do site" — ela está na tela o tempo todo, sobre
 * uma cena cuja única luz se move. Medido na varredura de contraste, sem véu
 * ela entregava 1.7:1 no beat de Quem sou. Cada um dos dois é marcado porque
 * eles nunca aparecem juntos exceto no mobile aberto: no desktop o acionador
 * tem caixa zero, e no mobile fechado o painel tem. O DOM continua sem
 * `background` — quem escurece é o véu, dentro do canvas.
 */
export function HudPanel({
  label,
  openLabel,
  closeLabel,
  stationLabel,
  children,
}: HudPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { value: progress } = useScrollProgress({ steps: 100 });
  const station = Math.round(progress * 1000)
    .toString()
    .padStart(4, "0");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A descida continua acontecendo atrás do painel aberto, e um painel que
  // cobre a tela inteira enquanto a cena roda é uma janela fechada na hora
  // errada. Rolar fecha.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  return (
    <aside
      aria-label={label}
      data-hud={open ? "open" : "closed"}
      className="fixed inset-x-0 top-0 z-50 px-6 py-4 md:inset-x-auto md:inset-y-0 md:left-0 md:w-44 md:px-6 md:py-8"
    >
      <button
        type="button"
        data-veil
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((value) => !value)}
        className="type-mono text-hud text-mist flex w-fit items-center gap-3 md:hidden"
      >
        <span className="tabular-nums">
          {stationLabel} {station}
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      <div
        id={panelId}
        data-veil
        className={`${
          open ? "mt-6 flex" : "hidden"
        } w-fit flex-col gap-8 md:mt-0 md:flex md:h-full md:justify-between md:gap-6`}
      >
        {children}
      </div>
    </aside>
  );
}
