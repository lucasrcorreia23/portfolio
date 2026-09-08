"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  DepthFormat,
  DepthTexture,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  UnsignedIntType,
  Vector2,
  WebGLRenderTarget,
  type ShaderMaterial,
} from "three";
import { blit, createPassMaterial } from "@/lib/scene/gpu";
import {
  BLOOM_DOWN_FRAG,
  BLOOM_THRESHOLD_FRAG,
  BLOOM_UP_FRAG,
  COMPOSITE_FRAG,
  DOF_FRAG,
} from "@/lib/scene/shaders/post";
import { sceneSettings } from "@/lib/scene/settings";
import { veilUniforms, type SharedUniforms } from "@/lib/scene/uniforms";

/** Níveis da cadeia de bloom, a partir de meia resolução. */
const BLOOM_LEVELS = 5;

type ComposerProps = {
  shared: SharedUniforms;
  /** Abertura da DOF, 0 (navalha) a 1, já resolvida pelo laço mestre. */
  apertureRef: { readonly current: number };
  /** Distância da câmera ao ponto em foco, em unidades de mundo. */
  focusRef: { readonly current: number };
};

/**
 * O compositor: cena → DOF → bloom → composite.
 *
 * Ver `lib/scene/shaders/post.ts` para por que ele é escrito à mão em vez de
 * usar o `@react-three/postprocessing`.
 *
 * **Ele desliga o render automático do R3F ao se inscrever com prioridade 1.**
 * O R3F só desenha a cena por conta própria quando nenhum `useFrame` pediu
 * prioridade positiva; a partir daí a única coisa que chega na tela é o que
 * este componente compõe. A simulação do bando roda em −5 e portanto antes.
 *
 * **A profundidade sai de uma `DepthTexture` anexada ao alvo multiamostrado.**
 * O three resolve o buffer de profundidade junto com a cor no blit de
 * multiamostragem, então dá para ter antisserrilhado geométrico *e* o
 * círculo de confusão por pixel — que era a escolha difícil aqui.
 */
