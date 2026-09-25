/**
 * Os poucos números da cena que precisam ser trocáveis sem recompilar.
 *
 * **Isto não é um painel de debug.** O DIRECTION.md §3 termina a seção da
 * profundidade de campo com uma regra de corte — "se não fechar o orçamento de
 * fps, a DOF cai antes de qualquer outra coisa" —, e uma regra de corte só é
 * acionável se der para medir os dois lados. Com a DOF compilada dentro da
 * cena, medir o custo dela exige editar código, e aí quem mede compara duas
 * builds diferentes em vez de dois quadros do mesmo site.
 *
 * Por isso o resolvedor lê a URL: `?dof=off` produz a rodada B da medição, e a
 * comparação A/B acontece no mesmo binário, no mesmo navegador, no mesmo
 * minuto. Vale hoje, quando a DOF é a única coisa nova na cena e o custo dela
 * está isolado, e vale daqui a três prompts, quando não estiver mais.
 *
 * `DPR_CAP` é do PROJECT.md §5 e não é ajustável: é orçamento, não gosto.
 */

/**
 * PROJECT.md §5: "DPR do canvas limitado a 1.5."
 *
 * **É este número que faz o celular fechar o orçamento**, e agora com medição:
 * a GPU do iPhone é 4.2× mais lenta por pixel que a do M5 e desenha 4.4× menos
 * pixels, porque o teto de 1.5 sobre uma viewport de 390×699 dá 0.61 Mpx contra
 * 2.71 do desktop. Os dois lados quase se cancelam — 4.62 ms contra 4.87. Num
 * DPR 3 nativo seriam 2.44 Mpx e a cena estouraria o quadro sozinha.
 */
export const DPR_CAP = 1.5;

/**
 * Corpos no bando. O DIRECTION.md §5 pede de 4k a 16k.
 *
 * **16.384, e o número veio da medição, não do gosto.** A escala começou no piso
 * de 4.096 e subiu porque o tempo de GPU não mudou: 4.34 ms a 4.096 contra
 * 4.36 ms a 16.384 num M5 a 2160×1254 — dentro do ruído. A cena é limitada por
 * preenchimento nas passadas de tela cheia (a névoa com ruído 3D cobre o quadro
 * inteiro, e o alvo é multiamostrado), não pelos corpos.
 *
 * **No iPhone isso deixa de ser verdade, e é a única medida que se comporta
 * diferente nos dois aparelhos.** Os mesmos dois pontos, num iOS 18.7 a
 * 585×1048: 4.20 ms a 4.096 contra 4.62 a 16.384. São 0.42 ms — o mesmo que a
 * DOF inteira. A contagem fica em 16.384 porque o celular fecha o orçamento com
 * folga assim mesmo (28% do quadro a 60 Hz), mas se algum dia faltar quadro lá,
 * `?flock=4096` é alavanca de verdade e não placebo.
 *
 * Os números anteriores desta nota (13.91 contra 13.93) vinham do cronômetro de
 * query, que media a espera pelo vsync junto com o trabalho. Ver AGENTS.md,
 * "Desempenho da cena, medido".
 *
 * A textura da simulação é quadrada: 16.384 = 128².
 */
export const FLOCK_TEXTURE_SIZE = 128;
export const FLOCK_COUNT = FLOCK_TEXTURE_SIZE * FLOCK_TEXTURE_SIZE;

/**
 * **No telefone, menos corpos e menos pixels** — PROJECT.md §5, "Mobile": "DPR
 * e contagem de partículas reduzidos". O iPhone fecha o quadro sem isto (4.62
 * ms, ver acima), então não é conserto de desempenho: é a folha térmica que
 * ninguém mediu (a cena aberta por dez minutos), comprada nas duas alavancas
 * que a medição mostrou serem reais no aparelho. 96² = 9.216 corpos, dentro da
 * faixa do DIRECTION.md §5; DPR 1.25 é 69% dos pixels do teto de 1.5.
 *
 * "Telefone" é a viewport estreita, a mesma fronteira `md` do CSS que colapsa a
 * HUD e encurta o rio — um critério só para as três coisas.
 */
export const MOBILE_TEXTURE_SIZE = 96;
export const MOBILE_DPR_CAP = 1.25;
const COMPACT_QUERY = "(max-width: 767px)";

/** Faixa do DIRECTION.md §5: de 4k a 16k corpos, ou seja lado 64 a 128. */
const MIN_TEXTURE_SIZE = 64;
const MAX_TEXTURE_SIZE = 128;

