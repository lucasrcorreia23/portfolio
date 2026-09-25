import { Matrix4, Vector3, type Vector4 } from "three";
import { CARD_HALF_HEIGHT, CARD_HALF_WIDTH, MAX_CARDS } from "./cards";

/**
 * Qual card está sob o ponteiro — PROJECT.md §3.3: "latência de resposta abaixo
 * de 100 milissegundos em qualquer interação de ponteiro".
 *
 * ## Por que o evento é de `window`, e não do canvas
 *
 * O `SceneGate` monta a cena numa camada `pointer-events-none` atrás de tudo
 * (`fixed inset-0 -z-10`), e isso não é acidente: o conteúdo do site é DOM real
 * por cima do canvas, e um canvas que capturasse ponteiro roubaria o clique de
 * cada link. O canvas, portanto, **nunca recebe evento de ponteiro** — e o
 * `raycaster` do R3F, que depende deles, não tem como ver os cards.
 *
 * `pointermove` no `window` chega de qualquer jeito, com coordenadas de
 * viewport. E como a cena cobre a viewport inteira, coordenada de viewport
 * **é** coordenada de canvas: o teste de acerto é geometria, não hit-testing de
 * DOM.
 *
 * ## Por que o teste roda no quadro, e não no evento
 *
 * `pointermove` dispara mais rápido que o quadro em trackpad. Rodar o teste no
 * evento faria o mesmo trabalho três vezes para um resultado que só pode
 * aparecer no próximo quadro. Aqui o evento só **guarda a coordenada** e o
 * laço de quadro consome — uma vez, com a câmera e as posições daquele quadro,
 * que são as que estão na tela.
 *
 * Isso é o mínimo de latência possível e não um adiamento: a resposta não
 * poderia pintar antes do próximo quadro de qualquer forma.
 *
 * ## O raycast é analítico
 *
 * Sete quads, quatro cantos cada: projetar 28 pontos e testar ponto-em-quad
 * custa menos que montar um `Raycaster` e percorrer a árvore. E ele lê **as
 * posições animadas** — o filtro do rio move os cards (`Cards.tsx`), e um teste
 * de acerto contra a corrente de repouso apontaria para onde a peça estava.
 */

/** Coordenada do último `pointermove`, em pixels de CSS. −1 quando não há. */
export type CardPick = {
  /** Índice do card sob o ponteiro no último quadro consumido, ou −1. */
  readonly hovered: number;
  /**
   * Resolve o acerto para este quadro e devolve o índice, ou −1.
   *
   * Chamado uma vez por quadro pelo laço dos cards, **depois** de as posições
   * animadas serem escritas e antes de o uniform ir para o material.
   */
  resolve: (
    camera: { projectionMatrix: Matrix4; matrixWorldInverse: Matrix4; position: Vector3 },
    chain: readonly Vector4[],
    count: number,
    active: boolean,
  ) => number;
  /**
   * Marca que a resposta a um `pointermove` foi aplicada neste quadro.
   *
   * Só faz alguma coisa em desenvolvimento: agenda um `requestAnimationFrame`
   * para fechar a medição de latência. Ver `hoverLatency`.
   */
  markApplied: () => void;
  dispose: () => void;
};

export type CardPickOptions = {
  /**
   * Chamado quando alguém clica na peça que está sob o ponteiro.
   *
   * O pick não navega: ele não sabe de rota, de idioma nem de slug, e não
   * deveria — é geometria. Quem sabe é `Cards.tsx`, que tem o conteúdo do rio e
   * o `router`. É a mesma divisão que separa `readout-store` da HUD.
   */
  onActivate?: (index: number) => void;
};

