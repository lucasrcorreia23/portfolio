import type { Vector4 } from "three";

/**
 * O véu de legibilidade — DIRECTION.md §5, "Legibilidade sobre luz variável".
 *
 * Se o bando é a única luz prática até 0.85, a luminância atrás de todo texto
 * em DOM muda a cada quadro. Contraste médio não vale nada aqui; o que vale é o
 * pior quadro. E o pior quadro é conhecido: `--mist` tem L ≈ 0.796, e para
 * 4.5:1 nenhum pixel sob a caixa de um texto de leitura pode passar de
 * **L = 0.138**.
 *
 * ## Este arquivo encolheu, e o motivo é uma medição
 *
 * Ele resolvia `f` — a densidade do véu — uma vez por caixa por quadro, a
 * partir dos aglomerados do proxy da CPU. A ideia era boa: o proxy roda
 * adiantado, então o véu subiria *antes* de o cacho chegar. Varrendo o beat de
 * Quem sou a 0.6 vh/s e lendo o **pixel entregue**, o pior contraste sob a
 * coluna de manifesto deu **1.21:1** — com `f` parado no piso de 0.15 enquanto
 * a luminância real sob o texto batia em 0.65.
 *
 * A causa não é calibragem: a energia de um aglomerado do proxy é massa ×
 * velocidade, e no poleiro de Quem sou a velocidade **cai de propósito**. O
 * estimador desce exatamente enquanto o bando se junta atrás do texto e fica
 * mais brilhante. Era um modelo da cena decidindo pela cena — o erro que o
 * PROJECT.md §7 proíbe para instrumentos, cometido pelo mecanismo.
 *
 * O `f` passou a ser resolvido **da própria cena**: o compositor reduz o quadro
 * (cena + bloom, tonemapado) por **máximo** até 1/64 e varre, na região de cada
 * caixa, a luminância que vai para a tela. Exato por construção, sem readback,
 * sem palpite. O mecanismo está em `shaders/post.ts`; o que sobrou aqui é o que
 * sempre foi certo: **ler do DOM a caixa que o texto realmente ocupa** e
 * publicá-la para o shader.
 */

/** L de `--mist` (#C9D1D3) em luz relativa. */
const MIST_LUMINANCE = 0.627;

/**
 * A razão de contraste que o solucionador mira — **não** o piso de
 * reprovação do PROJECT.md §5 (esse continua 4.5, e é aplicado separado, em
 * `probe-contrast.ts`, contra o pixel entregue).
 *
 * Até esta revisão os dois eram o mesmo número: `f` resolvia exatamente para
 * 4.5:1, sem folga nenhuma. Medido: as quatro condições da varredura
 * pousaram em 4.59–4.65 — a poucas centenas de um por cento da linha. Isso é
 * o esperado de um mecanismo exato (ele pousa onde mandarem), mas descreve
 * uma margem zero bem no momento em que ela some de vez: o rio entra em 0.45
 * com capas de card — brilho de imagem atrás de texto —, e a HUD, que está
 * na tela o tempo todo, fica na borda por onde os cards passam por baixo
 * dela. Mirar exatamente no piso deixa de fazer sentido quando o que vem a
 * seguir é justamente mais luz atrás do texto.
 *
 * Subir este número escurece mais a cena atrás do texto sempre que ela
 * precisar de véu — o preço direto da margem. Três valores foram comparados
 * lado a lado (screenshots do beat de Quem sou + pior contraste medido por
 * `__probe.contrast()`) antes da escolha; ver AGENTS.md, "Comparação do alvo
 * do véu".
 *
 * **Travado em 5.5 — pior quadro medido 5.57:1 —, e é setpoint de
 * controlador, não valor final.** Foi escolhido olhando a imagem: em 5.5 o
 * retângulo escurecido atrás do texto já é visível (a região lê como mais
 * escura que a vizinhança, não como scrim opaco), contra 4.5 onde o véu não
 * se via a olho nu. Ele volta à mesa depois que o rio existir de verdade —
 * capa de card é brilho de imagem atrás de texto, um caso que esta
 * comparação não podia testar porque o card ainda não existe, e a HUD, que
 * está na tela o tempo todo, fica exatamente na borda por onde os cards
 * passam.
 *
 * **Voltou para 4.5.** O teto sai da luz do texto, e quando `--mist` escureceu
 * (0.796 → 0.627) o mesmo 5.5 passou a pedir um fundo um terço mais escuro:
 * o teto caiu de 0.087 para 0.056 e o véu voltou a ler como sombra atrás do
 * texto. Em 4.5 o teto ficou em 0.083, perto de onde estava, e o Lucas ainda
 * leu sombra: desceu para 3, com o teto em 0.159. É abaixo dos 4.5:1 de texto
 * de leitura no quadro em que uma flor acesa passa atrás de uma linha.
 */
