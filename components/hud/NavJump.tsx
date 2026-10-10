"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { localeOf, localizePath, stripLocale } from "@/lib/i18n/config";
import { requestScrollTo } from "@/lib/scroll/scroll-store";

type NavJumpProps = {
  /** O progresso da descida para onde o link leva. */
  progress: number;
  /** A âncora da seção, para o link funcionar sem JavaScript. */
  anchor: string;
  className?: string;
  children: ReactNode;
};

/**
 * Um link da navegação para um ponto da descida. Na home ele rola; fora dela
 * ele volta para a home e pede a rolagem, que o driver atende quando a descida
 * estiver montada.
 */
export function NavJump({ progress, anchor, className, children }: NavJumpProps) {
  const pathname = usePathname();
  const router = useRouter();
  const home = localizePath("/", localeOf(pathname));

  return (
    <a
      href={`${home}#${anchor}`}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        if (stripLocale(pathname) !== "/") router.push(home, { scroll: false });
        requestScrollTo(progress);
      }}
    >
      {children}
    </a>
  );
}
