"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei/core/Text";
import { useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, ShaderMaterial, type Material, type Mesh } from "three";
import {
  SPECIMEN_FRAG,
  SPECIMEN_VERT,
} from "@/lib/scene/shaders/specimen";
import { TYPE_ARTICLE, specimenText } from "@/lib/scene/type-article";
import { bakeTypeField, type TypeField } from "@/lib/scene/type-field";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";

type SpecimenProps = {
  shared: SharedUniforms;
  /** A string do dicionário. Conteúdo, e portanto traduzível. */
  text: string;
  /** Ângulo de ataque já amortecido, escrito por quadro pelo laço mestre. */
  attackRef: { readonly current: number };
};

/**
 * O corpo de prova: o título display como geometria dentro da cena.
 *
 * **Por que o `<Text>` do `drei` e não o troika direto.** O `troika-three-text`
 * não publica tipos utilizáveis sob este `tsconfig` — não há campo `types`, não
 * há mapa de `exports`, e o `.d.ts` que ele traz declara `class Text` sem
 * estender `Mesh`, com `material: any` e `anchorX: number` (o runtime aceita
 * `'center'`). Sob `strict`, `import { Text } from "troika-three-text"` é
 * TS7016. O `core/Text` do drei tem um `.d.ts` escrito à mão, custa 1.5 kB
 * cru, e já resolve o ciclo de `sync()` e o descarte. Importado **fundo**, não
 * pelo barril — o barril arrasta `three-stdlib`, `camera-controls` e mais meia
 * dúzia de pacotes que nada aqui usa.
 *
 * **Transparente, escrevendo profundidade — e é assim que a oclusão funciona.**
 * O troika força `transparent = true` no material derivado, e aqui isso é
 * mantido de propósito: a borda macia do SDF do glifo é o que dá antisserrilhado
 * a um título que ocupa 84% da tela. A oclusão não depende disso — depende de
 * os **corpos** serem opacos. Eles desenham primeiro, escrevem profundidade; o
 * glifo desenha depois e é recortado onde um corpo está na frente, e cobre onde
 * está atrás. Metade do bando na frente das letras, metade atrás, por teste de
 * profundidade e não por ordenação.
 *
 * `outlineWidth` fica em zero, e não é detalhe: qualquer valor faz o troika
 * devolver **dois** materiais, e o do contorno vem com `depthWrite: false` —
 * um buraco na profundidade em volta de cada glifo.
 */
export function Specimen({ shared, text, attackRef }: SpecimenProps) {
  const meshRef = useRef<Mesh>(null);
  const gl = useThree((state) => state.gl);
  const field = useRef<TypeField | null>(null);

  const material = useMemo(() => {
    const specimenMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uDeep: shared.deep,
        uCyan: shared.cyan,
        uFlockAhead: shared.flockAhead,
        uAheadField: shared.flockAheadField,
        uAheadReady: shared.flockAheadReady,
      },
      vertexShader: SPECIMEN_VERT,
      fragmentShader: SPECIMEN_FRAG,
      // GLSL 1.00 de propósito: o troika injeta código que escreve
      // `gl_FragColor`. Ver o docblock de `lib/scene/shaders/specimen.ts`.
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: DoubleSide,
      toneMapped: false,
    });
    return specimenMaterial;
  }, [shared]);

  useEffect(() => {
    return () => {
      // Descartar o material base dispara o ouvinte que descarta o derivado do
      // troika. `text.dispose()` sozinho só cuida da geometria.
      material.dispose();
    };
  }, [material]);

  const onSync = useCallback(
    (troika: unknown) => {
      const mesh = troika as Mesh | null;
      if (mesh === null) return;
      // Ler `mesh.material` é o que cria o material derivado; a partir daqui as
      // flags são próprias dele e não caem mais para o base por prototype.
      const derived = mesh.material as Material | Material[];
      const single = Array.isArray(derived) ? derived[0] : derived;
      if (single === undefined) return;
      single.depthWrite = true;
      single.depthTest = true;
      single.side = DoubleSide;
      mesh.renderOrder = 0;

      // O assado do campo de distância — DIRECTION.md §5, "dentro do callback
      // de `sync()` do troika, nunca antes". Aqui a geometria dos glifos e o
      // `textRenderInfo` acabaram de ficar válidos, e nenhum alvo de render
      // está ligado (este callback roda de um efeito de layout, fora do laço
      // de quadro).
      //
      // As três flags acima vêm primeiro de propósito: a passada de máscara
      // renderiza este mesmo material, e um `depthWrite` diferente entre o
      // assado e a cena seria uma silhueta assada de uma peça que não existe.
      let baked: TypeField | null = null;
      try {
        baked = bakeTypeField(gl, mesh, TYPE_ARTICLE.capHeight);
      } catch (error) {
        // Falhar aqui degrada o beat para "sem interação com a peça", que é o
        // mesmo que `?detach=0`. O que não pode acontecer é falhar em
        // silêncio: o campo vazio leria como distância zero em todo lugar,
        // ou seja o bando se comportaria como se a peça ocupasse a câmara
        // inteira.
        console.error("[specimen] o assado do campo de distância falhou", error);
      }
      if (baked === null) return;

      field.current?.dispose();
      field.current = baked;
      shared.typeField.value = baked.texture;
      shared.typeFieldRect.value.copy(baked.rect);
      shared.typeFieldReady.value = 1;
    },
    [gl, shared],
  );

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
    <Text
      ref={meshRef}
      font={TYPE_ARTICLE.font}
      fontSize={TYPE_ARTICLE.size}
      letterSpacing={TYPE_ARTICLE.letterSpacing}
      anchorX={TYPE_ARTICLE.anchorX}
      anchorY={TYPE_ARTICLE.anchorY}
      position={[...TYPE_ARTICLE.position]}
      sdfGlyphSize={TYPE_ARTICLE.sdfGlyphSize}
      outlineWidth={0}
      outlineBlur={0}
      outlineOffsetX={0}
      outlineOffsetY={0}
      depthOffset={0}
      onSync={onSync}
    >
      {specimenText(text)}
      <primitive object={material} attach="material" />
    </Text>
  );
}
