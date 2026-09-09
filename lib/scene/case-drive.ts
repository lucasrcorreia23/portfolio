import {
  NoColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  type Texture,
  type Vector4,
} from "three";
import { damp, easeStrong } from "@/lib/motion";
import { CARD_COVER_ASPECT } from "./card-layout";
import {
  getCaseState,
  setCaseIndex,
  setDocked,
  setReturnProgress,
  settleRiver,
} from "@/lib/work/case-transition";
import type { CameraPose } from "./curve";
import { dockPose, restPose, stationProgress } from "./case-pose";
import type { SharedUniforms } from "./uniforms";

/**
 * A travessia, quadro a quadro — o lado da cena.
 *
 * Ela mora aqui e não no `SceneWorld` por tamanho, não por arquitetura: quem
 * escreve a câmera continua sendo o laço mestre, com prioridade −10, e este
 * módulo só entrega a pose já misturada. Uma pose aplicada **depois** daquele
 * laço seria sobrescrita no quadro seguinte — é a mesma razão pela qual o
 * poleiro e a abertura também são resolvidos lá dentro.
 *
 * ## Três estados, dois escalares
 *
 * ```
 * curva(p) ──amount──▶ encaixe(card, retângulo) ──recede──▶ repouso(card)
 * ```
 *
 * `amount` é o voo: sobe amortecido enquanto a fase é `entering` ou `case`, e
 * desce quando ela vira `leaving`. `recede` é o passo atrás depois da entrega, e
 * ele só começa quando a capa já é do DOM — recuar antes disso arrastaria o
 * retângulo com que a peça acabou de casar.
 *
 * Nenhum dos dois é um temporizador do começo ao fim. `amount` é `damp`, então
 * um voo interrompido no meio (a pessoa aperta voltar antes de a página abrir)
 * volta pelo mesmo caminho, sem descontinuidade e sem estado a desfazer.
 *
 * ## A entrega espera o DOM, e não o contrário
 *
 * Esconder a peça no instante em que `amount` fecha em 1 abriria uma janela em
 * que nem o card nem o `<img>` estão desenhados — 120 ms de buraco, que é
 * exatamente a tela em branco que esta rodada existe para não ter. Então a ordem
 * é: a cena avisa que atracou (`setDocked`), o DOM traz o `<img>` por cima com o
 * corte de 120 ms, e só **depois** disso a peça sai do quadro. As duas imagens
 * ficam sobrepostas no meio, que é o único jeito de não haver quadro nenhum sem
 * nenhuma das duas.
 */

/**
 * Taxa do voo, em `damp` por segundo.
 *
 * A 5 a câmera percorre 63% do caminho em 0.2 s e 99% em 0.92 s. O teto que
 * importa não é este — o PROJECT.md §3.3 mede **resposta**, não duração, e a
 * resposta é o primeiro quadro em que algo se move, que aqui é imediato. O que
 * este número protege é o outro lado: mais rápido que isto e a aproximação vira
 * um corte, e o beat inteiro do rio é sobre aproximação.
 */
const FLIGHT_DAMP = 5;

/**
 * Onde o voo é considerado chegado.
 *
 * **0.995, e a primeira versão usou 0.9995.** O `damp` é assintótico: a 5 por
 * segundo, chegar a 0.9995 leva 1.52 s, e o conteúdo do case fica retido esse
 * tempo inteiro (ver `CaseReveal`) — medido, 1574 ms do clique até atracar, para
 * um movimento que o olho já tinha visto terminar. Uma casa decimal a menos
 * corta isso para ~1.06 s.
 *
 * E não custa precisão, porque a mistura passa por `easeStrong` antes de virar
 * pose: a bezier de saída forte achata tanto no fim que `easeStrong(0.995)`
 * vale 0.99997, ou seja meio milésimo de unidade de mundo de resíduo. A
 * medição confirma: o desencontro entre a peça projetada e o `<img>` continua
 * abaixo de um centésimo de pixel.
 */
const FLIGHT_SNAP = 0.995;

/** Taxa do recuo. Mais lenta que o voo: é um assentamento, não um movimento. */
const RECEDE_DAMP = 2;

/** Taxa da travessia para a capa em resolução de entrega. */
const DELIVERY_DAMP = 6;

/**
 * Quanto a peça continua desenhada depois de a cena avisar que atracou.
 *
 * O corte do DOM dura `--dur-cut` (120 ms, `styles/tokens.css`). O dobro disso
 * é margem para um quadro perdido, e o custo de errar para mais é zero: são duas
 * imagens iguais, uma em cima da outra.
 */
const HANDOFF_HOLD_MS = 260;

/** Onde a página do case põe a capa. É o retângulo com que a peça casa. */
const COVER_SELECTOR = "[data-case-cover] img";

