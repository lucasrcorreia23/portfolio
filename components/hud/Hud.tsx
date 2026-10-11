import { getLocale, getTranslations } from "next-intl/server";
import { beatOf, VITRINE_PROGRESS } from "@/components/beats/beats";
import { CaseReturn } from "@/components/work/CaseReturn";
import { requireLocale } from "@/lib/i18n/locale";
import { STOP_COUNT } from "@/lib/scene/stops";
import { AudioToggle } from "./AudioToggle";
import { HudPanel } from "./HudPanel";
import { HudToggle } from "./HudToggle";
import { LanguageToggle } from "./LanguageToggle";
import { NavJump } from "./NavJump";
import { NavSlot } from "./NavSlot";
import { ScrollBar } from "./ScrollBar";
import { ScrollRule } from "./ScrollRule";

const LINK = "type-mono text-hud text-mist w-fit hover:text-cyan";

/**
 * A navegação permanente, na estrutura da HUD lateral: coluna à esquerda no
 * desktop, barra com acionador no mobile. O site não tem rodapé.
 *
 * Componente de servidor: resolve as strings e as desce como props, porque
 * nenhum componente de cliente importa o next-intl.
 */
export async function Hud() {
  const t = await getTranslations("nav");
  const tCases = await getTranslations("cases");
  const locale = requireLocale(await getLocale());

  const stopLabels = Array.from({ length: STOP_COUNT }, (_, index) =>
    t("stop", { index: index + 1 }),
  );

  return (
    <>
      <HudPanel
        label={t("label")}
        openLabel={t("open")}
        closeLabel={t("close")}
        menuLabel={t("menu")}
      >
        <nav aria-label={t("label")} className="flex flex-col gap-3">
          <NavJump progress={0} anchor="impact" className={LINK}>
            {t("home")}
          </NavJump>
          <NavJump progress={beatOf("cases").from} anchor="cases" className={LINK}>
            {t("cases")}
          </NavJump>
          <NavJump progress={VITRINE_PROGRESS} anchor="vitrine" className={LINK}>
            {t("vitrine")}
          </NavJump>
          <NavJump progress={1} anchor="cta" className={LINK}>
            {t("contact")}
          </NavJump>
        </nav>
        <NavSlot
          fallback={
            <CaseReturn
              label={tCases("case.back")}
              title={tCases("case.backTitle")}
              className={`${LINK} text-left`}
            />
          }
        >
          <ScrollRule label={t("rule")} stopLabels={stopLabels} />
        </NavSlot>
        <div data-hud-controls className="flex flex-col gap-3">
          <LanguageToggle label={t("language")} active={locale} />
          <AudioToggle
            label={t("audio.label")}
            onLabel={t("audio.on")}
            offLabel={t("audio.off")}
          />
          <HudToggle
            label={t("hud.label")}
            onLabel={t("hud.on")}
            offLabel={t("hud.off")}
          />
        </div>
      </HudPanel>
      <ScrollBar />
    </>
  );
}