/**
 * Latências de ponteiro medidas, em milissegundos — **só em desenvolvimento**.
 *
 * O número é **do evento até o quadro pintado**, que é o que o PROJECT.md §7
 * exige e é o que o clique de entrada do portão já custou uma rodada por não
 * medir. A construção é a única que o navegador permite sem extensão:
 *
 * - o evento chega em `T0` (`event.timeStamp`, na mesma base de
 *   `performance.now()`);
 * - o laço de quadro consome a coordenada e escreve o uniform — a partir daí a
 *   resposta está no quadro que está sendo montado;
 * - um `requestAnimationFrame` agendado nesse instante dispara em `T1`, **antes
 *   da pintura seguinte** e portanto depois de a pintura daquele quadro ter
 *   acontecido.
 *
 * Então `T1 − T0` é um **teto** do event-to-paint, não uma estimativa: a
 * pintura caiu em algum lugar dentro desse intervalo. Reportar o teto é o lado
 * seguro da medição.
 */
const latencies: number[] = [];

export function hoverLatency(): {
  samples: number;
  min: number;
  p50: number;
  p95: number;
  max: number;
} {
  const sorted = latencies.slice().sort((a, b) => a - b);
  const at = (q: number) =>
    sorted.length === 0
      ? 0
      : (sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0);
  return {
    samples: sorted.length,
    min: sorted[0] ?? 0,
    p50: at(0.5),
    p95: at(0.95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

export function resetHoverLatency(): void {
  latencies.length = 0;
}

type PickDiagnostic = {
  calls: number;
  pointer: [number, number];
  active: boolean;
  count: number;
  quads: {
    i: number;
    behind: boolean;
    /** Descartado pelo corte de profundidade, sem ser projetado. */
    skipped?: boolean;
    depth: number;
    box: [number, number, number, number] | null;
  }[];
};

/**
 * O último estado que `resolve` viu — **só em desenvolvimento**, e **de módulo**,
 * não de instância.
 *
 * De módulo porque em desenvolvimento existe mais de uma instalação viva ao
 * mesmo tempo (StrictMode monta, desmonta e monta de novo; o Fast Refresh
 * reexecuta o módulo), e um diagnóstico preso ao fechamento de uma delas
 * responde sobre a instância errada: foi exatamente o que aconteceu ao depurar
 * isto — `window.__cardPick.debug()` devolvia `calls: 0` para sempre enquanto o
 * laço de quadro chamava `resolve` normalmente, porque o objeto publicado no
 * `window` pertencia a um pick que ninguém mais usava.
 *
 * Num lugar só, qualquer instância que resolva escreve aqui, e a leitura é
 * sempre sobre a que está de fato rodando.
 */
let diagnostic: PickDiagnostic = {
  calls: 0,
  pointer: [-1, -1],
  active: false,
  count: 0,
  quads: [],
};

export function pickDiagnostic(): PickDiagnostic {
  return diagnostic;
}

/**
 * O card resolvido no último quadro — **de módulo, pelo mesmo motivo do
 * diagnóstico**.
 *
 * A instalação viva é uma, mas em desenvolvimento ela não é a única que
 * existiu, e o gancho publicado no `window` pode pertencer a outra. Com o
 * estado no módulo, `hovered()` responde sobre quem está de fato resolvendo.
 */
let resolved = -1;

/**
 * Projeta os quatro cantos de um card em pixels de CSS da viewport.
 *
 * Escreve em `out` na ordem (−x−y, +x−y, +x+y, −x+y) e devolve `false` quando
 * algum canto está atrás da lente — a projeção espelha, e o quad vira um laço.
 * É a mesma conta que o teste de acerto usa, exportada para o foco de teclado
 * (`Cards.tsx`) posicionar o link sobre a peça sem uma segunda descrição dela.
 */
export function projectCard(
  card: Vector4,
  viewProjection: Matrix4,
  width: number,
  height: number,
  out: Float64Array,
  scratch: Vector3,
): boolean {
  const c = Math.cos(card.w);
  const s = Math.sin(card.w);
  for (let k = 0; k < 4; k += 1) {
    const sx = k === 0 || k === 3 ? -1 : 1;
    const sy = k < 2 ? -1 : 1;
    scratch
      .set(
        card.x + c * sx * CARD_HALF_WIDTH,
        card.y + sy * CARD_HALF_HEIGHT,
        card.z - s * sx * CARD_HALF_WIDTH,
      )
      .applyMatrix4(viewProjection);
    if (scratch.z > 1) return false;
    out[k * 2] = (scratch.x * 0.5 + 0.5) * width;
    out[k * 2 + 1] = (0.5 - scratch.y * 0.5) * height;
  }
  return true;
}

/** Ponto em quad convexo, por sinal consistente dos produtos vetoriais. */
function inside(px: number, py: number, quad: ArrayLike<number>): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const ax = quad[i * 2] ?? 0;
    const ay = quad[i * 2 + 1] ?? 0;
    const bx = quad[((i + 1) % 4) * 2] ?? 0;
    const by = quad[((i + 1) % 4) * 2 + 1] ?? 0;
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (cross === 0) continue;
    const next = cross > 0 ? 1 : -1;
    if (sign === 0) sign = next;
    else if (sign !== next) return false;
  }
  return true;
}

/**
 * Um clique que já pertence a outra coisa não pode virar navegação de card.
 *
 * A camada da cena é `pointer-events-none` e fica atrás de tudo, então o clique
 * é ouvido no `window` — e ali chegam também os cliques da HUD, da lista de
 * estações e de qualquer link em DOM que por acaso esteja por cima de um card.
 * Sem este teste, clicar em `EMAIL` na HUD abriria um case.
 */
const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role=button]";

