import { getLocale, getTranslations } from "next-intl/server";
import { SCENE_MODES, type SceneMode } from "@/lib/capabilities/scene-mode";
import { requireLocale } from "@/lib/i18n/locale";
import { ArchiveLink } from "./ArchiveLink";
import { LanguageToggle } from "./LanguageToggle";
import { SceneReadout } from "./SceneReadout";
import { ScrollRule } from "./ScrollRule";

/**
 * A HUD lateral fixa — PROJECT.md §4, DIRECTION.md §4.
 *
 * Coluna estreita e permanente, em mono pequena. Substitui o rodapé: o site
 * não tem rodapé. No mobile ela colapsa numa faixa no topo.
 *
 * Ainda faltam contato, filtros do rio e controle de áudio; entram com os
 * beats que os justificam. O que já está montado é a moldura, o indicador de
 * progresso como régua e o seletor de idioma.
 *
 * **É um Server Component, e isso é uma decisão de orçamento.** Os filhos
 * precisam de estado do cliente (progresso do scroll, capacidades do
 * dispositivo), mas não precisam de tradução no cliente: as strings são
 * resolvidas aqui e descem como props. Assim o formatador ICU do next-intl e
 * o dicionário inteiro ficam no servidor. Ver AGENTS.md, "Orçamento de JS".
 *
 * Nada aqui usa opacidade reduzida: a HUD carrega informação e está na tela
 * o tempo todo, então é a caixa mais exposta do site à luz variável da cena
 * (DIRECTION.md §5). O tom baixo vem de corpo pequeno e tracking largo.
 */
export async function Hud() {
  const t = await getTranslations("hud");
  const locale = requireLocale(await getLocale());

  const sceneLabels = Object.fromEntries(
    SCENE_MODES.map((mode) => [mode, t(`scene.${mode}`)]),
  ) as Record<SceneMode, string>;

  return (
    <aside
      aria-label={t("label")}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-6 px-6 py-4 md:inset-x-auto md:inset-y-0 md:left-0 md:w-24 md:flex-col md:items-start md:justify-between md:px-6 md:py-8"
    >
      <SceneReadout labels={sceneLabels} />
      <ArchiveLink />
      <ScrollRule
        progressLabel={t("progress")}
        stationLabel={t("lexicon.station")}
      />
      <LanguageToggle label={t("language")} active={locale} />
    </aside>
  );
}
