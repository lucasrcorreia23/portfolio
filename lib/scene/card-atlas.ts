import {
  ClampToEdgeWrapping,
  DataArrayTexture,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
} from "three";
import type { RiverCard } from "./river-content";
import {
  COVER_FIELD_GAIN,
  COVER_GAIN_MAX,
  COVER_GAIN_MIN,
  COVER_SELF_TARGET,
} from "./shaders/cards";
import {
  COVER_LAYER_HEIGHT,
  COVER_LAYER_WIDTH,
  PLATE_LAYER_HEIGHT,
  PLATE_LAYER_WIDTH,
} from "./card-layout";

/**
 * As duas texturas de conteúdo do rio: a capa de cada case e a placa de cota
 * gravada com cliente, título e ano.
 *
 * ## Por que `sampler2DArray`, e não um atlas em tira
 *
 * O material dos cards é **uma malha instanciada só** (ver `Cards.tsx`), então
 * o fragmento precisa escolher a imagem pelo índice da instância — e esse
 * índice chega num varying, ou seja **não é dinamicamente uniforme**. GLSL ES
 * 3.00 proíbe indexar um array de samplers assim: `uCovers[vIndex]` não
 * compila. As duas saídas usuais são um atlas em tira (UV deslocada por linha)
 * ou uma textura em camadas.
 *
 * A tira sangra. Com filtragem linear, o texel da borda de uma linha mede a
 * média com a linha vizinha, e com mipmap o sangramento vira a imagem inteira
 * do card ao lado aparecendo por cima. Numa textura em camadas o índice é
 * **parte da coordenada** (`texture(tex, vec3(uv, layer))`), não um índice de
 * array: é legal com índice não uniforme, e cada camada filtra sozinha.
 *
 * ## Nada de retângulo cinza
 *
 * PROJECT.md §6 é explícito, e o prompt do rio repete: "não deixe retângulo
 * cinza, não use ícone no lugar de imagem". Enquanto a imagem não chega, quem
 * desenha a capa é o campo procedural do próprio shader (`coverField`, em
 * `shaders/cards.ts`) — que é da paleta e da metáfora, não um placeholder. A
 * camada nasce preenchida com o mesmo tom escuro do acento, e o shader
 * atravessa de um para o outro com `uCoverBlend`, por card, conforme cada
 * imagem chega. Em nenhum quadro existe cinza.
 *
 * ## As camadas e as duas classes de dado
 *
 * A **capa** é imagem: sai de um `<img>` desenhado num canvas 2D com
 * enquadramento `cover` (preenche a camada, corta o excedente), e é convertida
 * de sRGB para linear **no shader** — não pelo `colorSpace` do three, para o
 * caminho não depender de qual formato interno a versão da biblioteca escolhe
 * para `texImage3D`.
 *
 * A **placa** é máscara, e carrega **dois níveis em dois canais**:
 *
 * - `R` — o nível principal: título, cliente e ano. É o que se lê à distância
 *   de leitura, de raspão.
 * - `G` — o nível de detalhe: número de estação, régua fina e marcas de
 *   intervalo. Só aparece quando o card se aproxima da lente — é o "ao
 *   aproximar, ganha detalhe" do prompt, resolvido sem uma segunda textura e
 *   sem um segundo `draw`.
 *
 * Máscara não passa por conversão de espaço de cor: os dois canais são lidos
 * crus.
 */

/** Quantos milissegundos esperar pela fonte antes de desenhar a placa assim mesmo. */
const FONT_DEADLINE_MS = 1500;

