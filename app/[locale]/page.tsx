import { getTranslations, setRequestLocale } from "next-intl/server";
import { BeatSection } from "@/components/beats/BeatSection";
import { BEATS } from "@/components/beats/beats";
import { Gate } from "@/components/gate/Gate";
import { DisplayLine } from "@/components/type/DisplayLine";
import { requireLocale } from "@/lib/i18n/locale";

/**
 * A home é a descida completa — PROJECT.md §4.
 *
 * O portão é o beat "pré": ele mora aqui e não no layout, porque quem chega
 * direto num case por link não tem cena para carregar nem descida para
 * destravar.
 *
 * Os cinco beats seguintes são, por enquanto, só a estrutura de altura: as
 * alturas em viewport que o DIRECTION.md §4 prescreve, cada seção anunciando
 * seu intervalo de progresso. Nenhum deles tem conteúdo ainda.
 *
 * A única exceção é o corpo de prova no beat de Identidade: ele existe aqui
 * para a escala de display ser verificável. Quando o `troika-three-text`
 * entrar, o mesh vira a instância visível e este `h1` continua no DOM —
 * é ele que é lido, indexado e selecionado (PROJECT.md §5).
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(requireLocale(locale));

  const t = await getTranslations();

  return (
    <>
      <Gate />
      {/* `tabIndex` para o portão ter para onde devolver o foco quando a
          veneziana termina de abrir. Sem isso o teclado recomeçaria do topo
          do documento, que é a HUD — não a descida recém-aberta. */}
      <main id="descent" tabIndex={-1} className="md:pl-24">
        {BEATS.map((beat) => (
          <BeatSection key={beat.id} beat={beat} label={t(`${beat.id}.label`)}>
            {beat.id === "identity" ? (
              <DisplayLine as="h1" step="display-1" className="mt-6">
                {t("identity.specimen")}
              </DisplayLine>
            ) : null}
          </BeatSection>
        ))}
      </main>
    </>
  );
}
