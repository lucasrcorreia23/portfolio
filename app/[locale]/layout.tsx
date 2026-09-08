import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hud } from "@/components/hud/Hud";
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
          props, o que mantém o formatador ICU fora do navegador — 13 kB
          comprimidos de diferença medida. Ver AGENTS.md, "Orçamento de JS". */}
      {/* A cena **não** mora aqui. Ela é montada pela home, ao lado do portão,
          porque só a home tem descida: quem chega direto num case por link não
          tem progresso para dirigir a câmera nem motivo para baixar 350 kB. O
          `bg-void` do body já sustenta o fundo das outras rotas, e a névoa
          parada dentro do case (DIRECTION.md §4) é outro prompt. */}
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
