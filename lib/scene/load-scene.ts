import type { ComponentType } from "react";
import type { SceneProps } from "@/components/scene/Scene";

/**
 * O ponto único de carregamento da cena — o mesmo desenho de
 * `lib/scroll/load-driver.ts`, pela mesma razão e com um chunk quinze vezes
 * maior.
 *
 * Dois lugares esperam por esta promessa e nenhum deles quer dois downloads: o
 * `SceneGate`, que monta a cena assim que ela chega, e o preloader do portão,
 * que conta esse carregamento como progresso. É o chunk de 350 kB do
 * PROJECT.md §5, e o portão é exatamente o momento de baixá-lo — enquanto a
 * veneziana está fechada e a espera é o que ele existe para cobrir.
 *
 * Numa falha a memoização é desfeita: uma queda de rede não deve deixar o site
 * sem cena pelo resto da sessão. E se ela nunca chegar, o portão abre assim
 * mesmo (o teto de 6 s do manifesto) para uma câmara escura com o conteúdo em
 * DOM inteiro — que é o degradado certo, não uma tela de erro.
 */
export type SceneComponent = ComponentType<SceneProps>;

let pending: Promise<SceneComponent> | null = null;

export function loadScene(): Promise<SceneComponent> {
  if (pending !== null) return pending;

  pending = import("@/components/scene/Scene")
    .then((module) => module.default)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });

  return pending;
}
