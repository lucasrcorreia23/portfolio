"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  DepthFormat,
  DepthTexture,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  NearestFilter,
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
  VEIL_REDUCE_FRAG,
  VEIL_SEED_FRAG,
  VEIL_SOLVE_FRAG,
} from "@/lib/scene/shaders/post";
import { markScenePainted } from "@/lib/scene/scene-painted";
import { sceneSettings } from "@/lib/scene/settings";
import { veilUniforms, type SharedUniforms } from "@/lib/scene/uniforms";
import { MAX_VEIL_BOXES, VEIL_CEILING, VEIL_FLOOR_DAWN } from "@/lib/scene/veil";

/** Níveis da cadeia de bloom, a partir de meia resolução. */
const BLOOM_LEVELS = 5;

/** Níveis da redução do véu: 4× por nível, de 1/4 a 1/64 do quadro. */
const VEIL_LEVELS = 3;

/**
 * Força do bloom e exposição do tonemap.
 *
 * Elas viraram constantes de módulo porque **duas passadas precisam concordar
 * sobre elas**: o composite, que compõe o quadro, e a semente do véu, que
 * reconstrói a mesma luminância para resolver o `f`. Dois números iguais
 * digitados em dois lugares é a forma mais fácil de o véu passar a resolver
 * para um quadro que não é o que vai para a tela.
 */
const BLOOM_STRENGTH = 0.55;
const EXPOSURE = 1.15;

