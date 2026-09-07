import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

/**
 * Os `params` de rota chegam como `string`. Tudo do next-intl —
 * `setRequestLocale`, `getTranslations`, os dicionários — trabalha com o
 * union `"en" | "pt"`. Este é o único ponto de estreitamento, e ele responde
 * 404 em vez de cair para o idioma padrão: `/fr/work/x` não é a home em
 * inglês, é um endereço que não existe.
 */
export function requireLocale(locale: string): Locale {
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}