export function Composer({ shared, apertureRef, focusRef }: ComposerProps) {
  const { size, viewport, camera } = useThree();
  const settings = sceneSettings();

  const rig = useMemo(() => {
    const makeColorTarget = (samples: number) => {
      const target = new WebGLRenderTarget(1, 1, {
        type: HalfFloatType,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: samples > 0,
        stencilBuffer: false,
        generateMipmaps: false,
        samples,
      });
      return target;
    };

    const scene = makeColorTarget(4);
    // Multiamostrado **e** com textura de profundidade: o three inclui
    // DEPTH_BUFFER_BIT no blit de resolução, então as duas coisas convivem.
    scene.depthTexture = new DepthTexture(1, 1, UnsignedIntType);
    scene.depthTexture.format = DepthFormat;

    const dofA = makeColorTarget(0);
    const dofB = makeColorTarget(0);
    const bloom = Array.from({ length: BLOOM_LEVELS }, () =>
      makeColorTarget(0),
    );

    const depthUniforms = {
      uDepth: { value: scene.depthTexture },
      uNear: { value: 0.1 },
      uFar: { value: 200 },
      uFocus: { value: 20 },
      uFocusRange: { value: 26 },
      uAperture: { value: 0 },
    };

    const dof = createPassMaterial(
      DOF_FRAG,
      {
        uSource: { value: scene.texture },
        uTexel: { value: new Vector2() },
        uDirection: { value: new Vector2(1, 0) },
        ...depthUniforms,
      },
      GLSL3,
    );

    const threshold = createPassMaterial(
      BLOOM_THRESHOLD_FRAG,
      {
        uSource: { value: scene.texture },
        // Alto de propósito. A cena escreve HDR linear; as paredes ficam perto
        // de 0.05 e os corpos em cruzeiro perto de 0.4. Só um cacho comprimido
        // e acelerado passa daqui — "bloom não é o efeito, é o transbordo".
        uThreshold: { value: 1.05 },
        uSoftKnee: { value: 0.55 },
      },
      GLSL3,
    );

    const down = createPassMaterial(
      BLOOM_DOWN_FRAG,
      { uSource: { value: null }, uTexel: { value: new Vector2() } },
      GLSL3,
    );

    const up = createPassMaterial(
      BLOOM_UP_FRAG,
      {
        uSource: { value: null },
        uTexel: { value: new Vector2() },
        uRadius: { value: 1.1 },
      },
      GLSL3,
    );
    up.blending = AdditiveBlending;
    up.transparent = true;

    const composite = createPassMaterial(
      COMPOSITE_FRAG,
      {
        uScene: { value: scene.texture },
        uBlurred: { value: dofB.texture },
        uBloom: { value: bloom[0]?.texture ?? null },
        uResolution: shared.resolution,
        uBloomStrength: { value: 0.55 },
        // Sutil, e só nas bordas — e "sutil" aqui é um número, não um
        // adjetivo. O deslocamento cresce com o quadrado do raio, e na quina
        // do quadro `centered.x * r2` vale 0.25; para os ~2.5 px que uma lente
        // real entrega ali, o coeficiente é 2.5/1440/0.25 ≈ 0.007.
        //
        // Estava em 0.9, o que deslocava R e B em **324 px**. Num corpo de dois
        // pixels os três canais caíam em lugares diferentes do quadro e só o
        // verde sobrava em cima do corpo: o bando inteiro lia verde e azul
        // puros, cores que não existem na paleta.
        uAberration: { value: 0.007 },
        uGrain: { value: 0.045 },
        uGrainSeed: { value: 0 },
        uExposure: { value: 1.15 },
        uDofEnabled: { value: settings.dof ? 1 : 0 },
        // O véu de legibilidade mora aqui, e não nos materiais: é a única
        // passada em que o bloom já pousou. Ver `shaders/post.ts`.
        ...veilUniforms(shared),
        ...depthUniforms,
      },
      GLSL3,
    );

    return {
      scene,
      dofA,
      dofB,
      bloom,
      dof,
      threshold,
      down,
      up,
      composite,
      depthUniforms,
    };
  }, [shared, settings.dof]);

  useEffect(() => {
    const held = rig;
    return () => {
      held.scene.depthTexture?.dispose();
      held.scene.dispose();
      held.dofA.dispose();
      held.dofB.dispose();
      for (const target of held.bloom) target.dispose();
      for (const material of [
        held.dof,
        held.threshold,
        held.down,
        held.up,
        held.composite,
      ]) {
        material.dispose();
      }
    };
  }, [rig]);

  useEffect(() => {
    const dpr = viewport.dpr;
    const width = Math.max(1, Math.floor(size.width * dpr));
    const height = Math.max(1, Math.floor(size.height * dpr));

    rig.scene.setSize(width, height);
    rig.dofA.setSize(Math.max(1, width >> 1), Math.max(1, height >> 1));
    rig.dofB.setSize(Math.max(1, width >> 1), Math.max(1, height >> 1));
    rig.bloom.forEach((target, level) => {
      const shift = level + 1;
      target.setSize(
        Math.max(1, width >> shift),
        Math.max(1, height >> shift),
      );
    });

    shared.resolution.value.set(width, height);
  }, [rig, shared, size.width, size.height, viewport.dpr]);

  useEffect(() => {
    if (!("isPerspectiveCamera" in camera)) return;
    rig.depthUniforms.uNear.value = camera.near;
    rig.depthUniforms.uFar.value = camera.far;
  }, [camera, rig]);

  useFrame((state) => {
    const renderer = state.gl;
    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    // --- a cena -------------------------------------------------------------
    renderer.setRenderTarget(rig.scene);
    renderer.clear(true, true, false);
    renderer.render(state.scene, state.camera);

    const aperture = apertureRef.current;
    rig.depthUniforms.uAperture.value = settings.dof ? aperture : 0;
    rig.depthUniforms.uFocus.value = focusRef.current;

    // --- profundidade de campo, kernel duplo --------------------------------
    // Ela é a primeira coisa da lista de corte do DIRECTION.md §3, então o
    // desligamento pula as duas passadas inteiras — e não só zera a força.
    // É isso que faz a medição A/B medir o custo dela, e não o custo de
    // multiplicar por zero.
    if (settings.dof && aperture > 0.001) {
      setUniform(rig.dof, "uSource", rig.scene.texture);
      setVec2(rig.dof, "uTexel", TEXEL.set(1 / rig.dofA.width, 1 / rig.dofA.height));
      setVec2(rig.dof, "uDirection", HORIZONTAL);
      blit(renderer, rig.dof, rig.dofA);

      setUniform(rig.dof, "uSource", rig.dofA.texture);
      setVec2(rig.dof, "uDirection", VERTICAL);
      blit(renderer, rig.dof, rig.dofB);
    }

    // --- bloom --------------------------------------------------------------
    setUniform(rig.threshold, "uSource", rig.scene.texture);
    const first = rig.bloom[0];
    if (first !== undefined) blit(renderer, rig.threshold, first);

    for (let level = 1; level < rig.bloom.length; level += 1) {
      const source = rig.bloom[level - 1];
      const target = rig.bloom[level];
      if (source === undefined || target === undefined) continue;
      setUniform(rig.down, "uSource", source.texture);
      setVec2(
        rig.down,
        "uTexel",
        TEXEL.set(1 / source.width, 1 / source.height),
      );
      blit(renderer, rig.down, target);
    }

    for (let level = rig.bloom.length - 1; level > 0; level -= 1) {
      const source = rig.bloom[level];
      const target = rig.bloom[level - 1];
      if (source === undefined || target === undefined) continue;
      setUniform(rig.up, "uSource", source.texture);
      setVec2(rig.up, "uTexel", TEXEL.set(1 / source.width, 1 / source.height));
      blit(renderer, rig.up, target);
    }

    // --- composite ----------------------------------------------------------
    setUniform(rig.composite, "uScene", rig.scene.texture);
    setUniform(rig.composite, "uBlurred", rig.dofB.texture);
    if (first !== undefined) setUniform(rig.composite, "uBloom", first.texture);

    // Grão animado por quadro. A semente muda sempre, e a intensidade respira
    // entre 0.03 e 0.06 — a faixa do PROJECT.md §3.1, e a razão de não existir
    // PNG de ruído neste projeto.
    const time = shared.time.value;
    setUniform(rig.composite, "uGrainSeed", (time * 977) % 1000);
    setUniform(rig.composite, "uGrain", 0.045 + 0.015 * Math.sin(time * 11.3));
    setUniform(
      rig.composite,
      "uDofEnabled",
      settings.dof && aperture > 0.001 ? 1 : 0,
    );

    blit(renderer, rig.composite, null);

    renderer.autoClear = previousAutoClear;
  }, 1);

  return null;
}

const HORIZONTAL = new Vector2(1, 0);
const VERTICAL = new Vector2(0, 1);
const TEXEL = new Vector2();

function setUniform(
  material: ShaderMaterial,
  name: string,
  value: unknown,
): void {
  const uniform = material.uniforms[name];
  if (uniform !== undefined) uniform.value = value;
}

function setVec2(
  material: ShaderMaterial,
  name: string,
  value: Vector2,
): void {
  const uniform = material.uniforms[name];
  if (uniform !== undefined && uniform.value instanceof Vector2) {
    uniform.value.copy(value);
  }
}