/** L de `--void`, a cor para a qual o véu mistura. Lida do próprio uniform. */
function fogLuminance(shared: SharedUniforms): number {
  const c = shared.void.value;
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

type ComposerProps = {
  shared: SharedUniforms;
  /** Abertura da DOF, 0 (navalha) a 1, já resolvida pelo laço mestre. */
  apertureRef: { readonly current: number };
  /** Distância da câmera ao ponto em foco, em unidades de mundo. */
  focusRef: { readonly current: number };
  /**
   * Profundidade do plano nítido, em unidades de mundo — o denominador do
   * círculo de confusão. Ela é do beat, não do compositor: no rio ela fecha
   * para separar cards vizinhos em profundidade (`focusRangeAt`, em `curve.ts`).
   */
  focusRangeRef: { readonly current: number };
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
export function Composer({
  shared,
  apertureRef,
  focusRef,
  focusRangeRef,
}: ComposerProps) {
  const { size, viewport, camera } = useThree();
  const settings = sceneSettings();
  /** Qual dos dois alvos de três texels tem a resolução do quadro anterior. */
  const veilSwap = useRef(0);

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
      uNearBlur: { value: 1 },
      uLeakGuard: { value: 0 },
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

    /**
     * O campo do véu: a luminância entregue, reduzida por máximo.
     *
     * Três níveis de 4×4 levam o quadro a 1/64 — a 1440×900 isso são 23×15
     * texels, cada um carregando o **maior** dos 4096 pixels que ele resume.
     * O critério do DIRECTION.md §5 é "nenhum pixel sob a caixa passa do teto",
     * então a redução tem que ser por máximo; uma média diria que uma coluna
     * atravessada por um corpo está escura na média, que é verdade e é inútil.
     */
    const veilField = Array.from({ length: VEIL_LEVELS }, () =>
      makeColorTarget(0),
    );
    // **`NearestFilter` nos dois, e não é higiene.** Com filtro linear cada
    // amostra do campo é uma média de quatro texels vizinhos, e a média de
    // máximos não é o máximo: a redução passa a subestimar exatamente o pixel
    // brilhante que ela existe para encontrar. Medido, o véu resolvia para
    // L = 0.16–0.20 sob o texto com o teto em 0.125. É a mesma armadilha que o
    // FBO do bando já documenta, aqui num alvo de um canal só.
    for (const target of veilField) {
      target.texture.minFilter = NearestFilter;
      target.texture.magFilter = NearestFilter;
    }
    // Dois alvos de três texels, em ping-pong: a resolução deste quadro precisa
    // ler a do anterior para amortecer a descida. Um alvo só seria ler e
    // escrever a mesma textura na mesma passada, que é indefinido.
    const veilSolve = [makeColorTarget(0), makeColorTarget(0)] as const;
    for (const target of veilSolve) {
      target.setSize(MAX_VEIL_BOXES, 1);
      target.texture.minFilter = NearestFilter;
      target.texture.magFilter = NearestFilter;
    }

    const veilSeed = createPassMaterial(
      VEIL_SEED_FRAG,
      {
        uSource: { value: scene.texture },
        uBloom: { value: bloom[0]?.texture ?? null },
        uTexel: { value: new Vector2() },
        uBloomStrength: { value: BLOOM_STRENGTH },
        uExposure: shared.exposure,
      },
      GLSL3,
    );

    const veilReduce = createPassMaterial(
      VEIL_REDUCE_FRAG,
      { uSource: { value: null }, uTexel: { value: new Vector2() } },
      GLSL3,
    );

    const veilSolver = createPassMaterial(
      VEIL_SOLVE_FRAG,
      {
        uField: { value: veilField[VEIL_LEVELS - 1]?.texture ?? null },
        uPrevious: { value: veilSolve[0].texture },
        uVeilBox: shared.veilBox,
        uVeilF: shared.veilF,
        uCeiling: { value: VEIL_CEILING },
        uFogLuma: { value: fogLuminance(shared) },
        uDawn: shared.dawn,
        uFloor: { value: VEIL_FLOOR_DAWN },
        // Descida em ~16 quadros (0.27 s). Ver o docblock do véu em post.ts.
        uFall: { value: 0.06 },
      },
      GLSL3,
    );

    const composite = createPassMaterial(
      COMPOSITE_FRAG,
      {
        uScene: { value: scene.texture },
        uBlurred: { value: dofB.texture },
        uBloom: { value: bloom[0]?.texture ?? null },
        uResolution: shared.resolution,
        uBloomStrength: { value: BLOOM_STRENGTH },
        uGrain: { value: 0.045 },
        uGrainSeed: { value: 0 },
        uExposure: shared.exposure,
        uDofEnabled: { value: settings.dof ? 1 : 0 },
        // O véu de legibilidade mora aqui, e não nos materiais: é a única
        // passada em que o bloom já pousou. Ver `shaders/post.ts`.
        ...veilUniforms(shared),
        uVeilCeiling: { value: VEIL_CEILING },
        uVeilFloor: { value: VEIL_FLOOR_DAWN },
        uDawn: shared.dawn,
        ...depthUniforms,
      },
      GLSL3,
    );

    return {
      scene,
      dofA,
      dofB,
      bloom,
      veilField,
      veilSolve,
      dof,
      threshold,
      down,
      up,
      veilSeed,
      veilReduce,
      veilSolver,
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
      for (const target of held.veilField) target.dispose();
      for (const target of held.veilSolve) target.dispose();
      for (const material of [
        held.dof,
        held.threshold,
        held.down,
        held.up,
        held.veilSeed,
        held.veilReduce,
        held.veilSolver,
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
    // O campo do véu cai de quatro em quatro: 1/4, 1/16, 1/64.
    rig.veilField.forEach((target, level) => {
      const shift = (level + 1) * 2;
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
    // O amanhecer (rodada 18): mais exposição, e a luminância do fundo — que o
    // véu usa como alvo — relida da paleta, que troca com o tema.
    shared.exposure.value = EXPOSURE * (1 + 0.15 * shared.dawn.value);
    const fogLuma = rig.veilSolver.uniforms["uFogLuma"];
    if (fogLuma !== undefined) {
      const c = shared.void.value;
      const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      fogLuma.value = 1 - Math.exp(-l * shared.exposure.value);
    }
    rig.depthUniforms.uAperture.value = settings.dof ? aperture : 0;
    // O campo próximo sai dentro do case, com a mesma rampa do voo: o
    // DIRECTION.md §3 desliga a DOF nas rotas de case, e isso vale para ele.
    rig.depthUniforms.uNearBlur.value = settings.dof ? 1 - shared.caseRecess.value : 0;
    rig.depthUniforms.uLeakGuard.value = shared.cardAmount.value;
    rig.depthUniforms.uFocus.value = focusRef.current;
    rig.depthUniforms.uFocusRange.value = focusRangeRef.current;

    // --- profundidade de campo, kernel duplo --------------------------------
    // Ela é a primeira coisa da lista de corte do DIRECTION.md §3, então o
    // desligamento pula as duas passadas inteiras — e não só zera a força.
    // É isso que faz a medição A/B medir o custo dela, e não o custo de
    // multiplicar por zero.
    //
    // **Com a abertura em zero ela continua rodando** (rodada 12): o campo
    // próximo desfoca sempre (ver `cocAt` em `shaders/post.ts`), e um corpo a
    // uma unidade da lente não pode sair nítido só porque o beat fechou o
    // diafragma. Onde nada está perto, o fragmento sai no primeiro `if`.
    if (settings.dof) {
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

    // --- o véu de legibilidade ----------------------------------------------
    // Depois do bloom de propósito: o que ele mede é a luminância que vai para
    // a tela, e o bloom é justamente o que espalha a luz de um corpo que está
    // **fora** da caixa para dentro dela. Ver o bloco do véu em post.ts.
    //
    // **`?veil=0` pula as quatro passadas inteiras.** Diferente de DOF, cards e
    // descolamento, aqui não há shader a recompilar — cada passada já é um
    // material e uma chamada de `blit()` à parte, então "desligado" é
    // simplesmente não emitir as chamadas. `uVeilSolved` fica apontando para o
    // que já estava lá (o alvo nasce zerado), e o composite lê `f = 0`: sem
    // escurecimento, o que não importa numa rodada de banco. Ver o docblock de
    // `veil` em `lib/scene/settings.ts`.
    if (settings.veil) {
      const seedTarget = rig.veilField[0];
      if (seedTarget !== undefined && first !== undefined) {
        setUniform(rig.veilSeed, "uSource", rig.scene.texture);
        setUniform(rig.veilSeed, "uBloom", first.texture);
        setVec2(
          rig.veilSeed,
          "uTexel",
          TEXEL.set(1 / rig.scene.width, 1 / rig.scene.height),
        );
        blit(renderer, rig.veilSeed, seedTarget);
      }

      for (let level = 1; level < rig.veilField.length; level += 1) {
        const source = rig.veilField[level - 1];
        const target = rig.veilField[level];
        if (source === undefined || target === undefined) continue;
        setUniform(rig.veilReduce, "uSource", source.texture);
        setVec2(
          rig.veilReduce,
          "uTexel",
          TEXEL.set(1 / source.width, 1 / source.height),
        );
        blit(renderer, rig.veilReduce, target);
      }

      const field = rig.veilField[rig.veilField.length - 1];
      const read = rig.veilSolve[veilSwap.current];
      const write = rig.veilSolve[veilSwap.current ^ 1];
      if (field !== undefined && read !== undefined && write !== undefined) {
        setUniform(rig.veilSolver, "uField", field.texture);
        setUniform(rig.veilSolver, "uPrevious", read.texture);
        blit(renderer, rig.veilSolver, write);
        veilSwap.current ^= 1;
        setUniform(rig.composite, "uVeilSolved", write.texture);
      }
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
    setUniform(
      rig.composite,
      "uGrain",
      settings.grain ? 0.045 + 0.015 * Math.sin(time * 11.3) : 0,
    );
    setUniform(
      rig.composite,
      "uDofEnabled",
      settings.dof ? 1 : 0,
    );

    blit(renderer, rig.composite, null);
    // O portão espera por isto para abrir as frestas para a câmara.
    markScenePainted();

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
