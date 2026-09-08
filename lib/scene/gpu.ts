import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  FloatType,
  Mesh,
  NearestFilter,
  NoBlending,
  NoColorSpace,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type RenderTargetOptions,
  type WebGLRenderer,
} from "three";

/**
 * O encanamento de passadas de tela cheia.
 *
 * Um triângulo, uma cena, uma câmera ortográfica — reaproveitados por **todas**
 * as passadas: os dois passos da simulação do bando, a cadeia de bloom, o
 * borrão da profundidade de campo e o composite final. É a peça que torna o
 * compositor próprio praticamente de graça: ela já era necessária para os
 * boids.
 *
 * **Triângulo, não quad.** Um triângulo que transborda a tela não tem a
 * costura diagonal do par de triângulos, e roda um quarto a menos de quads de
 * fragmento na borda. É o padrão para passadas de tela cheia e custa três
 * vértices.
 */

const FULLSCREEN_TRIANGLE = new BufferGeometry();
FULLSCREEN_TRIANGLE.setAttribute(
  "position",
  new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
);
FULLSCREEN_TRIANGLE.setAttribute(
  "uv",
  new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2),
);

const QUAD_SCENE = new Scene();
const QUAD_CAMERA = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
const QUAD_MESH = new Mesh(FULLSCREEN_TRIANGLE, new ShaderMaterial());
QUAD_MESH.frustumCulled = false;
QUAD_SCENE.add(QUAD_MESH);

/** O vertex shader de toda passada de tela cheia. */
export const FULLSCREEN_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Desenha `material` em `target` (ou na tela, se `null`).
 *
 * Salva e restaura o alvo e o `autoClear`. Restaurar não é zelo: o `blit`
 * roda no meio do quadro, entre a simulação e o composite, e deixar o alvo
 * trocado mandaria a cena inteira para dentro de um FBO de 64×64. O triângulo
 * cobre todos os texels, então limpar antes seria só desperdício.
 */
export function blit(
  gl: WebGLRenderer,
  material: ShaderMaterial,
  target: WebGLRenderTarget | null,
): void {
  const previousTarget = gl.getRenderTarget();
  const previousAutoClear = gl.autoClear;

  QUAD_MESH.material = material;
  gl.autoClear = false;
  gl.setRenderTarget(target);
  gl.render(QUAD_SCENE, QUAD_CAMERA);

  gl.autoClear = previousAutoClear;
  gl.setRenderTarget(previousTarget);
}

/**
 * Alvo de dados para a simulação: RGBA32F, sem filtro, sem mipmap, sem
 * profundidade.
 *
 * **`NearestFilter` nos dois filtros, e explicitamente.** O padrão de
 * `minFilter` é linear, e filtrar textura de ponto flutuante exige
 * `OES_texture_float_linear`, que é uma extensão à parte e falta em boa parte
 * das GPUs móveis. O three **não lança** nesse caso: ele avisa no console e
 * amarra `LINEAR` assim mesmo. O modo de falha seria uma simulação
 * silenciosamente corrompida, que é o pior tipo — por isso os dois filtros
 * estão escritos aqui, e não herdados.
 */
const DATA_TARGET_OPTIONS: RenderTargetOptions = {
  type: FloatType,
  minFilter: NearestFilter,
  magFilter: NearestFilter,
  wrapS: ClampToEdgeWrapping,
  wrapT: ClampToEdgeWrapping,
  colorSpace: NoColorSpace,
  depthBuffer: false,
  stencilBuffer: false,
  generateMipmaps: false,
};

export function createDataTarget(size: number): WebGLRenderTarget {
  return new WebGLRenderTarget(size, size, DATA_TARGET_OPTIONS);
}

/**
 * Alvo retangular, para o assado do campo de distância do corpo de prova.
 *
 * `createDataTarget` é quadrado porque a textura da simulação é quadrada por
 * construção (16.384 = 128²). A peça não é: sete letras num corpo de 2.79
 * dão um retângulo de razão ~4:1, e um alvo quadrado ou desperdiçaria 75% dos
 * texels ou esmagaria a resolução vertical.
 *
 * **O filtro é argumento, e a escolha certa não é a de `createDataTarget`.**
 * Ali `NearestFilter` é obrigatório porque filtrar ponto flutuante de 32 bits
 * exige `OES_texture_float_linear`, que falta em boa parte das GPUs móveis. O
 * campo final é **meio-float**, e filtrar meio-float é core no WebGL2 — então
 * ele pode e deve ser linear: o gradiente que o escoamento lê precisa ser
 * contínuo entre texels, senão a força de separação degrau a cada 0.0176 de
 * unidade e o bando ganha uma escada invisível.
 */
export function createFieldTarget(
  width: number,
  height: number,
  options: RenderTargetOptions,
): WebGLRenderTarget {
  return new WebGLRenderTarget(width, height, {
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    colorSpace: NoColorSpace,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
    ...options,
  });
}

/** O material de uma passada de tela cheia: sem profundidade, sem blend. */
export function createPassMaterial(
  fragmentShader: string,
  uniforms: ShaderMaterial["uniforms"],
  glslVersion: ShaderMaterial["glslVersion"],
): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: FULLSCREEN_VERT,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
  material.glslVersion = glslVersion;
  return material;
}

export function disposeFullscreenPlumbing(): void {
  FULLSCREEN_TRIANGLE.dispose();
}
