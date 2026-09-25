"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { setConsoleFunction } from "three";
import type { RiverCard } from "@/lib/scene/river-content";
import { sceneSettings } from "@/lib/scene/settings";
import { CAMERA_FOV } from "@/lib/scene/world";
import { SceneWorld } from "./SceneWorld";

/**
 * **Um aviso do three, e um só, sai do console.** O R3F 9 cria um
 * `THREE.Clock` no próprio store de cada raiz, e o three 0.185 marca a classe
 * como obsoleta com um `warn` no construtor. Não há o que fazer do lado de cá:
 * o relógio é do R3F, e é ele que o `SceneClock` avança (ver "Duas armadilhas
 * do R3F" no AGENTS.md). O critério da rodada 12 é console limpo em dev, então
 * a mensagem é descartada **pelo texto exato** e toda outra saída do three
 * passa inalterada. Sai daqui no dia em que o R3F trocar o `Clock` pelo
 * `Timer`.
 */
const R3F_CLOCK_NOTICE = "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";
setConsoleFunction((type: string, message: string, ...params: unknown[]) => {
  if (type === "warn" && message === R3F_CLOCK_NOTICE) return;
  if (type === "error") console.error(message, ...params);
  else if (type === "warn") console.warn(message, ...params);
  else console.log(message, ...params);
});

export type SceneProps = {
  /** A string do corpo de prova (`identity.specimen`), traduzida no servidor. */
  specimen: string;
  /**
   * O conteúdo do rio, em ordem de curadoria (`river_rank`), resolvido no
   * servidor. São strings curtas — cliente, título, ano, slug, acento — e elas
   * viajam no payload da rota inicial; as **imagens** de capa não, elas são
   * carregadas aqui dentro, depois do primeiro quadro útil.
   */
  river: readonly RiverCard[];
  /**
   * `true` no modo calmo. A cena é a mesma; o que muda é que a câmera corta
   * entre composições fixas em vez de percorrer a curva.
   */
  composed: boolean;
};

/**
 * A raiz do chunk da cena.
 *
 * Tudo que este arquivo alcança — three, R3F, troika, os shaders — vive dentro
 * do chunk de 350 kB do PROJECT.md §5, e nada dele pode vazar para a rota
 * inicial. É por isso que ele só é alcançado por `import()` dinâmico, a partir
 * de `lib/scene/load-scene.ts`, e nunca importado estaticamente por ninguém.
 *
 * **`frameloop="never"`.** O `requestAnimationFrame` do R3F fica desligado;
 * quem avança a cena é o ticker do GSAP, que já é o relógio do scroll — ver
 * `SceneClock`. No modo calmo não há laço nenhum: uma composição por beat, um
 * `advance()` por corte.
 *
 * **`antialias: false` no framebuffer padrão.** O antisserrilhado acontece no
 * alvo interno do compositor, que é multiamostrado; ligá-lo também aqui pagaria
 * duas vezes por uma coisa que só a última passada — um triângulo de tela cheia
 * sem bordas — nem usaria.
 *
 * **`flat` e `linear`.** Desligam o tonemap e a conversão de espaço de cor do
 * R3F, porque quem faz as duas coisas é a última linha do composite. Deixar os
 * dois ligados aplicaria a conversão duas vezes.
 */
export default function Scene({ specimen, river, composed }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <Canvas
      ref={canvasRef}
      frameloop="never"
      dpr={[1, sceneSettings().dprCap]}
      flat
      linear
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 200, position: [0, 0.9, 8] }}
    >
      <SceneWorld
        specimen={specimen}
        river={river}
        instant={composed}
        canvasRef={canvasRef}
      />
    </Canvas>
  );
}
