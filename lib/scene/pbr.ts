import {
  DataTexture,
  ImageBitmapLoader,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  type ColorSpace,
  type WebGLRenderer,
} from "three";
import { nextFrame } from "./late-assets";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./shaders/fog";
import { fogUniforms, MAX_EMITTERS, type SharedUniforms } from "./uniforms";

/**
 * O material das coisas de chapa e concreto que a câmera lê de perto: a
 * moldura das placas, o verso, o pórtico e a porta.
 *
 * É o `MeshStandardMaterial` do three com os mapas do Poly Haven (cor, normal
 * e o `arm`: oclusão, rugosidade e metal), ligado à atmosfera da cena. Sozinho
 * ele sairia preto e sem névoa: a cena não tem luz do three, mapa de ambiente
 * nem `scene.fog`. O `onBeforeCompile` abaixo dá a ele o que os outros
 * materiais têm pelo chunk de `fog.ts`:
 *
 * - a luz de campo da flora (`floraGlow`) e um mínimo geral, sem direção;
 * - cada mancha de flora como luz direta, para o brilho de raspão no chanfro.
 *   A mancha é larga, não um ponto: o ponto de luz é puxado até o raio
 *   refletido, dentro do raio dela;
 * - a névoa da cena no lugar da do three.
 *
 * Nada aqui emite: a saída fica abaixo do limiar do bloom.
 */

/** O raio de uma mancha de flora vista como fonte de luz, em metros. */
const PATCH_RADIUS = 5;
/** A luz geral fraca, a de campo e a direta: os três ganhos do material. */
const AMBIENT = 0.5;
const FIELD = 0.7;
const DIRECT = 2.5;
/** O teto da saída. O bloom começa em 1.05. */
const CEILING = 0.9;

const VERTEX_PARS = /* glsl */ `
varying vec3 vPbrWorld;
`;

const VERTEX_WORLD = /* glsl */ `
vPbrWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

// Todos os mapas leem o mesmo UV. Ele passa a ser uma variável comum, para a
// paralaxe poder deslocá-lo antes da primeira leitura de textura.
const FRAGMENT_UV = /* glsl */ `
vec2 pbrUv;
vec2 pbrPlainUv() { return vMapUv; }
#define vMapUv pbrUv
#define vNormalMapUv pbrUv
#define vRoughnessMapUv pbrUv
#define vMetalnessMapUv pbrUv
#define vAoMapUv pbrUv
`;

const FRAGMENT_PARS = /* glsl */ `
${FOG_UNIFORMS_GLSL}
uniform sampler2D uHeightMap;
uniform float uParallax;
varying vec3 vPbrWorld;

${FOG_GLSL}

