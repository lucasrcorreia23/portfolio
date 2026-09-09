/**
 * A travessia do rio para o case, fora do React.
 *
 * Mesmo desenho do `filter-store` e do `readout-store`, e pelo mesmo motivo
 * prático: este estado precisa ser lido pela **rota inicial** (o clique, a
 * página do case, a HUD) e pelo **chunk da cena** (o laço mestre da câmera), e
 * precisa sobreviver a uma navegação de cliente. Um singleton de módulo faz as
 * três coisas de graça; um contexto de React não faria nenhuma delas, porque a
 * árvore que o hospedaria é justamente a que a navegação troca.
 *
 * Sem `three` e sem React aqui dentro — este arquivo viaja na rota inicial.
 *
 * ## A regra que torna isto robusto: o `pathname` manda, o clique só adianta
 *
 * Há duas fontes de evento e elas discordam por construção. O **clique** sabe de
 * onde a pessoa saiu (o progresso do rio, o card sob o ponteiro) e acontece
 * imediatamente; a **rota** sabe onde ela está, e acontece quando o payload
 * chega. Orquestrar as duas com temporizador seria inventar um terceiro relógio.
 *
 * Então: o clique publica `entering` na hora — senão haveria tempo morto entre o
 * dedo e o primeiro movimento, e o teto de 100 ms do PROJECT.md §3.3 é sobre o
 * que a pessoa sente, não sobre quando o RSC chega. E o `pathname` é a
 * autoridade: ele confirma, corrige ou desfaz.
 *
 * | pathname | fase anterior | resultado |
 * |---|---|---|
 * | case | `entering` | segue `entering` — o voo continua, agora com destino confirmado |
 * | case | `river` | `case`, já atracado: link direto, ou vindo do acervo |
 * | home | `entering` \| `case` | `leaving`, e `river` quando a volta assenta |
 *
 * Se a navegação falhar ou for abortada, o `pathname` nunca muda, o `setCaseRoute`
 * seguinte chega com `null` e o estado volta sozinho para `river`. **Não há nada
 * a desfazer**, que é a propriedade que se estava comprando.
 */

export type CasePhase = "river" | "entering" | "case" | "leaving";

export type CaseState = {
  phase: CasePhase;
  /** O case de destino, ou `null` no rio. */
  slug: string | null;
  /**
   * Posição na **ordem da curadoria** — `river_rank − 1`, não o rank.
   *
   * Quem decide se essa posição está montada na câmara é a cena, e só ela: o
   * corte por aparelho (7 no desktop, 4 no mobile) depende da largura da janela,
   * que nem o servidor nem a rota inicial conhecem. Uma posição além do corte
   * simplesmente não tem card para onde voar, e a rota do case funciona inteira
   * assim mesmo — é o princípio do PROJECT.md §4, o acervo é maior que o rio.
   *
   * `-1` é "não sei ainda", e é o que se tem antes de a cena resolver.
   */
  index: number;
  /**
   * Entrou por clique no rio nesta sessão.
   *
   * É o que decide o caminho de volta: com `true` existe uma entrada de
   * histórico da home guardando o `scrollY` do rio, e `router.back()` restaura
   * tudo sozinho. Com `false` (link direto, acervo, reload dentro do case) não
   * existe essa entrada, e a volta é um `push` com o progresso da estação.
   */
  fromRiver: boolean;
  /** O progresso da descida no instante do clique. `null` quando não houve. */
  returnProgress: number | null;
  /** A cena avisa que o voo terminou e a capa pode ser entregue ao DOM. */
  docked: boolean;
};

const IDLE: CaseState = {
  phase: "river",
  slug: null,
  index: -1,
  fromRiver: false,
  returnProgress: null,
  docked: false,
};

let current: CaseState = IDLE;
const listeners = new Set<() => void>();

function publish(next: CaseState): void {
  // Objeto novo e congelado a cada mudança, mesmo objeto entre elas: é o que
  // `useSyncExternalStore` exige para não entrar em laço de render.
  current = Object.freeze(next);
  for (const listener of listeners) listener();
}

export function getCaseState(): Readonly<CaseState> {
  return current;
}

/** O que o servidor renderiza: ninguém está atravessando nada. */
export function getIdleCaseState(): Readonly<CaseState> {
  return IDLE;
}

export function subscribeToCase(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * O clique num card do rio. Otimista: publica antes de a rota existir.
 *
 * `index` é o posto na corrente montada, e `fromProgress` é o progresso da
 * descida naquele instante — é ele, e só ele, que sustenta "a câmera volta para
 * a posição do rio de onde saiu, não para o topo".
 */
export function enterCase(
  slug: string,
  index: number,
  fromProgress: number,
): void {
  if (current.phase === "entering" && current.slug === slug) return;
  publish({
    phase: "entering",
    slug,
    index,
    fromRiver: true,
    returnProgress: fromProgress,
    docked: false,
  });
}

/**
 * A rota, que é a autoridade. Chamado de um `usePathname()` — ver `SceneGate`.
 *
 * `index` só é consultado quando o estado ainda não conhece o destino (chegada
 * direta); numa entrada por clique o posto já foi resolvido pelo raycast, e
 * reescrevê-lo aqui trocaria a verdade do ponteiro por uma busca por slug.
 */
export function setCaseRoute(slug: string | null, index = -1): void {
  if (slug === null) {
    if (current.phase === "river") return;
    if (current.phase === "leaving") return;
    publish({ ...current, phase: "leaving", docked: false });
    return;
  }

  if (current.phase === "entering" && current.slug === slug) return;
  if (current.phase === "case" && current.slug === slug) return;

  // Chegada sem voo: link direto, acervo, reload, ou um segundo case aberto a
  // partir do primeiro. Não há de onde voar, então já se chega atracado.
  publish({
    phase: "case",
    slug,
    index,
    fromRiver: false,
    returnProgress: null,
    docked: true,
  });
}

/**
 * Escrito pelo laço mestre quando o voo fecha em 1 e o retângulo existe.
 *
 * Atracar **encerra o voo**: a fase sai de `entering` e vira `case`. Sem isso
 * ela ficaria em `entering` pelo tempo inteiro da leitura, e "entrando" deixaria
 * de querer dizer o que diz — a diferença aparece na primeira vez que alguém
 * perguntar ao store se a travessia ainda está acontecendo.
 */
export function setDocked(docked: boolean): void {
  const phase = docked && current.phase === "entering" ? "case" : current.phase;
  if (current.docked === docked && current.phase === phase) return;
  publish({ ...current, docked, phase });
}

/** A volta assentou: a câmera está de novo na curva, no progresso restaurado. */
export function settleRiver(): void {
  if (current.phase === "river") return;
  publish(IDLE);
}

/**
 * O posto do card, resolvido tarde.
 *
 * A cena sabe qual card é um slug; a rota inicial não, porque o corte por
 * aparelho depende da largura da janela. Quando a cena descobre, ela escreve
 * aqui — e é isso que faz a volta de uma visita direta cair na estação certa em
 * vez de no começo do rio.
 */
export function setCaseIndex(index: number): void {
  if (current.index === index) return;
  publish({ ...current, index });
}

/** O progresso para onde a volta deve levar, quando não houve clique. */
export function setReturnProgress(progress: number): void {
  if (current.returnProgress !== null) return;
  publish({ ...current, returnProgress: progress });
}
