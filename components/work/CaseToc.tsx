"use client";

import { useEffect, useRef, useState } from "react";
import { requestPageScroll } from "@/lib/scroll/scroll-store";

type Entry = { label: string; el: HTMLElement };

/** O que vem antes do primeiro tema ("O que eu fiz…") é a introdução. */
const THEME = /^(o que eu fiz|what i did)\s+/i;
/** Os números das perguntas ("01.") são rótulos, não seções. */
const NUMBERED = /^\d+\.$/;

/**
 * O sumário do case, fixo à direita na rolagem: introdução, os temas, os
 * números e o retrospecto. A lista sai dos rótulos de seção (`####` do MDX,
 * `.case-label`) que já estão na página, então todo case ganha o seu sem
 * marcação nova. O salto vai pelo `requestPageScroll`, que o driver atende
 * com o Lenis (um `window.scrollTo` direto ele desfaz no quadro seguinte).
 */
export function CaseToc({ title, intro }: { title: string; intro: string }) {
  const ref = useRef<HTMLElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const body = ref.current?.parentElement?.querySelector<HTMLElement>(".case-body");
    if (!body) return;
    const labels = [...body.querySelectorAll<HTMLElement>(".case-label")].filter(
      (el) => !NUMBERED.test(el.textContent?.trim() ?? ""),
    );
    const firstTheme = labels.findIndex((el) => THEME.test(el.textContent?.trim() ?? ""));
    const rest = firstTheme < 0 ? labels : labels.slice(firstTheme);
    const list: Entry[] = [
      { label: intro, el: body },
      ...rest.map((el) => {
        const text = (el.textContent ?? "").trim().replace(THEME, "");
        return { label: text.charAt(0).toUpperCase() + text.slice(1), el };
      }),
    ];
    setEntries(list);

    let frame = 0;
    const read = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let current = 0;
      list.forEach((entry, index) => {
        if (entry.el.getBoundingClientRect().top <= line) current = index;
      });
      setActive(current);
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [intro]);

  const go = (el: HTMLElement) => {
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.2;
    requestPageScroll(top);
  };

  return (
    <nav ref={ref} aria-label={title} className="case-toc type-mono">
      {entries.length === 0 ? null : (
        <ol>
          {entries.map((entry, index) => (
            <li key={entry.label}>
              <button
                type="button"
                aria-current={index === active ? "location" : undefined}
                onClick={() => go(entry.el)}
              >
                {entry.label}
              </button>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