// A paralaxe de altura: o relevo da chapa desloca a textura conforme o olhar.
vec2 pbrParallaxUv() {
  vec2 uv = pbrPlainUv();
  if (uParallax <= 0.0) return uv;
  mat3 frame = getTangentFrame(-vViewPosition, normalize(vNormal), uv);
  vec3 view = normalize(vViewPosition);
  vec3 tangentView = vec3(dot(view, frame[0]), dot(view, frame[1]), dot(view, frame[2]));
  float height = texture2D(uHeightMap, uv).r - 0.5;
  return uv + tangentView.xy / max(tangentView.z, 0.35) * height * uParallax;
}
`;

const FRAGMENT_LIGHTS = /* glsl */ `
{
  vec3 pbrNormal = transformDirectionByInverseViewMatrix(geometryNormal, viewMatrix);
  vec3 pbrMirror = reflect(-normalize(cameraPosition - vPbrWorld), pbrNormal);

  // A luz sem direção: o mínimo geral da cena e a luz de campo da flora. É
  // também o que a chapa espelha, na falta de um mapa de ambiente.
  vec3 pbrField = uDeep * ${AMBIENT.toFixed(2)} + floraGlow(vPbrWorld) * ${FIELD.toFixed(2)};
  irradiance += pbrField * PI;
  iblIrradiance += pbrField * PI;
  radiance += pbrField;

  // Cada mancha de flora, com a mesma queda de \`floraGlow\`. O difuso usa a
  // direção da mancha; o especular, o ponto dela mais perto do raio refletido,
  // com a correção de energia de uma fonte larga (Karis, 2013).
  float pbrAlpha = material.roughness * material.roughness;
  for (int i = 0; i < ${MAX_EMITTERS}; i++) {
    vec4 e = uEmitters[i];
    if (e.w <= 0.0) continue;
    vec3 toLight = e.xyz - vPbrWorld;
    float reach = length(toLight);
    float fall = e.w / (1.0 + reach * reach * 0.035);
    // Só as manchas por perto contam: a da parada e, de leve, a vizinha.
    if (fall < 0.02) continue;
    vec3 light = mix(uCyan, uRose, uEmitterWarm[i]) * fall * uGlow;
    float facing = saturate(dot(pbrNormal, toLight / reach));
    reflectedLight.directDiffuse += light * facing * ${DIRECT.toFixed(2)} * BRDF_Lambert(material.diffuseContribution);

    vec3 toRay = dot(toLight, pbrMirror) * pbrMirror - toLight;
    vec3 toSpot = toLight + toRay * clamp(${PATCH_RADIUS.toFixed(1)} / max(length(toRay), 1e-3), 0.0, 1.0);
    vec3 spot = normalize((viewMatrix * vec4(toSpot, 0.0)).xyz);
    float wide = pbrAlpha / saturate(pbrAlpha + ${PATCH_RADIUS.toFixed(1)} / (2.0 * reach));
    reflectedLight.directSpecular += light * saturate(dot(geometryNormal, spot)) * wide * wide
      * ${DIRECT.toFixed(2)} * BRDF_GGX_Multiscatter(spot, geometryViewDir, geometryNormal, material);
  }
}
`;

const FRAGMENT_FOG = /* glsl */ `
gl_FragColor.rgb = applyPlateFog(min(gl_FragColor.rgb, vec3(${CEILING.toFixed(2)})), vViewPosition.z, vPbrWorld);
`;

function pixel(r: number, g: number, b: number, colorSpace: ColorSpace): DataTexture {
  const texture = new DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Trechos extras de GLSL para uma variação do material (a porta). */
export type PbrExtension = {
  /** O que diferencia o programa no cache do three. */
  key: string;
  uniforms?: Record<string, { value: unknown }>;
  vertexPars?: string;
  /** Depois de `begin_vertex`: pode mexer em `transformed`. */
  vertexMove?: string;
  fragmentPars?: string;
  /** No começo do `main` do fragmento. */
  fragmentStart?: string;
  /** Depois das luzes da cena: mais luz sobre `irradiance` e `reflectedLight`. */
  fragmentLights?: string;
  /** No lugar da névoa das placas, que escurece com a distância. */
  fragmentFog?: string;
};

export type PbrMaterial = MeshStandardMaterial & {
  userData: { height: { value: Texture }; parallax: { value: number } };
};

/**
 * Cria o material com mapas de espera de um pixel. São eles que fixam os
 * `#define`s: o programa compila uma vez, com o resto da cena, e as texturas
 * de verdade só trocam de lugar com eles depois (`loadPbrSet`).
 */
export function createPbrMaterial(
  shared: SharedUniforms,
  extension?: PbrExtension,
): PbrMaterial {
  const arm = pixel(255, 190, 0, NoColorSpace);
  const material = new MeshStandardMaterial({
    map: pixel(120, 124, 126, SRGBColorSpace),
    normalMap: pixel(128, 128, 255, NoColorSpace),
    aoMap: arm,
    roughnessMap: arm,
    metalnessMap: arm,
    roughness: 1,
    metalness: 1,
  }) as PbrMaterial;
  const height = { value: pixel(128, 128, 128, NoColorSpace) as Texture };
  const parallax = { value: 0 };
  material.userData = { height, parallax };

  material.customProgramCacheKey = () => `pbr-cena:${extension?.key ?? ""}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fogUniforms(shared), extension?.uniforms, {
      uHeightMap: height,
      uParallax: parallax,
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}${extension?.vertexPars ?? ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${extension?.vertexMove ?? ""}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${VERTEX_WORLD}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <uv_pars_fragment>", `#include <uv_pars_fragment>\n${FRAGMENT_UV}`)
      .replace(
        "#include <normalmap_pars_fragment>",
        `#include <normalmap_pars_fragment>\n${FRAGMENT_PARS}${extension?.fragmentPars ?? ""}`,
      )
      .replace("void main() {", `void main() {\n${extension?.fragmentStart ?? ""}\npbrUv = pbrParallaxUv();`)
      .replace(
        "#include <lights_fragment_begin>",
        `#include <lights_fragment_begin>\n${FRAGMENT_LIGHTS}${extension?.fragmentLights ?? ""}`,
      )
      .replace("#include <fog_fragment>", extension?.fragmentFog ?? FRAGMENT_FOG);
  };
  return material;
}