export type CardAtlas = {
  /** Capas, uma camada por card. */
  cover: DataArrayTexture;
  /** Placas de cota, uma camada por card. R = principal, G = detalhe. */
  plate: DataArrayTexture;
  /**
   * `1` quando a imagem de capa daquele card já está na textura.
   *
   * Quem faz a travessia do campo procedural para a imagem é o shader, com
   * `uCoverBlend` amortecido por quadro — este array é só o alvo.
   */
  readonly loaded: Float32Array;
  /**
   * A luz própria de cada capa (rodada 12): o ganho que leva a luminância
   * média **desta** imagem a `COVER_SELF_TARGET` antes da névoa. Calculado uma
   * vez, quando a camada chega; até lá vale o do campo procedural.
   */
  readonly gain: Float32Array;
  /**
   * `true` quando alguma camada mudou e a textura precisa subir de novo.
   *
   * Existe para o upload ser **um por quadro**, e não um por imagem: são ~6 MB
   * por `needsUpdate` numa `DataArrayTexture`, e sete imagens chegando juntas
   * custariam sete uploads do buffer inteiro.
   */
  consumePending: () => boolean;
  dispose: () => void;
};

/** Desenha uma imagem cobrindo o retângulo, cortando o excedente. */
function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  const source = image.naturalWidth / image.naturalHeight;
  const target = width / height;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (source > target) sw = image.naturalHeight * target;
  else sh = image.naturalWidth / target;
  context.drawImage(
    image,
    (image.naturalWidth - sw) / 2,
    (image.naturalHeight - sh) / 2,
    sw,
    sh,
    0,
    0,
    width,
    height,
  );
}

function makeCanvas(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) throw new Error("sem contexto 2D para o atlas do rio");
  return context;
}

/**
 * A placa de cota de um card, desenhada em dois níveis.
 *
 * **Ela é uma gravação, não um rótulo**, e quem faz isso é o shader — aqui só
 * sai a máscara. O corpo é mono em caixa alta com tracking largo, que é o
 * léxico da HUD do DIRECTION.md §2 (`EST. 040`, `COTA +12.40`); o título entra
 * na display, porque é o nome da peça e não um metadado.
 *
 * Nada de opacidade para baixar o tom (DIRECTION.md §5): a máscara sai cheia e
 * quem decide quanto dela chega ao pixel é a luz de raspão do material.
 */
function drawPlate(
  main: CanvasRenderingContext2D,
  detail: CanvasRenderingContext2D,
  card: RiverCard,
): void {
  const w = PLATE_LAYER_WIDTH;
  const h = PLATE_LAYER_HEIGHT;

  for (const context of [main, detail]) {
    context.clearRect(0, 0, w, h);
    context.fillStyle = "#000";
    context.fillRect(0, 0, w, h);
    context.fillStyle = "#fff";
    context.strokeStyle = "#fff";
    context.textBaseline = "alphabetic";
  }

  // --- nível principal: título, cliente, ano -------------------------------
  const pad = Math.round(w * 0.012);

  // O título, na display. `fontStretch` é o eixo `wdth: 125` da `.type-display`
  // — o Canvas 2D o expõe como atributo próprio; onde não existir, a família
  // cai para a largura normal e a placa continua legível.
  main.fontStretch = "expanded";
  main.font = `700 ${Math.round(h * 0.42)}px Archivo, ui-sans-serif, system-ui, sans-serif`;
  main.textAlign = "left";
  main.fillText(card.title.toLocaleUpperCase("pt-BR"), pad, Math.round(h * 0.46));

  // Cliente e ano, em mono, na linha de baixo. Caixa alta e tracking positivo.
  main.fontStretch = "normal";
  const monoSize = Math.round(h * 0.19);
  main.font = `500 ${monoSize}px "Geist Mono", ui-monospace, SFMono-Regular, monospace`;
  main.letterSpacing = `${(monoSize * 0.16).toFixed(2)}px`;
  main.textAlign = "left";
  main.fillText(card.client.toLocaleUpperCase("pt-BR"), pad, Math.round(h * 0.82));
  main.textAlign = "right";
  main.fillText(String(card.year), w - pad, Math.round(h * 0.82));

  // A régua da placa: uma linha fina abaixo do título, do léxico da estrutura.
  main.fillRect(pad, Math.round(h * 0.56), Math.round(w * 0.28), 2);

  // --- nível de detalhe: estação e marcas de intervalo ---------------------
  // `EST.` é o número de estação do DIRECTION.md §2, e aqui ele é o posto do
  // card na curadoria — a mesma ordem que o `river_rank` grava no frontmatter.
  detail.fontStretch = "normal";
  const detailSize = Math.round(h * 0.15);
  detail.font = `500 ${detailSize}px "Geist Mono", ui-monospace, SFMono-Regular, monospace`;
  detail.letterSpacing = `${(detailSize * 0.2).toFixed(2)}px`;
  detail.textAlign = "right";
  detail.fillText(
    `EST. ${String(card.rank).padStart(3, "0")}`,
    w - pad,
    Math.round(h * 0.34),
  );

  // Marcas de intervalo em dois períodos primos entre si, que nunca batem em
  // fase dentro da placa — gravação em concreto, não papel milimetrado
  // (DIRECTION.md §4, o mesmo critério da veneziana do portão).
  const baseline = Math.round(h * 0.92);
  for (let x = pad; x < w - pad; x += 23) {
    detail.fillRect(x, baseline, 1, Math.round(h * 0.06));
  }
  for (let x = pad; x < w - pad; x += 71) {
    detail.fillRect(x, baseline - Math.round(h * 0.05), 1, Math.round(h * 0.11));
  }
}

