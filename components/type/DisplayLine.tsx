"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType } from "react";

/**
 * Uma linha de display que se resolve para a largura da viewport.
 *
 * A regra do PROJECT.md §3.2 — "o maior título ocupa no mínimo 80% da largura
 * da viewport" — não é um tamanho, é um resultado: depende de quais letras a
 * linha tem. `styles/tokens.css` monta a conta
 *
 *   F = --display-fill × 100vw ÷ (--display-chars × --display-advance)
 *
 * e este componente fornece os dois termos que variam. `--display-chars` sai
 * do próprio texto; `--display-advance` é **medido** na fonte real, depois de
 * `document.fonts.ready`, no mesmo peso, largura e tracking em que a linha vai
 * ser desenhada. Com o avanço medido, a largura final é `fill × 100vw` de
 * verdade e não uma estimativa: 84% da viewport, com quatro pontos de folga
 * sobre o mínimo exigido.
 *
 * Antes da medição vale o padrão de `styles/tokens.css` (0.74 em/caractere),
 * que é deliberadamente baixo — errar para baixo produz fonte maior, e um
 * título grande demais por um instante é melhor que um título pequeno demais.
 *
 * Assume uma linha só. Para um título de duas linhas, use um `DisplayLine`
 * por linha: cada uma se dimensiona pela própria contagem de caracteres.
 */

type DisplayLineProps = {
  children: string;
  /** Passo da escala. Só `display-1` carrega a regra dos 80%. */
  step?: "display-1" | "display-2" | "display-3";
  as?: "h1" | "h2" | "p" | "span";
  className?: string;
};

const PROBE_SIZE_PX = 100;

/**
 * Escrito por extenso porque o Tailwind varre o código-fonte procurando
 * nomes de classe inteiros: `text-${step}` não geraria utility nenhuma.
 */
const STEP_CLASS = {
  "display-1": "text-display-1",
  "display-2": "text-display-2",
  "display-3": "text-display-3",
} as const;

export function DisplayLine({
  children,
  step = "display-1",
  as = "span",
  className = "",
}: DisplayLineProps) {
  const Tag = as as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [advance, setAdvance] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null || children.length === 0) return;

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;

      const computed = window.getComputedStyle(element);
      const probe = document.createElement("span");

      // Mesma família, mesmo peso, mesma largura, mesmo tracking, mesma caixa
      // — medir com qualquer um deles diferente mede outra fonte.
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.whiteSpace = "pre";
      probe.style.top = "0";
      probe.style.left = "-9999px";
      probe.style.fontFamily = computed.fontFamily;
      probe.style.fontWeight = computed.fontWeight;
      probe.style.fontStretch = computed.fontStretch;
      probe.style.fontVariationSettings = computed.fontVariationSettings;
      probe.style.letterSpacing = computed.letterSpacing;
      probe.style.textTransform = computed.textTransform;
      probe.style.fontSize = `${PROBE_SIZE_PX}px`;
      probe.textContent = children;

      document.body.appendChild(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();

      const measured = width / children.length / PROBE_SIZE_PX;

      // Uma medição fora desta faixa é sinal de que a fonte ainda não chegou
      // ou de que o texto foi trocado no meio do caminho: melhor manter o
      // padrão do CSS do que gravar um número absurdo.
      if (measured > 0.2 && measured < 2) setAdvance(measured);
    };

    // A primeira medição com a fonte de fallback seria a métrica errada.
    void document.fonts.ready.then(measure);

    return () => {
      cancelled = true;
    };
  }, [children]);

  const style = {
    "--display-chars": children.length,
    ...(advance === null ? {} : { "--display-advance": advance.toFixed(4) }),
  } as CSSProperties;

  return (
    <Tag
      ref={ref}
      className={`type-display ${STEP_CLASS[step]} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
