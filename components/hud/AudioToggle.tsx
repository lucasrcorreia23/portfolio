"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  armAudio,
  enableAudioFromGesture,
  hydrateAudioPreference,
  isAudioMuted,
  setAudioMuted,
  subscribeToAudioPreference,
} from "@/lib/audio/audio-context";

type AudioToggleProps = {
  label: string;
  onLabel: string;
  offLabel: string;
};

/**
 * O controle de áudio — de volta à HUD na rodada 10, **porque agora existe o
 * que ele controla**: o leito sonoro da câmara e as duas interações
 * (`lib/audio/sound-bed.ts`). Ele saiu na 6.5 porque ligava e desligava
 * silêncio.
 *
 * **Começa desligado e guarda a escolha.** O estado mora no módulo de áudio, não
 * aqui — o controle existe antes do `AudioContext`. O servidor renderiza
 * "desligado"; a escolha salva é lida depois de montar, então o HTML e o
 * primeiro render do cliente sempre concordam.
 *
 * O rótulo diz o **estado**, não a ação (`ÁUDIO MUDO` / `ÁUDIO ON`), porque a
 * HUD inteira é leitura de instrumento. Quem precisa da ação ouve o
 * `aria-pressed`.
 */
export function AudioToggle({ label, onLabel, offLabel }: AudioToggleProps) {
  const muted = useSyncExternalStore(
    subscribeToAudioPreference,
    isAudioMuted,
    () => true,
  );

  useEffect(() => {
    hydrateAudioPreference();
    return armAudio();
  }, []);

  return (
    <button
      type="button"
      aria-pressed={muted ? "false" : "true"}
      onClick={() => {
        // Ligar é um gesto, então pode destravar o contexto — numa rota sem
        // portão é o único gesto que vai existir.
        if (muted) enableAudioFromGesture();
        else setAudioMuted(true);
      }}
      className="type-mono text-hud text-mist w-fit"
    >
      {label} {muted ? offLabel : onLabel}
    </button>
  );
}
