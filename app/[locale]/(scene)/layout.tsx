import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SceneGate } from "@/components/scene/SceneGate";
import { getRiverCases } from "@/lib/cases";
import { requireLocale } from "@/lib/i18n/locale";
import { riverCardsFromCases } from "@/lib/scene/river-content";

/**
 * O layout que **é dono da cena**, e existe por uma razão só: o canvas não pode
 * remontar entre a home e um case.
 *
 * ## Por que isto não está no layout raiz
 *
 * O layout raiz cobre `/work` também, e o DIRECTION.md §4 é explícito sobre o
 * acervo: "DOM puro, sem cena, sem 3D. Ela é deliberadamente sem graça — quem
 * chega ali está procurando uma coisa específica". Então a cena precisa cobrir
 * `/` e `/work/[slug]` **sem** cobrir `/work`, e é exatamente isso que um grupo
 * de rotas faz: `(scene)` e `(archive)` não aparecem na URL, e quem está no
 * mesmo grupo divide a mesma instância de layout.
 *
 * Dividir a instância é o mecanismo inteiro da transição: navegando de `/` para
 * `/work/[slug]` o React reconcilia este layout em vez de remontá-lo, então o
 * `<div>` do `SceneGate`, o `<Canvas>` e o contexto WebGL atravessam a troca de
 * rota vivos. Sem isso não existe "sem tela branca" — existe um canvas novo com
 * um bando novo, e nada que se possa animar entre os dois.
 *
 * ## A decisão que isto reverte, e o que dela continua de pé
 *
 * O layout raiz dizia, em comentário, que a cena não morava lá para um link
 * direto de case não pagar 350 kB no caminho crítico. **Essa razão continua
 * valendo e continua sendo respeitada**: `loadScene()` é `import()` memoizado, o
 * chunk só é pedido depois do primeiro quadro útil, e a rota inicial do case
 * continua medida contra o teto de 200 kB (`npm run measure`).
 *
 * O que mudou é o outro lado da conta: o DIRECTION.md §4 sempre disse que dentro
 * do case há cena — "DOF desligada, névoa parada" —, e o §5 conta a rota de case
 * como um lugar onde a atmosfera existe. Uma rota de case sem cena não era uma
 * economia, era uma pendência.
 *
 * ## O portão continua na home
 *
 * `<Gate />` fica em `(scene)/page.tsx`, não aqui. Quem chega direto num case por
 * link não tem descida para destravar nem preloader a atravessar — o portão é o
 * beat "pré" da descida, e a descida é a home.
 */
export default async function SceneLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(requireLocale(locale));

  const t = await getTranslations();

  // A curadoria do rio, em ordem de `river_rank`. **O acervo inteiro desce**, e
  // quem corta pela capacidade do aparelho é a cena (7 no desktop, 4 no mobile
  // — DIRECTION.md §4): o corte depende da largura da janela, que o servidor
  // não conhece. `getRiverCases()` também é onde a garantia "nenhum filtro
  // devolve menos de dois cases" é conferida — ela quebra a build, não a
  // página (ver `assertFilterFloor`, em `lib/cases.ts`).
  //
  // Ele desce aqui, e não da home, porque a cena precisa saber a corrente
  // inteira em qualquer rota do grupo: dentro de um case ela ainda tem que
  // resolver qual card é aquele slug, e para onde a câmera volta.
  const river = riverCardsFromCases(await getRiverCases());

  return (
    <>
      {/* O `specimen` desce como prop porque nenhum componente de cliente deste
          projeto importa o next-intl. */}
      <SceneGate specimen={t("identity.specimen")} river={river} />
      {children}
    </>
  );
}