export type SceneSettings = {
  /** Profundidade de campo. Primeiro item da lista de corte do DIRECTION.md §3. */
  dof: boolean;
  /**
   * Lado da textura da simulação; a contagem de corpos é o quadrado dele.
   *
   * Ajustável pelo mesmo motivo da DOF: a faixa de 4k a 16k do DIRECTION.md §5
   * é uma decisão que só se fecha com fps na mão, e comparar duas contagens em
   * duas builds diferentes não é comparar contagens.
   */
  flockTextureSize: number;
  /** Teto do DPR do canvas: `DPR_CAP`, ou `MOBILE_DPR_CAP` numa viewport estreita. */
  dprCap: number;
  /**
   * `?bench=1`: o relógio da cena vira o banco de prova (`BenchClock`).
   *
   * Existe porque a medição que faltava é num **celular**, e ali não há
   * DevTools para injetar uma varredura por fora: o harness precisa morar na
   * própria página.
   *
   * **Ele é importado estaticamente, e isso foi medido, não suposto.** A
   * primeira versão trazia o banco por `import()`, no desenho de
   * `load-scene.ts`, para quem não está medindo não baixar nada dele. Com a
   * mesma build e o mesmo script de medição: chunk da cena em **285.0 kB gz**
   * sem o banco, **288.1 kB** com ele estático, **289.3 kB** com ele dinâmico
   * — mais o chunk separado de 3.6 kB. Partir o chunk custou 4.3 kB de cola de
   * bundler para economizar 3.1, ou seja, cobrou de todo mundo para não cobrar
   * de ninguém. O `import()` só paga quando o que sai é grande; 3 kB não é.
   *
   * Os outros parâmetros do banco (`?timer=`, `?chain=`, `?run=`, `?step=`)
   * são lidos pelo próprio módulo do banco, em `lib/scene/bench.ts`. Aqui fica
   * só o booleano, que é o que a cena precisa saber para escolher o relógio.
   */
  bench: boolean;
  /**
   * `?detach=0`: o descolamento sai do shader dos boids — **compilado fora, não
   * zerado**.
   *
   * É o mesmo desenho da DOF, e pelo mesmo motivo: multiplicar a força por zero
   * mediria o custo de multiplicar por zero. Aqui isso rende duas coisas de uma
   * vez. A primeira é o A/B de desempenho que o prompt pede ("com e sem o
   * descolamento isolado"). A segunda é mais valiosa: `?detach=0` é o **melhor
   * controle possível** dos critérios de aceite — mesma silhueta, mesmas
   * alturas, mesma semente, mesmo número de corpos, e nenhuma interação com a
   * peça. É ele que descarta "o bando já era mais denso ali".
   */
  detach: boolean;
  /**
   * `?cards=0`: o rio sai da cena — as malhas dos cards **e** as esteiras deles
   * no shader dos boids, compilados fora.
   *
   * Mesmo desenho de `detach`, e as mesmas duas serventias. A primeira é o A/B
   * de desempenho que o beat exige ("com e sem os cards isolados"). A segunda é
   * a que vale mais: com `?cards=0` a corrente continua existindo em
   * `lib/scene/cards.ts` — a sonda ainda sabe exatamente onde cada card
   * estaria — mas nada dela toca o escoamento. É o controle da medida de
   * esteira: mesma laje, mesma sombra de tinta, mesma semente, sem o efeito.
   *
   * Os dois são independentes de propósito: `?detach=0&cards=1` mede o rio sem
   * o corpo de prova interferir a montante, que é como se descobre se as duas
   * peças estão brigando pelo mesmo escoamento.
   */
  cards: boolean;
  /**
   * `?river=N`: quantos cards a corrente monta, sobrepondo a capacidade
   * derivada do aparelho (`riverCapacity`, em `lib/scene/cards.ts`).
   *
   * Existe porque a capacidade é **derivada da largura da janela**, e uma
   * medição que dependa da janela do sistema operacional não é repetível — a
   * mesma razão pela qual `__probe.viewport()` existe. Com ele dá para medir a
   * corrente do mobile num desktop, que é a única forma de conferir o
   * espaçamento de quatro cards sem um telefone na mão.
   */
  river: number | null;
  /**
   * `?span=N`: o comprimento do corredor em unidades de mundo.
   *
   * **É o controle da medida de separação em profundidade, e não um ajuste.**
   * O critério de aceite diz que os cards têm que ler como camadas distintas e
   * não como uma parede; o instrumento mede a largura projetada de cada card no
   * quadro composto e compara vizinhos. Um número sozinho não distingue "há
   * profundidade" de "o instrumento sempre diz isso" (PROJECT.md §7), então
   * `?span=3` colapsa a corrente inteira em três unidades de Z — uma parede,
   * literalmente — e a mesma varredura tem que devolver razões de ~1.00.
   */
  span: number | null;
  /**
   * `?veil=0`: as três passadas de redução do véu de legibilidade saem do
   * quadro — **em tempo de execução, não compiladas fora**.
   *
   * É a dívida que faltava no trio de A/B do compositor (DOF, descolamento,
   * rio): o véu ganhou três passadas de tela cheia (`VEIL_SEED_FRAG`,
   * `VEIL_REDUCE_FRAG` × 2, `VEIL_SOLVE_FRAG`) quando o mecanismo mudou de
   * "estimado pelo proxy" para "medido do quadro" (DIRECTION.md §5), e o custo
   * delas nunca foi separado do resto do composite — só o pacote foi medido
   * (4.5 kB gz, junto com o poleiro).
   *
   * **Aqui o desligamento é por `if`, não por variante de shader.** As outras
   * três chaves compilam um shader sem o bloco, porque o bloco vive dentro de
   * um único material grande. O véu é o oposto: cada passada já é um material
   * próprio e uma chamada de `blit()` separada no laço do compositor, então
   * "não existir" é simplesmente não chamar as três — sem custo de compilação
   * extra e sem exigir uma segunda variante de `COMPOSITE_FRAG`. O resultado
   * visual sem ele não importa aqui: é null de medição, não de site.
   */
  veil: boolean;
  /**
   * `?grain=0`: o grão de filme sai do composite — **só para medir**.
   *
   * O grão é redesenhado a cada quadro com semente nova, e toda medida que
   * compara dois quadros consecutivos (a presença da estrutura em
   * `probe-chamber.ts` é uma) passa a medir o grão em vez da cena: ele é a
   * maior diferença por pixel entre dois quadros escuros. Medido: a densidade
   * de bordas da estrutura saía ~95% na câmara nova e na caixa antiga, igual.
   */
  grain: boolean;
  /**
   * `?probe=1`: a sonda de medição — **só em desenvolvimento**.
   *
   * Ao contrário do banco, que é medição de tempo e por isso precisa rodar na
   * build de produção, a sonda mede **pixel e estado da simulação**, e esses
   * são idênticos nas duas builds (mesmos shaders, mesmo three, mesmo teto de
   * DPR). Então ela não precisa viajar no chunk da cena — e os 66 kB entre os
   * 284 medidos e o teto de 350 estão reservados pelo PROJECT.md §5 para o
   * campo de distância, os corpos de prova do rio e a transição para o case,
   * não para instrumentação.
   *
   * Quem apaga é o `process.env.NODE_ENV` no ponto de uso em `SceneWorld`, que
   * o Next substitui por literal: o ramo vira morto e o import da sonda cai.
   * A paridade dev/prod de um quadro é verificada antes de confiar nos números.
   */
  probe: boolean;
};

