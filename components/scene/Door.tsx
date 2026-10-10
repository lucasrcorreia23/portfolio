"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Mesh } from "three";
import { DOOR_STOPS, doorExtension, loadDoor } from "@/lib/scene/door";
import { whenEntered } from "@/lib/scene/late-assets";
import { applyPbrMaps, createPbrMaterial, disposePbrMaterial } from "@/lib/scene/pbr";
import type { SharedUniforms } from "@/lib/scene/uniforms";

type DoorProps = {
  shared: SharedUniforms;
  /** `true` no modo calmo: não há laço, quem chega tarde pede um redesenho. */
  instant: boolean;
};

/**
 * A porta de enrolar das paradas de `DOOR_STOPS`. O modelo chega depois do
 * loading e o programa dela compila antes de ela aparecer, fora do quadro.
 * Quem a abre e fecha é o laço mestre, por `shared.doors`.
 */
export function Door({ shared, instant }: DoorProps) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const [mesh, setMesh] = useState<Mesh | null>(null);

  useEffect(() => {
    if (DOOR_STOPS.length === 0) return;
    let alive = true;
    const material = createPbrMaterial(shared, doorExtension(shared));
    // A porta do modelo é chapa galvanizada clara, que à noite acende como se
    // emitisse. Aqui ela é aço pintado, cinza frio e pouco metálico.
    material.color.setRGB(0.34, 0.38, 0.41);
    material.metalness = 0.2;
    let built: Mesh | null = null;
    void whenEntered()
      .then(loadDoor)
      .then(async (door) => {
        built = new Mesh(door.geometry, material);
        built.frustumCulled = false;
        await applyPbrMaps(gl, material, door.maps, () => alive);
        await gl.compileAsync(built, camera, scene);
        if (alive) setMesh(built);
      })
      // Sem o modelo a placa fica sem porta, e a cena segue.
      .catch(() => {});
    return () => {
      alive = false;
      built?.geometry.dispose();
      disposePbrMaterial(material);
    };
  }, [shared, gl, camera, scene]);

  useEffect(() => {
    if (mesh !== null && instant) window.dispatchEvent(new Event("resize"));
  }, [mesh, instant]);

  return mesh === null ? null : <primitive object={mesh} />;
}
