"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, ShaderMaterial, type Mesh } from "three";
import { createPlates } from "@/lib/scene/frame";
import { createGantries } from "@/lib/scene/industry";
import { whenEntered } from "@/lib/scene/late-assets";
import {
  createPbrMaterial,
  disposePbrMaterial,
  loadPbrSet,
  type PbrMaterial,
  type PbrSet,
} from "@/lib/scene/pbr";
import { getQuality } from "@/lib/scene/quality";
import { GLASS_FRAG, GLASS_VERT } from "@/lib/scene/shaders/panel";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";

type PlatesProps = {
  shared: SharedUniforms;
  /** `true` no modo calmo: não há laço, quem chega tarde pede um redesenho. */
  instant: boolean;
};

/** A profundidade do relevo da chapa, em voltas de textura. */
const PARALLAX = 0.02;

/**
 * O corpo das placas dos cases: a moldura de chapa, o verso, o vidro e o
 * pórtico que as sustenta. A imagem e o link ficam na `Panels`.
 *
 * Cinco draw calls para as seis paradas. As texturas chegam depois do loading
 * (`whenEntered`); até lá cada material tem mapas de um pixel.
 */
export function Plates({ shared, instant }: PlatesProps) {
  const gl = useThree((state) => state.gl);
  const glass = useRef<Mesh>(null);

  const built = useMemo(() => {
    const plates = createPlates();
    const gantries = createGantries();
    return {
      plates,
      gantries,
      frame: createPbrMaterial(shared),
      back: createPbrMaterial(shared),
      steel: createPbrMaterial(shared),
      concrete: createPbrMaterial(shared),
      glass: new ShaderMaterial({
        uniforms: { ...fogUniforms(shared), uRecess: shared.caseRecess },
        vertexShader: GLASS_VERT,
        fragmentShader: GLASS_FRAG,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    };
  }, [shared]);

  useEffect(() => {
    const held = built;
    let alive = true;
    const sets: readonly (readonly [PbrMaterial, PbrSet, boolean])[] = [
      [held.frame, "metal_plate_02", true],
      [held.steel, "green_metal_rust", false],
      [held.concrete, "concrete_wall_006", false],
      [held.back, "corrugated_iron_02", false],
    ];
    void whenEntered().then(async () => {
      for (const [material, set, height] of sets) {
        if (!alive) return;
        // Sem a textura a chapa fica lisa, e a cena segue.
        await loadPbrSet(gl, material, set, () => alive, height).catch(() => {});
      }
      if (alive && instant) window.dispatchEvent(new Event("resize"));
    });
    return () => {
      alive = false;
      for (const geometry of Object.values(held.plates)) geometry.dispose();
      for (const geometry of Object.values(held.gantries)) geometry.dispose();
      for (const material of [held.frame, held.back, held.steel, held.concrete]) {
        disposePbrMaterial(material);
      }
      held.glass.dispose();
    };
  }, [built, gl, instant]);

  // O nível baixo de qualidade não tem vidro nem paralaxe.
  useFrame(() => {
    const quality = getQuality();
    if (glass.current !== null) glass.current.visible = quality.glass;
    built.frame.userData.parallax.value = quality.parallax ? PARALLAX : 0;
  }, -8);

  return (
    <>
      <mesh geometry={built.plates.frame} material={built.frame} frustumCulled={false} />
      <mesh geometry={built.plates.back} material={built.back} frustumCulled={false} />
      <mesh geometry={built.gantries.steel} material={built.steel} frustumCulled={false} />
      <mesh geometry={built.gantries.concrete} material={built.concrete} frustumCulled={false} />
      <mesh ref={glass} geometry={built.plates.glass} material={built.glass} frustumCulled={false} />
    </>
  );
}
