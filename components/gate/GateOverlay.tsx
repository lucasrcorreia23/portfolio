"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { playPressureThud, unlockAudio } from "@/lib/audio/audio-context";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { clamp01, damp, DURATION, easeStrong } from "@/lib/motion";
import { readPalette } from "@/lib/palette";
import { runPreload } from "@/lib/preload/manifest";
import {
  isScenePainted,
  subscribeScenePainted,
} from "@/lib/scene/scene-painted";
import {
  createDormantField,
  type DormantField,
  type SlatState,
} from "./dormant-field";
import { GateInvite } from "./GateInvite";
import { formatLevel, formatVelocity } from "./readout";

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
 * **2. O convite.** Ao chegar a 100 o contador *vira* uma marca só — uma seta
 * no traço das gravações da câmara —, desenhada na casa que o número ocupava:
 * mesma linha de base, mesma margem, a altura dos algarismos (ver
 * `GateInvite`). A palavra continua existindo como
 * nome acessível do botão.
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

/**
 * **O portão se atravessa uma vez por carga da página** (rodada 12).
 *
 * Ele mora na home, então voltar de um case para o rio — o `← RIO`, o clique
 * fora da coluna, o `Esc`, o botão voltar — remonta o `Gate` por navegação de
 * cliente. Sem esta marca ele nascia de novo em `loading`, trancava a descida
 * atrás da veneziana e pedia o clique de entrada outra vez: o progresso voltava
 * exato (Δ 0.00000) para um rio que ninguém via. Medido por CDP, igual antes da
 * rodada. Estado de módulo, e não `sessionStorage`: um reload **é** uma chegada
 * nova, e o portão volta — é o beat "pré" da descida.
 */
let crossed = false;

type GateOverlayProps = {
  /** Nome acessível do portão inteiro. */
  label: string;
  /** Nome acessível do convite de entrada — a palavra por trás da marca. */
  enter: string;
  /** `M/S`. */
  unit: string;
  /** `COTA`, do léxico compartilhado da HUD. */
  levelLabel: string;
  loadingStatus: string;
  readyStatus: string;
};

/** Quantas lâminas tem a veneziana. */
const SLATS = 9;
const CENTER_SLAT = (SLATS - 1) / 2;

/**
 * O horizonte da veneziana, em fração da altura — bate com o núcleo da névoa,
 * que é a fonte distante a montante. É para lá que a câmara aponta.
 */
const SLAT_HORIZON = 0.42;

/**
 * Quanto o passo das lâminas comprime em direção ao horizonte. 1 seria sem
 * perspectiva nenhuma.
 *
 * **Esta constante é a correção mais importante do portão, e não é de
 * textura.** Uma veneziana de frente, com lâminas iguais e frestas iguais, é
 * uma grade *por construção* — e grade é o que o PROJECT.md §2 veta pelo
 * nome. Nenhum brilho por quina desfaz isso, porque o olho lê a geometria
 * antes do brilho e a geometria era invariante: dezoito fios idênticos,
 * equidistantes, de ponta a ponta.
 *
 * Com a divisão de perspectiva o passo deixa de ser constante — as lâminas de
 * perto ficam grossas e separadas, as de longe finas e juntas — e as mesmas
 * nove lâminas passam a descrever um espaço em vez de um padrão. A câmara é
 * comprida e a câmera está dentro dela (DIRECTION.md §1); o quadro só não
 * dizia isso.
 */
const SLAT_PERSPECTIVE = 1.55;

/**
 * A borda superior da lâmina `index`, em fração da altura, com o passo já
 * comprimido em direção ao horizonte. `index` vai de 0 a SLATS.
 *
 * Vale para as duas pontas: a fresta de cada lâmina é uma fração da altura
 * dela, então as frestas de perto abrem e as de longe viram fio de cabelo,
 * sozinhas, sem nenhuma regra a mais.
 */
function slatEdge(index: number): number {
  const u = index / SLATS;
  const above = u >= SLAT_HORIZON;
  const span = above ? 1 - SLAT_HORIZON : SLAT_HORIZON;
  const warped = (Math.abs(u - SLAT_HORIZON) / span) ** SLAT_PERSPECTIVE;
  return above
    ? SLAT_HORIZON + warped * span
    : SLAT_HORIZON - warped * span;
}
/** Escalonamento do meio para as bordas, em fração da duração total. */
const SLAT_STAGGER = 0.05;
const MAX_STAGGER = CENTER_SLAT * SLAT_STAGGER;

