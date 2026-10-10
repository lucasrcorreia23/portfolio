"use client";

import type { CSSProperties } from "react";
import { stopAt, stopProgress, STOP_COUNT } from "@/lib/scene/stops";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";
import { beatOf } from "./beats";

export type Caption = {
  title: string;
  client: string;
  year: number;
  disciplines: string;
};

/**
 * A legenda da parada atual: o índice em mono grande e os dados do case, à
 * esquerda do painel. É rótulo, então é da indústria: mono, neutro, sem brilho.
 */
export function CaseCaption({ captions }: { captions: readonly Caption[] }) {
  const { value: progress } = useScrollProgress({ steps: 600 });
  const index = stopAt(progress);
  const caption = index < 0 ? undefined : captions[index];
  if (caption === undefined) return null;

  // Entra quando a câmera encontra o painel e sai quando o solta.
  const { from, to } = beatOf("cases");
  const half = (to - from) / STOP_COUNT / 2;
  const offset = Math.abs(progress - stopProgress(index)) / half;
  const reveal = 1 - Math.min(1, Math.max(0, (offset - 0.35) / 0.4));

  return (
    <div
      className="case-caption"
      data-veil
      style={{ "--reveal": reveal.toFixed(3) } as CSSProperties}
    >
      <p className="case-caption-index type-mono text-mist" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
        <span className="text-hud">/{String(STOP_COUNT).padStart(2, "0")}</span>
      </p>
      <p className="type-mono text-label text-mist mt-4">{caption.title}</p>
      <p className="type-mono text-hud-sm text-mist mt-2">
        {caption.client} · {caption.year}
      </p>
      <p className="type-mono text-hud-sm text-mist mt-1">{caption.disciplines}</p>
    </div>
  );
}