export function installCardPick(options: CardPickOptions = {}): CardPick {
  const matrix = new Matrix4();
  const point = new Vector3();
  const quad = new Float64Array(8);

  let pointerX = -1;
  let pointerY = -1;
  /** `timeStamp` do evento que produziu a coordenada pendente. */
  let eventAt = 0;
  /** A coordenada mudou desde o último quadro consumido? */
  let fresh = false;

  const onMove = (event: PointerEvent) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    eventAt = event.timeStamp;
    fresh = true;
  };

  // Um ponteiro que sai da janela não deixa um card aceso para trás.
  const onLeave = () => {
    pointerX = -1;
    pointerY = -1;
    fresh = true;
  };

  /**
   * O clique na peça.
   *
   * **Ele é ouvido, e não capturado.** Um `capture: true` chegaria antes do
   * `onClick` do link do card e navegaria duas vezes; ouvindo na
   * fase de bolha, quem tem dono trata primeiro e este teste sai fora.
   *
   * Modificadores passam batido de propósito: `cmd+clique` num card não tem o
   * que abrir em aba nova, porque o card não é um `href` — quem quer isso usa o
   * link invisível do card (`StationList`), que é um link de verdade. Fingir a
   * semântica de um link aqui seria pior que não tê-la.
   */
  const onClick = (event: MouseEvent) => {
    if (options.onActivate === undefined) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (resolved < 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest(INTERACTIVE) !== null) return;
    options.onActivate(resolved);
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerleave", onLeave, { passive: true });
  window.addEventListener("pointercancel", onLeave, { passive: true });
  window.addEventListener("click", onClick);

  const resolve: CardPick["resolve"] = (camera, chain, count, active) => {
    if (process.env.NODE_ENV !== "production") {
      diagnostic = {
        calls: diagnostic.calls + 1,
        pointer: [pointerX, pointerY],
        active,
        count,
        quads: [],
      };
    }

    if (!active || pointerX < 0) {
      resolved = -1;
      return -1;
    }

    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const width = window.innerWidth;
    const height = window.innerHeight;

    let best = -1;
    let bestDepth = Infinity;
    const limit = Math.min(count, MAX_CARDS, chain.length);

    for (let i = 0; i < limit; i += 1) {
      const card = chain[i];
      if (card === undefined) continue;
      const depth = point
        .set(card.x, card.y, card.z)
        .distanceTo(camera.position);
      // Mais longe que o acerto que já temos: não pode ganhar, não precisa ser
      // projetado. `chain` não está ordenado por profundidade, então um card
      // mais perto ainda entra — o corte só descarta quem perderia.
      if (depth >= bestDepth) {
        if (process.env.NODE_ENV !== "production") {
          diagnostic.quads.push({
            i,
            behind: false,
            skipped: true,
            depth: Number(depth.toFixed(1)),
            box: null,
          });
        }
        continue;
      }

      const behind = !projectCard(card, matrix, width, height, quad, point);
      if (process.env.NODE_ENV !== "production") {
        const xs = [quad[0] ?? 0, quad[2] ?? 0, quad[4] ?? 0, quad[6] ?? 0];
        const ys = [quad[1] ?? 0, quad[3] ?? 0, quad[5] ?? 0, quad[7] ?? 0];
        diagnostic.quads.push({
          i,
          behind,
          depth: Number(depth.toFixed(1)),
          box: behind
            ? null
            : [
                Math.round(Math.min(...xs)),
                Math.round(Math.min(...ys)),
                Math.round(Math.max(...xs)),
                Math.round(Math.max(...ys)),
              ],
        });
      }

      if (behind) continue;

      if (inside(pointerX, pointerY, quad)) {
        best = i;
        bestDepth = depth;
      }
    }

    resolved = best;
    return best;
  };

  const markApplied = () => {
    if (process.env.NODE_ENV === "production") return;
    if (!fresh) return;
    fresh = false;
    const at = eventAt;
    requestAnimationFrame(() => {
      const elapsed = performance.now() - at;
      // Um evento guardado enquanto a aba estava oculta devolve segundos, e
      // isso não é latência de ponteiro — é o rAF congelado.
      if (elapsed >= 0 && elapsed < 400) latencies.push(elapsed);
      if (latencies.length > 600) latencies.shift();
    });
  };

  /**
   * O atalho de desenvolvimento da medição de ponteiro.
   *
   * **Ele não pode morar atrás de `?probe=1`, e o motivo é o relógio.** O
   * `ProbeClock` não roda laço nenhum — "a cena fica parada até alguém chamar
   * `window.__probe.*`" —, então sob a sonda não existem quadros espontâneos
   * para o ponteiro chegar entre eles. Uma latência medida ali mediria o
   * intervalo entre duas chamadas de ferramenta, não o que a pessoa sente.
   *
   * A medição de ponteiro precisa do site **como ele roda**: o ticker do GSAP
   * publicando quadros a cada rAF, o portão aberto por clique, o scroll de
   * verdade. Daí este gancho, ao lado do `__lenis` que a varredura de contraste
   * já usa pela mesma razão.
   *
   * `process.env.NODE_ENV` é substituído por literal pelo Next, então o bloco
   * inteiro cai na build de produção — conferido por `npm run measure`, que
   * falha se algum chunk mencionar a instrumentação.
   */
  const hook = {
    latency: hoverLatency,
    reset: resetHoverLatency,
    hovered: () => resolved,
    debug: pickDiagnostic,
  };

  type Host = { __cardPick?: typeof hook };

  const api = {
    get hovered() {
      return resolved;
    },
    resolve,
    markApplied,
    dispose: () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("click", onClick);
      // **Só desinstala se ainda for esta instalação**, e isso não é zelo: em
      // desenvolvimento o efeito monta e desmonta várias vezes (StrictMode,
      // Fast Refresh) e as ordens se cruzam. Sem a comparação de identidade,
      // a limpeza da instância antiga apagava o gancho que a nova tinha acabado
      // de publicar — e o sintoma foi exatamente este: `window.__cardPick`
      // existindo, respondendo, e reportando `calls: 0` para sempre, porque o
      // objeto no `window` pertencia a um pick que ninguém mais chamava. É a
      // mesma armadilha que `installProbe` já documenta.
      if (process.env.NODE_ENV !== "production") {
        const host = window as unknown as Host;
        if (host.__cardPick === hook) delete host.__cardPick;
      }
    },
  };

  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Host).__cardPick = hook;
  }

  return api;
}
