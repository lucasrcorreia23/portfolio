import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { casePath, keyCookie } from "@/lib/work/case-lock";
import { caseKey } from "@/lib/work/locked";

/**
 * No Next 16 o arquivo `middleware.ts` foi renomeado para `proxy.ts` —
 * mesma capacidade, nome novo. O `createMiddleware` do next-intl continua se
 * chamando assim; é ele quem reescreve `/` para o idioma padrão e reconhece
 * o prefixo `/pt`.
 */
const intl = createMiddleware(routing);

/**
 * Antes do idioma, a senha: a rota de um case trancado só é servida a quem
 * traz o cookie da chave (`app/api/case-key`). Sem ele a pessoa volta para a
 * descida, onde a placa do case tem o campo. Vale também para o payload que
 * o roteador busca adiantado.
 */
export default function proxy(request: NextRequest) {
  const target = casePath(request.nextUrl.pathname);
  const expected = target === null ? undefined : caseKey(target.slug);
  if (
    target !== null &&
    expected !== undefined &&
    request.cookies.get(keyCookie(target.slug))?.value !== expected
  ) {
    return NextResponse.redirect(new URL(`${target.prefix || "/"}#cases`, request.url));
  }
  return intl(request);
}

export const config = {
  // Tudo, menos rotas de API, artefatos internos e qualquer coisa com
  // extensão (arquivos em /public).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
