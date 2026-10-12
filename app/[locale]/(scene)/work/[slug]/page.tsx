import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Glyphs } from "@/components/text/Glyphs";
import { CaseExit } from "@/components/work/CaseExit";
import { CaseReveal } from "@/components/work/CaseReveal";
import { PlateHud } from "@/components/work/PlateHud";
import { caseSummary, getCaseSlugs, getCases, loadCase } from "@/lib/cases";
import { alternatesFor, localizePath } from "@/lib/i18n/config";
import { requireLocale } from "@/lib/i18n/locale";
import { plateImage } from "@/lib/plate";
import { PANEL_ASPECT } from "@/lib/scene/stops";
import { openGraphBase } from "@/lib/site-meta";
import { isLocked } from "@/lib/work/locked";
import { caseComponents } from "@/lib/work/mdx-case";

/** Os slugs vêm do disco; qualquer outro é 404, sem render dinâmico. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getCaseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const slugs = await getCaseSlugs();
  if (!slugs.includes(slug)) notFound();

  const { frontmatter } = await loadCase(slug);
  const typed = requireLocale(locale);
  const t = await getTranslations({ locale: typed, namespace: "meta" });

  return {
    title: t("workTitle", { title: frontmatter.title }),
    description: caseSummary(frontmatter, locale),
    alternates: alternatesFor(`/work/${slug}`, typed),
    // Case com senha fica fora dos buscadores.
    ...(isLocked(slug) ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      ...openGraphBase(typed, { siteName: t("title"), imageAlt: t("ogAlt") }),
      type: "article",
      title: t("workTitle", { title: frontmatter.title }),
      description: caseSummary(frontmatter, locale),
    },
  };
}

/**
 * A rota de um case — o outro lado da travessia.
 *
 * ## A capa é a superfície de entrega, e por isso é um `<img>` puro
 *
 * Todo o resto da mídia deste arquivo passa por `next/image`. A capa é a
 * montagem da placa (`lib/plate.ts`), já derivada no tamanho de entrega por
 * `scripts/derive-placas.mjs`; a cena desenha a versão `.sm` dela no painel,
 * com o mesmo HUD por cima, e por isso a troca no fim do voo não aparece.
 *
 * `fetchPriority="high"` porque ela é o LCP desta rota nos dois caminhos de
 * chegada, e `aspect-ratio` vindo de `PANEL_ASPECT` porque o retângulo
 * precisa existir com o tamanho final **antes** de a imagem chegar: é ele que a
 * cena lê para saber onde parar.
 *
 * ## O que não é traduzido, e está declarado
 *
 * O corpo do MDX é único e está em português; `summary_en` dos quatro cases
 * migrados é hoje uma cópia literal de `summary_pt`. A rota em inglês existe,
 * resolve e é indexável — o que falta nela é tradução, não estrutura. Ver
 * AGENTS.md, "O que falta", item 1.
 */
export default async function CasePage({
  params,
}: PageProps<"/[locale]/work/[slug]">) {
  const { locale, slug } = await params;
  const typed = requireLocale(locale);
  setRequestLocale(typed);

  const slugs = await getCaseSlugs();
  if (!slugs.includes(slug)) notFound();

  const { frontmatter, Content, sizes } = await loadCase(slug);
  const t = await getTranslations("cases");

  const cases = await getCases();
  const here = cases.findIndex((entry) => entry.slug === slug);
  const next = here < 0 ? undefined : cases[(here + 1) % cases.length];

  return (
    <main className="case px-6 pb-32 pt-24 md:pl-56 md:pr-12">
      <CaseExit />
      <CaseReveal>
        {/* A capa é a mesma placa que o painel da cena desenha, a montagem
            com o HUD por cima: é o retângulo dela que a travessia lê para
            saber onde encaixar. */}
        <figure
          data-case-cover
          className="case-cover"
          style={{ aspectRatio: String(PANEL_ASPECT) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={plateImage(slug)}
            alt={frontmatter.title}
            fetchPriority="high"
            decoding="async"
          />
          <PlateHud
            name={frontmatter.title}
            index={Math.max(here, 0)}
            client={frontmatter.client}
          />
        </figure>

        <div className="case-head">
          <p className="type-mono text-hud text-mist w-fit" data-veil data-readout>
            {String(Math.max(here, 0) + 1).padStart(2, "0")} · {frontmatter.client} ·{" "}
            {frontmatter.year}
          </p>

          <h1
            aria-label={frontmatter.title}
            data-veil
            className="case-title type-display text-display-2 w-fit"
          >
            <Glyphs text={frontmatter.title} />
          </h1>

          <p
            className="case-summary fog-in text-body-lg text-mist w-fit"
            data-veil
            style={{ "--wait": "500ms" } as CSSProperties}
          >
            {caseSummary(frontmatter, typed)}
          </p>

          <dl
            data-veil
            data-readout
            className="case-meta type-mono w-fit"
            style={{ "--wait": "700ms" } as CSSProperties}
          >
            <dt>{t("case.role")}</dt>
            <dd>{frontmatter.role}</dd>
            <dt>{t("case.disciplines")}</dt>
            <dd>
              {frontmatter.disciplines
                .map((discipline) => t(`disciplines.${discipline}`))
                .join(" · ")}
            </dd>
            <dt>{t("case.stack")}</dt>
            <dd>{frontmatter.stack.join(" · ")}</dd>
          </dl>
        </div>

        <article className="case-body">
          {/* A âncora do véu do corpo: uma caixa da largura da medida de
              leitura, aparada pela janela em `readVeilBoxes`. */}
          <span aria-hidden="true" data-veil className="case-veil" />
          <Content
            components={caseComponents({
              frontmatter,
              locale: typed,
              sizes,
              generatedLabel: t("case.generated"),
            })}
          />
        </article>

        {next === undefined ? null : (
          <footer data-veil className="case-foot type-mono text-hud">
            <Link
              href={localizePath(`/work/${next.slug}`, typed)}
              className="case-foot-link group inline-flex items-center gap-2"
            >
              {t("case.next")}: {next.frontmatter.title}
              <span
                aria-hidden="true"
                className="ease-strong h-px w-4 origin-left bg-current transition-transform duration-(--dur-snap) group-hover:scale-x-150"
              />
            </Link>
          </footer>
        )}
      </CaseReveal>
    </main>
  );
}
