import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./config";

/**
 * Duas rotas de idioma: `/` em inglês e `/pt` em português — PROJECT.md §4.
 * `as-needed` é o que deixa o idioma padrão sem prefixo, então os cases
 * caem em `/work/[slug]` e `/pt/work/[slug]`, exatamente como o PROJECT.md
 * descreve.
 *
 * A lista de idiomas vem de `config.ts`, que não importa o next-intl: quem
 * roda no cliente consome de lá.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
});

export type { Locale } from "./config";