const SRGB_TO_LINEAR = new Float32Array(256).map((_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
});

/**
 * O ganho da luz própria de uma capa: `COVER_SELF_TARGET` sobre a luminância
 * média **linear** da camada (já recortada na razão da capa), dentro da faixa.
 * Um pixel em cada quatro, nas duas direções: é uma média, não uma imagem.
 */
function coverGain(pixels: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < COVER_LAYER_HEIGHT; y += 4) {
    for (let x = 0; x < COVER_LAYER_WIDTH; x += 4) {
      const at = (y * COVER_LAYER_WIDTH + x) * 4;
      sum +=
        0.2126 * (SRGB_TO_LINEAR[pixels[at] ?? 0] ?? 0) +
        0.7152 * (SRGB_TO_LINEAR[pixels[at + 1] ?? 0] ?? 0) +
        0.0722 * (SRGB_TO_LINEAR[pixels[at + 2] ?? 0] ?? 0);
      n += 1;
    }
  }
  const mean = sum / Math.max(n, 1);
  return Math.min(COVER_GAIN_MAX, Math.max(COVER_GAIN_MIN, COVER_SELF_TARGET / Math.max(mean, 1e-4)));
}

/**
 * Monta as duas texturas em camadas para a corrente montada.
 *
 * Síncrono no que é texto e assíncrono no que é imagem: a placa fica pronta no
 * primeiro quadro, e cada capa entra quando chega.
 */
