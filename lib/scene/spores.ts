import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  GLSL3,
  NearestFilter,
  RGBAFormat,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Texture,
  type WebGLRenderer,
} from "three";
import { blit, createPassMaterial } from "./gpu";
import { flowerHeads } from "./plants";
import { getQuality, POLLEN_MAX, SPORES_MAX } from "./quality";
import {
  HEADS_WIDTH,
  SPORE_FRAG,
  SPORE_SIM_FRAG,
  SPORE_SIZE,
  SPORE_VERT,
} from "./shaders/spores";
import { fogUniforms, wakeUniforms, type SharedUniforms } from "./uniforms";

/**
 * O campo de esporos e pólen: o estado na GPU e o passo que o avança.
 *
 * O estado mora em dois alvos de ponto flutuante inteiro, que se alternam: um
 * é lido, o outro é escrito. Meio-float não serve — posição integrada quadro a
 * quadro deriva —, e é por isso que a sonda de WebGL exige
 * `EXT_color_buffer_float` antes de a cena existir.
 */

/** Quanto pólen vive por flor do trecho visível, no máximo. */
const PER_HEAD = 40;
/** Até que distância em Z da câmera uma flor ainda solta pólen. */
const HEAD_REACH = 40;
/** O volume dos esporos fica à frente da câmera, como o ladrilho de relva. */
const LEAD = 26;
/** A partida: quantos passos o campo anda antes do primeiro quadro. */
const WARM_STEPS = 60;
const WARM_DELTA = 1 / 30;

const FORWARD = new Vector3();

function createState(): WebGLRenderTarget {
  return new WebGLRenderTarget(SPORE_SIZE, SPORE_SIZE, {
    count: 2,
    type: FloatType,
    format: RGBAFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

export type SporeField = {
  geometry: BufferGeometry;
  material: ShaderMaterial;
  /** Avança o campo um quadro. Chamado depois de a câmera estar no lugar. */
  step: (gl: WebGLRenderer, camera: Camera, delta: number) => void;
  dispose: () => void;
};

export function createSporeField(shared: SharedUniforms, height: Texture): SporeField {
  // As flores, em Z decrescente: a textura que a simulação sorteia e a lista
  // de Z que a CPU recorta a cada quadro.
  const heads = flowerHeads();
  const headCount = heads.length / 4;
  const rows = Math.max(1, Math.ceil(headCount / HEADS_WIDTH));
  const headData = new Float32Array(HEADS_WIDTH * rows * 4);
  headData.set(heads);
  const headTexture = new DataTexture(headData, HEADS_WIDTH, rows, RGBAFormat, FloatType);
  headTexture.minFilter = NearestFilter;
  headTexture.magFilter = NearestFilter;
  headTexture.needsUpdate = true;
  /** Quantas flores têm Z maior que `z`. */
  const headsAbove = (z: number): number => {
    let lo = 0;
    let hi = headCount;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((heads[mid * 4 + 2] ?? 0) > z) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  let read = createState();
  let write = createState();
  let primed = false;
  let frame = 0;

  const center = new Vector3();
  const eye = new Vector3();
  const headRange = new Vector2();
  const classic = { value: 0 };

  const simulation = createPassMaterial(
    SPORE_SIM_FRAG,
    {
      uPos: { value: null as Texture | null },
      uVel: { value: null as Texture | null },
      uHeads: { value: headTexture },
      uHeadRange: { value: headRange },
      uHeadShare: { value: 0 },
      uHeight: { value: height },
      uCenter: { value: center },
      uEye: { value: eye },
      uEyeVelocity: shared.eyeVelocity,
      uDelta: { value: 0 },
      uTime: shared.time,
      uFrame: { value: 0 },
      uInit: { value: 0 },
      uClassic: classic,
      ...wakeUniforms(shared),
    },
    GLSL3,
  );

  // Os pontos não têm posição própria: cada vértice lê a dele na textura de
  // estado, pelo índice. O atributo existe só para o three saber quantos são.
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(POLLEN_MAX * 3), 3));
  geometry.boundingSphere = new Sphere(new Vector3(), 1e5);

  const material = new ShaderMaterial({
    uniforms: {
      ...fogUniforms(shared),
      ...wakeUniforms(shared),
      uPos: { value: null as Texture | null },
      uVel: { value: null as Texture | null },
      uResolution: shared.resolution,
      uVeilBox: shared.veilBox,
      uVeilF: shared.veilF,
      uPanelRect: shared.panelRect,
      uClassic: classic,
    },
    vertexShader: SPORE_VERT,
    fragmentShader: SPORE_FRAG,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  const set = (target: ShaderMaterial, name: string, value: unknown) => {
    const uniform = target.uniforms[name];
    if (uniform !== undefined) uniform.value = value;
  };

  const advance = (gl: WebGLRenderer, delta: number) => {
    set(simulation, "uPos", read.textures[0] ?? null);
    set(simulation, "uVel", read.textures[1] ?? null);
    set(simulation, "uDelta", delta);
    // O sal do sorteio dá a volta: número grande demais gasta a precisão dele.
    set(simulation, "uFrame", frame);
    frame = (frame + 1) % 4096;
    blit(gl, simulation, write);
    [read, write] = [write, read];
    set(material, "uPos", read.textures[0] ?? null);
    set(material, "uVel", read.textures[1] ?? null);
  };

  return {
    geometry,
    material,
    step(gl, camera, delta) {
      camera.getWorldDirection(FORWARD);
      eye.copy(camera.position);
      center.copy(eye).addScaledVector(FORWARD, LEAD);

      // O nível de qualidade só escreve contagens: os esporos são os
      // primeiros da textura, o pólen vem depois.
      const quality = getQuality();
      const total = Math.floor(POLLEN_MAX * quality.pollen);
      const spores = Math.min(total, Math.floor(SPORES_MAX * quality.spores));
      geometry.setDrawRange(0, total);
      classic.value = spores;

      // O trecho da trilha cujas flores soltam pólen agora. Poucas flores à
      // vista não recebem o pólen todo: o que sobra é poeira no ar.
      const first = headsAbove(eye.z + HEAD_REACH);
      const count = headsAbove(eye.z - HEAD_REACH) - first;
      headRange.set(first, count);
      const pollen = total - spores;
      set(simulation, "uHeadShare", pollen > 0 ? Math.min(0.75, (count * PER_HEAD) / pollen) : 0);

      if (!primed) {
        primed = true;
        set(simulation, "uInit", 1);
        advance(gl, 0);
        set(simulation, "uInit", 0);
        for (let k = 0; k < WARM_STEPS; k += 1) advance(gl, WARM_DELTA);
        return;
      }
      advance(gl, delta);
    },
    dispose() {
      // Sem os alvos o estado se perde: o próximo passo parte de novo.
      primed = false;
      read.dispose();
      write.dispose();
      headTexture.dispose();
      simulation.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
