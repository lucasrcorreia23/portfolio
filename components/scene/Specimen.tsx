"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ExtrudeGeometry, FrontSide, GLSL3, ShaderMaterial, ShapePath, type Mesh } from "three";
import { MONOGRAM } from "@/lib/scene/monogram-data";
import { GLASS_FRAG, GLASS_VERT } from "@/lib/scene/shaders/glass";
import { TYPE_ARTICLE } from "@/lib/scene/type-article";
import { bakeTypeField, type TypeField } from "@/lib/scene/type-field";
import {
  GLASS_LAYER,
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";

type SpecimenProps = {
  shared: SharedUniforms;
  /**
   * A string do dicionário. Desde a rodada 17 a peça é o monograma e não a
   * desenha; ela continua descendo porque é o texto acessível do `<h1>`.
   */
  text: string;
  /** Ângulo de ataque já amortecido, escrito por quadro pelo laço mestre. */
  attackRef: { readonly current: number };
};

/**
 * O corpo de prova: a assinatura LRC como geometria dentro da cena.
 *
 * **Extrudada de leve, com chanfro** (rodada 17). O contorno vem de
 * `monogram-data.ts` (os glifos do próprio Archivo Expanded ExtraBold), vira
 * `ShapePath` → `ExtrudeGeometry` do three core — nada entra no pacote — e é
 * centrado no traço e na espessura. Até a rodada 16 a peça era a palavra
 * CORREIA pelo troika, em espessura zero; a proibição de "laje extrudada" caiu
 * para a peça por decisão do Lucas. O campo de descolamento continua fino.
 *
 * **Opaca, escrevendo profundidade.** A oclusão continua sendo a mesma: os
 * corpos do bando são opacos e escrevem profundidade, a peça também, e o teste
 * de profundidade decide quem está na frente. Sem o troika não há mais borda
 * macia de SDF para proteger — o chanfro e o antisserrilhado do alvo
 * multiamostrado fazem esse papel.
 */
function buildMonogram(): ExtrudeGeometry {
  const variant = MONOGRAM[TYPE_ARTICLE.variant];
  const scale = TYPE_ARTICLE.size / 1000;
  const [minX, minY, maxX, maxY] = variant.bounds;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const at = (x: number | undefined, y: number | undefined): [number, number] => [
    ((x ?? 0) - cx) * scale,
    ((y ?? 0) - cy) * scale,
  ];
  const shapes = variant.paths.flatMap((path) => {
    const shapePath = new ShapePath();
    for (const [cmd, ...args] of path) {
      if (cmd === "M") shapePath.moveTo(...at(args[0], args[1]));
      else if (cmd === "L") shapePath.lineTo(...at(args[0], args[1]));
      else if (cmd === "Q") shapePath.quadraticCurveTo(...at(args[0], args[1]), ...at(args[2], args[3]));
      else if (cmd === "C")
        shapePath.bezierCurveTo(...at(args[0], args[1]), ...at(args[2], args[3]), ...at(args[4], args[5]));
    }
    return shapePath.toShapes();
  });
  const geometry = new ExtrudeGeometry(shapes, {
    depth: TYPE_ARTICLE.depth,
    bevelEnabled: true,
    bevelThickness: TYPE_ARTICLE.bevel,
    bevelSize: TYPE_ARTICLE.bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -TYPE_ARTICLE.depth / 2);
  geometry.computeBoundingBox();
  return geometry;
}

export function Specimen({ shared, attackRef }: SpecimenProps) {
  const meshRef = useRef<Mesh>(null);
  const gl = useThree((state) => state.gl);
  const field = useRef<TypeField | null>(null);

  const { material, geometry } = useMemo(() => {
    // Vidro (rodada 20): ver `shaders/glass.ts`. Opaco e escrevendo
    // profundidade; o que ele tem de transparente vem do fundo amostrado.
    const specimenMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uCyan: shared.cyan,
        uViolet: shared.violet,
        uMagenta: shared.magenta,
        uMist: shared.mist,
        uBackdrop: shared.backdrop,
        uFlockAhead: shared.flockAhead,
        uAheadField: shared.flockAheadField,
        uAheadReady: shared.flockAheadReady,
        uSpecimenFogDepth: shared.specimenFogDepth,
        uSpecimenFogFlat: shared.specimenFogFlat,
      },
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      side: FrontSide,
      toneMapped: false,
    });
    specimenMaterial.glslVersion = GLSL3;
    return { material: specimenMaterial, geometry: buildMonogram() };
  }, [shared]);

  useEffect(() => {
    return () => {
      material.dispose();
      geometry.dispose();
    };
  }, [material, geometry]);

  // O assado do campo de distância, uma vez, com a malha montada. O
  // monograma não depende de fonte nem de idioma: não há `sync()` a esperar.
  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    let baked: TypeField | null = null;
    try {
      baked = bakeTypeField(gl, mesh, TYPE_ARTICLE.capHeight);
    } catch (error) {
      // Falhar aqui degrada o beat para "sem interação com a peça", que é o
      // mesmo que `?detach=0`. O que não pode é falhar em silêncio.
      console.error("[specimen] o assado do campo de distância falhou", error);
    }
    if (baked === null) return;
    field.current?.dispose();
    field.current = baked;
    shared.typeField.value = baked.texture;
    shared.typeFieldRect.value.copy(baked.rect);
    shared.typeFieldReady.value = 1;
  }, [gl, shared, geometry]);

  useEffect(() => {
    return () => {
      field.current?.dispose();
      field.current = null;
      shared.typeField.value = null;
      shared.typeFieldReady.value = 0;
    };
  }, [shared]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (mesh === null) return;
    // O ângulo de ataque já chega amortecido: quem o resolve é o laço mestre, a
    // partir do progresso. Aqui só se aplica.
    mesh.rotation.y = attackRef.current;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[...TYPE_ARTICLE.position]}
      layers={GLASS_LAYER}
    />
  );
}
