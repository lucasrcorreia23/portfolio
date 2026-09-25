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
 * Qual idioma um caminho já está falando.
 *
 * O inverso de `stripLocale`, e a fonte é a mesma: sob `localePrefix:
 * "as-needed"` a URL **é** a verdade sobre o idioma. Existe para o chunk da
 * cena, que precisa montar o href de um case e está longe demais do servidor
 * para receber o idioma por prop — quatro saltos de componente para uma string
 * de duas letras que a barra de endereço já tem.
 */
export function localeOf(pathname: string): Locale {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
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

/** O domínio de produção — PROJECT.md §0. O sitemap e o `metadataBase` leem daqui. */
export const SITE_URL = "https://www.lucasrc.com.br";

/**
 * Os `hreflang` de uma rota: o canônico no idioma dela, e a mesma rota nos
 * dois idiomas. `x-default` é o inglês, que é o idioma sem prefixo.
 */
export function alternatesFor(pathname: string, locale: Locale) {
  return {
    canonical: localizePath(pathname, locale),
    languages: {
      en: localizePath(pathname, "en"),
      pt: localizePath(pathname, "pt"),
      "x-default": localizePath(pathname, "en"),
    },
  };
}
