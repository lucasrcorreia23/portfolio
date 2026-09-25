"use client";

import Link from "next/link";
import type { Discipline } from "@/lib/disciplines";
import type { PaletteToken } from "@/lib/palette";
import { getScrollProgress } from "@/lib/scroll/scroll-store";
import { clearCardFocus, setCardFocus } from "@/lib/work/card-focus";
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
};

/**
 * Os links dos cards do rio — um por card curado, **invisíveis**.
 *
 * ## Por que não há mais lista na tela
 *
 * A versão anterior era uma lista mono com os sete cases, título em display,
 * fixa na margem esquerda durante o beat inteiro. Ela resolvia um problema real
 * — o rio não tinha `href`, nem teclado, nem caminho sem JavaScript — e ao
 * resolver pôs um índice de projetos por cima de um rio de projetos, onde texto
 * sempre ganha de peça escura. Nenhum dos dois documentos a pedia. O índice em
 * DOM do site é o acervo (`/work`).
 *
 * ## O que ficou
 *
 * Os sete links continuam no HTML servido, na ordem da curadoria: é o caminho
 * de teclado (PROJECT.md §7), de leitor de tela (§5 — o canvas é `aria-hidden`)
 * e de indexação, e funciona sem JavaScript nenhum. Só não são vistos:
 *
 * - **Com a cena viva**, o foco é mostrado **pela peça**: o link publica o índice
 *   em `card-focus`, o laço dos cards acende o chanfro e revela a placa (a mesma
 *   marcação da passagem do ponteiro), leva a câmera até o card e posiciona o
 *   link sobre a projeção dele. Nenhuma caixa de contorno do navegador.
 * - **Sem cena** (`poster`), não há peça para acender, então o link focado
 *   aparece em DOM — ver `.card-link` em `styles/globals.css`.
 *
 * O clique daqui e o clique no card 3D continuam sendo o mesmo clique: os dois
 * chamam `enterCase()` com o mesmo slug, posto e progresso antes de navegar.
 */
export function StationList({
  stations,
  stationLabel,
  enterLabel,
}: StationListProps) {
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
              // Antes de navegar, e no mesmo lugar em que o clique no card 3D
              // grava: o progresso daqui é o que a câmera vai reencontrar.
              enterCase(station.slug, index, getScrollProgress());
            }}
          >
            {stationLabel} {String(station.rank).padStart(3, "0")} ·{" "}
            {station.title}
          </Link>
        </li>
      ))}
    </ol>
  );
}
