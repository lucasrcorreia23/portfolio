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
 * Duas falhas, e nenhuma delas se conserta com outro número:
 *
 * 1. **A estimativa andava para o lado errado.** A energia de um aglomerado do
 *    proxy é massa × velocidade, e no poleiro a velocidade cai de propósito —
 *    então a estimativa desce exatamente enquanto o bando se junta e fica mais
 *    brilhante.
 * 2. **Um `f` por caixa é um teto médio para um problema de pixel.** O que
 *    falha é um corpo atrás de uma haste de letra, não a caixa inteira.
 *
 * O véu passou a ser resolvido **por pixel, depois do bloom**, dentro do
 * composite (`shaders/post.ts`, `applyVeil`) — mesma equação do documento,
 * resolvida onde o pixel é entregue. O que sobrou aqui é o que sempre foi certo:
 * **ler do DOM a caixa que o texto realmente ocupa** e publicá-la para o
 * shader.
 */

/** L de `--mist` (#DCE9EC) em luz relativa. */
const MIST_LUMINANCE = 0.796;

/** O piso de contraste do PROJECT.md §5. */
const CONTRAST_FLOOR = 4.5;

/**
 * O teto de luminância sob uma caixa de texto, na luminância **entregue** —
 * depois do tonemap, antes do grão.
 *
 * O alvo do DIRECTION.md §5 é `(0.796 + 0.05) / (L + 0.05) ≥ 4.5`, ou seja
 * `L ≤ 0.138`. O número aqui é menor, e a diferença é o grão: ele é somado
 * **depois** do véu (o PROJECT.md §3.1 quer o grão sobre o quadro composto), com
 * intensidade `0.045 ± 0.015` pesada por `0.12 + 0.88 · √L`. Em L = 0.13 isso
 * são até +0.011 de luminância, e um teto de 0.138 entregaria 0.149 no pixel —
 * 4.32:1, reprovado por causa da última linha do shader.
 *
 * Com 0.125, o pior pixel entregue fica em ~0.136 e a razão em ~4.53:1. A
 * verificação não é este comentário: é `__probe.contrast()`, que lê o pixel
 * final com grão e tudo.
 */
export const VEIL_CEILING =
  (MIST_LUMINANCE + 0.05) / CONTRAST_FLOOR - 0.05 - 0.013;

/**
 * Quantas caixas o véu cobre ao mesmo tempo.
 *
 * Três, e não duas, porque a HUD passou a contar: ela está na tela o tempo todo
 * e o DIRECTION.md §5 a chama de "a caixa mais exposta do site". Com a HUD
 * ocupando um slot fixo, sobram dois para o beat — e há momentos com dois beats
 * visíveis ao mesmo tempo, quando um painel `sticky` sai e o próximo entra.
 */
export const MAX_VEIL_BOXES = 3;

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
 * Chamado no redimensionamento e a cada quatro quadros, **nunca por quadro**:
 * um `getBoundingClientRect` força layout, e sessenta deles por segundo
 * custariam mais que a cena inteira.
 */
export function readVeilBoxes(): VeilBox[] {
  const nodes = document.querySelectorAll<HTMLElement>("[data-veil]");
  const boxes: VeilBox[] = [];
  const width = window.innerWidth;
  const height = window.innerHeight;

  for (const node of nodes) {
    if (boxes.length >= MAX_VEIL_BOXES) break;
    const rect = node.getBoundingClientRect();
    // Fora da tela não precisa de véu; a caixa que interessa é a visível.
    if (rect.bottom < 0 || rect.top > height || rect.width === 0) continue;

    // Uma folga de meia altura de linha: o DIRECTION.md exige que nem o texto
    // nem o que encosta na caixa dele estourem o teto.
    const pad = 10;
    boxes.push({
      rect: [
        (rect.left - pad) / width,
        1 - (rect.bottom + pad) / height,
        (rect.right + pad) / width,
        1 - (rect.top - pad) / height,
      ],
    });
  }

  return boxes;
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
