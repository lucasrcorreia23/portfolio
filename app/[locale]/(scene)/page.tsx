import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BeatSection } from "@/components/beats/BeatSection";
import { BEATS } from "@/components/beats/beats";
import { StationList } from "@/components/beats/StationList";
import { Gate } from "@/components/gate/Gate";
import { getCases } from "@/lib/cases";
import { alternatesFor, localizePath } from "@/lib/i18n/config";
import { requireLocale } from "@/lib/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternatesFor("/", requireLocale(locale)) };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const typed = requireLocale(locale);
  setRequestLocale(typed);
  const t = await getTranslations();

  const stations = (await getCases()).map((entry) => ({
    slug: entry.slug,
    href: localizePath(`/work/${entry.slug}`, typed),
    title: entry.frontmatter.title,
    client: entry.frontmatter.client,
    year: entry.frontmatter.year,
  }));

  return (
    <>
      <Gate />
      <main id="descent" tabIndex={-1} className="md:pl-44">
        {BEATS.map((beat) => (
          <BeatSection key={beat.id} beat={beat} label={t(`${beat.id}.label`)}>
            {beat.id === "cases" ? (
              <StationList stations={stations} enterLabel={t("cases.enter")} />
            ) : null}
          </BeatSection>
        ))}
      </main>
    </>
  );
}
