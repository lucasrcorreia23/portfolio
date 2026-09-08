"use client";

import { useEffect, useMemo } from "react";
import { BackSide, GLSL3, ShaderMaterial } from "three";
import {
  CHAMBER_FRAG,
  CHAMBER_VERT,
  SOURCE_FRAG,
} from "@/lib/scene/shaders/chamber";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";
import {
  CHAMBER_FAR,
  CHAMBER_HALF_HEIGHT,
  CHAMBER_HALF_WIDTH,
  CHAMBER_NEAR,
} from "@/lib/scene/world";

/**
 * A câmara: um duto comprido visto por dentro, mais a fonte distante que fecha
 * o fundo dele.
 *
 * **Uma caixa com `BackSide`, e não quatro planos.** Quatro planos seriam
 * quatro objetos, quatro entradas na lista de render e quatro chances de um
 * deles ficar com um material diferente. A caixa é uma malha e um material, e o
 * shader não precisa saber qual face está desenhando.
 *
 * A tampa do fundo é um objeto à parte porque **não é parede**: é a única coisa
 * da cena que emite, e ela emite fraquíssimo. "Uma fonte distante a montante"
 * (DIRECTION.md §4) é o que impede o fim do duto de ser um buraco preto, e é a
 * luz para a qual a descida inteira está andando.
 */
export function Chamber({ shared }: { shared: SharedUniforms }) {
  const { wall, source, depth, center } = useMemo(() => {
    const wallMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uWallColor: shared.abyss,
        uCyan: shared.cyan,
      },
      vertexShader: CHAMBER_VERT,
      fragmentShader: CHAMBER_FRAG,
      side: BackSide,
      depthWrite: true,
      transparent: false,
      toneMapped: false,
    });
    wallMaterial.glslVersion = GLSL3;

    const sourceMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
      },
      vertexShader: CHAMBER_VERT,
      fragmentShader: SOURCE_FRAG,
      depthWrite: true,
      transparent: false,
      toneMapped: false,
    });
    sourceMaterial.glslVersion = GLSL3;

    return {
      wall: wallMaterial,
      source: sourceMaterial,
      depth: CHAMBER_NEAR - CHAMBER_FAR,
      center: (CHAMBER_NEAR + CHAMBER_FAR) / 2,
    };
  }, [shared]);

  useEffect(() => {
    return () => {
      wall.dispose();
      source.dispose();
    };
  }, [wall, source]);

  return (
    <>
      <mesh position={[0, 0, center]} material={wall}>
        <boxGeometry
          args={[CHAMBER_HALF_WIDTH * 2, CHAMBER_HALF_HEIGHT * 2, depth]}
        />
      </mesh>
      {/* Meia unidade à frente da tampa: coplanar com a parede do fundo daria
          disputa de profundidade justo onde a névoa está mais espessa. */}
      <mesh position={[0, 0, CHAMBER_FAR + 0.5]} material={source}>
        <planeGeometry
          args={[CHAMBER_HALF_WIDTH * 2, CHAMBER_HALF_HEIGHT * 2]}
        />
      </mesh>
    </>
  );
}