/**
 * Quanto da própria faixa cada lâmina cobre com a veneziana fechada.
 *
 * Não é 1, e a diferença é o portão inteiro. Uma veneziana cem por cento
 * fechada é uma tela preta: o organismo dormente ficaria atrás dela e ninguém
 * veria nada vivo enquanto o site carrega. Mas a fresta é isso mesmo — uma
 * fresta, não uma faixa: em 0.76 a área exposta somava um quarto da tela,
 * repetida em nove faixas parelhas, e o resultado lia como textura de fundo,
 * não como estrutura "vista de relance" (DIRECTION.md §2).
 *
 * Mas fechar não é grátis na outra direção: em 0.92 a fresta caiu para ~8 px
 * e o organismo praticamente sumiu junto — trocar "textura demais" por
 * "presença de menos" não é resolver, é mudar de defeito. 0.86 dá ~15 px por
 * fresta numa viewport de 900, e o que fecha a conta não é este número
 * sozinho: é ele com a densidade maior de corpos e, principalmente, com a
 * gravação da quina reagindo a quem passa (ver `sampleSeams`). A vida do
 * portão não precisa caber inteira na fresta.
 */
const SLAT_SHUT = 0.86;

/** A leitura sai antes das lâminas: ela passa pela câmera, elas abrem. */
const READOUT_EXIT = 0.42;
const READOUT_TRAVEL_VH = 26;
const READOUT_SWELL = 1.4;

/**
 * Auge do realce que viaja pela quina. Não há valor "de repouso" aqui: em
 * repouso o realce simplesmente não existe, e o que sobra é a gravação, que
 * tem alfa próprio e constante no CSS. Uma gravação não pisca — o que pisca
 * é a luz que passa por ela.
 */
