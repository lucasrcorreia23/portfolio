import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

/** `--void`, de `styles/tokens.css`: a cor da barra do navegador e do manifesto. */
export const VOID_COLOR = "#06090d";

/**
 * O que toda rota repete no Open Graph.
 *
 * O Next não funde `openGraph` entre segmentos: a rota que declara o seu
 * substitui o do layout inteiro, e sairia sem imagem, sem `og:site_name` e sem
 * idioma. A rota de case parte daqui e troca só título e descrição.
 */
export function openGraphBase(
  locale: Locale,
  text: { siteName: string; imageAlt: string },
): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    siteName: text.siteName,
    locale: locale === "pt" ? "pt_BR" : "en_US",
    alternateLocale: locale === "pt" ? "en_US" : "pt_BR",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: text.imageAlt }],
  };
}
