"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/config";

type DescentSlotProps = {
  /** A régua, a leitura de cota e os filtros — os instrumentos da descida. */
  children: ReactNode;
  /** O que ocupa a mesma casa dentro de um case. */
  fallback: ReactNode;
};

/**
 * A casa dos instrumentos da HUD, que muda de conteúdo por rota.
 *
 * A régua graduada mede **a descida**. Dentro de um case não há descida
 * acontecendo: o progresso está congelado no ponto do rio de onde se saiu (ver
 * `lib/scroll/scroll-store.ts`), então a régua mostraria um cursor parado no
 * meio de uma escala que não descreve a página em que a pessoa está. Um
 * instrumento apontando para outra coisa é pior que nenhum — o mesmo argumento
 * que faz `readout-store` publicar `live: false` em vez de `0.00`.
 *
 * O que ocupa a casa no lugar dela é o caminho de volta, que é a única coisa que
 * a HUD tem a dizer ali.
 *
 * Deriva da rota e não do store de travessia de propósito: um reload dentro do
 * case ou uma chegada por link direto não passam por `enterCase`, e o `pathname`
 * passa sempre.
 */
export function DescentSlot({ children, fallback }: DescentSlotProps) {
  const pathname = usePathname();
  const inCase = stripLocale(pathname).startsWith("/work/");
  return <>{inCase ? fallback : children}</>;
}