export const VEIL_TARGET_CONTRAST = 3;

/**
 * O teto de luminância sob uma caixa de texto, na luminância **entregue** —
 * depois do tonemap, antes do grão.
 *
 * A fórmula é `(0.796 + 0.05) / (L + 0.05) ≥ VEIL_TARGET_CONTRAST`, ou seja
 * `L ≤ 0.846 / VEIL_TARGET_CONTRAST − 0.05`. O teto aqui é menor que isso, e
 * a diferença é o grão: ele é somado **depois** do véu (o PROJECT.md §3.1
 * quer o grão sobre o quadro composto), com intensidade `0.045 ± 0.015`
 * pesada por `0.12 + 0.88 · √L`.
 *
 * **A margem do grão foi medida, não estimada**, no alvo de 4.5: com o teto
 * em 0.125, a varredura devolveu um pior pixel de exatamente 0.138 — ou seja
 * o grão somou 0.013, e a razão pousou em 4.50, em cima da linha. Com 0.017
 * de margem o pior quadro entrega ~0.134 e sobra folga. A mesma margem de
 * grão vale para qualquer `VEIL_TARGET_CONTRAST`, porque o grão não muda com
 * o alvo — só a cena por trás muda.
 *
 * A faixa medida da entrada — a luminância que a cena de fato entrega atrás de
 * cada caixa — está no relatório de `__probe.contrast()` e no AGENTS.md. É ela
 * que valida este número, como o PROJECT.md §7 exige de todo limiar.
 */
export const VEIL_CEILING =
  (MIST_LUMINANCE + 0.05) / VEIL_TARGET_CONTRAST - 0.05 - 0.017;

/**
 * Quantas caixas o véu cobre ao mesmo tempo.
 *
 * **Era 4, contado por slot: a HUD ocupa um fixo, cada beat quer dois (rótulo
 * e conteúdo), e na virada de um painel `sticky` para o próximo há dois beats
 * na tela — e o rio acrescentaria mais três, um por botão de filtro.** Essa
 * conta pressupõe que a HUD é **uma** caixa entre outras, e que os filtros são
 * caixas à parte — nenhuma das duas é verdade: `HudPanel.tsx` marca o painel
 * inteiro (contato, acervo, filtros, régua, áudio, idioma) como um
 * `data-veil` **só**, e os três botões de filtro moram dentro dele, não em
 * `data-veil` próprios. **Verificado ao vivo** com
 * `document.querySelectorAll('[data-veil]')` em progressos 0.35, 0.42, 0.44,
 * 0.60 e 0.77: em nenhum ponto existem mais de **três** caixas com área
 * visível ao mesmo tempo — a HUD, o conteúdo do beat atual, e o rótulo do
 * próximo entrando pela margem de 15%. O teto antigo de 4 nunca foi o gargalo:
 * sempre sobrava um slot, com ou sem o rio.
 *
 * **A causa que a versão anterior deste comentário apontava — "o rio
 * acrescenta três botões de filtro que competem pelos mesmos quatro slots" —
 * está falseada pela medição acima**, não só recalibrada: não existe
 * competição de slot para falsear, porque os filtros nunca tiveram slot
 * próprio. Subiu para 8 mesmo assim, por dois motivos que não dependem desse
 * diagnóstico: cobre com margem qualquer HUD futura que separe elementos em
 * `data-veil` individuais, e o custo é quase de graça (ver abaixo). **O que
 * isto não faz — e que ainda não foi confirmado ao vivo nesta sessão — é
 * mexer no pior contraste medido com capa de card atrás do texto (5.16:1, no
 * botão `Product`, ver MEASUREMENTS.md, "A legibilidade, com capa de card
 * atrás do texto"): dado que a caixa da HUD nunca disputou slot, a suspeita é
 * que 5.16:1 nunca dependeu de `MAX_VEIL_BOXES`, e a causa real esteja na
 * grade de 24×16 do resolvedor (`VEIL_SOLVE_FRAG`, em `shaders/post.ts`)
 * subamostrando um pico estreito de brilho dentro de uma caixa alta e
 * estreita como a coluna inteira da HUD — mas isso é hipótese, não medição.
 * Reconfirmar com `__probe.contrast({from: 0.45, to: 0.85})` antes de calibrar
 * o véu contra o rio de verdade.
 *
 * **O custo de 4 para 8**: o resolvedor (`VEIL_SOLVE_FRAG`) roda um fragmento
 * por caixa, cada um varrendo a mesma grade de 24×16 texels — dobrar o número
 * de caixas dobra o número de fragmentos (4→8), não o trabalho por fragmento.
 * O alvo é 8×1 texels em vez de 4×1: o triângulo de tela cheia que desenha
 * nele continua cobrindo os mesmos oito ou quatro pixels de saída, então o
 * custo extra são quatro invocações a mais de um shader que já roda em
 * microssegundos. Medido no chunk da cena: 302.7 → 302.9 kB gz, +0.2 kB — o
 * array a mais em `uniforms.ts` são 4 `Vector4` e 4 `float`, bytes, não kB.
 * Custo de quadro não medido (o banco de GPU precisa de uma janela em
 * primeiro plano; ver "Desempenho da cena, medido"), mas as passadas de tela
 * cheia deste compositor já dominam o orçamento, e quatro fragmentos extras
 * de um shader de microssegundos não é onde esse orçamento se perde.
 */
