import { getLocale, getTranslations } from "next-intl/server";
import { BEAT_IDS, type BeatId } from "@/components/beats/beats";
import { EMAIL, PROFILES } from "@/lib/contact";
import { DISCIPLINES, type Discipline } from "@/lib/disciplines";
import { requireLocale } from "@/lib/i18n/locale";
import { CaseReturn } from "@/components/work/CaseReturn";
import { ArchiveLink } from "./ArchiveLink";
import { AudioToggle } from "./AudioToggle";
import { BeatReadout } from "./BeatReadout";
import { DescentSlot } from "./DescentSlot";
import { HudPanel } from "./HudPanel";
import { LanguageToggle } from "./LanguageToggle";
import { RiverFilters } from "./RiverFilters";
import { ScrollRule } from "./ScrollRule";

/**
 * A HUD lateral fixa — PROJECT.md §4, DIRECTION.md §4.
 *
 * Coluna estreita e permanente, em mono pequena, com contato, acervo, filtros
 * do trabalho, progresso como régua graduada e toggle de idioma. **Substitui o
 * rodapé: o site não tem rodapé.** No mobile ela colapsa num acionador no topo
 * (`HudPanel`).
 *
 * **O controle de áudio saiu na rodada 6.5 e voltou na 10**, junto com a
 * camada sonora: antes dela ele ligava e desligava silêncio.
 *
 * Três grupos, e a ordem é a da mão: quem procura contato acha em cima, quem
 * quer saber onde está lê o meio, quem quer mexer em alguma coisa acha embaixo.
 *
 * **É um Server Component, e isso é uma decisão de orçamento.** Os filhos
 * precisam de estado do cliente (progresso, filtro), mas não precisam de
 * tradução no cliente: as strings são resolvidas aqui e descem como props.
 * Assim o formatador ICU do next-intl e o dicionário inteiro ficam no servidor.
 * Ver AGENTS.md, "Orçamento de JS".
 *
 * Nada aqui usa opacidade reduzida: a HUD carrega informação e está na tela o
 * tempo todo, então é a caixa mais exposta do site à luz variável da cena
 * (DIRECTION.md §5). O tom baixo vem de corpo pequeno e tracking largo.
 */
export async function Hud() {
  const t = await getTranslations("hud");
  const tWork = await getTranslations("work");
  const tAll = await getTranslations();
  const locale = requireLocale(await getLocale());

  const beatLabels = Object.fromEntries(
    BEAT_IDS.map((id) => [id, tAll(`${id}.label`)]),
  ) as Record<BeatId, string>;

  const disciplines = Object.fromEntries(
    DISCIPLINES.map((id) => [id, tWork(`disciplines.${id}`)]),
  ) as Record<Discipline, string>;

  return (
    <HudPanel
      label={t("label")}
      openLabel={t("open")}
      closeLabel={t("close")}
      stationLabel={t("lexicon.station")}
    >
      <div className="flex flex-col gap-2">
        <p className="type-mono text-hud-sm text-mist">{t("contact")}</p>
        {/* O e-mail por extenso não cabe numa coluna de 176 px, e encolher o
            corpo para caber é justamente o que o DIRECTION.md §5 proíbe usar
            como tom baixo. O endereço inteiro aparece na Superfície, que é
            onde o PROJECT.md §4 o coloca; aqui ele é um link com rótulo. */}
        <a
          href={`mailto:${EMAIL}`}
          className="type-mono text-hud text-mist w-fit hover:text-cyan"
        >
          {t("email")}
        </a>
        <ul className="flex gap-3">
          {PROFILES.map((profile) => (
            <li key={profile.id}>
              <a
                href={profile.href}
                rel="me noreferrer"
                target="_blank"
                aria-label={t(`profiles.${profile.id}`)}
                className="type-mono text-hud text-mist hover:text-cyan"
              >
                {profile.short}
              </a>
            </li>
          ))}
        </ul>
        <ArchiveLink label={tWork("archive.title")} locale={locale} />
      </div>

      <div className="flex flex-col gap-4">
        <DescentSlot
          fallback={
            <CaseReturn
              label={tWork("case.back")}
              title={tWork("case.backTitle")}
              className="type-mono text-hud text-mist w-fit text-left hover:text-cyan"
            />
          }
        >
          <ScrollRule progressLabel={t("progress")} />
          <BeatReadout
            stationLabel={t("lexicon.station")}
            densityLabel={t("lexicon.density")}
            depthLabel={t("lexicon.depth")}
            beatLabels={beatLabels}
          />
          <RiverFilters label={t("filters")} disciplines={disciplines} />
        </DescentSlot>
      </div>

      <div className="flex flex-col gap-3">
        <AudioToggle
          label={t("audio.label")}
          onLabel={t("audio.on")}
          offLabel={t("audio.off")}
        />
        <LanguageToggle label={t("language")} active={locale} />
      </div>
    </HudPanel>
  );
}
