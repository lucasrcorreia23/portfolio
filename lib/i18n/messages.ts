import type { Locale } from "./routing";

/**
 * Import estático por idioma: o Turbopack consegue dividir o bundle por
 * locale e ainda assim checar os caminhos em tempo de compilação. Cada
 * `index.ts` monta o dicionário a partir dos arquivos por beat.
 */
const dictionaries = {
  en: () => import("@/content/messages/en"),
  pt: () => import("@/content/messages/pt"),
} as const satisfies Record<Locale, () => Promise<unknown>>;

export async function getMessages(locale: Locale) {
  const loaded = await dictionaries[locale]();
  return loaded.default;
}
