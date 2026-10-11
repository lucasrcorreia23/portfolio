import type { MetadataRoute } from "next";
import { getCaseSlugs } from "@/lib/cases";
import { alternatesFor, LOCALES, SITE_URL } from "@/lib/i18n/config";
import { isLocked } from "@/lib/work/locked";

/**
 * O sitemap: a descida e cada case, nos dois idiomas, cada entrada
 * com os `hreflang` da outra. **Todos os cases**, e não só os do rio — o acervo
 * é maior que o rio (PROJECT.md §4), e ficar fora do corte de um aparelho não
 * tira ninguém da indexação.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Case com senha não é anunciado.
  const slugs = (await getCaseSlugs()).filter((slug) => !isLocked(slug));
  const paths = ["/", ...slugs.map((slug) => `/work/${slug}`)];

  return paths.flatMap((path) =>
    LOCALES.map((locale) => {
      const { canonical, languages } = alternatesFor(path, locale);
      return {
        url: `${SITE_URL}${canonical === "/" ? "" : canonical}`,
        alternates: {
          languages: {
            en: `${SITE_URL}${languages.en === "/" ? "" : languages.en}`,
            pt: `${SITE_URL}${languages.pt}`,
          },
        },
      };
    }),
  );
}
