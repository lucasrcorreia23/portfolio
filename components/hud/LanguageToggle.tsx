"use client";

import { usePathname } from "next/navigation";
import { LOCALES, stripLocale, type Locale } from "@/lib/i18n/config";

type LanguageToggleProps = {
  label: string;
  active: Locale;
};

/**
 * O seletor de idioma da HUD.
 *
 * **`<a>`, e não `next/link`.** O idioma é o parâmetro do layout raiz: trocar
 * por navegação de cliente remonta a árvore inteira — canvas, rolagem, HUD —
 * enquanto o estado dos módulos (a descida, os uniforms) fica onde estava. Uma
 * carga de documento troca tudo junto, e roda o `RESTORE_SCRIPT` do layout.
 *
 * **O href leva sempre o prefixo, inclusive `/en`.** O proxy do next-intl
 * guarda o idioma num cookie `NEXT_LOCALE`, e esse cookie decide o que `/`
 * serve: quem está em `/pt` e pede `/` volta para `/pt`. Pedir `/en/...` é o
 * que troca: o proxy grava o cookie e redireciona para o caminho sem prefixo.
 * Sem `Link` também não há busca adiantada, que gravaria o cookie só por o
 * link existir na tela.
 */
export function LanguageToggle({ label, active }: LanguageToggleProps) {
  const bare = stripLocale(usePathname());

  return (
    <nav aria-label={label}>
      <ul className="flex gap-2">
        {LOCALES.map((locale) => (
          <li key={locale} className="flex">
            <a
              href={`/${locale}${bare === "/" ? "" : bare}`}
              hrefLang={locale}
              aria-current={locale === active ? "true" : "false"}
              className="type-mono text-hud text-mist aria-[current=true]:text-cyan"
            >
              {locale}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