const EDGE_PEAK = 0.62;
/** Taxa com que a quina acende e apaga ao passar um corpo, em 1/s. */
const EDGE_LAMBDA = 3.4;
/** Meia-largura do realce que viaja pela quina, em fração da largura. */
const GLOW_SPREAD = 0.07;

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

  const [phase, setPhaseState] = useState<GatePhase>(() =>
    crossed ? "gone" : "loading",
  );
  const phaseRef = useRef<GatePhase>(crossed ? "gone" : "loading");

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** A casa da leitura e a linha da cota — o véu se ancora na união das duas. */
  const slotRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLParagraphElement>(null);
  /**
   * A reancoragem do véu, publicada pelo efeito do relógio para quem precisa
   * dela de fora — o deslize da cota termina depois, e é lá que a caixa
   * definitiva existe.
   */
  // `true` quando as frestas já mostram a câmara de verdade: o fundo opaco do
  // portão sai, senão ele cobriria exatamente o que a janela existe para
  // mostrar.
  const [windowMode, setWindowMode] = useState(false);

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
      // **E `opening` também** (rodada 12). Quem entra e clica num card antes
      // de a veneziana terminar (1.45 s) desmonta o portão no meio da abertura;
      // sem isto o `<html>` ficava em `opening` para sempre, e a regra que
      // esconde a HUD e a descida atrás das frestas escondia o case inteiro —
      // artigo e HUD em `visibility: hidden`, reproduzido por CDP.
      const gate = root.getAttribute("data-gate");
      if (gate === "closed" || gate === "opening") {
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
        field.setHorizon(SLAT_HORIZON);
      } catch {
        // Um portão preto e legível é melhor que um portão que não abre.
        field = null;
      }
    }

    // **As frestas passam a mostrar a câmara de verdade** quando ela pinta o
    // primeiro quadro — ela já está montada embaixo do portão desde que a
    // tarefa `scene` do preload resolveu. A troca é de um quadro para o
    // seguinte, sem fade (DIRECTION.md §4: "nada esmaece para revelar o que
    // está atrás"). O campo dormente cobre o intervalo antes disso e é o
    // caminho inteiro sem WebGL, porque sem WebGL a cena nunca pinta.
    let windowed = false;
    const enterWindow = () => {
      if (windowed || field === null) return;
      windowed = true;
      field.setWindow(true);
      setWindowMode(true);
      if (reducedMotion) {
        lightSeams(Infinity, 0);
        field.render(0, 0, slats);
      }
    };
    const stopWatchingScene = subscribeScenePainted(enterWindow);

    // A caixa da **coluna de texto**, medida uma vez por layout e não por
    // quadro: ler `getBoundingClientRect()` a 60 Hz força recálculo de layout
    // no meio do laço de desenho.
    //
    // A união dos dois filhos, e não o contêiner: `.gate-readout` é
    // `inset-x-0`, então medi-lo dava uma caixa de 1440px de largura para
    // proteger uma coluna de 240. O DIRECTION.md §5 ancora o véu na coluna.
    const anchorVeil = () => {
      const slot = slotRef.current;
      const level = levelRef.current;
      if (field === null || slot === null || level === null) return;
      const a = slot.getBoundingClientRect();
      const b = level.getBoundingClientRect();
      field.setVeil(
        Math.min(a.left, b.left),
        Math.min(a.top, b.top),
        Math.max(a.right, b.right),
        Math.max(a.bottom, b.bottom),
      );
    };

    // As lâminas, com a geometria comprimida já resolvida. Mutadas no lugar:
    // o `render` só lê.
    const slats: SlatState[] = Array.from({ length: SLATS }, (_, i) => ({
      top: slatEdge(i),
      bottom: slatEdge(i + 1),
      shut: SLAT_SHUT,
      light: 0,
      glowX: 0.5,
      glowSpread: GLOW_SPREAD,
    }));

    // Buffers da gravação reativa, alocados uma vez e mutados no lugar — o
    // laço roda a cada quadro e não deve produzir lixo.
    const seamYs: number[] = new Array<number>(SLATS + 1).fill(0);
    const seamLight: number[] = new Array<number>(SLATS + 1).fill(0);
    const seamX: number[] = new Array<number>(SLATS + 1).fill(0.5);

    /** Resolve o realce de cada quina a partir de quem está passando perto. */
    const lightSeams = (lambda: number, dt: number) => {
      if (field === null) return;
      // Na janela os corpos dormentes não são mais desenhados, então não
      // acendem quina nenhuma: a gravação fica no fio, e quem vive atrás da
      // fresta é o bando de verdade.
      if (windowed) {
        for (const slat of slats) {
          slat.light = lambda === Infinity ? 0 : damp(slat.light, 0, lambda, dt);
        }
        return;
      }
      const canvasHeight = canvas === null ? 0 : canvas.clientHeight;
      for (let i = 0; i <= SLATS; i += 1) {
        seamYs[i] = slatEdge(i) * canvasHeight;
      }
      field.sampleSeams(seamYs, seamLight, seamX);

      for (let i = 0; i < SLATS; i += 1) {
        const slat = slats[i];
        if (slat === undefined) continue;
        // A lâmina tem duas quinas e um realce só: manda a mais acesa, e o
        // realce viaja para o x de quem a acendeu.
        const top = seamLight[i] ?? 0;
        const bottom = seamLight[i + 1] ?? 0;
        const light = Math.max(top, bottom) * EDGE_PEAK;
        slat.glowX = (top >= bottom ? seamX[i] : seamX[i + 1]) ?? 0.5;
        slat.glowSpread = GLOW_SPREAD;
        // Amortecido, como tudo (PROJECT.md §3.3): a luz de raspão cresce e
        // some, nunca pisca. `lambda` infinito resolve direto, para o quadro
        // único do modo calmo não precisar de um laço para assentar.
        slat.light =
          lambda === Infinity ? light : damp(slat.light, light, lambda, dt);
      }
    };

    const onResize = () => {
      field?.resize();
      anchorVeil();
      if (reducedMotion) {
        lightSeams(Infinity, 0);
        field?.render(0, 0, slats);
      }
    };
    window.addEventListener("resize", onResize);
    anchorVeil();

    // **O véu se reancora quando a casa da leitura muda de tamanho.**
    //
    // A casa não desaba mais na virada do contador (o convite é desenhado por
    // cima do número), mas ela ainda muda em dois casos: a troca de fonte (a
    // mono é `display: swap` e pode chegar depois da hidratação, deixando a
    // única medição com métrica de fallback) e o modo calmo, onde o quadro é
    // um só e não haveria segunda chance. Medir o que o código *calcula* em vez
    // do que ele *entrega* não pega nenhum dos dois — daí o observador.
    const observer = new ResizeObserver(() => {
      anchorVeil();
      if (reducedMotion) {
        lightSeams(Infinity, 0);
        field?.render(0, 0, slats);
      }
    });
    if (slotRef.current !== null) observer.observe(slotRef.current);

    // Modo calmo: uma composição fixa, sem laço nenhum (DIRECTION.md §5).
    //
    // Fixa não quer dizer morta. A gravação acende do mesmo jeito, resolvida
    // uma vez em vez de amortecida a cada quadro — se a quina só pegasse luz
    // no modo normal, a estrutura existiria num modo e não no outro, e o §5 é
    // explícito: "qualquer coisa que apareça só num dos dois modos é bug, não
    // adaptação". O que o modo calmo tira é o movimento, não o mundo.
    if (reducedMotion) {
      lightSeams(Infinity, 0);
      field?.render(0, 0, slats);
      return () => {
        window.removeEventListener("resize", onResize);
        observer.disconnect();
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
          const stagger = Math.abs(i - CENTER_SLAT) * SLAT_STAGGER;
          const open = easeStrong(clamp01((t - stagger) / (1 - MAX_STAGGER)));
          const slat = slats[i];
          if (slat === undefined) continue;
          slat.shut = SLAT_SHUT * (1 - open);
          // A luz pega a quina no meio da travessia, não na face parada. Aqui
          // o realce cobre a lâmina inteira, e é o único momento em que isso
          // é certo: a lâmina está se movendo, e é ela que pega a luz — não
          // um corpo passando por um ponto dela.
          slat.light = open * (1 - open) * 4 * EDGE_PEAK;
          slat.glowX = 0.5;
          slat.glowSpread = 0.7;
        }

        if (t >= 1) setPhase("gone");
      } else {
        // Veneziana fechada: a gravação de cada lâmina acende quando um corpo
        // do organismo raspa por ela, e apaga quando ele passa. Sem isto as
        // nove quinas ficam num valor fixo, e nove linhas idênticas e imóveis
        // atravessando a tela leem como grade desenhada — que é justamente o
        // que o PROJECT.md §2 veta. A estrutura tem que ser vista *de
        // relance*, e "de relance" é uma coisa que acontece no tempo.
        for (const slat of slats) slat.shut = SLAT_SHUT;
        lightSeams(EDGE_LAMBDA, dt);
      }

      field?.render(now - startedAt, dolly, slats);
    };

    raf = requestAnimationFrame(frame);

    // A cena pode ter pintado antes de este efeito montar (um reload com o
    // chunk em cache, por exemplo) — aí a assinatura não dispara mais.
    if (isScenePainted()) enterWindow();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      stopWatchingScene();
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
    crossed = true;

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
      className={`fixed inset-0 z-[100] overflow-hidden ${
        windowMode ? "" : "bg-void"
      } ${cutting ? "gate-cut" : ""}`}
    >
      {/* O organismo dormente. Decorativo: tudo que precisa ser lido está no
          DOM ao lado (PROJECT.md §5). */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full"
      />

      {/* A veneziana não está no DOM: ela é desenhada dentro do canvas, junto
          com a névoa e o organismo. Quando era um empilhamento de nove divs
          opacos por cima do canvas, o grão — que é pós — não encostava em 79%
          da tela, e o véu de legibilidade ficava numa camada abaixo do realce
          de quina que ele existe para abafar. Uma passada só resolve os dois
          (PROJECT.md §3.1, DIRECTION.md §5). */}

      {/* A leitura, na margem — nunca centralizada. */}
      <div
        ref={readoutRef}
        className="gate-readout absolute inset-x-0 bottom-0 px-6 pb-10 md:px-12 md:pb-12"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-10">
          {/* A casa da leitura **não desaba**. O número continua ocupando o
              layout depois de chegar a 100 — invisível — e o convite é
              desenhado por cima dele, na mesma linha de base e na mesma margem
              (DIRECTION.md §4: "o convite ocupa exatamente a casa que o número
              ocupava"). A cota não se move, então não há deslize para
              amortecer, e a caixa do véu é a mesma do começo ao fim. */}
          <div ref={slotRef} className="relative w-fit type-mono text-readout text-mist">
            <p
              aria-hidden="true"
              className={phase === "loading" ? "" : "invisible"}
            >
              {/* O conteúdo é escrito pelo laço, não pelo React: sessenta
                  renders por segundo para trocar seis dígitos seria caro e
                  desnecessário. Como o componente não re-renderiza durante
                  o carregamento, o valor inicial do JSX e o laço nunca
                  brigam pelo mesmo nó. */}
              <span ref={velocityRef}>{formatVelocity(0)}</span>
              <span className="text-hud ml-3">{unit}</span>
            </p>
            {phase === "loading" ? null : (
              <button
                ref={buttonRef}
                type="button"
                aria-label={enter}
                onClick={open}
                className="gate-enter absolute inset-0 text-left"
              >
                <GateInvite />
              </button>
            )}
          </div>

          <p
            ref={levelRef}
            aria-hidden="true"
            className="w-fit type-mono text-hud text-mist"
          >
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
