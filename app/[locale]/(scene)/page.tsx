import { getTranslations, setRequestLocale } from "next-intl/server";
import { AboutBeat } from "@/components/beats/AboutBeat";
import { BeatSection } from "@/components/beats/BeatSection";
import { BEATS } from "@/components/beats/beats";
import { EmergenceBeat } from "@/components/beats/EmergenceBeat";
import { IdentityBeat } from "@/components/beats/IdentityBeat";
import { Gate } from "@/components/gate/Gate";
import { SurfaceBeat } from "@/components/beats/SurfaceBeat";
import { WorkBeat } from "@/components/beats/WorkBeat";
import { getRiverCases } from "@/lib/cases";
import type { Metadata } from "next";
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

  // A curadoria do rio, em ordem de `river_rank`. Quem desce a mesma lista para
  // a **cena** é o layout do grupo (`(scene)/layout.tsx`); aqui ela serve à
  // links invisíveis dos cards em DOM, que são o caminho de teclado, de sem-JS e de
  // indexação para os mesmos cases.
  const river = (await getRiverCases()).map((entry) => ({
    rank: entry.frontmatter.river_rank,
    slug: entry.slug,
    href: localizePath(`/work/${entry.slug}`, typed),
    client: entry.frontmatter.client,
    title: entry.frontmatter.title,
    year: entry.frontmatter.year,
    accent: entry.frontmatter.accent,
    disciplines: entry.frontmatter.disciplines,
  }));

  // As três linhas do posicionamento, na ordem de leitura. São as mesmas três
  // disciplinas que filtram o rio mais adiante — a arquitetura do site dita
  // uma vez e reaproveitada.
  const position = [
    t("identity.position.product"),
    t("identity.position.engineering"),
    t("identity.position.brand"),
  ];

  // Os três parágrafos do manifesto. Chaves nomeadas e não um array porque o
  // dicionário é JSON tipado pelo shape do inglês (`lib/i18n/augment.d.ts`):
  // um array não teria como falhar na compilação se um idioma tivesse dois
  // parágrafos e o outro três.
  const manifesto = [
    t("about.manifesto.one"),
    t("about.manifesto.two"),
    t("about.manifesto.three"),
  ];

  return (
    <>
      {/* O portão vive na home, e só nela: quem chega direto num case por link
          não tem cena para carregar nem descida para destravar. A **cena**, ao
          contrário, mora um nível acima — em `(scene)/layout.tsx` —, porque ela
          precisa atravessar viva a navegação para o case. */}
      <Gate />
      <main id="descent" tabIndex={-1} className="md:pl-44">
        {BEATS.map((beat) => (
          <BeatSection key={beat.id} beat={beat} label={t(`${beat.id}.label`)}>
            {beat.id === "emergence" ? (
              <EmergenceBeat
                beat={beat}
                name={t("emergence.name")}
                stationLabel={t("hud.lexicon.station")}
              />
            ) : null}
            {beat.id === "identity" ? (
              <IdentityBeat
                beat={beat}
                specimen={t("identity.specimen")}
                name={t("identity.name")}
                position={position}
              />
            ) : null}
            {beat.id === "about" ? (
              <AboutBeat beat={beat} manifesto={manifesto} />
            ) : null}
            {beat.id === "work" ? (
              <WorkBeat
                beat={beat}
                river={river}
                stationLabel={t("hud.lexicon.station")}
                enterLabel={t("work.enter")}
              />
            ) : null}
            {beat.id === "surface" ? (
              <SurfaceBeat
                beat={beat}
                locale={typed}
                farewell={t("surface.farewell")}
                labels={{
                  email: t("surface.email"),
                  profiles: t("surface.profiles"),
                  language: t("surface.language"),
                }}
                profileNames={{
                  linkedin: t("hud.profiles.linkedin"),
                  github: t("hud.profiles.github"),
                  x: t("hud.profiles.x"),
                }}
                localeNames={{
                  en: t("surface.locales.en"),
                  pt: t("surface.locales.pt"),
                }}
              />
            ) : null}
          </BeatSection>
        ))}
      </main>
    </>
  );
}