export type CaseDrive = {
  /** 0 a 1 — quanto da pose de curva já virou pose de case. */
  amount: number;
  /**
   * Mistura a pose do case por cima da pose da curva, **no lugar**, e mantém os
   * uniforms de entrega em dia. Devolve `amount` já atualizado.
   */
  update: (
    dt: number,
    instant: boolean,
    shared: SharedUniforms,
    pose: CameraPose,
    viewportWidth: number,
    viewportHeight: number,
  ) => number;
  dispose: () => void;
};

export function createCaseDrive(): CaseDrive {
  const dock: CameraPose = { position: new Vector3(), target: new Vector3() };
  const rest: CameraPose = { position: new Vector3(), target: new Vector3() };

  const loader = new TextureLoader();
  let coverTexture: Texture | null = null;
  let coverSrc = "";
  let coverReady = 0;
  const coverCrop = new Vector2(1, 1);

  let amount = 0;
  let recede = 0;
  let handoffAt = 0;
  /** Já limpou tudo depois da última travessia? Começa limpo. */
  let idle = true;
  /** O slug cuja estação já foi resolvida — para não buscar de novo por quadro. */
  let stationFor = "";

  const releaseCover = () => {
    if (coverTexture !== null) coverTexture.dispose();
    coverTexture = null;
    coverSrc = "";
    coverReady = 0;
  };

  /**
   * A capa em resolução de entrega sai do **`currentSrc`** do `<img>`, e não do
   * `cover` do frontmatter.
   *
   * `currentSrc` é a URL que o navegador de fato escolheu — depois de `srcset`,
   * de `sizes` e do que estiver em cache. Pedir a URL do frontmatter baixaria uma
   * segunda imagem, do mesmo assunto, em outro tamanho: dois downloads, e duas
   * versões que não são bit a bit a mesma coisa justamente no quadro em que uma
   * substitui a outra.
   */
  const syncCover = (element: HTMLImageElement | null) => {
    if (element === null) {
      releaseCover();
      return;
    }
    const src = element.currentSrc || element.src;
    if (src === "" || src === coverSrc) return;
    releaseCover();
    coverSrc = src;
    loader.load(
      src,
      (texture) => {
        // O shader converte de sRGB para linear à mão (`srgbToLinear`), como já
        // faz com as camadas do atlas: deixar o three converter no sampler
        // aplicaria a curva duas vezes.
        texture.colorSpace = NoColorSpace;
        // A camada do atlas vem de um canvas 2D, que conta as linhas de cima
        // para baixo, e o shader amostra com `1 − v` por causa disso. Sem
        // `flipY = false` esta textura chegaria invertida em relação àquela, e a
        // capa entregue apareceria de cabeça para baixo.
        texture.flipY = false;
        if (coverSrc !== src) {
          texture.dispose();
          return;
        }
        // O mesmo enquadramento `cover` que o canvas do atlas aplica, e que o
        // `object-fit: cover` do `<img>` vai aplicar do outro lado da entrega.
        // Sem ele a capa chega esticada e as duas imagens deixam de ser a
        // mesma imagem exatamente no quadro em que uma substitui a outra.
        const image = texture.image as { width?: number; height?: number };
        const w = image.width ?? 0;
        const h = image.height ?? 0;
        if (w > 0 && h > 0) {
          const aspect = w / h;
          if (aspect > CARD_COVER_ASPECT) {
            coverCrop.set(CARD_COVER_ASPECT / aspect, 1);
          } else {
            coverCrop.set(1, aspect / CARD_COVER_ASPECT);
          }
        } else {
          coverCrop.set(1, 1);
        }
        coverTexture = texture;
      },
      undefined,
      () => {
        // Sem imagem, `dockBlend` fica em zero e a peça chega com a camada do
        // atlas — mais macia, e não um buraco. Falhar aqui degrada a nitidez da
        // entrega, nunca a travessia.
        if (coverSrc === src) coverSrc = "";
      },
    );
  };

  const update: CaseDrive["update"] = (
    dt,
    instant,
    shared,
    pose,
    viewportWidth,
    viewportHeight,
  ) => {
    const state = getCaseState();
    const flying = state.phase === "entering" || state.phase === "case";

    // Nada a fazer, e nada a ler do DOM: no rio isto custa uma comparação.
    if (!flying && amount <= 0.0005) {
      // **`idle`, e não `amount !== 0`.** A primeira versão testava o próprio
      // `amount`, e ele já tinha sido encaixado em zero pelo laço abaixo antes
      // de chegar aqui — a limpeza nunca rodava. O sintoma foi discreto e
      // errado do jeito pior: a câmera voltava certa, a abertura voltava certa,
      // e a fase ficava em `leaving` para sempre, com o `returnProgress` ainda
      // pendurado. A próxima visita à home seria arrastada para a estação de um
      // case que ninguém abriu.
      if (!idle) {
        idle = true;
        amount = 0;
        recede = 0;
        handoffAt = 0;
        stationFor = "";
        shared.dockCard.value = -1;
        shared.dockBlend.value = 0;
        shared.dockHandoff.value = 0;
        shared.dockCover.value = null;
        releaseCover();
        // A câmera está de novo na curva, no progresso restaurado: a travessia
        // acabou. Sem isto o `returnProgress` continuaria pendurado no store, e
        // a próxima visita à home seria arrastada para a estação de um case que
        // ninguém abriu.
        settleRiver();
      }
      return 0;
    }

    // O corte do modo calmo: o DIRECTION.md §5 é explícito — "a troca é corte,
    // não movimento de câmera: 120 ms de dissolve, nada de interpolação de
    // posição". Amortecer aqui reintroduziria exatamente o que o modo tira.
    idle = false;
    const wanted = flying ? 1 : 0;
    amount = instant ? wanted : damp(amount, wanted, FLIGHT_DAMP, dt);
    if (amount > FLIGHT_SNAP) amount = 1;
    if (amount < 0.0005) amount = 0;

    // A peça: o índice é da ordem de curadoria, e ela só está montada se coube
    // no corte deste aparelho. Fora do corte não há para onde voar — a rota do
    // case funciona igual, e a volta cai no começo do rio.
    const count = shared.cardCount.value;
    const index = state.index;
    const card: Vector4 | undefined =
      index >= 0 && index < count ? shared.cards.value[index] : undefined;

    if (card === undefined) {
      shared.dockCard.value = -1;
      shared.dockBlend.value = 0;
      shared.dockHandoff.value = 0;
      // Sem peça não há encaixe, mas ainda há uma travessia: a câmera não se
      // move e a atmosfera do case entra igual. Quem cuida disso é o laço
      // mestre, lendo o `amount` que devolvemos.
      return amount;
    }

    // A volta de uma chegada sem clique: o progresso em que **esta** peça está à
    // distância de leitura. Resolvido uma vez por slug, não por quadro.
    if (state.slug !== null && stationFor !== state.slug) {
      stationFor = state.slug;
      setCaseIndex(index);
      setReturnProgress(stationProgress(card.z));
    }

    // --- o retângulo entregue ---------------------------------------------
    const image = document.querySelector<HTMLImageElement>(COVER_SELECTOR);
    syncCover(image);
    const rect = image === null ? null : image.getBoundingClientRect();
    const usable =
      rect !== null && rect.width > 1 && rect.height > 1 ? rect : null;

    dockPose(card, usable, viewportWidth, viewportHeight, dock);
    restPose(card, rest);

    // --- a capa em resolução de entrega ------------------------------------
    shared.dockCard.value = index;
    shared.dockCover.value = coverTexture;
    shared.dockCoverCrop.value.copy(coverCrop);
    const deliveryWanted = coverTexture === null ? 0 : amount;
    coverReady = instant
      ? deliveryWanted
      : damp(coverReady, deliveryWanted, DELIVERY_DAMP, dt);
    shared.dockBlend.value = coverReady;

    // --- a entrega ---------------------------------------------------------
    // Ela pede as três coisas juntas: o voo terminou, o retângulo existe, e a
    // imagem já está decodificada. Faltando qualquer uma, a peça continua sendo
    // quem desenha — o que se perde é um instante, nunca o quadro.
    const arrived = amount >= 1 && usable !== null;
    setDocked(arrived);
    if (arrived) {
      if (handoffAt === 0) handoffAt = performance.now();
    } else {
      handoffAt = 0;
    }
    const handed =
      handoffAt !== 0 &&
      (instant || performance.now() - handoffAt >= HANDOFF_HOLD_MS);
    shared.dockHandoff.value = handed ? 1 : 0;

    // --- o recuo -----------------------------------------------------------
    recede = instant
      ? handed
        ? 1
        : 0
      : damp(recede, handed ? 1 : 0, RECEDE_DAMP, dt);

    // --- a mistura ---------------------------------------------------------
    // `easeStrong` por cima do `damp` não é redundância: o `damp` dá a inércia
    // e a bezier dá a saída forte que o PROJECT.md §3.3 pede em toda
    // transformação. Sem ela o voo chega no encaixe desacelerando para sempre,
    // e o instante da entrega fica indefinido.
    dock.position.lerp(rest.position, easeStrong(recede));
    dock.target.lerp(rest.target, easeStrong(recede));

    const blend = easeStrong(amount);
    pose.position.lerp(dock.position, blend);
    pose.target.lerp(dock.target, blend);

    return amount;
  };

  return {
    get amount() {
      return amount;
    },
    update,
    dispose: releaseCover,
  };
}