const DEFAULTS: SceneSettings = {
  dof: true,
  flockTextureSize: FLOCK_TEXTURE_SIZE,
  dprCap: DPR_CAP,
  bench: false,
  detach: true,
  cards: true,
  river: null,
  span: null,
  veil: true,
  grain: true,
  probe: false,
};

let resolved: SceneSettings | null = null;

function readFlag(params: URLSearchParams, key: string, fallback: boolean): boolean {
  const raw = params.get(key);
  if (raw === null) return fallback;
  return raw !== "0" && raw !== "off" && raw !== "false";
}

/** Um número positivo da URL, ou `null` — quem tem o padrão é quem consome. */
function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** `?flock=N` recebe a **contagem**; o lado da textura sai da raiz dela. */
function readTextureSize(params: URLSearchParams, fallback: number): number {
  const raw = params.get("flock");
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  const side = Math.round(Math.sqrt(parsed));
  // Fora da faixa do DIRECTION.md §5 não é uma medição, é outra cena.
  if (side < MIN_TEXTURE_SIZE || side > MAX_TEXTURE_SIZE) return fallback;
  return side;
}

/**
 * Resolve uma vez e memoiza. Uma vez porque trocar a contagem do bando ou a
 * DOF no meio da descida invalidaria a medição que o parâmetro existe para
 * permitir — e porque a cena monta uma vez.
 */
export function sceneSettings(): SceneSettings {
  if (resolved !== null) return resolved;

  if (typeof window === "undefined") {
    resolved = DEFAULTS;
    return resolved;
  }

  const params = new URLSearchParams(window.location.search);
  const compact = window.matchMedia(COMPACT_QUERY).matches;
  resolved = {
    dof: readFlag(params, "dof", DEFAULTS.dof),
    flockTextureSize: readTextureSize(
      params,
      compact ? MOBILE_TEXTURE_SIZE : DEFAULTS.flockTextureSize,
    ),
    dprCap: compact ? MOBILE_DPR_CAP : DPR_CAP,
    bench: readFlag(params, "bench", DEFAULTS.bench),
    detach: readFlag(params, "detach", DEFAULTS.detach),
    cards: readFlag(params, "cards", DEFAULTS.cards),
    river: readNumber(params, "river"),
    span: readNumber(params, "span"),
    veil: readFlag(params, "veil", DEFAULTS.veil),
    grain: readFlag(params, "grain", DEFAULTS.grain),
    probe:
      process.env.NODE_ENV !== "production" &&
      readFlag(params, "probe", DEFAULTS.probe),
  };
  return resolved;
}
