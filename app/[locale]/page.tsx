import { getTranslations, setRequestLocale } from "next-intl/server";
import { BeatSection } from "@/components/beats/BeatSection";
import { BEATS } from "@/components/beats/beats";
import { EmergenceBeat } from "@/components/beats/EmergenceBeat";
import { IdentityBeat } from "@/components/beats/IdentityBeat";
import { Gate } from "@/components/gate/Gate";
import { SceneGate } from "@/components/scene/SceneGate";
import { requireLocale } from "@/lib/i18n/locale";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(requireLocale(locale));

  const t = await getTranslations();

  // As três linhas do posicionamento, na ordem de leitura. São as mesmas três
  // disciplinas que filtram o rio mais adiante — a arquitetura do site dita
  // uma vez e reaproveitada.
  const position = [
    t("identity.position.product"),
    t("identity.position.engineering"),
    t("identity.position.brand"),
  ];

  return (
    <>
      <Gate />
      {/* A cena vive na home, com o portão: é aqui que existe descida. O
          `specimen` desce como prop porque nenhum componente de cliente deste
          projeto importa o next-intl. */}
      <SceneGate specimen={t("identity.specimen")} />
      <main id="descent" tabIndex={-1} className="md:pl-24">
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
                position={position}
              />
            ) : null}
          </BeatSection>
        ))}
      </main>
    </>
  );
}
