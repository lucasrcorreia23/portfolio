import { open } from "node:fs/promises";
import path from "node:path";

/**
 * As dimensões intrínsecas de uma imagem de `public/`, lidas do cabeçalho.
 *
 * ## Por que isto existe, e por que não é uma dependência
 *
 * As mídias dos cases são referenciadas por caminho no MDX (`![…](/assets/…)`),
 * não importadas como módulo, então o Next não conhece o tamanho delas. Sem
 * `width`/`height` o `next/image` não roda, e um `<img>` sem dimensão reserva
 * zero de altura: cada imagem que chega empurra o texto para baixo, que é
 * exatamente o salto de layout que uma página de leitura não pode ter.
 *
 * Ler quatro cabeçalhos de formato são ~90 linhas contra uma dependência nova
 * numa rodada em que o orçamento já está sendo gasto. E o custo é o menor
 * possível: **os primeiros 64 kB do arquivo**, não o arquivo — os JPEGs deste
 * repositório passam de 3 MB. Roda só na build, porque as rotas de case são
 * estáticas (`dynamicParams = false`).
 *
 * ## O que ela cobre, e o que faz quando não sabe
 *
 * PNG, GIF, WEBP (as três variantes) e JPEG, que é o conjunto que existe em
 * `public/`. Formato desconhecido ou cabeçalho truncado devolve `null`, e quem
 * chama desenha sem `next/image` — degrada a otimização, nunca a página.
 */

export type MediaSize = { width: number; height: number };

/** O bastante para o SOF de um JPEG com metadados de câmera e perfil de cor. */
const HEAD_BYTES = 64 * 1024;

const cache = new Map<string, MediaSize | null>();

export async function imageSize(publicPath: string): Promise<MediaSize | null> {
  const cached = cache.get(publicPath);
  if (cached !== undefined) return cached;

  const size = await read(publicPath);
  cache.set(publicPath, size);
  return size;
}

async function read(publicPath: string): Promise<MediaSize | null> {
  if (!publicPath.startsWith("/")) return null;
  const file = path.join(process.cwd(), "public", publicPath.slice(1));

  let handle;
  try {
    handle = await open(file, "r");
  } catch {
    return null;
  }

  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEAD_BYTES, 0);
    return parse(buffer.subarray(0, bytesRead));
  } catch {
    return null;
  } finally {
    await handle.close();
  }
}

function parse(head: Buffer): MediaSize | null {
  return png(head) ?? gif(head) ?? webp(head) ?? jpeg(head);
}

function png(head: Buffer): MediaSize | null {
  // Assinatura de 8 bytes, depois o chunk IHDR: 4 de tamanho, 4 de tipo, e aí
  // largura e altura em big-endian.
  if (head.length < 24) return null;
  if (head.readUInt32BE(0) !== 0x89504e47) return null;
  if (head.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function gif(head: Buffer): MediaSize | null {
  if (head.length < 10) return null;
  const magic = head.toString("ascii", 0, 6);
  if (magic !== "GIF87a" && magic !== "GIF89a") return null;
  // Little-endian, ao contrário do PNG: o descritor lógico de tela do GIF é de
  // 1987 e segue a ordem de byte do 8086.
  return { width: head.readUInt16LE(6), height: head.readUInt16LE(8) };
}

function webp(head: Buffer): MediaSize | null {
  if (head.length < 30) return null;
  if (head.toString("ascii", 0, 4) !== "RIFF") return null;
  if (head.toString("ascii", 8, 12) !== "WEBP") return null;

  const chunk = head.toString("ascii", 12, 16);

  // Estendido (animação, alfa, ICC): a lona vem em dois campos de 24 bits,
  // guardados como "valor − 1".
  if (chunk === "VP8X") {
    const width = 1 + head.readUIntLE(24, 3);
    const height = 1 + head.readUIntLE(27, 3);
    return { width, height };
  }

  // Com perda: o cabeçalho do quadro-chave do VP8 começa com a sequência de
  // sincronismo `9d 01 2a`, e os catorze bits baixos de cada campo são a medida.
  if (chunk === "VP8 ") {
    if (head[23] !== 0x9d || head[24] !== 0x01 || head[25] !== 0x2a) return null;
    return {
      width: head.readUInt16LE(26) & 0x3fff,
      height: head.readUInt16LE(28) & 0x3fff,
    };
  }

  // Sem perda: assinatura `2f`, e aí 14 bits de largura e 14 de altura,
  // empacotados sem alinhamento de byte.
  if (chunk === "VP8L") {
    if (head[20] !== 0x2f) return null;
    const bits = head.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }

  return null;
}

/**
 * Marcadores de início de quadro. Todos carregam altura e largura no mesmo
 * lugar; os que faltam na sequência são outra coisa — `C4` é a tabela de
 * Huffman, `C8` é uma extensão da JPEG e `CC` é a tabela aritmética.
 */
const SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpeg(head: Buffer): MediaSize | null {
  if (head.length < 4) return null;
  if (head[0] !== 0xff || head[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < head.length) {
    if (head[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = head[offset + 1];
    if (marker === undefined) return null;
    // Preenchimento (`ff ff`) e marcadores sem carga não têm comprimento.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = head.readUInt16BE(offset + 2);
    if (SOF.has(marker)) {
      return {
        height: head.readUInt16BE(offset + 5),
        width: head.readUInt16BE(offset + 7),
      };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}
