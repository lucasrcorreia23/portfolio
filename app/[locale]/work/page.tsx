import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { caseSummary, getAllCases } from "@/lib/cases";
import { DISCIPLINES, isDiscipline } from "@/lib/disciplines";
import { localizePath } from "@/lib/i18n/config";
import { requireLocale } from "@/lib/i18n/locale";

/**
 * O acervo — PROJECT.md §4, "o acervo é maior que o rio".
 *
 * Lista completa dos cases, em DOM puro: sem cena, sem 3D, sem canvas. É a
 * única forma de chegar num case fora do rio, e é o que impede a curadoria de
 * virar exclusão — promover um case depois é virar um booleano, não
 * reconstruir uma rota.
 *
 * Deliberadamente sem graça. Quem chega aqui está procurando uma coisa
 * específica, não sendo apresentado ao trabalho: a cena é o argumento, o
 * acervo é o índice.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: requireLocale(locale),
    namespace: "work",
  });

  return { title: t("archive.title") };
}

export default async function ArchivePage({
  params,
  searchParams,
}: PageProps<"/[locale]/work">) {
  const { locale } = await params;
  const typed = requireLocale(locale);
  setRequestLocale(typed);

  const t = await getTranslations("work");
  // `getAllCases`, não `getRiverCases`: aqui é o acervo inteiro, por definição.
  const cases = await getAllCases();

  /**
   * O `?d=` vem da HUD, e é a mesma seleção que vai promover cards no rio
   * (`lib/work/filter-store.ts`). Aqui ele filtra a lista — o acervo é índice,
   * e índice se filtra removendo linhas; no rio o mesmo eixo **promove**, e
   * nada some. Os dois comportamentos são diferentes de propósito
   * (DIRECTION.md §4).
   *
   * Um valor fora dos três eixos é ignorado, não é erro: uma URL colada errado
   * mostra o acervo inteiro, que é o destino certo por padrão.
   */
  const raw = (await searchParams)["d"];
  const asked = typeof raw === "string" ? raw : undefined;
  const selected = isDiscipline(asked) ? asked : null;
  const shown =
    selected === null
      ? cases
      : cases.filter((entry) =>
          entry.frontmatter.disciplines.includes(selected),
        );

  return (
    <main className="px-6 py-32 md:pl-56">
      <h1 className="type-mono text-label">{t("archive.title")}</h1>

      <ul className="mt-6 flex gap-4">
        <li>
          <Link
            href={localizePath("/work", typed)}
            aria-current={selected === null ? "true" : "false"}
            className="type-mono text-hud text-mist aria-[current=true]:text-cyan"
          >
            {t("archive.all")}
          </Link>
        </li>
        {DISCIPLINES.map((discipline) => (
          <li key={discipline}>
            <Link
              href={`${localizePath("/work", typed)}?d=${discipline}`}
              aria-current={selected === discipline ? "true" : "false"}
              className="type-mono text-hud text-mist aria-[current=true]:text-cyan"
            >
              {t(`disciplines.${discipline}`)}
            </Link>
          </li>
        ))}
      </ul>

      {shown.length === 0 ? (
        <p className="measure text-body mt-8">{t("archive.empty")}</p>
      ) : (
        <ul className="mt-12 max-w-3xl">
          {shown.map(({ slug, frontmatter }) => (
            <li key={slug} className="border-t border-deep py-8">
              <Link
                href={localizePath(`/work/${slug}`, typed)}
                className="group block"
              >
                <p className="type-mono text-hud-sm">
                  {frontmatter.client} · {frontmatter.year}
                  {/* Estar fora do rio é público e sem estigma: é uma decisão
                      de composição, não um julgamento sobre o trabalho. */}
                  {frontmatter.in_river ? null : (
                    <> · {t("archive.outsideRiver")}</>
                  )}
                </p>
                <h2 className="type-display text-display-3 mt-2 group-hover:text-cyan">
                  {frontmatter.title}
                </h2>
                <p className="measure text-body-sm mt-3">
                  {caseSummary(frontmatter, typed)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
