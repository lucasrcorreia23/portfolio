"use client";

import { useState } from "react";
import { isAudioMuted, setAudioMuted } from "@/lib/audio/audio-context";

type AudioToggleProps = {
  label: string;
  onLabel: string;
  offLabel: string;
};

/**
 * O controle de áudio da HUD — PROJECT.md §4.
 *
 * **A preferência não mora aqui.** Ela mora em `lib/audio/audio-context.ts`,
 * porque este controle existe antes do áudio: no portão ainda não há
 * `AudioContext` (ele nasce suspenso no preload e destrava no clique de
 * entrada). Guardar o estado no componente faria "mudo antes de entrar" virar
 * som ao entrar, que é exatamente o contrário do que a pessoa pediu.
 *
 * O rótulo diz o **estado**, não a ação — `ÁUDIO ON` / `ÁUDIO MUDO` —, porque
 * a HUD inteira é leitura de instrumento. Quem precisa da ação ouve o
 * `aria-pressed`.
 */
export function AudioToggle({ label, onLabel, offLabel }: AudioToggleProps) {
  const [muted, setMuted] = useState(() => isAudioMuted());

  return (
    <button
      type="button"
      aria-pressed={muted ? "true" : "false"}
      onClick={() => {
        const next = !muted;
        setAudioMuted(next);
        setMuted(next);
      }}
      className="type-mono text-hud text-mist w-fit"
    >
      {label} {muted ? offLabel : onLabel}
    </button>
  );
}
