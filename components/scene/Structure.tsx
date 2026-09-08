"use client";

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  GLSL3,
  ShaderMaterial,
} from "three";
import {
  STRUCTURE_FRAG,
  STRUCTURE_VERT,
} from "@/lib/scene/shaders/structure";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";
import {
  CHAMBER_HALF_HEIGHT,
  CHAMBER_HALF_WIDTH,
  SPECIMEN_HALF_HEIGHT,
  SPECIMEN_Z,
} from "@/lib/scene/world";

/**
 * A estrutura gravada — DIRECTION.md §2, "Medida gravada, nunca instrumento
 * numerado".
 *
 * A distribuição em Z é o roteiro dos dois beats, e não uma textura repetida:
 *
 * - **Perto da entrada não há nada.** A Emergência começa no escuro absoluto.
 * - **Uma marca só, em z = −16.** É literalmente o que o DIRECTION.md §4 pede
 *   para a Emergência: "Primeiro sinal da estrutura: **uma** marca gravada
 *   pegando luz de raspão quando um corpo isolado passa perto dela, e some."
 *   No singular. Duas já seriam um padrão, e padrão é o começo de uma grade.
 * - **A parede cotada, de −18 para trás.** Réguas correndo pela parede e
 *   marcas de intervalo em dois períodos primos entre si, 7 e 11, que só
 *   voltam a coincidir a cada 77 unidades — mais do que cabe num quadro.
 * - **A cota do corpo de prova, em z = −26.** Linhas de chamada na altura de
 *   caixa alta da peça e uma seta de escala entre elas: "o título é
 *   dimensionado como peça de ensaio".
 *
 * Os números gravados em mono ficam para o prompt seguinte: exigem um segundo
 * arquivo de fonte e uma segunda instância de troika, e o que este prompt pediu
 * foi geometria de linha.
 */

const RULE_FROM = -18;
const RULE_TO = -74;
const LONE_MARK_Z = -16;

type Builder = {
  push: (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    nx: number,
    ny: number,
    nz: number,
    seed: number,
  ) => void;
};

function createBuilder(): Builder & { build: () => BufferGeometry } {
  const positions: number[] = [];
  const normals: number[] = [];
  const seeds: number[] = [];

  const push: Builder["push"] = (ax, ay, az, bx, by, bz, nx, ny, nz, seed) => {
    positions.push(ax, ay, az, bx, by, bz);
    normals.push(nx, ny, nz, nx, ny, nz);
    seeds.push(seed, seed);
  };

  return {
    push,
    build() {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(positions), 3),
      );
      geometry.setAttribute(
        "aNormal",
        new BufferAttribute(new Float32Array(normals), 3),
      );
      geometry.setAttribute(
        "aSeed",
        new BufferAttribute(new Float32Array(seeds), 1),
      );
      return geometry;
    },
  };
}

function buildStructure(): BufferGeometry {
  const b = createBuilder();
  // Recuadas da parede: a gravação é recessada, e o brilho pega a quina.
  const x = CHAMBER_HALF_WIDTH - 0.05;

  // A marca solitária da Emergência.
  b.push(-x, -1.1, LONE_MARK_Z, -x, -0.2, LONE_MARK_Z, 1, 0, 0, 0.31);

  // Alturas assimétricas: duas réguas na mesma altura nas duas paredes leriam
  // como grade, que o PROJECT.md §2 veta.
  // A parede de estibordo tem duas porque é ela que a câmera raspa em Quem sou
  // (ver os pontos de controle de 0.34 a 0.45 em `lib/scene/curve.ts`), e uma
  // régua sozinha a três unidades da lente lê como um risco, não como uma
  // parede cotada. As quatro alturas são todas diferentes: duas na mesma altura
  // nas duas paredes leriam como grade, que o PROJECT.md §2 veta.
  const rules: readonly { y: number; side: number; seed: number }[] = [
    { y: -3.2, side: -1, seed: 0.13 },
    { y: 2.4, side: -1, seed: 0.57 },
    { y: -1.6, side: 1, seed: 0.79 },
    { y: 3.1, side: 1, seed: 0.23 },
  ];

  for (const rule of rules) {
    const wallX = rule.side * x;
    b.push(
      wallX,
      rule.y,
      RULE_FROM,
      wallX,
      rule.y,
      RULE_TO,
      -rule.side,
      0,
      0,
      rule.seed,
    );

    // Dois períodos primos entre si. O curto é uma marca de intervalo; o longo
    // é uma estação, e é mais alto.
    for (let z = RULE_FROM; z > RULE_TO; z -= 7) {
      b.push(wallX, rule.y, z, wallX, rule.y + 0.42, z, -rule.side, 0, 0, rule.seed);
    }
    for (let z = RULE_FROM; z > RULE_TO; z -= 11) {
      b.push(wallX, rule.y, z, wallX, rule.y + 0.95, z, -rule.side, 0, 0, rule.seed);
    }
  }

  // A cota do corpo de prova. Linhas de chamada na altura de caixa alta, e a
  // seta de escala entre elas: o título dimensionado como peça de ensaio.
  const callout = -x + 0.6;
  const arrowZ = SPECIMEN_Z;
  for (const y of [-SPECIMEN_HALF_HEIGHT, SPECIMEN_HALF_HEIGHT]) {
    b.push(-x, y, arrowZ, callout + 2.4, y, arrowZ, 1, 0, 0, 0.91);
  }
  b.push(callout, -SPECIMEN_HALF_HEIGHT, arrowZ, callout, SPECIMEN_HALF_HEIGHT, arrowZ, 1, 0, 0, 0.91);
  // As duas pontas da seta.
  for (const [tip, dir] of [
    [SPECIMEN_HALF_HEIGHT, -1],
    [-SPECIMEN_HALF_HEIGHT, 1],
  ] as const) {
    b.push(callout, tip, arrowZ, callout - 0.16, tip + 0.34 * dir, arrowZ, 1, 0, 0, 0.91);
    b.push(callout, tip, arrowZ, callout + 0.16, tip + 0.34 * dir, arrowZ, 1, 0, 0, 0.91);
  }

  // Uma cota no piso, para a câmara ter chão e não só paredes.
  const floorY = -CHAMBER_HALF_HEIGHT + 0.05;
  b.push(-2.6, floorY, RULE_FROM, -2.6, floorY, RULE_TO, 0, 1, 0, 0.44);
  for (let z = RULE_FROM; z > RULE_TO; z -= 11) {
    b.push(-2.6, floorY, z, -1.85, floorY, z, 0, 1, 0, 0.44);
  }

  return b.build();
}

export function Structure({ shared }: { shared: SharedUniforms }) {
  const { geometry, material } = useMemo(() => {
    const lineMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uMist: shared.mist,
        uCyan: shared.cyan,
        // Baixíssima: a estrutura existe **entre** os lampejos. O que a torna
        // visível é o bando passando, não este número.
        uStructureBase: { value: 0.045 },
      },
      vertexShader: STRUCTURE_VERT,
      fragmentShader: STRUCTURE_FRAG,
      transparent: true,
      // Ornamento não oclui. Ele testa profundidade (uma gravação atrás de um
      // corpo fica atrás dele), mas não escreve — senão uma linha de um pixel
      // furaria o bando.
      depthTest: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    lineMaterial.glslVersion = GLSL3;

    return { geometry: buildStructure(), material: lineMaterial };
  }, [shared]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <lineSegments geometry={geometry} material={material} />;
}
