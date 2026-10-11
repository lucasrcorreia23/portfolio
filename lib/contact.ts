/**
 * Os endereços, num lugar só — PROJECT.md §0.
 *
 * A HUD mostra o contato o tempo todo e a Superfície o mostra por extenso no
 * fim da descida (PROJECT.md §4). São dois consumidores da mesma verdade, e
 * escrever o e-mail duas vezes garantiria que um dos dois ficasse velho.
 *
 * **As siglas são de duas letras e não são decoração.** A HUD é uma coluna
 * estreita em mono; escrever "LinkedIn" ali estouraria a coluna e obrigaria a
 * encolher o corpo, que é justamente o que o DIRECTION.md §5 proíbe usar como
 * tom baixo. O nome inteiro continua existindo no `aria-label`, então quem
 * navega por leitor de tela ouve "LinkedIn", não "IN".
 */

import type { Locale } from "@/lib/i18n/config";

export type Profile = {
  /** Chave da tradução em `hud.profiles`. */
  id: "linkedin" | "github" | "x" | "resume";
  /** A sigla que a HUD desenha. */
  short: string;
  /** Um endereço só, ou um por idioma. */
  href: string | Record<Locale, string>;
};

export const EMAIL = "lucas_rc15@live.com";

export const PROFILES: readonly Profile[] = [
  { id: "linkedin", short: "IN", href: "https://linkedin.com/in/lucasrcorreia" },
  { id: "github", short: "GH", href: "https://github.com/lucasrcorreia23" },
  { id: "x", short: "X", href: "https://x.com/lucasrcpd" },
  {
    id: "resume",
    short: "CV",
    href: { en: "/resume.pdf", pt: "/curriculo.pdf" },
  },
] as const;
