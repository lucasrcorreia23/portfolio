import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hud } from "@/components/hud/Hud";
import { fontVariables } from "@/lib/fonts";
import { SITE_URL } from "@/lib/i18n/config";
import { routing } from "@/lib/i18n/routing";
import { ScrollProvider } from "@/lib/scroll/ScrollProvider";
import "@/styles/globals.css";

/**
 * Este é o layout raiz — não existe `app/layout.tsx`. Todas as rotas moram
 * sob `[locale]`, e o proxy reescreve `/` para o idioma padrão.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    // Sem isto, a capa que a rota de case declara como imagem de Open Graph
    // sai como caminho relativo e o Next resolve contra `localhost:3000` — o
    // aviso da build é literal sobre isso. O domínio é o do PROJECT.md §0.
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    // A imagem de Open Graph **é a cena**: o último quadro da descida — a
    // câmara vazia, a luz de fora em lâminas e a cota ±00.000 gravada na
    // soleira —, lido do buffer do WebGL pela sonda e recortado em 1200×630.
    // Um case troca por a capa dele (ver `work/[slug]/page.tsx`).
    openGraph: {
      type: "website",
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      locale: locale === "pt" ? "pt_BR" : "en_US",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: t("ogAlt") }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Sem isto as rotas caem para render dinâmico.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables}>
      {/* Sem `NextIntlClientProvider`: nenhum componente de cliente deste
          projeto traduz. As strings são resolvidas no servidor e descem como
          props, o que mantém o formatador ICU fora do navegador — 13 kB
          comprimidos de diferença medida. Ver AGENTS.md, "Orçamento de JS". */}
      {/* A cena **não** mora aqui, e não é mais porque "só a home tem descida":
          ela mora em `app/[locale]/(scene)/layout.tsx`, um grupo de rotas que
          cobre `/` e `/work/[slug]` e deixa `/work` de fora. O acervo continua
          sem 3D (DIRECTION.md §4) e o canvas atravessa vivo a navegação da home
          para o case, que é o que a transição contínua exige. O motivo original
          — um link direto de case não pagar 350 kB no caminho crítico —
          continua respeitado pelo `import()` memoizado de `loadScene()`. */}
      {/* **Sem `bg-void` aqui.** Quem pinta o fundo é o `html`
          (`styles/globals.css`), e a diferença não é de gosto: a camada da cena
          é `-z-10`, e a ordem de pintura do CSS põe camadas de z negativo
          **antes** do fundo dos descendentes em fluxo. Com `bg-void` no body, o
          body pintava por cima do canvas e escondia a cena inteira — invisível
          enquanto a camada era só uma div da mesma cor, e total no instante em
          que ela virou a câmara. */}
      <body className="text-mist">
        <ScrollProvider>
          <Hud />
          {children}
        </ScrollProvider>
      </body>
    </html>
  );
}
