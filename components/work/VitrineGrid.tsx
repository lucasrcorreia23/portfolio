"use client";

import { Children, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type VitrineGridProps = {
  /** O tipo de cada item, na ordem dos filhos. */
  types: readonly (string | undefined)[];
  filterLabel: string;
  allLabel: string;
  /** Um item por filho, já renderizado no servidor. */
  children: ReactNode;
};

/**
 * A grade da vitrine. Os itens chegam prontos do servidor, na ordem do arquivo;
 * depois de montar, a ordem é embaralhada — nova a cada visita. O embaralho é
 * só de ordem (`order` em CSS), então o HTML servido e o hidratado coincidem.
 */
export function VitrineGrid({
  types,
  filterLabel,
  allLabel,
  children,
}: VitrineGridProps) {
  const items = Children.toArray(children);
  const [order, setOrder] = useState<number[] | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const next = items.map((_, index) => index);
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j] as number, next[i] as number];
    }
    // Assíncrono: a ordem muda depois da hidratação, nunca durante ela.
    queueMicrotask(() => setOrder(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const kinds = useMemo(
    () => [...new Set(types.filter((type): type is string => type !== undefined))],
    [types],
  );

  return (
    <>
      {kinds.length > 1 ? (
        <div className="type-mono text-hud text-mist mb-10 flex flex-wrap gap-5">
          <span>{filterLabel}</span>
          {[null, ...kinds].map((kind) => (
            <button
              key={kind ?? "all"}
              type="button"
              aria-pressed={active === kind ? "true" : "false"}
              onClick={() => setActive(kind)}
              className="type-mono text-hud text-mist hover:text-cyan aria-[pressed=true]:text-cyan"
            >
              {kind ?? allLabel}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="vitrine-grid">
        {items.map((item, index) => (
          <li
            key={index}
            hidden={active !== null && types[index] !== active}
            style={{ order: order === null ? index : order.indexOf(index) }}
          >
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}
