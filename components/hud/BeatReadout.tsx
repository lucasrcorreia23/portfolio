"use client";

import { useSyncExternalStore } from "react";
import { beatAt, type BeatId } from "@/components/beats/beats";
import {
  getIdleReadout,
  getReadout,
  subscribeToReadout,
} from "@/lib/scene/readout-store";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";

type BeatReadoutProps = {
  stationLabel: string;
  densityLabel: string;
  depthLabel: string;
  /** O nome de cada beat, traduzido no servidor. */
  beatLabels: Record<BeatId, string>;
};

/**
 * A leitura da HUD, e é ela que **reage ao beat** (PROJECT.md §4).
 *
 * Três linhas: a estação, o nome do beat e uma grandeza do léxico do
 * DIRECTION.md §2. A terceira é a que troca, e a troca tem motivo em cada
 * ponto da descida — não é variedade:
 *
 * - **`DENS.` em Quem sou.** O DIRECTION.md §4 é literal: ali "a densidade do
 *   bando é medida contra [a parede graduada], com a leitura correndo na HUD".
 *   É o único beat em que a estrutura chega perto o bastante para medir alguma
 *   coisa contra ela.
 * - **`Z` no resto.** A profundidade da câmera na câmara, que é a grandeza que
 *   existe em qualquer ponto — e a única que a Emergência pode mostrar, onde
 *   "não dá pra saber se a câmara tem três metros ou trezentos".
 *
 * **Sem cena, a linha não existe** — não vira `0.00`. Sem WebGL, no poster, ou
 * enquanto o chunk baixa, não há instrumento nenhum ligado, e um zero seria uma
 * leitura inventada. Ver `lib/scene/readout-store.ts`.
 *
 * A faixa medida das duas grandezas, que é o que o PROJECT.md §7 exige ao lado
 * de qualquer coisa que decida o que aparece, está em `formatDensity` abaixo.
 */
export function BeatReadout({
  stationLabel,
  densityLabel,
  depthLabel,
  beatLabels,
}: BeatReadoutProps) {
  const { value: progress } = useScrollProgress({ steps: 100 });
  // O store publica um objeto novo só quando o **dígito** muda, e o mesmo
  // objeto entre uma leitura e outra — que é o contrato de
  // `useSyncExternalStore`. A quantização mora lá, junto de quem sabe a que
  // taxa a cena escreve.
  const readout = useSyncExternalStore(
    subscribeToReadout,
    getReadout,
    getIdleReadout,
  );

  const beat = beatAt(progress);
  const station = Math.round(progress * 1000)
    .toString()
    .padStart(4, "0");

  return (
    <div className="flex flex-col gap-1">
      <p className="type-mono text-hud text-mist tabular-nums">
        {stationLabel} {station}
      </p>
      <p className="type-mono text-hud-sm text-mist">{beatLabels[beat.id]}</p>
      {readout.live ? (
        <p className="type-mono text-hud-sm text-mist tabular-nums">
          {beat.id === "about"
            ? `${densityLabel} ${formatDensity(readout.density)}`
            : `${depthLabel} ${formatDepth(readout.depth)}`}
        </p>
      ) : null}
    </div>
  );
}

/**
 * `Z −38`, do léxico do DIRECTION.md §2 — inteiro, com o sinal de menos
 * tipográfico e não o hífen do teclado.
 */
function formatDepth(depth: number): string {
  const rounded = Math.round(depth);
  return rounded < 0 ? `−${Math.abs(rounded)}` : `+${rounded}`;
}

/**
 * `DENS. 0.62`, duas casas.
 *
 * **Faixa medida da entrada** (PROJECT.md §7), varrendo o progresso de 0.28 a
 * 0.45 com a sonda, 340 amostras: mínimo 0.32, mediana 0.71, máximo 1.00. A
 * grandeza é a densidade do proxy no poleiro, normalizada, e satura em 1.00
 * quando o bando assenta — que é o que "densidade estável" quer dizer no
 * DIRECTION.md §4. Duas casas porque a terceira só mostraria o `damp`.
 */
function formatDensity(density: number): string {
  return density.toFixed(2);
}
