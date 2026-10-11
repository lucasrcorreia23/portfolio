"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Texture } from "three";
import { createSporeField } from "@/lib/scene/spores";
import type { SharedUniforms } from "@/lib/scene/uniforms";

/**
 * Os esporos e o pólen: um passo de simulação por quadro e um draw call de
 * pontos. O passo roda depois do laço mestre (prioridade −10), com a câmera
 * já no lugar.
 */
export function Spores({ shared, height }: { shared: SharedUniforms; height: Texture }) {
  const field = useMemo(() => createSporeField(shared, height), [shared, height]);
  useEffect(() => () => field.dispose(), [field]);

  useFrame((state, delta) => {
    field.step(state.gl, state.camera, Math.min(delta, 1 / 30));
  }, -8);

  return (
    <points
      geometry={field.geometry}
      material={field.material}
      frustumCulled={false}
      renderOrder={2}
    />
  );
}
