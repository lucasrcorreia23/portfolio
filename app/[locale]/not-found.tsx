import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localizePath } from "@/lib/i18n/config";
import { requireLocale } from "@/lib/i18n/locale";

export default async function NotFound() {
  const t = await getTranslations("meta");
  const locale = requireLocale(await getLocale());

  return (
    <main className="flex min-h-svh flex-col justify-center px-6 md:pl-32">
      <p className="type-mono text-hud">404</p>
      <h1 className="type-display text-display-2 mt-4">{t("title")}</h1>
      <Link
        href={localizePath("/", locale)}
        className="type-mono text-hud mt-8 underline underline-offset-4"
      >
        {localizePath("/", locale)}
      </Link>
    </main>
  );
}
