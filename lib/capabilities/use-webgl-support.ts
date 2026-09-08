"use client";

import { useSyncExternalStore } from "react";

let probed: boolean | undefined;

/**
 * WebGL2, não WebGL1: é o que three e o React Three Fiber 9 usam.
 * Sondado uma vez por sessão e memoizado — criar contexto é caro e os
 * navegadores limitam quantos podem existir ao mesmo tempo, então o
 * contexto de teste é devolvido na hora.
 *
 * **`EXT_color_buffer_float` faz parte da pergunta, e ter WebGL2 não o
 * garante.** O bando é uma simulação em FBO ping-pong com posição e velocidade
 * em RGBA32F (DIRECTION.md §5), e sem essa extensão um alvo de render de ponto
 * flutuante não é renderizável em cor. O modo de falha é o pior tipo: o three
 * não lança, ele monta um framebuffer incompleto e desenha lixo.
 *
 * Meio-float não é a saída. RGBA16F tem mantissa de 10 bits, e posição
 * integrada quadro a quadro deriva visivelmente em segundos — o bando se
 * desmancharia sozinho.
 *
 * Então a pergunta que esta sonda responde não é "existe WebGL" e sim "este
 * navegador roda **esta** cena". Quando a resposta é não, o site cai para
 * `poster`, e não para `composed`: o modo calmo também é a cena, com a câmera
 * parada, e também precisa da simulação para ter uma pose do bando em cada
 * composição. Sem alvo de ponto flutuante não há bando em modo nenhum.
 */
function probe(): boolean {
  if (probed !== undefined) return probed;

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    probed = gl !== null && gl.getExtension("EXT_color_buffer_float") !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    probed = false;
  }

  return probed;
}

/** Suporte a WebGL não muda no meio da sessão: não há o que assinar. */
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): null {
  return null;
}

/**
 * `null` enquanto ainda não foi sondado (servidor e primeiro paint).
 * Sem WebGL o site não degrada para nada: entra um poster estático por
 * seção e o conteúdo continua inteiro (PROJECT.md §5).
 */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    probe,
    getServerSnapshot,
  );
}
