import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BeatSection } from "@/components/beats/BeatSection";
import { BEATS } from "@/components/beats/beats";
import { CaseCaption } from "@/components/beats/CaseCaption";
import { CtaBeat } from "@/components/beats/CtaBeat";
import { ImpactBeat } from "@/components/beats/ImpactBeat";
import { IntroBeat } from "@/components/beats/IntroBeat";
import { StationList } from "@/components/beats/StationList";
import { Gate } from "@/components/gate/Gate";
import { VITRINE } from "@/content/vitrine";
import { isLocked } from "@/lib/work/locked";
import { getCases } from "@/lib/cases";
import { EMAIL, PROFILES } from "@/lib/contact";
import { alternatesFor, localizePath, SITE_URL } from "@/lib/i18n/config";
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

  const cases = await getCases();
  const stations = cases.map((entry) => ({
    slug: entry.slug,
    href: localizePath(`/work/${entry.slug}`, typed),
    title: entry.frontmatter.title,
    client: entry.frontmatter.client,
    year: entry.frontmatter.year,
    locked: isLocked(entry.slug),
  }));
  const captions = cases.map((entry) => ({
    title: entry.frontmatter.title,
    client: entry.frontmatter.client,
    market:
      typed === "pt" ? entry.frontmatter.market_pt : entry.frontmatter.market_en,
    year: entry.frontmatter.year,
    disciplines: entry.frontmatter.disciplines
      .map((discipline) => t(`cases.disciplines.${discipline}`))
      .join(" · "),
  }));

  // Quem é o dono do site, para os buscadores. Só na home.
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: t("intro.fullName"),
    alternateName: t("meta.title"),
    url: SITE_URL,
    email: `mailto:${EMAIL}`,
    description: t("meta.description"),
    jobTitle: t("intro.position"),
    sameAs: PROFILES.flatMap((profile) =>
      typeof profile.href === "string" ? [profile.href] : [],
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(person).replace(/</g, "\\u003c"),
        }}
      />
      {/* O loading vive na home, e só nela. A cena mora um nível acima, em
          `(scene)/layout.tsx`, porque atravessa viva a navegação para o case. */}
      <Gate />
      <main id="descent" tabIndex={-1} className="md:pl-44">
        {BEATS.map((beat) => (
          <BeatSection key={beat.id} beat={beat} label={t(`${beat.id}.label`)}>
            {beat.id === "impact" ? (
              <ImpactBeat beat={beat} hint={t("impact.hint")} />
            ) : null}
            {beat.id === "intro" ? (
              <IntroBeat
                beat={beat}
                first={t("intro.first")}
                last={t("intro.last")}
                fullName={t("intro.fullName")}
                position={t("intro.position")}
                manifesto={[t("intro.manifesto.one"), t("intro.manifesto.two")]}
              />
            ) : null}
            {beat.id === "cases" ? (
              <div className="beat-stage justify-end pb-[12svh]">
                <CaseCaption captions={captions} />
                <StationList
                  stations={stations}
                  enterLabel={t("cases.enter")}
                  lock={{
                    label: t("cases.lock.label"),
                    wrong: t("cases.lock.wrong"),
                  }}
                />
              </div>
            ) : null}
            {beat.id === "vitrine" ? (
              // A vitrine é a parede de telas da cena. Em DOM, só os nomes,
              // para leitor de tela.
              <ul className="sr-only">
                {VITRINE.map((item) => (
                  <li key={item.name}>{item.name}</li>
                ))}
              </ul>
            ) : null}
            {beat.id === "cta" ? (
              <CtaBeat
                beat={beat}
                locale={typed}
                line={t("cta.line")}
                profileNames={{
                  linkedin: t("nav.profiles.linkedin"),
                  github: t("nav.profiles.github"),
                  x: t("nav.profiles.x"),
                  resume: t("nav.profiles.resume"),
                }}
              />
            ) : null}
          </BeatSection>
        ))}
      </main>
    </>
  );
}
