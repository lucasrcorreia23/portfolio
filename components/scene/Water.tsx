"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  GLSL3,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type Mesh,
} from "three";
import { PLAN_FAR, PLAN_NEAR, WATER_LEVEL } from "@/lib/scene/chamber-plan";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "@/lib/scene/shaders/fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "@/lib/scene/shaders/lights";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";

/**
 * **O rio** (rodada 22) — água de verdade no piso da câmara inteira.
 *
 * Até aqui o piso tinha poças: manchas de ruído com o brilho especular das
 * luzes, sem reflexo nenhum. O Lucas pediu que a câmara lembrasse um rio com
 * água, com sutileza e realismo. Agora é uma lâmina contínua, rasa, de ponta a
 * ponta, com **reflexo planar de verdade**: a cada quadro a cena é desenhada
 * por uma câmera espelhada pelo plano da água, em meia resolução, com o plano
 * de recorte oblíquo (nada abaixo da água entra no reflexo). A superfície
 * amostra esse reflexo distorcido por ondulações que correm rio abaixo, na
 * direção do escoamento, e o mistura com o corpo escuro da água pelo Fresnel:
 * de raspão, que é como a câmera vê o piso, a água é espelho; olhando para
 * baixo, é escura e funda.
 *
 * A matemática da câmera espelhada é a do `Reflector` dos exemplos do three,
 * escrita aqui porque a cena é desenhada pelo compositor e os materiais são
 * todos próprios (a névoa de cada material usa `cameraPosition`, então o
 * reflexo sai com a névoa vista do lugar certo).
 */

/**
 * A altura da água. No piso (y −7) o reflexo do que importa — os cards, o
 * bando, o LRC, todos perto de y 0 — caía longe demais, fora do quadro, e
 * perto da câmera a água só refletia o teto escuro. A −3.6 o rio corre logo
 * abaixo do tubo do bando, dos cards mais baixos (base em −3.0) e do plinto do
 * LRC: as peças pairam sobre a água, e o reflexo delas entra na metade de
 * baixo da tela.
 */
export const WATER_Y = WATER_LEVEL;

const HALF_WIDTH = 17;

const VERT = /* glsl */ `
uniform mat4 uTextureMatrix;
out vec3 vWorld;
out vec4 vProjected;
out float vViewDepth;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vProjected = uTextureMatrix * world;
  vec4 view = viewMatrix * world;
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

const FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

uniform sampler2D uReflection;

in vec3 vWorld;
in vec4 vProjected;
in float vViewDepth;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}

/** A superfície: duas ondulações de ruído correndo rio abaixo (+z). */
float surface(vec2 p) {
  float t = uTime;
  return sceneNoise(vec3(p.x * 0.8, t * 0.22, p.y * 0.45 - t * 0.55))
    + 0.45 * sceneNoise(vec3(p.x * 2.2, t * 0.35 + 3.0, p.y * 1.4 - t * 1.2))
    + 0.15 * sceneNoise(vec3(p.x * 6.0, t * 0.6 + 7.0, p.y * 4.5 - t * 2.4));
}

void main() {
  const float e = 0.04;
  vec2 p = vWorld.xz;
  float h = surface(p);
  float hx = (surface(p + vec2(e, 0.0)) - h) / e;
  float hz = (surface(p + vec2(0.0, e)) - h) / e;
  // A ondulação some ao longe: a água distante é um espelho quase liso, e o
  // ruído fino ali seria serrilhado.
  float near = exp(-vViewDepth * 0.02);
  vec3 n = normalize(vec3(-hx * 0.14 * near, 1.0, -hz * 0.14 * near));

  vec3 v = normalize(cameraPosition - vWorld);
  float cosine = max(dot(n, v), 0.0);
  // Schlick com a água (F0 = 0.02), limitado: nem a água de raspão é um
  // espelho perfeito, ela tem corpo.
  float fresnel = 0.02 + 0.98 * pow(1.0 - cosine, 5.0);
  fresnel = min(fresnel, 0.82);

  // A água de verdade não devolve uma imagem: devolve riscas. O reflexo é
  // deslocado pela ondulação e esticado na vertical (quatro amostras ao
  // longo de y), que é o que um rio faz com uma luz acima dele.
  vec2 uv = vProjected.xy / vProjected.w + n.xz * 0.06;
  float smear = 0.006 + 0.01 * abs(hz) * near;
  vec3 reflected = (
    texture(uReflection, uv).rgb
    + texture(uReflection, uv + vec2(0.0, smear)).rgb
    + texture(uReflection, uv - vec2(0.0, smear)).rgb
    + texture(uReflection, uv + vec2(0.0, smear * 2.0)).rgb
  ) * 0.25;

  // O corpo da água: escuro, um pouco de teal, e a luz que passa perto
  // atravessando a lâmina.
  vec3 body = uDeep * 0.18 + lampLight(vWorld) * 0.12;

  vec3 color = mix(body, reflected * 0.78, fresnel);

  // O brilho das luzes na crista das ondulações.
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 d = uClusters[i].xyz - vWorld;
    vec3 hv = normalize(normalize(d) + v);
    spec += uClusterColor[i] * uClusters[i].w * pow(max(dot(n, hv), 0.0), 120.0)
      / (1.0 + dot(d, d) * 0.01);
  }
  color += spec * 0.6;

  fragColor = vec4(applyFog(color, vViewDepth, vWorld), 1.0);
}
`;

