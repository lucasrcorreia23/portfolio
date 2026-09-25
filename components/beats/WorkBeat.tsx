import { StationList, type RiverStation } from "./StationList";
import type { Beat } from "./beats";

type WorkBeatProps = {
  beat: Beat;
  /** A curadoria, em ordem de `river_rank`. A mesma que a cena monta. */
  river: readonly RiverStation[];
  stationLabel: string;
  enterLabel: string;
};

/**
 * O DOM do beat de Trabalho — e ele não mostra nada.
 *
 * No beat de Trabalho o único texto visível em DOM é a HUD e o rótulo do beat;
 * quem fala é o rio. O que mora aqui são os links dos cards, invisíveis até o
 * foco (ver `StationList`). O contêiner é `sticky` para um link focado nunca
 * fazer o navegador rolar para fora do beat.
 */
export function WorkBeat({ river, stationLabel, enterLabel }: WorkBeatProps) {
  return (
    <div className="pointer-events-none sticky top-0 h-svh">
      <StationList
        stations={river}
        stationLabel={stationLabel}
        enterLabel={enterLabel}
      />
    </div>
  );
}
