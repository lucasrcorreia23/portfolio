import { LOCALES } from "@/lib/i18n/config";

/**
 * O cookie de um case com senha, e a forma da rota dele. Sem segredo aqui:
 * as chaves ficam em `locked.ts`.
 */

/** O cookie que abre a rota: só o servidor lê, e é ele que o proxy confere. */
export const keyCookie = (slug: string) => `case-key-${slug}`;

const CASE_PATH = new RegExp(`^(?:/(${LOCALES.join("|")}))?/work/([^/]+)/?$`);

/** O idioma e o slug de um caminho de case, ou `null` se não for um. */
export function casePath(pathname: string): { prefix: string; slug: string } | null {
  const match = CASE_PATH.exec(pathname);
  if (match === null) return null;
  return { prefix: match[1] === undefined ? "" : `/${match[1]}`, slug: match[2] ?? "" };
}