export const MAX_VEIL_BOXES = 8;

/**
 * Raio da queda do véu para fora da caixa, em UV de tela.
 *
 * **Um décimo: já foram dezesseis centésimos e depois sete; subiu de novo para
 * a borda do véu ler como névoa.** A queda larga foi desenhada para
 * o mecanismo antigo, em que `f` era uma constante por caixa: ali ela escondia a
 * borda de um retângulo que escurecia por igual. Com o `f` resolvido da
 * luminância da própria cena, quem escurece são os corpos que passam — o fundo
 * escuro não muda —, então a borda não precisa ser escondida, precisa ser
 * suave.
 *
 * E a diferença é grande na composição: 0.16 de UV são 230 px de folga na
 * horizontal, o que fazia o envelope da coluna de manifesto chegar a 82% da
 * largura e apagar o poleiro, que é o assunto do beat. Com 0.07 são 100 px, e o
 * envelope termina em 73% — antes da coluna do bando.
 *
 * O número é lido pelo shader do composite e pela conferência de pegada da
 * sonda, para os dois falarem da mesma queda.
 */
export const VEIL_FALLOFF = 0.1;

export type VeilBox = {
  /** Caixa em UV de tela: x0, y0, x1, y1, origem embaixo à esquerda. */
  readonly rect: [number, number, number, number];
};

/**
 * Lê as caixas dos elementos marcados com `data-veil`, em UV de tela.
 *
 * **As caixas vêm do DOM medido**, via `getBoundingClientRect` — não de
 * constantes de layout. É a lição do PROJECT.md §7 aplicada na entrada: a caixa
 * que importa é a que foi entregue, não a que o CSS diz ter. Confirmado no
 * pixel por `__probe.veilFootprint()`, que renderiza o mesmo quadro com e sem
 * véu e mede a pegada da diferença.
 *
 * Chamado **por quadro** pelo laço mestre. O custo é um `getBoundingClientRect`
 * por caixa, medido em 0.68 ms no pior caso para cinco caixas — e é sobretudo
 * trabalho antecipado, não somado: o `BeatReveal` escreve uma custom property
 * por quadro, então o navegador ia recalcular estilo e layout antes de pintar de
 * qualquer jeito. A versão que relia a cada quatro quadros deixava até 67 ms de
 * texto sem véu quando uma coluna entrava na tela, e a varredura acusou.
 */
const UNLIT = '[data-lit="false"] :is([data-readout], .fog-in, :has(.glyph))';

