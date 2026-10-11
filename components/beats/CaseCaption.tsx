"use client";

import { useSyncExternalStore } from "react";
import { stopAt, stopProgress, STOP_COUNT } from "@/lib/scene/stops";
import { getScrollProgress, subscribeToScroll } from "@/lib/scroll/scroll-store";
import { BeatReveal } from "./BeatReveal";
import { beatOf } from "./beats";

export type Caption = {
  title: string;
  client: string;
  market: string;
  year: number;
  disciplines: string;
};

const currentStop = () => stopAt(getScrollProgress());
const noStop = () => -1;

/**
 * A legenda da parada atual: o índice em mono grande e os dados do case, à
 * esquerda do painel. É rótulo, então é da indústria: mono, neutro, sem brilho,
 * e entra como leitura.
 */
export function CaseCaption({ captions }: { captions: readonly Caption[] }) {
  const index = useSyncExternalStore(subscribeToScroll, currentStop, noStop);
  const caption = index < 0 ? undefined : captions[index];
  if (caption === undefined) return null;

  // Entra quando a câmera encontra o painel e sai quando o solta.
  const { from, to } = beatOf("cases");
  const reach = ((to - from) / STOP_COUNT / 2) * 0.55;
  const stop = stopProgress(index);

  return (
    <BeatReveal key={index} from={stop - reach} to={stop + reach} cue="readout">
      <div className="case-caption" data-veil data-readout>
        <p className="case-caption-index type-mono text-mist" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
          <span className="text-hud">/{String(STOP_COUNT).padStart(2, "0")}</span>
        </p>
        <p className="type-mono text-label text-mist mt-4">{caption.title}</p>
        <p className="type-mono text-hud-sm text-mist mt-2">
          {caption.client} · {caption.market} · {caption.year}
        </p>
        <p className="type-mono text-hud-sm text-mist mt-1">{caption.disciplines}</p>
      </div>
    </BeatReveal>
  );
}
