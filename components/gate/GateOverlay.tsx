"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { playPressureThud, unlockAudio } from "@/lib/audio/audio-context";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { clamp01, damp, DURATION, easeStrong } from "@/lib/motion";
import { readPalette } from "@/lib/palette";
import { runPreload } from "@/lib/preload/manifest";
import { createDormantField, type DormantField } from "./dormant-field";
import { ENTER_GLYPH, formatLevel, formatVelocity } from "./readout";

/**
 * O portão — PROJECT.md §4 ("pré"), DIRECTION.md §4 ("pré — Portão").
 *
 * Três coisas ao mesmo tempo, e nenhuma delas é uma barra de progresso.
 *
 * **1. O contador.** Tipográfico, em mono, e mais preciso do que se consegue
 * ler: a terceira casa borra durante a subida, e é isso que faz a leitura
 * parecer medida em vez de animada (ver `readout.ts`). O que ele conta é o
 * carregamento real do manifesto (`lib/preload/manifest.ts`); o que ele
 * mostra é a câmara chegando ao regime.
 *
 * O número **nunca ultrapassa o carregamento de verdade** — ele é amortecido
 * em direção a ele e depois travado por `Math.min`. O amortecimento existe
 * porque `import()` e `fonts.ready` só sabem informar "pronto", em degraus; é
 * ele que transforma dois degraus numa subida, sem inventar bytes que não
 * chegaram. Numa rede rápida o portão dura cerca de um segundo, que é o tempo
 * de a leitura assentar, e não um atraso plantado.
 *
 * **2. O convite.** Ao chegar a 100 o contador *vira* um caractere só: `↓`.
 * A palavra continua existindo como nome acessível do botão.
 *
 * **3. A abertura.** O clique destrava o áudio, libera a descida e dispara a
 * veneziana — as três, síncronas, no mesmo handler. A transição não é um
 * fade: são lâminas de `--void` que se abrem a partir do próprio centro,
 * escalonadas do meio para as bordas, com o campo dormente avançando pela
 * câmera atrás delas. Nada esmaece para revelar o que está atrás; o que muda
 * de opacidade é a densidade da névoa e a energia dos corpos que passam pela
 * lente, que é outra coisa.
 *
 * Com `prefers-reduced-motion` o portão continua inteiro — contador, convite,
 * áudio, descida — e só a abertura vira um corte de 120 ms, que é o que o
 * DIRECTION.md §5 define como corte. O campo dormente vira um quadro fixo e
 * não há `requestAnimationFrame` nenhum rodando.
 */

type GatePhase = "loading" | "ready" | "opening" | "gone";

type GateOverlayProps = {
  /** Nome acessível do portão inteiro. */
  label: string;
  /** Nome acessível do convite de entrada — a palavra por trás do `↓`. */
  enter: string;
  /** `M/S`. */
  unit: string;
  /** `COTA`, do léxico compartilhado da HUD. */
  levelLabel: string;
  loadingStatus: string;
  readyStatus: string;
};

/** Quantas lâminas tem a veneziana. Nove dá ~100 px de lâmina a 900 px. */
const SLATS = 9;
const CENTER_SLAT = (SLATS - 1) / 2;
/** Escalonamento do meio para as bordas, em fração da duração total. */
const SLAT_STAGGER = 0.05;
const MAX_STAGGER = CENTER_SLAT * SLAT_STAGGER;

/**
 * Quanto da própria faixa cada lâmina cobre com a veneziana fechada.
 *
 * Não é 1, e a diferença é o portão inteiro. Uma veneziana cem por cento
 * fechada é uma tela preta: o organismo dormente ficaria atrás dela e ninguém
 * veria nada vivo enquanto o site carrega. Com 0.76 sobram nove frestas por
 * onde a câmara vaza — e é assim que a estrutura deste projeto aparece, "de
 * relance" (DIRECTION.md §2), nunca sob holofote. Se em algum quadro desse
 * para ler a câmara inteira, a névoa estaria fina demais.
 */
