"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { Discipline } from "@/lib/disciplines";
import type { PaletteToken } from "@/lib/palette";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";
import { getScrollProgress } from "@/lib/scroll/scroll-store";
import {
  getRiverFilter,
  noRiverFilter,
  subscribeToRiverFilter,
} from "@/lib/work/filter-store";
import { enterCase } from "@/lib/work/case-transition";

export type RiverStation = {
  /** `river_rank`. É o mesmo número gravado na placa do card (`EST. NNN`). */
  rank: number;
  slug: string;
  href: string;
  client: string;
  title: string;
  year: number;
  accent: PaletteToken;
  disciplines: readonly Discipline[];
};

type StationListProps = {
  stations: readonly RiverStation[];
  /** `EST.` — o léxico do DIRECTION.md §2, resolvido no servidor. */
  stationLabel: string;
  /** Nome acessível do link, para o leitor de tela não ler só o título. */
  enterLabel: string;
  /** Progresso onde o beat de Trabalho começa e termina. */
  from: number;
  to: number;
};

/**
 * Quantas cotas a leitura precisa. O destaque muda quando a câmera passa de um
 * card para o próximo — sete trocas em 40% da descida —, então 200 degraus dão
 * resolução de sobra e limitam o render a duzentas vezes numa travessia inteira.
 */
const STEPS = 200;

/**
 * A lista de estações do rio, em DOM.
 *
 * ## Por que ela existe
 *
 * Até aqui os sete cards viviam só na cena, e `card-pick.ts` só escutava
 * `pointermove`: não havia clique, não havia `href`, e o rio inteiro era
 * inalcançável por teclado. O PROJECT.md §7 exige "passa em teclado do começo ao
 * fim", e a §5 exige que "todo o conteúdo textual exista no DOM e navegue por
 * teclado" — o canvas é `aria-hidden`, então nada que só exista nele conta.
 *
 * Ela também é a metade em DOM de "Trabalho (placas e títulos de card)", que o
 * DIRECTION.md §5 já listava entre os quatro beats com texto sob luz variável, e
 * o caminho de indexação: sete links de verdade para os sete cases curados,
 * servidos pelo servidor, funcionando sem JavaScript nenhum.
 *
 * ## O destaque sai do progresso, não de um mecanismo novo
 *
 * A linha acesa é a do card que a câmera está passando, e ela é derivada da
 * mesma variável única (PROJECT.md §3.3): o beat é dividido em tantas faixas
 * quantos são os cards. Isso amarra a leitura em DOM ao que está na tela sem
 * inventar um segundo relógio nem ler nada da cena — e continua funcionando em
 * modo `poster`, onde não há cena para ler.
 *
 * ## O clique daqui e o clique no card 3D são o mesmo clique
 *
 * Os dois chamam `enterCase()` com o mesmo slug, o mesmo posto e o mesmo
 * progresso, e só então navegam. É isso que garante que a travessia seja
 * idêntica pelas duas portas — e que a volta caia no mesmo lugar, porque
 * `returnProgress` é gravado no mesmo ponto do código.
 *
 * ## O filtro acende, e não reordena
 *
 * O DIRECTION.md §4 é explícito: o filtro **promove**, nunca remove. Reordenar a
 * lista faria as linhas trocarem de lugar — que é exatamente o "cards trocando
 * de lugar" que o documento veta. As promovidas ganham o acento; a ordem é
 * sempre a da curadoria.
 */
export function StationList({
  stations,
  stationLabel,
  enterLabel,
  from,
  to,
}: StationListProps) {
  const { value: progress } = useScrollProgress({ steps: STEPS });
  const filter = useSyncExternalStore(
    subscribeToRiverFilter,
    getRiverFilter,
    noRiverFilter,
  );

  const span = to - from;
  const local = span <= 0 ? 0 : (progress - from) / span;
  const nearest =
    local < 0 || local > 1
      ? -1
      : Math.min(stations.length - 1, Math.floor(local * stations.length));

  return (
    <ol
      data-veil
      className="type-mono text-hud-sm text-mist pointer-events-auto flex w-fit flex-col gap-3"
    >
      {stations.map((station, index) => {
        const promoted =
          filter !== null && station.disciplines.includes(filter);
        return (
          <li
            key={station.slug}
            className="station-row"
            data-near={index === nearest ? "true" : "false"}
            data-promoted={promoted ? "true" : "false"}
            style={
              { "--station-accent": `var(--${station.accent})` } as CSSProperties
            }
          >
            <Link
              href={station.href}
              className="station-link block"
              aria-label={`${enterLabel}: ${station.title}`}
              onClick={() => {
                // Antes de navegar, e no mesmo lugar em que o clique no card 3D
                // grava: o progresso daqui é o que a câmera vai reencontrar.
                enterCase(station.slug, index, getScrollProgress());
              }}
            >
              <span className="station-cota">
                {stationLabel} {String(station.rank).padStart(3, "0")}
              </span>
              <span className="station-title type-display text-body-lg">
                {station.title}
              </span>
              <span className="station-meta">
                {station.client} · {station.year}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
