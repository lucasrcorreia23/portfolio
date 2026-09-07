/**
 * A configuração de idioma sem depender do next-intl.
 *
 * `routing.ts` monta o objeto do next-intl a partir daqui, e componentes de
 * cliente que só precisam saber quais idiomas existem e como montar um
 * caminho localizado importam este arquivo — não o next-intl. Ver AGENTS.md,
 * "Orçamento de JS".
 */

export const LOCALES = ["en", "pt"] as const;
export const DEFAULT_LOCALE = "en";

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Tira o prefixo de idioma de um caminho, se houver. */
export function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue; // o padrão não tem prefixo
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

/**
 * Reescreve um caminho para outro idioma, preservando a rota.
 * `/work/x` ↔ `/pt/work/x`, `/` ↔ `/pt`.
 *
 * Implementa a mesma regra que `localePrefix: "as-needed"` do next-intl:
 * o idioma padrão não ganha prefixo.
 */
export function localizePath(pathname: string, locale: Locale): string {
  const bare = stripLocale(pathname);
  if (locale === DEFAULT_LOCALE) return bare;
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`;
}