/** Os conjuntos de `public/textures/cena`, gerados por `scripts/compress-assets.mjs`. */
export type PbrSet =
  | "metal_plate_02"
  | "corrugated_iron_02"
  | "green_metal_rust"
  | "concrete_wall_006"
  // Os mapas do modelo da chaminé (`scripts/extract-industry.mjs`).
  | "chamine";

let loader: ImageBitmapLoader | null = null;

async function loadMap(url: string, colorSpace: ColorSpace): Promise<Texture> {
  loader ??= new ImageBitmapLoader().setOptions({
    imageOrientation: "flipY",
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
  });
  // A imagem é decodificada fora da thread principal.
  const texture = new Texture(await loader.loadAsync(url));
  texture.flipY = false;
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Põe as texturas de verdade no lugar das de espera. Cada uma sobe para a GPU
 * num quadro próprio, para o envio não aparecer como um tranco. `alive`
 * responde se o material ainda está em uso: a carga pode chegar tarde demais.
 */
export async function applyPbrMaps(
  gl: WebGLRenderer,
  material: PbrMaterial,
  maps: {
    color: Texture;
    normal: Texture;
    arm: Texture;
    /** A oclusão, quando não é o canal vermelho do `arm`. */
    ao?: Texture | undefined;
    height?: Texture | undefined;
  },
  alive: () => boolean,
): Promise<void> {
  const textures = [maps.color, maps.normal, maps.arm, maps.ao, maps.height].filter(
    (texture): texture is Texture => texture !== undefined,
  );
  for (const texture of textures) {
    if (!alive()) break;
    gl.initTexture(texture);
    await nextFrame();
  }
  if (!alive()) {
    for (const texture of textures) texture.dispose();
    return;
  }
  const waiting = [material.map, material.normalMap, material.aoMap];
  material.map = maps.color;
  material.normalMap = maps.normal;
  material.aoMap = maps.ao ?? maps.arm;
  material.roughnessMap = maps.arm;
  material.metalnessMap = maps.arm;
  if (maps.height !== undefined) {
    waiting.push(material.userData.height.value);
    material.userData.height.value = maps.height;
  }
  for (const texture of waiting) texture?.dispose();
}

export async function loadPbrSet(
  gl: WebGLRenderer,
  material: PbrMaterial,
  set: PbrSet,
  alive: () => boolean,
  withHeight = false,
): Promise<void> {
  const base = `/textures/cena/${set}`;
  const [color, normal, arm, height] = await Promise.all([
    loadMap(`${base}_diff.webp`, SRGBColorSpace),
    loadMap(`${base}_nor_gl.webp`, NoColorSpace),
    loadMap(`${base}_arm.webp`, NoColorSpace),
    withHeight ? loadMap(`${base}_disp.webp`, NoColorSpace) : undefined,
  ]);
  await applyPbrMaps(gl, material, { color, normal, arm, height }, alive);
}

/** Libera o material e as texturas que ele segura. */
export function disposePbrMaterial(material: PbrMaterial): void {
  for (const texture of new Set([
    material.map,
    material.normalMap,
    material.aoMap,
    material.roughnessMap,
    material.metalnessMap,
    material.userData.height.value,
  ])) {
    texture?.dispose();
  }
  material.dispose();
}
