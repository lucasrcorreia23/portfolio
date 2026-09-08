"use client";

import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  Color,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Sphere,
  Vector3,
} from "three";
import {
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
  resolveRiver,
  type RiverLayout,
} from "@/lib/scene/cards";
import { CARD_FRAG, CARD_VERT } from "@/lib/scene/shaders/cards";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";

/**
 * O rio — os corpos de prova do beat de Trabalho, montados ao longo da câmara.
 *
 * **São planos na cena, não elementos de DOM com transform.** É a mesma regra
 * que o PROJECT.md §5 aplica ao corpo de prova, e pelo mesmo motivo: um card em
 * DOM quebra no instante em que um corpo do bando passa entre ele e a câmera —
 * que é justamente o momento que importa, porque é ele que prova que o card
 * está *dentro* da câmara. Opacos, escrevendo profundidade, com a mesma névoa e
 * a mesma pós-produção de todo o resto.
 *
 * **Uma malha instanciada, e não sete meshes.** O corpo é idêntico; o que muda
 * por card é centro, ângulo de montagem, tom e semente — quatro atributos de
 * instância contra sete entradas na lista de render e sete conjuntos de uniforms
 * por quadro.
 *
 * `frustumCulled = false` pela mesma razão do bando: a esfera envolvente que a
 * CPU calcularia seria a do plano único na origem, e a corrente inteira sumiria
 * assim que a câmera saísse de perto do zero. A esfera enorme é a declaração de
 * que quem sabe onde as peças estão é o vertex shader.
 *
 * ## Onde a corrente é escrita
 *
 * Este componente é o **único** que escreve `shared.cards`, e escreve uma vez.
 * A corrente não se move: ela é geometria da câmara, como as réguas gravadas nas
 * paredes. Quem a lê são dois — este material e o passo de velocidade do bando,
 * que precisa das mesmas posições para descolar o escoamento exatamente onde a
 * peça está desenhada.
 */

/** Os tons das capas de teste. Ver `coverField` em `shaders/cards.ts`. */
const TEST_TONE_KEYS = ["teal", "cyan"] as const;

type CardsProps = {
  shared: SharedUniforms;
};

function writeChain(shared: SharedUniforms, layout: RiverLayout): void {
  for (let i = 0; i < shared.cards.value.length; i += 1) {
    const card = layout.cards[i];
    const slot = shared.cards.value[i];
    if (slot === undefined) continue;
    if (card === undefined) {
      slot.set(0, 0, 0, 0);
      continue;
    }
    slot.set(card.x, card.y, card.z, card.yaw);
  }
  shared.cardCount.value = layout.count;
}

export function Cards({ shared }: CardsProps) {
  const layout = useMemo(() => resolveRiver(), []);

  const { geometry, material } = useMemo(() => {
    // O plano em coordenadas locais da peça: ±meia-largura, ±meia-altura, z=0.
    // Ele é o mesmo retângulo que o SDF analítico do shader dos boids descreve,
    // e é por isso que as duas medidas saem de `lib/scene/cards.ts`.
    const plane = new InstancedBufferGeometry();
    plane.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([
          -CARD_HALF_WIDTH, -CARD_HALF_HEIGHT, 0,
          CARD_HALF_WIDTH, -CARD_HALF_HEIGHT, 0,
          CARD_HALF_WIDTH, CARD_HALF_HEIGHT, 0,
          -CARD_HALF_WIDTH, CARD_HALF_HEIGHT, 0,
        ]),
        3,
      ),
    );
    plane.setAttribute(
      "uv",
      new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
    );
    plane.setIndex([0, 1, 2, 0, 2, 3]);

    const count = layout.count;
    const cards = new Float32Array(count * 4);
    const tones = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const indices = new Float32Array(count);
    const tone = new Color();

    for (let i = 0; i < count; i += 1) {
      const card = layout.cards[i];
      if (card === undefined) continue;
      cards[i * 4] = card.x;
      cards[i * 4 + 1] = card.y;
      cards[i * 4 + 2] = card.z;
      cards[i * 4 + 3] = card.yaw;

      // O tom da capa de teste alterna entre os dois frios da paleta, com a
      // semente decidindo a mistura. **Nada de `--rose` nem `--coral` aqui**:
      // o DIRECTION.md §2 os reserva para eventos do bando, e sete retângulos
      // quentes espalhados pelo corredor gastariam o teto de 15% de tela do
      // PROJECT.md §3.1 sem nenhum deles ser um evento. O `accent` de verdade
      // de cada case chega com o conteúdo.
      const key = TEST_TONE_KEYS[i % TEST_TONE_KEYS.length] ?? "teal";
      tone.copy(shared[key].value);
      tone.lerp(shared.deep.value, 0.18 + 0.34 * card.seed);
      tones[i * 3] = tone.r;
      tones[i * 3 + 1] = tone.g;
      tones[i * 3 + 2] = tone.b;

      seeds[i] = card.seed;
      indices[i] = i;
    }

    plane.setAttribute("aCard", new InstancedBufferAttribute(cards, 4));
    plane.setAttribute("aTone", new InstancedBufferAttribute(tones, 3));
    plane.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    plane.setAttribute("aIndex", new InstancedBufferAttribute(indices, 1));
    plane.instanceCount = count;
    plane.boundingSphere = new Sphere(new Vector3(), 1e4);

    // A corrente é publicada aqui, e não num efeito, porque o primeiro quadro
    // pode acontecer **antes** dos efeitos: o `ComposedClock` chama `advance()`
    // de dentro do efeito dele, e efeitos de irmãos rodam em ordem de árvore.
    // Um passo de simulação com `uCardCount = 0` seria um quadro em que o rio
    // não desvia nada — invisível, e exatamente o tipo de divergência de um
    // quadro que este projeto já pagou caro. A escrita é idempotente e o objeto
    // é o mesmo que o `Flock` já segura.
    writeChain(shared, layout);

    const cardMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uSubstrate: shared.abyss,
        uCyan: shared.cyan,
        uMist: shared.mist,
        // Pico da capa em HDR linear. Abaixo do limiar de bloom do compositor
        // (1.05) de propósito: o DIRECTION.md §5 reserva o transbordo para os
        // corpos emissivos e a fresta da tomada de ar, e uma capa que floresce
        // seria a segunda fonte de luz da câmara.
        uCoverGain: { value: 0.38 },
        uCardMask: shared.cardMask,
      },
      vertexShader: CARD_VERT,
      fragmentShader: CARD_FRAG,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
    cardMaterial.glslVersion = GLSL3;

    return { geometry: plane, material: cardMaterial };
  }, [layout, shared]);

  useEffect(() => {
    return () => {
      shared.cardCount.value = 0;
    };
  }, [shared]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
