import {
  Color,
  FloatType,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  NearestFilter,
  OrthographicCamera,
  UnsignedByteType,
  Vector2,
  Vector4,
  type Mesh,
  type ShaderMaterial,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { blit, createFieldTarget, createPassMaterial } from "./gpu";
import {
  FIELD_ENCLOSURE_FRAG,
  FIELD_JFA_FRAG,
  FIELD_PACK_FRAG,
  FIELD_SEED_FRAG,
} from "./shaders/field";
import { TYPE_FIELD } from "./type-article";

/**
 * O assado do campo de distância do corpo de prova — DIRECTION.md §5.
 *
 * ## Uma fonte de verdade, literalmente
 *
 * O documento é explícito: o campo é assado **a partir do mesmo mesh** que a
 * cena desenha, "nunca a partir de uma rasterização paralela da mesma string:
 * um segundo rasterizador significa um segundo kerning, um segundo
 * arredondamento, e o escoamento passa a se descolar alguns pixels ao lado de
 * onde a letra está".
 *
 * Aqui isso é obedecido do jeito mais forte possível: **não existe segundo
 * material**. A passada de máscara renderiza o mesh vivo, com o material vivo,
 * numa câmera ortográfica com a transformada da peça zerada. Funciona porque o
 * troika termina o fragmento que injeta com
 *
 *     gl_FragColor.a *= edgeAlpha;
 *     if (edgeAlpha == 0.0) discard;
 *
 * ou seja, o canal alfa do alvo já é a cobertura do glifo, com
 * antisserrilhado. Nenhum material trocado, nenhuma recompilação de shader,
 * nenhum kerning novo.
 *
 * **Não use `scene.overrideMaterial` para isso.** O `onBeforeRender` do troika
 * pula `_prepareForRender` quando o material não é dele, os uniforms
 * `uTroika*` ficam vazios e os quads de glifo rasterizam como **retângulos
 * sólidos** — um campo de distância de uma cerca, não de um texto.
 *
 * ## Quando roda
 *
 * Uma vez por assado, do `onSync` do troika: carregamento da fonte, troca de
 * idioma, troca de corpo por breakpoint. Nunca por quadro. Quem garante isso
 * não é uma flag nossa — é o `_needsSync` do troika, que só o setter de uma
 * `SYNCABLE_PROP` levanta.
 */

/** O que o assado devolve. O bando lê os dois primeiros. */
export type TypeField = {
  texture: Texture;
  /** `(minX, minY, larguraX, alturaY)` no referencial local da peça. */
  rect: Vector4;
  /**
   * O alvo por trás da textura. Existe para a sonda poder ler o campo de volta
   * e conferir que `d = 0` cai na silhueta e que o enclausuramento só acende nos
   * vazios; a cena nunca o usa.
   */
  target: WebGLRenderTarget;
  dispose: () => void;
};

/**
 * O pedaço do `textRenderInfo` do troika que este módulo consome.
 *
 * O pacote não publica tipos utilizáveis sob este `tsconfig` (ver o docblock de
 * `components/scene/Specimen.tsx`), e o `Mesh` do three não conhece o campo.
 * Declarar só o que se usa é mais honesto que um `any`: se o troika mudar o
 * formato, isto aqui é o lugar que quebra.
 */
type TextRenderInfo = {
  /** `[minX, minY, maxX, maxY]`, colado ao traço visível dos glifos. */
  visibleBounds?: readonly number[];
  blockBounds?: readonly number[];
};

function readBounds(mesh: Mesh): readonly number[] | null {
  const info = (mesh as unknown as { textRenderInfo?: TextRenderInfo | null })
    .textRenderInfo;
  // Rodada 17: a peça é uma malha comum (o monograma extrudado), e os limites
  // são os da própria geometria. O caminho do troika fica para quem voltar a
  // assar texto.
  let bounds: readonly number[] | undefined;
  if (info === null || info === undefined) {
    const box = mesh.geometry.boundingBox;
    if (box === null) return null;
    bounds = [box.min.x, box.min.y, box.max.x, box.max.y];
  } else {
    bounds = info.visibleBounds ?? info.blockBounds;
  }
  if (bounds === undefined || bounds.length < 4) return null;
  const [minX, minY, maxX, maxY] = bounds;
  if (
    minX === undefined ||
    minY === undefined ||
    maxX === undefined ||
    maxY === undefined ||
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    maxX <= minX ||
    maxY <= minY
  ) {
    return null;
  }
  return bounds;
}

/**
 * O retângulo do campo, no referencial local da peça.
 *
 * Duas restrições, e a segunda é a que não é óbvia:
 *
 * 1. Margem mínima de `TYPE_FIELD.margin · H` em volta da silhueta, para a
 *    força morrer sozinha em vez de ser cortada na borda do retângulo.
 * 2. **Texel quadrado.** A razão do retângulo tem que ser a da textura, senão
 *    uma unidade de mundo mede um tanto na horizontal e outro na vertical: a
 *    distância do jump flood sairia anisotrópica e o gradiente apontaria para o
 *    lado errado em toda diagonal. Como a peça é larga e baixa, quem cede é a
 *    margem vertical, que cresce — e margem vertical sobrando é barata.
 */
function solveRect(bounds: readonly number[], capHeight: number): Vector4 {
  const [minX = 0, minY = 0, maxX = 0, maxY = 0] = bounds;
  const margin = TYPE_FIELD.margin * capHeight;
  const aspect = TYPE_FIELD.width / TYPE_FIELD.height;

  const inkWidth = maxX - minX + margin * 2;
  const inkHeight = maxY - minY + margin * 2;

  // O maior dos dois manda; o outro é inflado até a razão fechar. Numa string
  // curta o alto é que domina, e aí é a largura que cresce.
  let width = inkWidth;
  let height = width / aspect;
  if (height < inkHeight) {
    height = inkHeight;
    width = height * aspect;
  }

  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  return new Vector4(centerX - width * 0.5, centerY - height * 0.5, width, height);
}

/**
 * Renderiza a máscara de cobertura: o mesh vivo, o material vivo, a peça de
 * face.
 *
 * A transformada é zerada e restaurada em volta da chamada porque no instante
 * do assado a peça pode estar em 78° de ângulo de ataque (a entrada de perfil
 * do DIRECTION.md §4) — assar dali daria uma lâmina de um texel de largura.
 * O campo é guardado sem ângulo; quem reintroduz o ângulo é o shader do bando,
 * que já transforma a posição para o referencial local por `uSpecimenYaw`.
 */
function renderMask(
  gl: WebGLRenderer,
  mesh: Mesh,
  target: WebGLRenderTarget,
  rect: Vector4,
): void {
  const camera = new OrthographicCamera(
    rect.x,
    rect.x + rect.z,
    rect.y + rect.w,
    rect.y,
    1,
    3,
  );
  camera.position.set(0, 0, 2);
  camera.updateMatrixWorld();

  const previousTarget = gl.getRenderTarget();
  const previousAutoClear = gl.autoClear;
  const previousClearColor = new Color();
  gl.getClearColor(previousClearColor);
  const previousClearAlpha = gl.getClearAlpha();

  const previousPosition = mesh.position.clone();
  const previousRotation = mesh.rotation.clone();
  const previousCulled = mesh.frustumCulled;

  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  // A peça é o objeto inteiro: sem o `frustumCulled` desligado, uma esfera
  // envolvente calculada para a câmera da cena pode tirá-la do quadro do
  // assado, e o campo sairia vazio sem erro nenhum.
  mesh.frustumCulled = false;
  mesh.updateWorldMatrix(true, false);

  gl.setRenderTarget(target);
  gl.autoClear = false;
  gl.setClearColor(0x000000, 0);
  gl.clear(true, false, false);
  gl.render(mesh, camera);

  mesh.position.copy(previousPosition);
  mesh.rotation.copy(previousRotation);
  mesh.frustumCulled = previousCulled;
  mesh.updateWorldMatrix(true, false);

  gl.setClearColor(previousClearColor, previousClearAlpha);
  gl.autoClear = previousAutoClear;
  gl.setRenderTarget(previousTarget);
}

let bakes = 0;
let current: TypeField | null = null;

/**
 * Quantas vezes o campo foi assado nesta página.
 *
 * O DIRECTION.md §5 diz "nunca por frame", e isso é uma afirmação verificável,
 * não um comentário: a sonda lê este contador depois de rolar a descida
 * inteira e ele tem que continuar em 1.
 */
export function typeFieldBakeCount(): number {
  return bakes;
}

/**
 * O último campo assado.
 *
 * Existe para a sonda não precisar de mais uma prop atravessando `SceneWorld` →
 * `Specimen`: o assado é um evento único e global por página, e um ponteiro
 * aqui descreve isso melhor que um `ref` passado por três componentes que não
 * têm nada a ver com medição.
 */
export function currentTypeField(): TypeField | null {
  return current;
}

export function bakeTypeField(
  gl: WebGLRenderer,
  mesh: Mesh,
  capHeight: number,
): TypeField | null {
  bakes += 1;
  const bounds = readBounds(mesh);
  if (bounds === null) return null;

  const rect = solveRect(bounds, capHeight);
  const { width, height, enclosureScale, enclosureReach, enclosureShape } =
    TYPE_FIELD;

  const mask = createFieldTarget(width, height, {
    type: UnsignedByteType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });
  const ping = [
    createFieldTarget(width, height, {
      type: FloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    }),
    createFieldTarget(width, height, {
      type: FloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    }),
  ] as const;
  const enclosure = createFieldTarget(
    Math.max(1, Math.floor(width / enclosureScale)),
    Math.max(1, Math.floor(height / enclosureScale)),
    { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter },
  );
  const field = createFieldTarget(width, height, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
  });

  const texel = new Vector2(1 / width, 1 / height);
  const size = new Vector2(rect.z, rect.w);
  const materials: ShaderMaterial[] = [];
  const pass = (fragment: string, uniforms: ShaderMaterial["uniforms"]) => {
    const material = createPassMaterial(fragment, uniforms, GLSL3);
    materials.push(material);
    return material;
  };

  try {
    renderMask(gl, mesh, mask, rect);

    // --- semente ------------------------------------------------------------
    const seed = pass(FIELD_SEED_FRAG, {
      uMask: { value: mask.texture },
      uTexel: { value: texel },
    });
    blit(gl, seed, ping[0]);

    // --- jump flood ---------------------------------------------------------
    // `ceil(log2(maior lado))` passadas, do meio da textura até um texel, mais
    // uma repetição do passo 1: é o "JFA+1", que fecha os poucos texels que o
    // salto potência-de-dois deixa com uma semente pior que a do vizinho.
    const jfa = pass(FIELD_JFA_FRAG, {
      uJfa: { value: null },
      uTexel: { value: texel },
      uRect: { value: size },
      uStep: { value: 1 },
    });

    const steps: number[] = [];
    for (
      let step = Math.pow(2, Math.ceil(Math.log2(Math.max(width, height))) - 1);
      step >= 1;
      step /= 2
    ) {
      steps.push(step);
    }
    steps.push(1);

    let read = 0;
    for (const step of steps) {
      const write = read ^ 1;
      const source = ping[read];
      const destination = ping[write];
      if (source === undefined || destination === undefined) break;
      setUniform(jfa, "uJfa", source.texture);
      setUniform(jfa, "uStep", step);
      blit(gl, jfa, destination);
      read = write;
    }
    const resolved = ping[read];
    if (resolved === undefined) return null;

    // --- enclausuramento ----------------------------------------------------
    const rays = pass(FIELD_ENCLOSURE_FRAG, {
      uMask: { value: mask.texture },
      uRect: { value: size },
      uReach: { value: enclosureReach * capHeight },
    });
    blit(gl, rays, enclosure);

    // --- empacotamento ------------------------------------------------------
    const pack = pass(FIELD_PACK_FRAG, {
      uMask: { value: mask.texture },
      uJfa: { value: resolved.texture },
      uEnclosure: { value: enclosure.texture },
      uTexel: { value: texel },
      uRect: { value: size },
      uCapHeight: { value: capHeight },
      uEncShape: {
        value: new Vector2(enclosureShape[0], enclosureShape[1]),
      },
    });
    blit(gl, pack, field);

    const baked: TypeField = {
      texture: field.texture,
      rect,
      target: field,
      dispose: () => {
        if (current === baked) current = null;
        field.dispose();
      },
    };
    current = baked;
    return baked;
  } finally {
    // Os intermediários são ~19 MB e não servem para mais nada depois do
    // empacotamento. Só o campo final (2 MB, meio-float) fica residente.
    mask.dispose();
    ping[0].dispose();
    ping[1].dispose();
    enclosure.dispose();
    for (const material of materials) material.dispose();
  }
}

function setUniform(
  material: ShaderMaterial,
  name: string,
  value: unknown,
): void {
  const uniform = material.uniforms[name];
  if (uniform !== undefined) uniform.value = value;
}
