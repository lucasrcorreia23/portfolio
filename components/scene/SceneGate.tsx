"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSceneMode } from "@/lib/capabilities/use-scene-mode";
import { stripLocale } from "@/lib/i18n/config";
import { loadScene, type SceneComponent } from "@/lib/scene/load-scene";
import { markSceneUnavailable } from "@/lib/scene/scene-painted";
import type { ScenePanel } from "./Scene";
import { setCaseRoute } from "@/lib/work/case-transition";
import { ScenePoster } from "./ScenePoster";

type SceneGateProps = {
  /** Os cases, na ordem das paradas da trilha. */
  panels: readonly ScenePanel[];
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
export function SceneGate({ panels }: SceneGateProps) {
  const detected = useSceneMode();
  const pathname = usePathname();
  const [Scene, setScene] = useState<SceneComponent | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  // O contexto perdido vira poster: no iPhone, sem memória, o Safari derruba o
  // WebGL e o canvas ficaria congelado no último quadro, com a página parada.
  const [lost, setLost] = useState(false);
  const mode = lost ? "poster" : detected;

  useEffect(() => {
    const node = holder.current;
    if (node === null) return;
    const onLost = () => setLost(true);
    // O evento não sobe do canvas: a captura no contêiner o pega.
    node.addEventListener("webglcontextlost", onLost, true);
    return () => node.removeEventListener("webglcontextlost", onLost, true);
  }, []);

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
      slug === null ? -1 : panels.findIndex((panel) => panel.slug === slug);
    setCaseRoute(slug, index);
  }, [pathname, panels]);

  useEffect(() => {
    // Sem WebGL a cena nunca pinta: o loading não pode ficar esperando por ela.
    if (mode === "poster") markSceneUnavailable();
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
      ref={holder}
      aria-hidden="true"
      data-scene-mode={mode}
      className="pointer-events-none fixed inset-0 -z-10 bg-void"
    >
      {/* Sem WebGL, o poster da composição do beat — só na descida: dentro de
          um case a cena é névoa parada nos dois modos, e ali o fundo é o void. */}
      {mode === "poster" && stripLocale(pathname) === "/" ? <ScenePoster /> : null}
      {Scene === null || mode === "poster" ? null : (
        <Scene panels={panels} composed={mode === "composed"} />
      )}
    </div>
  );
}
