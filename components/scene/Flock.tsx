"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  HalfFloatType,
  LinearFilter,
  NearestFilter,
  NoBlending,
  NoColorSpace,
  RGBAFormat,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import type { Roost } from "@/lib/scene/curve";
import { blit, createDataTarget, createPassMaterial } from "@/lib/scene/gpu";
import {
  AHEAD_COLUMNS,
  AHEAD_HALF_WIDTH,
  AHEAD_ROWS_FRAG,
  AHEAD_SUM_FRAG,
} from "@/lib/scene/shaders/ahead";
import { BODY_FRAG, BODY_VERT } from "@/lib/scene/shaders/body";
import {
  BOIDS_POSITION_FRAG,
  boidsVelocityFrag,
} from "@/lib/scene/shaders/boids";
import { SEED_FRAG } from "@/lib/scene/shaders/seed";
import type { FlockRead } from "@/lib/scene/probe";
import { TYPE_ARTICLE } from "@/lib/scene/type-article";
import {
  cardUniforms,
  fogUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";
import {
  FLOCK_TUBE_HEIGHT,
  FLOCK_TUBE_NARROW,
  SPECIMEN_Z,
} from "@/lib/scene/world";
import { sceneSettings } from "@/lib/scene/settings";

type FlockProps = {
  shared: SharedUniforms;
  progressRef: { readonly current: number };
  attackRef: { readonly current: number };
  /** Z da câmera. A reciclagem do bando é relativa a ela, não ao duto. */
  cameraZRef: { readonly current: number };
  /**
   * Meia-largura e meia-altura do tubo. A largura abre na Identidade, para o
   * escoamento cobrir a peça inteira; a altura abre só no poleiro de Quem sou,
   * para a coluna ter altura de coluna.
   */
  tubeRef: { readonly current: Vector2 };
  /**
   * O poleiro de Quem sou, resolvido pelo laço mestre. É um objeto estável
   * mutado por quadro — mesma disciplina dos uniforms compartilhados: quem
   * escreve é um só (`SceneWorld`), quem lê são vários.
   */
  roost: Roost;
  /**
   * Preenchido com uma função que roda N passos de simulação **sem desenhar**.
   * É como o modo calmo assenta o bando numa pose: 150 pares de blits numa
   * textura de 64×64 custam alguns milissegundos, contra 150 quadros
   * completos se a mesma simulação passasse pelo laço de render.
   */
  settleRef?: { current: ((steps: number) => void) | null };
  /**
   * Preenchido com os alvos de leitura da simulação. **Só a sonda usa**, e ela
   * só existe em desenvolvimento.
   *
   * Devolve os alvos e não os pixels de propósito: a leitura em si mora em
   * `lib/scene/probe.ts`, que não viaja no chunk de produção. Aqui fica só um
   * literal de objeto — nenhum import novo, nenhum byte a mais no pacote.
   */
  readRef?: { current: FlockRead | null };
  /**
   * O relógio do bando, como fração do normal. 1 na descida.
   *
   * Dentro do case ele cai para `CASE_FLOCK_RATE`: "a cena recua e vira
   * atmosfera de fundo, com o organismo desacelerado". Escala o **passo**, e não
   * a velocidade dos corpos — encolher a velocidade mudaria a rampa emissiva,
   * que é dirigida pela aceleração (DIRECTION.md §5), e o bando desaceleraria
   * apagando. Com o passo escalado a física é a mesma, rodando mais devagar.
   */
  rateRef?: { readonly current: number };
};

/**
 * O bando.
 *
 * Duas texturas de ponto flutuante em ping-pong (posição e velocidade), um
 * triângulo de tela cheia para cada passo, e um `InstancedBufferGeometry` que
 * lê o resultado no vertex shader. **Nada volta da GPU** — quem informa luz,
 * estrutura e véu é o proxy da CPU.
 *
 * **`<mesh>` com `InstancedBufferGeometry`, e não `<instancedMesh>`.** O
 * `InstancedMesh` do three carrega um `instanceMatrix` de 16 floats por corpo,
 * que a CPU teria que preencher e enviar — e que este material nunca leria,
 * porque posição e orientação vêm da textura. A 4096 corpos são 256 kB de VRAM
 * e um upload por quadro comprados para não serem usados.
 *
 * **`frustumCulled = false` não é opcional.** A CPU não sabe onde os corpos
 * estão; a esfera envolvente calculada seria a do corpo único na origem, e o
 * bando inteiro sumiria assim que a câmera saísse de perto dele.
 */
export function Flock({
  shared,
  progressRef,
  attackRef,
  cameraZRef,
  tubeRef,
  roost,
  settleRef,
  readRef,
  rateRef,
}: FlockProps) {
  const { gl } = useThree();
  const swap = useRef(0);
  const frame = useRef(0);
  const seeded = useRef(false);

  const rig = useMemo(() => {
    const settings = sceneSettings();
    const size = settings.flockTextureSize;
    const texSize = new Vector2(size, size);

    const position = [createDataTarget(size), createDataTarget(size)] as const;
    const velocity = [createDataTarget(size), createDataTarget(size)] as const;

    const simUniforms = {
      uPos: { value: position[0].texture },
      uVel: { value: velocity[0].texture },
      uTexSize: { value: texSize },
      uDt: { value: 1 / 60 },
      uTime: shared.time,
      uProgress: { value: 0 },
      uStride: { value: 1 },
      uSpecimen: { value: new Vector3(0, 0, SPECIMEN_Z) },
      uSpecimenYaw: { value: 0 },
      uTube: { value: new Vector2(FLOCK_TUBE_NARROW, FLOCK_TUBE_HEIGHT) },
      uCameraZ: { value: 0 },
      uRoost: { value: new Vector3(0, 0, SPECIMEN_Z) },
      uRoostAmount: { value: 0 },
      uRoostDrift: { value: 0 },

      // O campo de distância assado da peça. Os três primeiros são **os mesmos
      // objetos** que o `Specimen` escreve depois do assado (ver
      // `lib/scene/uniforms.ts`); `uTypeH` é constante e mora aqui.
      //
      // Este mapa é montado à mão e não espalha `shared` — então uma entrada
      // nova precisa ser escrita aqui explicitamente, ou o shader compila com
      // um sampler que ninguém liga.
      uTypeField: shared.typeField,
      uTypeRect: shared.typeFieldRect,
      uTypeReady: shared.typeFieldReady,
      uTypeH: { value: TYPE_ARTICLE.capHeight },

      // A corrente de cards do rio. Os mesmos objetos que o material dos cards
      // recebe (`lib/scene/uniforms.ts`): a esteira precisa se descolar
      // exatamente onde a peça está desenhada, e duas cópias da corrente é a
      // forma mais fácil de as duas coisas divergirem meio metro.
      ...cardUniforms(shared),
    };

    // Os dois passos compartilham o mesmo mapa de uniforms de propósito: são a
    // mesma simulação lida de dois jeitos, e um `uDt` diferente entre eles
    // seria um bug impossível de ver.
    const velocityMaterial = createPassMaterial(
      boidsVelocityFrag(settings.detach, settings.cards),
      simUniforms,
      GLSL3,
    );
    const positionMaterial = createPassMaterial(
      BOIDS_POSITION_FRAG,
      simUniforms,
      GLSL3,
    );

    // A contagem diante da face da peça — ver `shaders/ahead.ts`. Dois alvos:
    // as somas parciais por linha do bando, e a soma final por coluna.
    const aheadRows = new WebGLRenderTarget(AHEAD_COLUMNS, size, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      colorSpace: NoColorSpace,
    });
    const aheadTarget = new WebGLRenderTarget(AHEAD_COLUMNS, 1, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      colorSpace: NoColorSpace,
    });
    const aheadUniforms = {
      uPos: { value: position[0].texture },
      uTexSize: { value: texSize },
      uSpecimenZ: { value: SPECIMEN_Z },
      uHalfWidth: { value: AHEAD_HALF_WIDTH },
      uHalfHeight: { value: TYPE_ARTICLE.capHeight * 0.8 },
      uDepth: { value: 4.5 },
    };
    const aheadRowsMaterial = createPassMaterial(
      AHEAD_ROWS_FRAG,
      aheadUniforms,
      GLSL3,
    );
    const aheadMaterial = createPassMaterial(
      AHEAD_SUM_FRAG,
      { uRows: { value: aheadRows.texture }, uRowCount: { value: size } },
      GLSL3,
    );
    shared.flockAheadField.value = aheadTarget.texture;

    const seedUniforms = {
      uTexSize: { value: texSize },
      // O mesmo objeto do passo de simulação: a semeadura acontece no primeiro
      // quadro, e o tubo já pode ter começado a abrir se alguém entrar na
      // descida por um link com âncora.
      uTube: simUniforms.uTube,
      uCameraZ: simUniforms.uCameraZ,
      uMode: { value: 0 },
    };
    const seedMaterial = createPassMaterial(SEED_FRAG, seedUniforms, GLSL3);

    // Corpo lenticular: um fuso de seis vértices e oito triângulos — nariz,
    // cauda e um anel de quatro no meio.
    //
    // **Volume, e não um plano.** Um quad orientado pela velocidade fica
    // invisível exatamente quando o corpo voa na direção da câmera, que é o
    // caso desta cena o tempo todo: o plano passa a conter a direção do olhar e
    // a área projetada vai a zero. O DIRECTION.md §5 pede "corpo lenticular de
    // poucos triângulos", e lenticular é uma lente — tem espessura. Oito
    // triângulos custam praticamente o mesmo que dois e se leem de qualquer
    // ângulo.
    //
    // Achatado no eixo Y (0.09 contra 0.16 em X): continua sendo uma lasca com
    // direção, não um corpo redondo, e nada nele lembra asa ou pássaro
    // (DIRECTION.md §6).
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([
          0.0, 0.0, 1.0, // 0 nariz
          0.0, 0.0, -1.0, // 1 cauda
          0.16, 0.0, -0.1, // 2 flanco direito
          0.0, 0.09, -0.1, // 3 dorso
          -0.16, 0.0, -0.1, // 4 flanco esquerdo
          0.0, -0.09, -0.1, // 5 ventre
        ]),
        3,
      ),
    );
    geometry.setIndex([
      0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 2, // nariz → anel
      1, 3, 2, 1, 4, 3, 1, 5, 4, 1, 2, 5, // cauda → anel, winding invertido
    ]);

    const count = size * size;
    const refs = new Float32Array(count * 2);
    for (let i = 0; i < count; i += 1) {
      refs[i * 2] = ((i % size) + 0.5) / size;
      refs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
    }
    geometry.setAttribute("aRef", new InstancedBufferAttribute(refs, 2));
    geometry.instanceCount = count;
    geometry.boundingSphere = new Sphere(new Vector3(), 1e4);

    // Guardados por referência: o laço de quadro troca a textura que os corpos
    // leem toda vez que o ping-pong vira, e indexar `material.uniforms` por
    // string a 60 Hz sob `noUncheckedIndexedAccess` só produziria asserções.
    const bodyPos = { value: position[0].texture };
    const bodyVel = { value: velocity[0].texture };

    const bodyMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        uPos: bodyPos,
        uVel: bodyVel,
        uBodyScale: { value: 0.085 },
        uForming: shared.forming,
        uTeal: shared.teal,
        uCyan: shared.cyan,
        uRose: shared.rose,
        uCoral: shared.coral,
        uSpecimenZ: shared.specimenZ,
        uGain: { value: 2.4 },
        uFormingFrag: shared.forming,
        uCards: shared.cards,
        uCardCount: shared.cardCount,
        uCardAmount: shared.cardAmount,
      },
      vertexShader: BODY_VERT,
      fragmentShader: BODY_FRAG,
      // Opaco, com escrita de profundidade. É o que permite metade do bando
      // ficar na frente das letras e metade atrás — ver o docblock de
      // `lib/scene/shaders/body.ts`.
      transparent: false,
      depthTest: true,
      depthWrite: true,
      blending: NoBlending,
      toneMapped: false,
    });
    bodyMaterial.glslVersion = GLSL3;

    return {
      position,
      velocity,
      simUniforms,
      velocityMaterial,
      positionMaterial,
      seedMaterial,
      seedUniforms,
      geometry,
      bodyMaterial,
      bodyPos,
      bodyVel,
      aheadRows,
      aheadRowsMaterial,
      aheadTarget,
      aheadUniforms,
      aheadMaterial,
    };
  }, [shared]);

  useEffect(() => {
    const held = rig;
    return () => {
      for (const target of [...held.position, ...held.velocity]) {
        target.dispose();
      }
      held.velocityMaterial.dispose();
      held.positionMaterial.dispose();
      held.seedMaterial.dispose();
      held.bodyMaterial.dispose();
      held.geometry.dispose();
      held.aheadRows.dispose();
      held.aheadRowsMaterial.dispose();
      held.aheadTarget.dispose();
      held.aheadMaterial.dispose();
    };
  }, [rig]);

  const step = useCallback(
    (
      dt: number,
      progress: number,
      attack: number,
      cameraZ: number,
      tube: Vector2,
      roost: Roost,
    ) => {
      rig.simUniforms.uTube.value.copy(tube);
      rig.simUniforms.uRoost.value.copy(roost.center);
      rig.simUniforms.uRoostAmount.value = roost.amount;
      rig.simUniforms.uRoostDrift.value = roost.drift;
      // A semeadura roda na GPU, uma vez. Uma matriz na CPU seria 4096 × 8
      // floats subindo pelo barramento para dizer o que uma linha de shader
      // deriva de `gl_FragCoord`.
      if (!seeded.current) {
        rig.seedUniforms.uMode.value = 0;
        blit(gl, rig.seedMaterial, rig.position[0]);
        blit(gl, rig.seedMaterial, rig.position[1]);
        rig.seedUniforms.uMode.value = 1;
        blit(gl, rig.seedMaterial, rig.velocity[0]);
        blit(gl, rig.seedMaterial, rig.velocity[1]);
        seeded.current = true;
      }

      const read = swap.current;
      const write = read ^ 1;

      rig.simUniforms.uDt.value = dt;
      rig.simUniforms.uProgress.value = progress;
      rig.simUniforms.uSpecimenYaw.value = attack;
      rig.simUniforms.uCameraZ.value = cameraZ;

      // O passo da vizinhança gira a cada quadro. Nenhum corpo vê o bando
      // inteiro, mas ao longo de alguns quadros vê uma amostra bem distribuída
      // dele — que é do que a murmuração precisa. Ímpares e coprimos com a
      // contagem, para o passeio não fechar ciclo curto.
      frame.current += 1;
      const strides = [37, 61, 89, 113, 151];
      rig.simUniforms.uStride.value =
        strides[frame.current % strides.length] ?? 37;

      const readPos = rig.position[read];
      const readVel = rig.velocity[read];
      const writePos = rig.position[write];
      const writeVel = rig.velocity[write];
      if (
        readPos === undefined ||
        readVel === undefined ||
        writePos === undefined ||
        writeVel === undefined
      ) {
        return;
      }

      rig.simUniforms.uPos.value = readPos.texture;
      rig.simUniforms.uVel.value = readVel.texture;
      blit(gl, rig.velocityMaterial, writeVel);

      // A posição integra a velocidade **deste** quadro, não a do anterior.
      rig.simUniforms.uVel.value = writeVel.texture;
      blit(gl, rig.positionMaterial, writePos);

      swap.current = write;
      rig.bodyPos.value = writePos.texture;
      rig.bodyVel.value = writeVel.texture;

      rig.aheadUniforms.uPos.value = writePos.texture;
      blit(gl, rig.aheadRowsMaterial, rig.aheadRows);
      blit(gl, rig.aheadMaterial, rig.aheadTarget);
      shared.flockAheadReady.value = 1;
      if (process.env.NODE_ENV !== "production") {
        // Só para a sonda ler a contagem por coluna (`readRenderTargetPixels`
        // é leitura síncrona, que o caminho de render nunca faz).
        (window as unknown as { __ahead?: unknown }).__ahead = {
          gl,
          target: rig.aheadTarget,
        };
      }
    },
    [gl, rig, shared],
  );

  useEffect(() => {
    if (settleRef === undefined) return;
    settleRef.current = (steps: number) => {
      for (let i = 0; i < steps; i += 1) {
        step(
          1 / 60,
          progressRef.current,
          attackRef.current,
          cameraZRef.current,
          tubeRef.current,
          roost,
        );
      }
    };
    return () => {
      settleRef.current = null;
    };
  }, [settleRef, step, progressRef, attackRef, cameraZRef, tubeRef, roost]);

  useEffect(() => {
    if (readRef === undefined) return;
    readRef.current = {
      size: rig.simUniforms.uTexSize.value.x,
      // O alvo **lido** é o que a última troca escreveu, e é o que o material
      // dos corpos está desenhando naquele instante — senão a sonda mediria um
      // quadro de simulação diferente do quadro composto que ela acabou de ler.
      position: () => rig.position[swap.current],
      velocity: () => rig.velocity[swap.current],
    };
    return () => {
      readRef.current = null;
    };
  }, [readRef, rig]);

  useFrame((_state, delta) => {
    // O passo é clampado: o `lagSmoothing(0)` do driver é deliberado, então
    // voltar de uma aba em segundo plano entrega vários segundos de uma vez, e
    // um passo desse tamanho explode a integração.
    step(
      Math.min(delta, 1 / 30) * (rateRef?.current ?? 1),
      progressRef.current,
      attackRef.current,
      cameraZRef.current,
      tubeRef.current,
      roost,
    );
  }, -5);

  return (
    <mesh
      geometry={rig.geometry}
      material={rig.bodyMaterial}
      frustumCulled={false}
    />
  );
}
