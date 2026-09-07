import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localizePath } from "@/lib/i18n/config";
import { requireLocale } from "@/lib/i18n/locale";

/**
 * A entrada de acervo da HUD — PROJECT.md §4.
 *
 * É a única forma de chegar num case fora do rio, então não é opcional e não
 * pode depender de JavaScript: um `<a>` de verdade, renderizado no servidor,
 * que funciona no modo calmo, sem WebGL e com o JS ainda baixando.
 */
export async function ArchiveLink() {
  const t = await getTranslations("work");
  const locale = requireLocale(await getLocale());

  return (
    <Link
      href={localizePath("/work", locale)}
      className="type-mono text-hud text-mist hover:text-cyan"
    >
      {t("archive.title")}
    </Link>
  );
}