export function Water({ shared }: { shared: SharedUniforms }) {
  const meshRef = useRef<Mesh>(null);

  const rig = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    const textureMatrix = new Matrix4();
    const material = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uReflection: { value: target.texture },
        uTextureMatrix: { value: textureMatrix },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: true,
      transparent: false,
      toneMapped: false,
    });
    material.glslVersion = GLSL3;
    const length = PLAN_NEAR - PLAN_FAR;
    const geometry = new PlaneGeometry(HALF_WIDTH * 2, length, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, WATER_Y, (PLAN_NEAR + PLAN_FAR) / 2);
    return {
      target,
      textureMatrix,
      material,
      geometry,
      virtualCamera: new PerspectiveCamera(),
      plane: new Plane(),
      clip: new Vector4(),
      q: new Vector4(),
      normal: new Vector3(0, 1, 0),
      point: new Vector3(0, WATER_Y, 0),
      view: new Vector3(),
      target3: new Vector3(),
      lookAt: new Vector3(),
      rotation: new Matrix4(),
    };
  }, [shared]);

  useEffect(
    () => () => {
      rig.target.dispose();
      rig.material.dispose();
      rig.geometry.dispose();
    },
    [rig],
  );

  // Antes do compositor (prioridade 1) e depois do laço mestre e do bando:
  // o reflexo é do quadro que vai ser desenhado.
  useFrame((state) => {
    const mesh = meshRef.current;
    const camera = state.camera as PerspectiveCamera;
    if (mesh === null || !("isPerspectiveCamera" in camera)) return;
    const gl = state.gl;

    const size = gl.getDrawingBufferSize(TMP_SIZE);
    const width = Math.max(1, Math.floor(size.x / 2));
    const height = Math.max(1, Math.floor(size.y / 2));
    if (rig.target.width !== width || rig.target.height !== height) {
      rig.target.setSize(width, height);
    }

    // A câmera espelhada, como no Reflector do three.
    const { normal, point, view, lookAt, rotation, virtualCamera } = rig;
    camera.updateMatrixWorld();
    view.setFromMatrixPosition(camera.matrixWorld);
    if (view.y < WATER_Y) return;
    rotation.extractRotation(camera.matrixWorld);
    lookAt.set(0, 0, -1).applyMatrix4(rotation).add(view);
    // O espelho de um ponto: o plano mais o reflexo do deslocamento até ele.
    const mirrorOf = (v: Vector3) => v.sub(point).reflect(normal).add(point);
    mirrorOf(view);
    mirrorOf(lookAt);
    virtualCamera.position.copy(view);
    virtualCamera.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal);
    virtualCamera.lookAt(lookAt);
    virtualCamera.near = camera.near;
    virtualCamera.far = camera.far;
    virtualCamera.updateMatrixWorld();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
    virtualCamera.layers.mask = camera.layers.mask;

    rig.textureMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    );
    rig.textureMatrix.multiply(virtualCamera.projectionMatrix);
    rig.textureMatrix.multiply(virtualCamera.matrixWorldInverse);

    // O recorte oblíquo: o plano próximo da câmera espelhada passa a ser o
    // plano da água, e nada abaixo dela entra no reflexo.
    rig.plane.setFromNormalAndCoplanarPoint(normal, point);
    rig.plane.applyMatrix4(virtualCamera.matrixWorldInverse);
    rig.clip.set(rig.plane.normal.x, rig.plane.normal.y, rig.plane.normal.z, rig.plane.constant);
    const projection = virtualCamera.projectionMatrix.elements;
    rig.q.x = (Math.sign(rig.clip.x) + (projection[8] ?? 0)) / (projection[0] ?? 1);
    rig.q.y = (Math.sign(rig.clip.y) + (projection[9] ?? 0)) / (projection[5] ?? 1);
    rig.q.z = -1;
    rig.q.w = (1 + (projection[10] ?? 0)) / (projection[14] ?? 1);
    rig.clip.multiplyScalar(2 / rig.clip.dot(rig.q));
    projection[2] = rig.clip.x;
    projection[6] = rig.clip.y;
    projection[10] = rig.clip.z + 1;
    projection[14] = rig.clip.w;

    const previousTarget = gl.getRenderTarget();
    const previousAutoClear = gl.autoClear;
    mesh.visible = false;
    gl.autoClear = false;
    gl.setRenderTarget(rig.target);
    gl.clear(true, true, false);
    gl.render(state.scene, virtualCamera);
    gl.setRenderTarget(previousTarget);
    gl.autoClear = previousAutoClear;
    mesh.visible = true;
  }, 0);

  return <mesh ref={meshRef} geometry={rig.geometry} material={rig.material} frustumCulled={false} />;
}

const TMP_SIZE = new Vector2();
