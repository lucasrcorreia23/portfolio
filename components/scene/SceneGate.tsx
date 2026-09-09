"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSceneMode } from "@/lib/capabilities/use-scene-mode";
import { stripLocale } from "@/lib/i18n/config";
import { loadScene, type SceneComponent } from "@/lib/scene/load-scene";
import type { RiverCard } from "@/lib/scene/river-content";
import { setCaseRoute } from "@/lib/work/case-transition";

type SceneGateProps = {
  specimen: string;
  river: readonly RiverCard[];
};

/** `/work/<slug>` → `<slug>`; qualquer outra rota do grupo → `null`. */
function caseSlugOf(pathname: string): string | null {
  const bare = stripLocale(pathname);
  if (!bare.startsWith("/work/")) return null;
  const slug = bare.slice("/work/".length);
  return slug.length > 0 && !slug.includes("/") ? slug : null;
}

/**
 * O portão **da cena** — decide qual das três versões dela roda, e agora também
 * informa em qual rota do grupo ela está.
 *
 * Não confundir com `components/gate/`, que é o portão **de entrada** (o
 * preloader, o contador, a veneziana). Nomes parecidos, papéis sem interseção.
 *
 * ## O `pathname` é a autoridade da travessia
 *
 * O clique num card publica `entering` na hora, mas quem confirma que a
 * travessia aconteceu é a rota. Ler isso aqui, e não no clique, é o que faz o
 * mecanismo cobrir os caminhos que ninguém orquestrou: o botão voltar do
 * navegador, um link direto para um case, a entrada pelo acervo, um reload
 * dentro do case, uma navegação abortada. Todos passam por `pathname`, e
 * nenhum passa pelo clique. Ver `lib/work/case-transition.ts`.
 */
export function SceneGate({ specimen, river }: SceneGateProps) {
  const mode = useSceneMode();
  const pathname = usePathname();
  const [Scene, setScene] = useState<SceneComponent | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-scene-mode", mode);
    return () => {
      root.removeAttribute("data-scene-mode");
    };
  }, [mode]);

  useEffect(() => {
    const slug = caseSlugOf(pathname);
    const index =
      slug === null ? -1 : river.findIndex((card) => card.slug === slug);
    setCaseRoute(slug, index);
  }, [pathname, river]);

  useEffect(() => {
    if (mode !== "driven" && mode !== "composed") return;
    let cancelled = false;
    loadScene().then(
      (component) => {
        if (!cancelled) setScene(() => component);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div
      aria-hidden="true"
      data-scene-mode={mode}
      className="pointer-events-none fixed inset-0 -z-10 bg-void"
    >
      {Scene === null ? null : (
        <Scene
          specimen={specimen}
          river={river}
          composed={mode === "composed"}
        />
      )}
    </div>
  );
}
