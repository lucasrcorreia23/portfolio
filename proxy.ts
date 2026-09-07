import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

/**
 * No Next 16 o arquivo `middleware.ts` foi renomeado para `proxy.ts` —
 * mesma capacidade, nome novo. O `createMiddleware` do next-intl continua se
 * chamando assim; é ele quem reescreve `/` para o idioma padrão e reconhece
 * o prefixo `/pt`.
 */
export default createMiddleware(routing);

export const config = {
  // Tudo, menos rotas de API, artefatos internos e qualquer coisa com
  // extensão (arquivos em /public).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