export function createCardAtlas(cards: readonly RiverCard[]): CardAtlas {
  const count = Math.max(1, cards.length);

  const coverData = new Uint8Array(
    COVER_LAYER_WIDTH * COVER_LAYER_HEIGHT * 4 * count,
  );
  const plateData = new Uint8Array(
    PLATE_LAYER_WIDTH * PLATE_LAYER_HEIGHT * 4 * count,
  );

  const cover = new DataArrayTexture(
    coverData,
    COVER_LAYER_WIDTH,
    COVER_LAYER_HEIGHT,
    count,
  );
  cover.format = RGBAFormat;
  cover.type = UnsignedByteType;
  // Sem mipmap, e por escolha: a corrente inteira mora atrás da profundidade de
  // campo do beat (`RIVER_APERTURE`), e os cards mais minificados são
  // exatamente os mais desfocados — o círculo de confusão já é o filtro. Uma
  // cadeia de mipmap numa `DataArrayTexture` precisaria ser regerada a cada
  // upload de camada, e o upload já é a parte cara.
  cover.minFilter = LinearFilter;
  cover.magFilter = LinearFilter;
  cover.wrapS = ClampToEdgeWrapping;
  cover.wrapT = ClampToEdgeWrapping;
  cover.generateMipmaps = false;
  cover.needsUpdate = true;

  const plate = new DataArrayTexture(
    plateData,
    PLATE_LAYER_WIDTH,
    PLATE_LAYER_HEIGHT,
    count,
  );
  plate.format = RGBAFormat;
  plate.type = UnsignedByteType;
  plate.minFilter = LinearFilter;
  plate.magFilter = LinearFilter;
  plate.wrapS = ClampToEdgeWrapping;
  plate.wrapT = ClampToEdgeWrapping;
  plate.generateMipmaps = false;

  const loaded = new Float32Array(count);
  const gain = new Float32Array(count).fill(COVER_FIELD_GAIN);
  let pending = true;
  let disposed = false;

  const coverContext = makeCanvas(COVER_LAYER_WIDTH, COVER_LAYER_HEIGHT);
  const plateMain = makeCanvas(PLATE_LAYER_WIDTH, PLATE_LAYER_HEIGHT);
  const plateDetail = makeCanvas(PLATE_LAYER_WIDTH, PLATE_LAYER_HEIGHT);

  const coverStride = COVER_LAYER_WIDTH * COVER_LAYER_HEIGHT * 4;
  const plateStride = PLATE_LAYER_WIDTH * PLATE_LAYER_HEIGHT * 4;

  /** Desenha as placas de todos os cards. Chamada de novo quando a fonte chega. */
  const paintPlates = () => {
    if (disposed) return;
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      if (card === undefined) continue;
      drawPlate(plateMain, plateDetail, card);
      const mainPixels = plateMain.getImageData(
        0,
        0,
        PLATE_LAYER_WIDTH,
        PLATE_LAYER_HEIGHT,
      ).data;
      const detailPixels = plateDetail.getImageData(
        0,
        0,
        PLATE_LAYER_WIDTH,
        PLATE_LAYER_HEIGHT,
      ).data;
      const base = i * plateStride;
      for (let p = 0; p < plateStride; p += 4) {
        plateData[base + p] = mainPixels[p] ?? 0;
        plateData[base + p + 1] = detailPixels[p] ?? 0;
        plateData[base + p + 2] = 0;
        plateData[base + p + 3] = 255;
      }
    }
    plate.needsUpdate = true;
  };

  paintPlates();

  // As duas famílias já são tarefa do preload (`lib/preload/manifest.ts`), mas a
  // cena pode montar antes de `document.fonts` ter resolvido a instância exata
  // que a placa pede. Redesenhar quando ela chegar custa dois `getImageData` por
  // card e evita uma placa desenhada com a métrica de fallback.
  if (typeof document !== "undefined" && "fonts" in document) {
    const wait = Promise.all([
      document.fonts.load(`500 ${PLATE_LAYER_HEIGHT * 0.19}px "Geist Mono"`),
      document.fonts.load(`700 ${PLATE_LAYER_HEIGHT * 0.42}px Archivo`),
    ]);
    const deadline = new Promise((done) =>
      setTimeout(done, FONT_DEADLINE_MS),
    );
    Promise.race([wait, deadline]).then(paintPlates, () => {});
  }

  // As capas. Cada uma entra na própria camada quando decodifica; o campo
  // procedural do shader cobre a espera.
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    if (card === undefined) continue;
    const image = new Image();
    image.decoding = "async";
    image.src = card.cover;
    const place = () => {
      if (disposed) return;
      drawCover(coverContext, image, COVER_LAYER_WIDTH, COVER_LAYER_HEIGHT);
      const pixels = coverContext.getImageData(
        0,
        0,
        COVER_LAYER_WIDTH,
        COVER_LAYER_HEIGHT,
      ).data;
      coverData.set(pixels, i * coverStride);
      gain[i] = coverGain(pixels);
      loaded[i] = 1;
      pending = true;
    };
    // `decode()` evita o pico de decodificação dentro do quadro em que a
    // imagem é desenhada; o `onload` é a rede de segurança para navegadores em
    // que ela rejeita por motivo bobo (a imagem já está lá).
    image
      .decode()
      .then(place, () => {
        if (image.complete && image.naturalWidth > 0) place();
        else image.onload = place;
      });
  }

  return {
    cover,
    plate,
    loaded,
    gain,
    consumePending: () => {
      if (!pending) return false;
      pending = false;
      cover.needsUpdate = true;
      return true;
    },
    dispose: () => {
      disposed = true;
      cover.dispose();
      plate.dispose();
    },
  };
}
