"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeToTheme } from "@/lib/theme";

type ThemeToggleProps = {
  label: string;
  nightLabel: string;
  dawnLabel: string;
};

/**
 * A hora do dia da câmara (rodada 18): noite ou amanhecer.
 *
 * Como o controle de áudio, o rótulo diz o **estado** (`LUZ NOITE` /
 * `LUZ AMANHECER`), e o `aria-pressed` diz se o amanhecer está ligado. O
 * servidor renderiza "noite"; o script antes da hidratação já pôs o atributo
 * no `<html>`, e o primeiro render depois de montar lê o valor de verdade.
 */
export function ThemeToggle({ label, nightLabel, dawnLabel }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, () => "night" as const);
  const dawn = theme === "dawn";

  return (
    <button
      type="button"
      aria-pressed={dawn ? "true" : "false"}
      onClick={() => setTheme(dawn ? "night" : "dawn")}
      className="type-mono text-hud text-mist w-fit"
    >
      {label} {dawn ? dawnLabel : nightLabel}
    </button>
  );
}
