import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CaseReturn } from "@/components/work/CaseReturn";
import { CaseExit } from "@/components/work/CaseExit";
import { CaseReveal } from "@/components/work/CaseReveal";
import { caseSummary, getCaseSlugs, getRiverCases, loadCase } from "@/lib/cases";
import { alternatesFor, localizePath } from "@/lib/i18n/config";
import { requireLocale } from "@/lib/i18n/locale";
import { CARD_COVER_ASPECT } from "@/lib/scene/card-layout";
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
  const t = await getTranslations({
    locale: requireLocale(locale),
    namespace: "meta",
  });

  return {
    title: t("workTitle", { title: frontmatter.title }),
    description: caseSummary(frontmatter, locale),
    alternates: alternatesFor(`/work/${slug}`, requireLocale(locale)),
    openGraph: {
      title: t("workTitle", { title: frontmatter.title }),
      description: caseSummary(frontmatter, locale),
      images: [frontmatter.coverSrc],
    },
  };
}

/**
 * A rota de um case — o outro lado da travessia.
 *
 * ## A capa é a superfície de entrega, e por isso é um `<img>` puro
 *
 * Todo o resto da mídia deste arquivo passa por `next/image`, que é o certo:
 * há JPEGs de 3840 px aqui, e o LCP de 4G do PROJECT.md §5 não sobrevive a
 * entregá-los inteiros. A capa é a exceção, e o motivo é o encaixe: no fim do
 * voo a cena está desenhando **a mesma imagem** naquele retângulo, e ela a
 * carrega a partir do `currentSrc` deste elemento. Duas imagens do mesmo assunto
 * em tamanhos diferentes seriam dois downloads e duas versões que não são bit a
 * bit iguais justamente no quadro em que uma substitui a outra.
 *
 * `fetchPriority="high"` porque ela é o LCP desta rota nos dois caminhos de
 * chegada, e `aspect-ratio` vindo de `CARD_COVER_ASPECT` porque o retângulo
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
  const t = await getTranslations("work");
  const tHud = await getTranslations("hud");

  const cover = sizes[frontmatter.coverSrc];
  const coverAlt =
    frontmatter.media.find((item) => item.src === frontmatter.cover)?.[
      typed === "pt" ? "alt_pt" : "alt_en"
    ] ?? t("case.cover", { title: frontmatter.title });

  // O próximo posto da curadoria, para o case não ser um beco sem saída. Ele
  // dá a volta no fim: o sétimo aponta para o primeiro, porque o rio é uma
  // ordem editorial e não uma paginação.
  const river = await getRiverCases();
  const here = river.findIndex((entry) => entry.slug === slug);
  const next = here < 0 ? undefined : river[(here + 1) % river.length];

  return (
    <main className="case px-6 pb-32 pt-24 md:pl-56 md:pr-12">
      <CaseExit />
      <CaseReveal>
        <figure
          data-case-cover
          className="case-cover"
          style={{ aspectRatio: String(CARD_COVER_ASPECT) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frontmatter.coverSrc}
            alt={coverAlt}
            {...(cover === undefined
              ? {}
              : { width: cover.width, height: cover.height })}
            fetchPriority="high"
            decoding="async"
          />
        </figure>

        <div className="case-head">
          <p className="type-mono text-hud text-mist w-fit" data-veil>
            {frontmatter.client} · {frontmatter.year} · {tHud("lexicon.station")}{" "}
            {String(frontmatter.river_rank).padStart(3, "0")}
          </p>

          <h1 data-veil className="type-display text-display-2 mt-4 w-fit">
            {frontmatter.title}
          </h1>

          <p className="measure text-body-lg text-mist mt-8 w-fit" data-veil>
            {caseSummary(frontmatter, typed)}
          </p>

          <dl data-veil className="case-meta type-mono text-hud-sm mt-10 w-fit">
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

        {/* Névoa parada e texto imóvel: nada aqui reage ao scroll
            (DIRECTION.md §4). A única coisa que se move na tela é o organismo,
            atrás, desacelerado. */}
        <article className="case-body">
          {/* A âncora do véu do corpo: uma caixa só, da largura da medida de
              leitura, cobrindo o artigo inteiro. Ela é aparada pela janela em
              `readVeilBoxes`, então o que chega ao compositor é a fatia visível
              da coluna — que é literalmente o "véu ancorado à coluna de texto"
              do DIRECTION.md §5. As figuras ficam **fora** dela de propósito:
              elas são mais largas que a medida, e o que precisa de proteção é o
              texto. */}
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

        <footer data-veil className="case-foot type-mono text-hud mt-24">
          <CaseReturn
            label={t("case.back")}
            title={t("case.backTitle")}
            className="case-foot-link"
          />
          {next === undefined ? null : (
            <Link
              href={localizePath(`/work/${next.slug}`, typed)}
              className="case-foot-link"
            >
              {t("case.next")}: {next.frontmatter.title}
              <span aria-hidden="true"> →</span>
            </Link>
          )}
          <Link
            href={localizePath("/work", typed)}
            className="case-foot-link"
          >
            {t("archive.title")}
          </Link>
        </footer>
      </CaseReveal>
    </main>
  );
}
