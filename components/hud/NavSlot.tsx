"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/config";

type NavSlotProps = {
  /** O que a descida mostra: a régua da trilha. */
  children: ReactNode;
  /** O que um case mostra no lugar: o caminho de volta. */
  fallback: ReactNode;
  /** O que as outras páginas mostram (a vitrine): nada, por padrão. */
  elsewhere?: ReactNode;
};

/**
 * A casa da régua na navegação. Ela mede a descida, então só existe na home;
 * dentro de um case a mesma casa leva de volta.
 */
export function NavSlot({ children, fallback, elsewhere = null }: NavSlotProps) {
  const bare = stripLocale(usePathname());
  if (bare === "/") return <>{children}</>;
  if (bare.startsWith("/work/")) return <>{fallback}</>;
  return <>{elsewhere}</>;
}
