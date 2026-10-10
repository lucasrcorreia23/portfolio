"use client";

import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, ShaderMaterial, Vector2, Vector3 } from "three";
import { createGrassGeometry, createSporeGeometry } from "@/lib/scene/flora";
import {
  loadPlants,
  markPlantsSettled,
  SPECIES,
  type Plants,
} from "@/lib/scene/plants";
import { getQuality, GRASS_MAX, SPORES_MAX } from "@/lib/scene/quality";
import {
  FLOWER_FRAG,
  FLOWER_VERT,
  GRASS_FRAG,
  GRASS_VERT,
  SPORE_FRAG,
  SPORE_VERT,
} from "@/lib/scene/shaders/flora";
import { createHeightTexture } from "@/lib/scene/terrain";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";

const FORWARD = new Vector3();
/** Até onde, à frente e atrás da câmera, uma zona de flora é desenhada. */
const AHEAD = 85;
const BEHIND = 28;

/**
 * A flora: relva, plantas e esporos. Um draw call por tipo de planta e por zona
 * da trilha, e um para os esporos. É tudo que emite luz.
 */
export function Flora({ shared }: { shared: SharedUniforms }) {
  const built = useMemo(() => {
    const fog = fogUniforms(shared);
    const height = createHeightTexture();
    return {
      height,
      grassGeometry: createGrassGeometry(),
      grassMaterial: new ShaderMaterial({
        uniforms: {
          ...fog,
          uHeight: { value: height },
          uTeal: shared.teal,
          uMist: shared.mist,
          uFocus: { value: new Vector2() },
        },
        vertexShader: GRASS_VERT,
        fragmentShader: GRASS_FRAG,
        side: DoubleSide,
      }),
      sporeGeometry: createSporeGeometry(),
      sporeMaterial: new ShaderMaterial({
        uniforms: {
          ...fog,
          uResolution: shared.resolution,
          uVeilBox: shared.veilBox,
          uVeilF: shared.veilF,
          uPanelRect: shared.panelRect,
          uBoxCenter: { value: new Vector3() },
        },
        vertexShader: SPORE_VERT,
        fragmentShader: SPORE_FRAG,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    };
  }, [shared]);

  useEffect(() => {
    const held = built;
    return () => {
      held.height.dispose();
      held.grassGeometry.dispose();
      held.grassMaterial.dispose();
      held.sporeGeometry.dispose();
      held.sporeMaterial.dispose();
    };
  }, [built]);

  // As plantas são modelos: chegam por arquivo, depois da relva.
  const [plants, setPlants] = useState<Plants | null>(null);
  useEffect(() => {
    let alive = true;
    let loaded: Plants | null = null;
    const release = (held: Plants) => {
      for (const texture of Object.values(held.textures)) texture.dispose();
      for (const batch of held.batches) batch.geometry.dispose();
    };
    loadPlants().then(
      (result) => {
        loaded = result;
        if (alive) setPlants(result);
        else release(result);
      },
      // Sem os arquivos a cena segue só com a relva: ninguém fica esperando.
      () => markPlantsSettled(),
    );
    return () => {
      alive = false;
      if (loaded !== null) release(loaded);
    };
  }, []);

  const plantMaterials = useMemo(
    () =>
      plants === null
        ? []
        : plants.batches.map((batch) => {
            const species = SPECIES[batch.species];
            return new ShaderMaterial({
              uniforms: {
                ...fogUniforms(shared),
                uHeight: { value: built.height },
                uMap: { value: plants.textures[batch.species] },
                uTeal: shared.teal,
                uTall: { value: batch.tall },
                uPetal: { value: new Vector2(species.petal[0], species.petal[1]) },
                uEmit: { value: species.emit },
                uSway: { value: species.sway },
                uLeaf: { value: species.leaf },
              },
              vertexShader: FLOWER_VERT,
              fragmentShader: FLOWER_FRAG,
              side: DoubleSide,
            });
          }),
    [plants, shared, built],
  );
  useEffect(
    () => () => {
      for (const material of plantMaterials) material.dispose();
    },
    [plantMaterials],
  );

  // Avisa depois do commit: as malhas das plantas já estão na cena quando o
  // laço mestre compila os shaders.
  useEffect(() => {
    if (plants !== null) markPlantsSettled();
  }, [plants, plantMaterials]);

  useFrame((state) => {
    // O ladrilho de relva e o volume dos esporos ficam à frente da câmera.
    state.camera.getWorldDirection(FORWARD);
    const focus = built.grassMaterial.uniforms["uFocus"]?.value as Vector2;
    focus.set(
      state.camera.position.x + FORWARD.x * 22,
      state.camera.position.z + FORWARD.z * 22,
    );
    const center = built.sporeMaterial.uniforms["uBoxCenter"]?.value as Vector3;
    center.copy(state.camera.position).addScaledVector(FORWARD, 26);

    // O nível de qualidade só escreve contagens.
    const quality = getQuality();
    built.grassGeometry.instanceCount = Math.floor(GRASS_MAX * quality.grass);
    built.sporeGeometry.setDrawRange(0, Math.floor(SPORES_MAX * quality.spores));
    if (plants !== null) {
      // A zona longe da câmera não é desenhada: a névoa já a esconde, e é o
      // que impede o mundo inteiro de ir para a GPU a cada quadro.
      const z = state.camera.position.z;
      for (const batch of plants.batches) {
        const visible = z - batch.nearZ < AHEAD && batch.farZ - z < BEHIND;
        batch.geometry.instanceCount = visible
          ? Math.floor(batch.count * quality.flowers)
          : 0;
      }
    }
  }, -8);

  return (
    <>
      <mesh
        geometry={built.grassGeometry}
        material={built.grassMaterial}
        frustumCulled={false}
      />
      {plants === null
        ? null
        : plants.batches.map((batch, index) => {
            const material = plantMaterials[index];
            return material === undefined ? null : (
              <mesh
                key={index}
                geometry={batch.geometry}
                material={material}
                frustumCulled={false}
              />
            );
          })}
      <points
        geometry={built.sporeGeometry}
        material={built.sporeMaterial}
        frustumCulled={false}
        renderOrder={2}
      />
    </>
  );
}
