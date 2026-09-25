"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { beatAt, SEPARATION_PROGRESS } from "@/components/beats/beats";
import type { BeatId } from "@/components/beats/beats";
import { DURATION } from "@/lib/motion";
import { getScrollProgress, subscribeToScroll } from "@/lib/scroll/scroll-store";

/**
 * O progresso em que cada beat é *composto* no modo calmo.
 *
 * Não é o meio do beat: é o quadro que aquele beat existe para mostrar. Na
 * Identidade é `SEPARATION_PROGRESS`, o mesmo 0.18 do quadro do descolamento —
 * "cada composição é uma pose diferente do bando, não a mesma congelada cinco
 * vezes" (DIRECTION.md §5).
 *
 * **O rio compõe em 0.50, e não no meio do beat.** O §5 pede "os cards do rio,
 * de face, cada um com sua esteira parada" — ou seja o corredor inteiro num
 * quadro. Em 0.65 a câmera já passou por três cards e está a uma unidade do
 * quarto: a composição seria um card em close com o corredor pela metade. Em
 * 0.50 a câmera está em `z = −47.5` e as sete peças estão à frente dela, da
 * distância de leitura até o fundo do corredor.
 */
const COMPOSITION_AT: Record<BeatId, number> = {
  emergence: 0.055,
  identity: SEPARATION_PROGRESS,
  about: 0.365,
  work: 0.5,
  // A Superfície compõe perto do fim, com a luz de fora já no topo: "a
  // veneziana aberta, bando saindo, luz em lâminas" (DIRECTION.md §5).
  surface: 0.96,
};

/**
 * Passos de simulação para o bando assentar numa pose. São dois blits de 128²
 * cada, sem desenhar.
 *
 * **Setecentos, e o número foi medido.** O bando escoa a ~6 u/s por um duto de
 * 66 unidades, então um corpo leva ~640 quadros para atravessá-lo — e a
 * estrutura que a composição da Identidade existe para mostrar (o descolamento
 * na aresta, o buraco na esteira, o recolamento a jusante) só existe depois que
 * o escoamento cruzou a peça e se reorganizou. Com os 150 anteriores a
 * composição congelava um transiente: a sonda mediu a razão de compressão
 * pulando de 1.12 a 1.60 entre rodadas conforme a fase em que o assentamento
 * parava.
 *
 * O DIRECTION.md §5 diz que a composição calma da Identidade é "o quadro do
 * descolamento, no auge da separação". Isso é uma afirmação sobre o estado do
 * bando, e 150 passos não a cumpriam.
 */
const SETTLE_STEPS = 700;

/**
 * As exceções, e as duas foram vistas na imagem (`.screens/11-calmo.png`):
 *
 * - **o rio assenta menos.** Setecentos passos com a câmera parada dentro do
 *   corredor represam o bando contra as sete peças — a armadilha que o
 *   AGENTS.md registra para a sonda —, e a composição saía com os cards
 *   afogados numa nuvem. Duzentos e quarenta formam o escoamento sem represá-lo;
 * - **a Superfície quase não assenta.** O que ela mostra é o bando saindo pela
 *   tomada de ar, e setecentos passos o levariam inteiro embora — a composição
 *   seria a câmara vazia do último quadro, que é outro quadro.
 */
const SETTLE_STEPS_BY_BEAT: Partial<Record<BeatId, number>> = {
  work: 240,
  surface: 45,
};

type ComposedClockProps = {
  /** Escreve o progresso da composição; o laço mestre o aplica sem amortecer. */
  composedRef: { current: number };
  /** Roda a simulação do bando sem desenhar. Preenchido pelo `Flock`. */
  settleRef: { current: ((steps: number) => void) | null };
  /** O `<canvas>`, para o corte de 120 ms. */
  canvasRef: { current: HTMLCanvasElement | null };
};

/**
 * O relógio do modo calmo — DIRECTION.md §5, "Movimento reduzido: uma
 * composição por beat".
 *
 * **Não existe `requestAnimationFrame` nenhum aqui**, e essa é a paridade que o
 * portão já entrega: o modo calmo é o mesmo site sem câmera em movimento, não
 * uma versão reduzida. O mesmo conteúdo, os mesmos cinco beats, os mesmos
 * cards — só que a câmera **corta** entre poses fixas em vez de percorrer a
 * curva.
 *
 * A troca é um corte de 120 ms (`DURATION.cut`), e não uma interpolação de
 * posição: movimento de câmera é exatamente o que este modo tira. O que
 * esmaece é o quadro inteiro, por opacidade do canvas — a única coisa do site
 * que esmaece, pelo mesmo motivo que a abertura do portão vira um corte aqui.
 *
 * Congelar a cena num quadro só apagaria o rio de projetos mais adiante: os
 * cards são objetos na câmara, e câmera parada nunca chega neles.
 */
