import type enMessages from "@/content/messages/en";
import type { routing } from "./routing";

/**
 * Amarra o next-intl aos tipos deste projeto: `useTranslations` e
 * `getTranslations` passam a autocompletar as chaves reais do dicionário, e
 * uma chave inexistente vira erro de compilação em vez de string crua na tela.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof enMessages;
  }
}
