"use client";

import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, ShaderMaterial, Vector2, Vector3 } from "three";
import {
  createFlowerGeometry,
  createGrassGeometry,
  createSporeGeometry,
} from "@/lib/scene/flora";
import { loadHeroFlower, type HeroFlower } from "@/lib/scene/hero-flower";
import { getQuality, GRASS_MAX, SPORES_MAX } from "@/lib/scene/quality";
import {
  FLOWER_FRAG,
  FLOWER_VERT,
  GRASS_FRAG,
  GRASS_VERT,
  HERO_FRAG,
  HERO_VERT,
  SPORE_FRAG,
  SPORE_VERT,
} from "@/lib/scene/shaders/flora";
import { createHeightTexture } from "@/lib/scene/terrain";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";

const FORWARD = new Vector3();

/**
 * A flora: relva, flores e esporos. Três draw calls, um por tipo, e é tudo que
 * emite luz na cena.
 */
export function Flora({ shared }: { shared: SharedUniforms }) {
  const built = useMemo(() => {
    const fog = fogUniforms(shared);
    const height = createHeightTexture();
    const flowers = createFlowerGeometry();
    return {
      height,
      flowerCount: flowers.count,
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
      flowerGeometry: flowers.geometry,
      flowerMaterial: new ShaderMaterial({
        uniforms: { ...fog, uHeight: { value: height }, uTeal: shared.teal },
        vertexShader: FLOWER_VERT,
        fragmentShader: FLOWER_FRAG,
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
      held.flowerGeometry.dispose();
      held.flowerMaterial.dispose();
      held.sporeGeometry.dispose();
      held.sporeMaterial.dispose();
    };
  }, [built]);

  // A flor de perto chega depois: é um arquivo. Até lá, e se ele faltar, o
  // campo é só o das flores geradas.
  const [hero, setHero] = useState<HeroFlower | null>(null);
  useEffect(() => {
    let alive = true;
    let loaded: HeroFlower | null = null;
    loadHeroFlower().then(
      (flower) => {
        loaded = flower;
        if (alive) setHero(flower);
        else {
          flower.geometry.dispose();
          flower.texture.dispose();
        }
      },
      () => {},
    );
    return () => {
      alive = false;
      loaded?.geometry.dispose();
      loaded?.texture.dispose();
    };
  }, []);
  const heroMaterial = useMemo(
    () =>
      hero === null
        ? null
        : new ShaderMaterial({
            uniforms: {
              ...fogUniforms(shared),
              uHeight: { value: built.height },
              uMap: { value: hero.texture },
              uTeal: shared.teal,
            },
            vertexShader: HERO_VERT,
            fragmentShader: HERO_FRAG,
            side: DoubleSide,
          }),
    [hero, shared, built],
  );
  useEffect(() => () => heroMaterial?.dispose(), [heroMaterial]);

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
    built.flowerGeometry.instanceCount = Math.floor(built.flowerCount * quality.flowers);
    built.sporeGeometry.setDrawRange(0, Math.floor(SPORES_MAX * quality.spores));
    if (hero !== null) {
      hero.geometry.instanceCount = Math.floor(hero.count * quality.flowers);
    }
  }, -8);

  return (
    <>
      <mesh
        geometry={built.grassGeometry}
        material={built.grassMaterial}
        frustumCulled={false}
      />
      <mesh
        geometry={built.flowerGeometry}
        material={built.flowerMaterial}
        frustumCulled={false}
      />
      {hero === null || heroMaterial === null ? null : (
        <mesh geometry={hero.geometry} material={heroMaterial} frustumCulled={false} />
      )}
      <points
        geometry={built.sporeGeometry}
        material={built.sporeMaterial}
        frustumCulled={false}
        renderOrder={2}
      />
    </>
  );
}
