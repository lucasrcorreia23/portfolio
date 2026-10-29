import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { SceneGate } from "@/components/scene/SceneGate";
import { getCases } from "@/lib/cases";
import { requireLocale } from "@/lib/i18n/locale";

/**
 * O grupo que é dono da cena: a home e `/work/[slug]` dividem esta instância
 * de layout, então navegar de uma para a outra reconcilia o `SceneGate` em vez
 * de remontá-lo, e o canvas atravessa a troca de rota vivo.
 */
export default async function SceneLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typed = requireLocale(locale);
  setRequestLocale(typed);

  const panels = (await getCases(typed)).map((entry, index) => ({
    slug: entry.slug,
    title: entry.frontmatter.title,
    client: entry.frontmatter.client,
    index,
  }));

  return (
    <>
      <SceneGate panels={panels} />
      {children}
    </>
  );
}