const SLAT_SHUT = 0.76;

/** A leitura sai antes das lâminas: ela passa pela câmera, elas abrem. */
const READOUT_EXIT = 0.42;
const READOUT_TRAVEL_VH = 26;
const READOUT_SWELL = 1.4;

/** Brilho da quina da lâmina, em repouso e no auge da travessia. */
const EDGE_REST = 0.14;
const EDGE_PEAK = 0.5;

/**
 * Taxa de aproximação do contador, em 1/s, e o alvo virtual que ele persegue
 * quando o carregamento termina.
 *
 * Perseguir 1.03 em vez de 1 é o que faz a leitura *chegar* a 14.617 num
 * tempo finito em vez de se aproximar dele para sempre — e como o valor
 * exibido é travado em `Math.min(v, alvo)`, mirar acima nunca mostra um
 * progresso que não aconteceu.
 */
const READOUT_LAMBDA = 4.2;
const READOUT_AIM = 1.03;

const OPEN_MS = DURATION.gate * 1000;
const CUT_MS = DURATION.cut * 1000;

export function GateOverlay({
  label,
  enter,
  unit,
  levelLabel,
  loadingStatus,
  readyStatus,
}: GateOverlayProps) {
  const reducedMotion = useReducedMotion();

  const [phase, setPhaseState] = useState<GatePhase>("loading");
  const phaseRef = useRef<GatePhase>("loading");

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const slatRefs = useRef<(HTMLDivElement | null)[]>([]);

  /** Progresso real do carregamento, 0 a 1. */
  const targetRef = useRef(0);
  /** O perseguidor amortecido, que mira acima de 1 para chegar a 1. */
  const chaseRef = useRef(0);
  const openStartRef = useRef(0);
  const reducedMotionRef = useRef<boolean | null>(null);

  const setPhase = useCallback((next: GatePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const writeVelocity = useCallback((progress: number) => {
    const node = velocityRef.current;
    if (node !== null) node.textContent = formatVelocity(progress);
  }, []);

  /* Espelho para o callback do carregamento, que roda fora do React e não
   * pode fechar sobre o valor de um render. Declarado antes do efeito do
   * preload de propósito: efeitos correm na ordem em que aparecem. */
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  /* --- A trava da descida -------------------------------------------------
   * O script inline do `Gate` já escreveu `data-gate="closed"` no parse; isto
   * repõe a trava se o componente remontar (o StrictMode do dev monta duas
   * vezes) e garante que ela some se o portão sair de cena por outro caminho.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (phaseRef.current === "loading" || phaseRef.current === "ready") {
      root.setAttribute("data-gate", "closed");
      window.scrollTo(0, 0);
    }
    return () => {
      if (root.getAttribute("data-gate") === "closed") {
        root.removeAttribute("data-gate");
      }
    };
  }, []);

  /* --- O carregamento ---------------------------------------------------- */
  useEffect(() => {
    return runPreload((progress) => {
      targetRef.current = progress;
      // No modo calmo não há laço: a leitura é escrita quando o número muda,
      // que são dois ou três eventos na vida do portão.
      if (reducedMotionRef.current !== true) return;
      writeVelocity(progress);
      if (progress >= 1 && phaseRef.current === "loading") setPhase("ready");
    });
  }, [setPhase, writeVelocity]);

  /* Corrida possível: o carregamento pode terminar antes de `reducedMotion`
   * resolver de `null` para um booleano. Sem isto o modo calmo ficaria preso
   * em "loading" com o carregamento já concluído. */
  useEffect(() => {
    if (reducedMotion !== true) return;
    writeVelocity(targetRef.current);
    if (targetRef.current >= 1 && phaseRef.current === "loading") {
      setPhase("ready");
    }
  }, [reducedMotion, setPhase, writeVelocity]);

  /* --- O relógio: contador, veneziana e campo dormente -------------------- */
  useEffect(() => {
    if (reducedMotion === null) return;

    const canvas = canvasRef.current;
    let field: DormantField | null = null;
    if (canvas !== null) {
      try {
        field = createDormantField(canvas, readPalette());
      } catch {
        // Um portão preto e legível é melhor que um portão que não abre.
        field = null;
      }
    }

    const onResize = () => {
      field?.resize();
      if (reducedMotion) field?.render(0, 0);
    };
    window.addEventListener("resize", onResize);

    // Modo calmo: uma composição fixa, sem laço nenhum (DIRECTION.md §5).
    if (reducedMotion) {
      field?.render(0, 0);
      return () => {
        window.removeEventListener("resize", onResize);
        field?.destroy();
      };
    }

    const startedAt = performance.now();
    let lastAt = startedAt;
    let raf = 0;

    const frame = (now: number) => {
      // O laço acaba junto com o portão. Sem esta saída ele continuaria
      // desenhando num canvas já desmontado — o efeito não se refaz numa
      // troca de fase, de propósito: refazê-lo perderia as posições dos
      // corpos toda vez que o contador chegasse ao fim.
      if (phaseRef.current === "gone") return;
      raf = requestAnimationFrame(frame);

      const dt = Math.min((now - lastAt) / 1000, 0.05);
      lastAt = now;

      if (phaseRef.current === "loading") {
        const target = targetRef.current;
        const aim = target >= 1 ? READOUT_AIM : target;
        chaseRef.current = damp(chaseRef.current, aim, READOUT_LAMBDA, dt);
        const shown = Math.min(chaseRef.current, target);
        writeVelocity(shown);
        if (shown >= 1) setPhase("ready");
      }

      let dolly = 0;
      if (phaseRef.current === "opening") {
        const t = clamp01((now - openStartRef.current) / OPEN_MS);
        dolly = t;

        const readout = readoutRef.current;
        if (readout !== null) {
          const exit = easeStrong(clamp01(t / READOUT_EXIT));
          readout.style.transform = `translate3d(0, ${(
            exit * READOUT_TRAVEL_VH
          ).toFixed(2)}vh, 0) scale(${(1 + exit * READOUT_SWELL).toFixed(3)})`;
        }

        for (let i = 0; i < SLATS; i += 1) {
          const slat = slatRefs.current[i];
          if (slat === undefined || slat === null) continue;
          const stagger = Math.abs(i - CENTER_SLAT) * SLAT_STAGGER;
          const open = easeStrong(clamp01((t - stagger) / (1 - MAX_STAGGER)));
          slat.style.transform = `scaleY(${(SLAT_SHUT * (1 - open)).toFixed(4)})`;
          // A luz pega a quina no meio da travessia, não na face parada.
          slat.style.setProperty(
            "--slat-edge",
            (EDGE_REST + open * (1 - open) * 4 * EDGE_PEAK).toFixed(3),
          );
        }

        if (t >= 1) setPhase("gone");
      }

      field?.render(now - startedAt, dolly);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      field?.destroy();
    };
  }, [reducedMotion, setPhase, writeVelocity]);

  /* --- O corte do modo calmo --------------------------------------------- */
  useEffect(() => {
    if (phase !== "opening" || reducedMotion !== true) return;
    const id = window.setTimeout(() => setPhase("gone"), CUT_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [phase, reducedMotion, setPhase]);

  /* --- Foco --------------------------------------------------------------
   * O portão é modal de fato: enquanto ele está na tela não há mais nada para
   * operar. `aria-modal` resolve isso para leitores de tela; o laço abaixo
   * resolve para o teclado, que continuaria alcançando a HUD por trás.
   */
  useEffect(() => {
    if (phase !== "loading" && phase !== "ready") return;

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (root === null) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      (buttonRef.current ?? root).focus({ preventScroll: true });
    };

    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "ready") buttonRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (phase !== "gone") return;
    document.documentElement.setAttribute("data-gate", "open");
    // Sem isto o foco cairia no `<body>` e o teclado recomeçaria do topo do
    // documento, que é a HUD — não a descida que a pessoa acabou de abrir.
    document.getElementById("descent")?.focus({ preventScroll: true });
  }, [phase]);

  /* --- A entrada ---------------------------------------------------------- */
  const open = useCallback(() => {
    if (phaseRef.current !== "ready") return;
    phaseRef.current = "opening";

    // 1. O áudio destrava. Precisa ser síncrono: um `await` antes daqui já
    //    perde o gesto do usuário em alguns navegadores.
    playPressureThud(unlockAudio());

    // 2. A descida começa agora, não no fim da transição. Prender o scroll
    //    por mais 1.45 s comeria da regra dos oito segundos (DIRECTION.md §1)
    //    sem nada em troca.
    document.documentElement.setAttribute("data-gate", "opening");
    window.dispatchEvent(new Event("resize"));

    // 3. A veneziana abre.
    openStartRef.current = performance.now();
    setPhaseState("opening");
  }, []);

  if (phase === "gone") return null;

  const cutting = phase === "opening" && reducedMotion === true;

  return (
    <div
      ref={rootRef}
      data-gate-overlay=""
      data-gate-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onClick={open}
      className={`fixed inset-0 z-[100] overflow-hidden bg-void ${
        cutting ? "gate-cut" : ""
      }`}
    >
      {/* O organismo dormente. Decorativo: tudo que precisa ser lido está no
          DOM ao lado (PROJECT.md §5). */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full"
      />

      {/* A veneziana. Lâminas de --void que abrem a partir do próprio centro:
          o escuro não esmaece, ele se afasta. */}
      <div aria-hidden="true" className="absolute inset-0">
        {Array.from({ length: SLATS }, (_, index) => (
          <div
            key={index}
            ref={(node) => {
              slatRefs.current[index] = node;
            }}
            className="gate-slat"
            style={
              {
                top: `${(index * 100) / SLATS}%`,
                height: `${100 / SLATS}%`,
                // O repouso vem daqui e não do CSS: um número só, em TS, e é
                // o mesmo que o relógio multiplica ao abrir.
                "--slat-shut": SLAT_SHUT,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* A leitura, na margem — nunca centralizada. */}
      <div
        ref={readoutRef}
        className="gate-readout absolute inset-x-0 bottom-0 px-6 pb-10 md:px-12 md:pb-12"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-10">
          {/* A largura da casa da leitura é fixa, em `ch` da própria mono:
              o convite ocupa o lugar do contador sem a cota dar um pulo de
              meia tela quando um vira o outro. */}
          <div className="type-mono text-readout text-mist md:min-w-[7.2ch]">
            {phase === "loading" ? (
              <p aria-hidden="true">
                {/* O conteúdo é escrito pelo laço, não pelo React: sessenta
                    renders por segundo para trocar seis dígitos seria caro e
                    desnecessário. Como o componente não re-renderiza durante
                    o carregamento, o valor inicial do JSX e o laço nunca
                    brigam pelo mesmo nó. */}
                <span ref={velocityRef}>{formatVelocity(0)}</span>
                <span className="text-hud ml-3">{unit}</span>
              </p>
            ) : (
              <button
                ref={buttonRef}
                type="button"
                aria-label={enter}
                onClick={open}
                className="gate-enter"
              >
                {ENTER_GLYPH}
              </button>
            )}
          </div>

          <p aria-hidden="true" className="type-mono text-hud text-mist">
            {levelLabel} {formatLevel()}
          </p>
        </div>
      </div>

      {/* Duas frases na vida inteira do portão. O número não é anunciado: uma
          região viva mudando sessenta vezes por segundo é ruído, não leitura. */}
      <p role="status" className="sr-only">
        {phase === "loading" ? loadingStatus : readyStatus}
      </p>
    </div>
  );
}
