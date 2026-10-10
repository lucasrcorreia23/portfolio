import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Placeholder } from "@/components/work/Placeholder";
import { VitrineGrid } from "@/components/work/VitrineGrid";
import { VITRINE } from "@/content/vitrine";
import { alternatesFor, localizePath } from "@/lib/i18n/config";
import { requireLocale } from "@/lib/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vitrine">): Promise<Metadata> {
  const { locale } = await params;
  const typed = requireLocale(locale);
  const t = await getTranslations({ locale: typed, namespace: "meta" });
  return {
    title: t("vitrineTitle"),
    alternates: alternatesFor("/vitrine", typed),
  };
}

/**
 * A vitrine: uma página só, em DOM, sem cena. Cada item é uma imagem (hoje um
 * placeholder gerado em código) e a informação básica dele.
 */
export default async function VitrinePage({
  params,
}: PageProps<"/[locale]/vitrine">) {
  const { locale } = await params;
  const typed = requireLocale(locale);
  setRequestLocale(typed);
  const t = await getTranslations("vitrine");

  return (
    <main className="px-6 pb-32 pt-24 md:pl-56 md:pr-12">
      <h1 className="type-display text-display-2">{t("title")}</h1>
      <div className="mt-16">
        <VitrineGrid
          types={VITRINE.map((item) => item.type)}
          filterLabel={t("filter")}
          allLabel={t("all")}
        >
          {VITRINE.map((item, index) => {
            const body = (
              <>
                <Placeholder
                  name={item.name}
                  index={index}
                  className="vitrine-image"
                />
                <div className="type-mono text-hud text-mist mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-label">{item.name}</span>
                  {item.year === undefined ? null : <span>{item.year}</span>}
                  {item.discipline === undefined ? null : (
                    <span>{item.discipline}</span>
                  )}
                </div>
              </>
            );
            return item.slug === undefined ? (
              <div key={item.name}>{body}</div>
            ) : (
              <Link
                key={item.name}
                href={localizePath(`/work/${item.slug}`, typed)}
                className="vitrine-link block"
              >
                {body}
              </Link>
            );
          })}
        </VitrineGrid>
      </div>
    </main>
  );
}