export function readVeilBoxes(): VeilBox[] {
  const nodes = document.querySelectorAll<HTMLElement>("[data-veil]");
  const width = window.innerWidth;
  const height = window.innerHeight;

  /**
   * A caixa entra na lista **antes** de aparecer, com uma margem de 15% da
   * altura da janela.
   *
   * Sem essa margem, uma coluna de texto que sobe pela borda de baixo só ganha
   * véu no quadro em que ela já está na tela — e como a lista é relida a cada
   * quatro quadros, isso são até 67 ms de texto sem véu. Medido na varredura:
   * **0.97:1** nos primeiros quadros do beat, contra 4.5 no resto dele. A 0.6
   * vh/s, 15% da altura são 250 ms de rolagem, ou seja quinze quadros de folga
   * sobre a janela de releitura.
   *
   * O que entra em cena é uma caixa fora do quadro, e ela não pinta nada por si
   * — a densidade dela é resolvida da luminância que existe ali, e fora do
   * quadro só há o que a borda mostra.
   */
  const margin = height * 0.15;

  // Com a HUD desligada o conteúdo da página está invisível (`globals.css`),
  // e véu atrás de nada escurece o cenário: só a caixa do botão que a religa
  // continua valendo.
  const bare = document.documentElement.getAttribute("data-hud-view") === "off";

  const candidates: { box: VeilBox; area: number }[] = [];
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (bare && node.closest("[data-hud]") === null) continue;
    if (rect.bottom < -margin || rect.top > height + margin) continue;
    // Texto ainda apagado não tem véu: a caixa só existe quando ele acende,
    // senão a cena escurece atrás de nada. Vale só para o que `data-lit` de
    // fato apaga; o corpo de um case fica à vista e mantém a caixa.
    if (node.matches(UNLIT)) continue;

    // Uma folga de meia altura de linha: o DIRECTION.md exige que nem o texto
    // nem o que encosta na caixa dele estourem o teto.
    const pad = 10;
    const visible =
      Math.max(0, Math.min(rect.bottom, height) - Math.max(rect.top, 0)) *
      Math.max(0, Math.min(rect.right, width) - Math.max(rect.left, 0));

    /**
     * A caixa é aparada pela janela, mais a mesma margem de antecipação.
     *
     * Na descida isto não muda nada: todo bloco marcado é um painel `sticky` de
     * uma altura de viewport, e aparar uma caixa que já cabe é um no-op — a
     * varredura de contraste dos quatro beats devolve os mesmos números.
     *
     * O que ele destrava é o texto **longo**. Uma coluna de leitura de cinco
     * viewports não tem uma caixa: convertida inteira para UV de tela, ela cobre
     * o quadro, e o resultado é o scrim de sangria total que o DIRECTION.md §5
     * veta pelo nome. Aparada, ela vira o que sempre deveria ter sido — a
     * **fatia visível** da coluna, com a largura da coluna e a altura da janela.
     *
     * A alternativa era marcar bloco a bloco, e ela foi implementada e medida
     * antes desta: no mobile, nove blocos disputavam os oito slots de
     * `MAX_VEIL_BOXES`, os pequenos perdiam, e o pior contraste caía para
     * **2.87:1** numa linha de metadados. O problema não era o teto de slots —
     * era estar gastando oito caixas para descrever uma coluna só.
     */
    const top = Math.max(rect.top, -margin);
    const bottom = Math.min(rect.bottom, height + margin);

    candidates.push({
      area: visible,
      box: {
        rect: [
          (rect.left - pad) / width,
          1 - (bottom + pad) / height,
          (rect.right + pad) / width,
          1 - (top - pad) / height,
        ],
      },
    });
  }

  return candidates
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_VEIL_BOXES)
    .map((candidate) => candidate.box);
}

/**
 * Escreve as caixas nos uniforms do compositor.
 *
 * A força é 1 ou 0 — a caixa existe ou não existe. Quanto de véu cada pixel
 * recebe é decidido no shader, pela luminância dele; aqui não há nada a
 * resolver, e é essa a diferença entre a versão medida e a anterior.
 */
export function writeVeilBoxes(
  boxes: readonly VeilBox[],
  boxUniform: Vector4[],
  strengthUniform: number[],
): void {
  for (let i = 0; i < MAX_VEIL_BOXES; i += 1) {
    const box = boxes[i];
    const target = boxUniform[i];
    if (box === undefined || target === undefined) {
      strengthUniform[i] = 0;
      continue;
    }
    target.set(box.rect[0], box.rect[1], box.rect[2], box.rect[3]);
    strengthUniform[i] = 1;
  }
}
