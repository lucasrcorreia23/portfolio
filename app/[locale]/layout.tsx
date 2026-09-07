import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hud } from "@/components/hud/Hud";
import { SceneGate } from "@/components/scene/SceneGate";
import { fontVariables } from "@/lib/fonts";
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
    title: t("title"),
    description: t("description"),
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
          props, o que mantém o formatador ICU fora do navegador — 67 kB
          comprimidos de diferença medida. Ver AGENTS.md, "Orçamento de JS". */}
      <body className="bg-void text-mist">
        <ScrollProvider>
          <SceneGate />
          <Hud />
          {children}
        </ScrollProvider>
      </body>
    </html>
  );
}
