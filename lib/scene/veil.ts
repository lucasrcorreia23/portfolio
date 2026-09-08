import { Vector3, type Camera, type Vector4 } from "three";
import type { ProxyCluster } from "./proxy-sim";

/**
 * O véu de legibilidade — DIRECTION.md §5, "Legibilidade sobre luz variável".
 *
 * Se o bando é a única luz prática até 0.85, a luminância atrás de todo texto
 * em DOM muda a cada quadro. Contraste médio não vale nada aqui; o que vale é o
 * pior quadro. E o pior quadro é conhecido: `--mist` tem L ≈ 0.796, e para
 * 4.5:1 nenhum pixel sob a caixa de um texto de leitura pode passar de
 * **L = 0.138**. Um aglomerado em `--cyan` emissivo no auge vale L ≈ 0.619 —
 * ou seja **1.26:1**, e a coluna some por dois segundos.
 *
 * O mecanismo não é um scrim preto: é um termo aditivo de densidade no shader
 * de névoa, ancorado à caixa do texto projetada na cena. Como a cor da névoa é
 * uma constante conhecida, dá para **resolver `f` para o alvo**, por quadro, em
 * vez de escolher um valor bonito e torcer:
 *
 *     L_saída = (1 − f)·L_cena + f·L_névoa   →   f = (L_cena − alvo) / (L_cena − L_névoa)
 *
 * Duas escolhas que parecem detalhe e não são:
 *
 * - **Quem estima `L_cena` é o proxy da CPU**, não uma leitura do quadro
 *   renderizado. O proxy roda adiantado, então o véu sobe *antes* de o cacho
 *   chegar; ler o quadro atrasaria um quadro, e um quadro ilegível já é falha.
 * - **As caixas vêm do DOM medido**, via `getBoundingClientRect` dos elementos
 *   marcados com `data-veil` — não de constantes de layout. É a lição do
 *   PROJECT.md §7 aplicada na entrada: a caixa que importa é a que foi
 *   entregue, não a que o CSS diz ter.
 */

/** L de `--mist` (#DCE9EC) em luz relativa. */
const MIST_LUMINANCE = 0.796;
/** L da névoa no escuro da câmara. */
const FOG_LUMINANCE = 0.003;
/** O teto duro do DIRECTION.md §5, resolvido para 4.5:1 contra `--mist`. */
const TARGET_LUMINANCE =
  (MIST_LUMINANCE + 0.05) / 4.5 - 0.05;
/** L de um aglomerado em `--cyan` emissivo no auge. */
const PEAK_CLUSTER_LUMINANCE = 0.619;

/** O DIRECTION.md §5 clampa `f` nesta faixa. */
const F_MIN = 0.15;
const F_MAX = 0.85;

export const MAX_VEIL_BOXES = 2;

export type VeilBox = {
  /** Caixa em UV de tela: x0, y0, x1, y1, origem embaixo à esquerda. */
  readonly rect: [number, number, number, number];
};

/**
 * Lê as caixas dos elementos marcados com `data-veil`, em UV de tela.
 *
 * Chamado no redimensionamento e na troca de beat, **nunca por quadro**: um
 * `getBoundingClientRect` força layout, e sessenta deles por segundo custariam
 * mais que a cena inteira.
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

const projected = new Vector3();

/**
 * Resolve `f` para cada caixa e escreve nos uniforms.
 *
 * `boxUniform` recebe a caixa em UV; `fUniform` recebe a densidade resolvida.
 * Uma caixa ausente vira `f = 0`, que o shader trata como "não há véu aqui".
 */
export function solveVeil(
  boxes: readonly VeilBox[],
  clusters: readonly ProxyCluster[],
  camera: Camera,
  boxUniform: Vector4[],
  fUniform: number[],
): void {
  for (let i = 0; i < MAX_VEIL_BOXES; i += 1) {
    const box = boxes[i];
    const target = boxUniform[i];
    if (box === undefined || target === undefined) {
      fUniform[i] = 0;
      continue;
    }

    target.set(box.rect[0], box.rect[1], box.rect[2], box.rect[3]);

    let worst = 0;
    for (const cluster of clusters) {
      projected.copy(cluster.position).project(camera);
      // Atrás da câmera não ilumina o que está na frente dela.
      if (projected.z > 1) continue;

      const x = projected.x * 0.5 + 0.5;
      const y = projected.y * 0.5 + 0.5;

      // Distância até a caixa, em UV. Zero dentro dela.
      const dx = Math.max(box.rect[0] - x, x - box.rect[2], 0);
      const dy = Math.max(box.rect[1] - y, y - box.rect[3], 0);
      const distance = Math.hypot(dx, dy);

      // Alcance largo: a névoa espalha a luz de um cacho que está longe, e é
      // por isso que uma "região de exclusão" não resolveria — ausência local
      // de corpos não controla a luminância.
      const reach = 1 - Math.min(distance / 0.34, 1);
      worst = Math.max(worst, cluster.energy * reach * reach);
    }

    const sceneLuminance = FOG_LUMINANCE + PEAK_CLUSTER_LUMINANCE * worst;
    if (sceneLuminance <= TARGET_LUMINANCE) {
      // Já passa sem véu. Ainda assim fica no piso: o DIRECTION.md quer o véu
      // baixo quase o tempo todo, e não ausente — quem aparece do nada é uma
      // caixa acendendo; quem já está lá é um banco de névoa.
      fUniform[i] = F_MIN;
      continue;
    }

    const solved =
      (sceneLuminance - TARGET_LUMINANCE) / (sceneLuminance - FOG_LUMINANCE);
    // Na dúvida, para cima: véu a mais é feio, véu a menos é inacessível.
    fUniform[i] = Math.min(F_MAX, Math.max(F_MIN, solved));
  }
}
