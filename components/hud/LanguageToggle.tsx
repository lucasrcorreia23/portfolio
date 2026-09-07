"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, localizePath, type Locale } from "@/lib/i18n/config";

type LanguageToggleProps = {
  label: string;
  active: Locale;
};

/**
 * O seletor de idioma da HUD.
 *
 * Usa `next/link` e o `usePathname` do Next, mais `localizePath` — e não o
 * `Link`/`usePathname` do next-intl — porque a HUD está em toda página e
 * nenhum byte do next-intl precisa chegar ao navegador por causa de dois
 * links. A regra de prefixo é a mesma, escrita em `lib/i18n/config.ts`.
 *
 * O que se perde: o next-intl grava um cookie `NEXT_LOCALE` ao trocar de
 * idioma pelo `Link` dele, então a escolha sobrevive a uma visita futura a
 * `/`. Aqui a negociação por `Accept-Language` volta a decidir. Para um
 * portfólio bilíngue pt/en isso quase sempre acerta; se algum dia não
 * acertar, o cookie se grava num `onClick` de três linhas.
 */
export function LanguageToggle({ label, active }: LanguageToggleProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex gap-3">
        {LOCALES.map((locale) => (
          <li key={locale}>
            <Link
              href={localizePath(pathname, locale)}
              hrefLang={locale}
              aria-current={locale === active ? "true" : "false"}
              className="type-mono text-hud text-mist aria-[current=true]:text-cyan"
            >
              {locale}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
