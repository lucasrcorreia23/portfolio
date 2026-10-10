"use client";

import Link from "next/link";
import { getScrollProgress } from "@/lib/scroll/scroll-store";
import { clearCardFocus, setCardFocus } from "@/lib/work/card-focus";
import { enterCase } from "@/lib/work/case-transition";

export type Station = {
  slug: string;
  href: string;
  title: string;
  client: string;
  year: number;
};

type StationListProps = {
  stations: readonly Station[];
  enterLabel: string;
};

/**
 * Um link de verdade por case, na ordem das paradas: é o caminho de teclado,
 * de leitor de tela e de indexação, e funciona sem JavaScript.
 *
 * Com a cena viva, cada link é posicionado sobre o painel dele (quem escreve o
 * `transform` é o `Panels`), então **o link é a área de clique do painel**.
 * Sem cena, o link focado aparece em DOM (`.card-link` em `globals.css`).
 */
export function StationList({ stations, enterLabel }: StationListProps) {
  return (
    <ol className="card-links">
      {stations.map((station, index) => (
        <li key={station.slug}>
          <Link
            href={station.href}
            className="card-link type-mono text-hud-sm text-mist"
            data-card-link={index}
            aria-label={`${enterLabel}: ${station.title} — ${station.client}, ${station.year}`}
            onFocus={(event) => setCardFocus(index, event.currentTarget)}
            onBlur={(event) => clearCardFocus(event.currentTarget)}
            onClick={() => {
              enterCase(station.slug, index, getScrollProgress());
            }}
          >
            {String(index + 1).padStart(2, "0")} · {station.title}
          </Link>
        </li>
      ))}
    </ol>
  );
}
