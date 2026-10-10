"use client";

import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, ShaderMaterial, Vector2, Vector3 } from "three";
import { createGrassGeometry, createSporeGeometry } from "@/lib/scene/flora";
import { loadFlowers, type Flowers } from "@/lib/scene/hero-flower";
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

/**
 * A flora: relva, flores e esporos. Um draw call por tipo de planta (a relva e
 * as duas variantes da flor) e um para os esporos. É tudo que emite luz.
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

  // As flores são um modelo: chegam por arquivo, depois da relva.
  const [flowers, setFlowers] = useState<Flowers | null>(null);
  useEffect(() => {
    let alive = true;
    let loaded: Flowers | null = null;
    const release = (held: Flowers) => {
      held.texture.dispose();
      for (const variant of held.variants) variant.geometry.dispose();
    };
    loadFlowers().then(
      (result) => {
        loaded = result;
        if (alive) setFlowers(result);
        else release(result);
      },
      () => {},
    );
    return () => {
      alive = false;
      if (loaded !== null) release(loaded);
    };
  }, []);

  const flowerMaterials = useMemo(
    () =>
      flowers === null
        ? []
        : flowers.variants.map(
            (variant) =>
              new ShaderMaterial({
                uniforms: {
                  ...fogUniforms(shared),
                  uHeight: { value: built.height },
                  uMap: { value: flowers.texture },
                  uTeal: shared.teal,
                  uTall: { value: variant.tall },
                },
                vertexShader: FLOWER_VERT,
                fragmentShader: FLOWER_FRAG,
                side: DoubleSide,
              }),
          ),
    [flowers, shared, built],
  );
  useEffect(
    () => () => {
      for (const material of flowerMaterials) material.dispose();
    },
    [flowerMaterials],
  );

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
    if (flowers !== null) {
      for (const variant of flowers.variants) {
        variant.geometry.instanceCount = Math.floor(variant.count * quality.flowers);
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
      {flowers === null
        ? null
        : flowers.variants.map((variant, index) => {
            const material = flowerMaterials[index];
            return material === undefined ? null : (
              <mesh
                key={index}
                geometry={variant.geometry}
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