export function ComposedClock({
  composedRef,
  settleRef,
  canvasRef,
}: ComposedClockProps) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);
  const gl = useThree((state) => state.gl);
  const current = useRef<BeatId | null>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    clock.autoStart = false;
    clock.stop();
    clock.elapsedTime = 0;

    const canvas = canvasRef.current;
    let timer = 0;

    const compose = (id: BeatId) => {
      composedRef.current = COMPOSITION_AT[id];
      // **Um quadro antes de assentar.** Quem escreve a câmera, o poleiro, o
      // tubo e a saída que o bando lê é o laço mestre, dentro do `advance()`;
      // assentando antes dele, o bando assentava com a pose da composição
      // **anterior** — o poleiro de Quem sou nunca ligava (a composição saía
      // sem coluna nenhuma) e o rio assentava com a câmera da Identidade. É a
      // mesma armadilha que a sonda já tinha resolvido em `settle()`; aqui ela
      // só apareceu quando a verificação passou a ser feita na imagem.
      elapsed.current += 1;
      advance(elapsed.current);
      // O bando assenta rodando a simulação sem desenhar: pares de blits numa
      // textura de 128×128, uma vez por beat, contra o mesmo número de quadros
      // completos se fosse pelo laço de render.
      settleRef.current?.(SETTLE_STEPS_BY_BEAT[id] ?? SETTLE_STEPS);
      elapsed.current += 1;
      advance(elapsed.current);
    };

    const cut = (id: BeatId) => {
      if (canvas === null) {
        compose(id);
        return;
      }
      canvas.style.opacity = "0";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        compose(id);
        canvas.style.opacity = "1";
      }, DURATION.cut * 1000);
    };

    const evaluate = (progress: number) => {
      const id = beatAt(progress).id;
      if (id === current.current) return;
      const first = current.current === null;
      current.current = id;
      if (first) compose(id);
      else cut(id);
    };

    if (canvas !== null) {
      canvas.style.transition = `opacity ${DURATION.cut * 1000}ms var(--ease-strong)`;
    }
    evaluate(getScrollProgress());

    const unsubscribe = subscribeToScroll((snapshot) => {
      evaluate(snapshot.progress);
    });

    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [advance, clock, canvasRef, composedRef, settleRef]);

  // **A captura das composições (só em desenvolvimento).** O modo calmo é
  // verificado **na imagem**, e a imagem tem que sair daqui: do quadro que este
  // relógio compõe, lido do buffer do WebGL na mesma tarefa do `advance()` —
  // nunca de um screenshot do compositor do navegador, que numa janela fora de
  // primeiro plano devolve um quadro velho (ver `scripts/cdp.mjs`). É a mesma
  // fonte dos posters do modo sem WebGL e da imagem de Open Graph.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const hook = {
      capture(id: BeatId): ImageData {
        composedRef.current = COMPOSITION_AT[id];
        elapsed.current += 1;
        advance(elapsed.current);
        settleRef.current?.(SETTLE_STEPS_BY_BEAT[id] ?? SETTLE_STEPS);
        elapsed.current += 1;
        advance(elapsed.current);
        gl.setRenderTarget(null);
        const context = gl.getContext();
        const width = context.drawingBufferWidth;
        const height = context.drawingBufferHeight;
        const pixels = new Uint8Array(width * height * 4);
        context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels);
        const image = new ImageData(width, height);
        // O buffer do WebGL vem de baixo para cima.
        for (let y = 0; y < height; y += 1) {
          const from = (height - 1 - y) * width * 4;
          image.data.set(pixels.subarray(from, from + width * 4), y * width * 4);
        }
        return image;
      },
    };
    (window as unknown as { __calm?: typeof hook }).__calm = hook;
    return () => {
      delete (window as unknown as { __calm?: typeof hook }).__calm;
    };
  }, [advance, gl, composedRef, settleRef]);

  // Redimensionar não é uma troca de beat, mas o quadro parado precisa ser
  // redesenhado — senão a composição fica esticada até o próximo corte.
  useEffect(() => {
    const redraw = () => {
      elapsed.current += 1;
      advance(elapsed.current);
    };
    window.addEventListener("resize", redraw);
    return () => {
      window.removeEventListener("resize", redraw);
    };
  }, [advance]);

  return null;
}
