import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { casePath, keyCookie } from "@/lib/work/case-lock";
import { caseKey } from "@/lib/work/locked";

/**
 * A senha de um case: confere e, se bate, entrega o cookie que o proxy pede
 * para servir a rota. Duas formas de chegar: o campo da placa manda JSON e
 * recebe 204 ou 401; sem JavaScript o formulário posta direto e a resposta é
 * um redirecionamento, para o case ou de volta à descida.
 */

/**
 * Quanto o cookie dura, em segundos: o tempo de a travessia buscar a rota, e
 * mais nada. A senha não é lembrada — quem passa pela placa de novo, ou
 * recarrega o case, digita de novo.
 */
const KEY_MAX_AGE = 10;

export async function POST(request: NextRequest) {
  const json = (request.headers.get("content-type") ?? "").includes("application/json");
  let slug = "";
  let key = "";
  let href = "";
  if (json) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    slug = typeof body?.["slug"] === "string" ? body["slug"] : "";
    key = typeof body?.["key"] === "string" ? body["key"] : "";
  } else {
    const data = await request.formData().catch(() => null);
    slug = String(data?.get("slug") ?? "");
    key = String(data?.get("key") ?? "");
    href = String(data?.get("href") ?? "");
  }

  const expected = caseKey(slug);
  const given = createHash("sha256").update(key).digest("hex");
  const right =
    expected !== undefined && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

  // O destino do formulário sem JavaScript só vale se for a rota deste case.
  const target = casePath(href);
  const prefix = target?.slug === slug ? target.prefix : "";

  if (!right || expected === undefined) {
    if (json) return new NextResponse(null, { status: 401 });
    return NextResponse.redirect(new URL(`${prefix || "/"}#cases`, request.url), 303);
  }

  const response = json
    ? new NextResponse(null, { status: 204 })
    : NextResponse.redirect(new URL(`${prefix}/work/${slug}`, request.url), 303);
  response.cookies.set(keyCookie(slug), expected, {
    path: "/",
    maxAge: KEY_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
