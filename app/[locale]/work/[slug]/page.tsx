import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { caseSummary, getCaseSlugs, loadCase } from "@/lib/cases";
import { requireLocale } from "@/lib/i18n/locale";

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
  };
}

export default async function CasePage({
  params,
}: PageProps<"/[locale]/work/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(requireLocale(locale));

  const slugs = await getCaseSlugs();
  if (!slugs.includes(slug)) notFound();

  const { frontmatter, Content } = await loadCase(slug);

  return (
    <main className="px-6 py-32 md:pl-32">
      <p className="type-mono text-hud">
        {frontmatter.client} · {frontmatter.year}
      </p>

      <h1 className="type-display text-display-2 mt-4">{frontmatter.title}</h1>

      <p className="measure text-body-lg mt-8">
        {caseSummary(frontmatter, locale)}
      </p>

      <p className="type-mono text-hud-sm mt-4">
        {frontmatter.role} · {frontmatter.stack.join(" · ")}
      </p>

      {/* Dentro do case a névoa para e o texto fica plano e imóvel
          (DIRECTION.md §4). */}
      <article className="mt-24">
        <Content />
      </article>
    </main>
  );
}
