import { subscribeToFrame } from "@/lib/scroll/frame-bus";

/**
 * A leitura: o texto mono entra como leitura de instrumento, com caracteres
 * sorteados que fixam da esquerda para a direita. É a entrada da indústria —
 * sem luz. A mono tem largura fixa, então trocar caractere não mexe no layout.
 *
 * O atraso vem de `--wait`, a mesma variável que o CSS usa para segurar a
 * opacidade: enquanto ele corre o texto está invisível e nada é escrito.
 */

const GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/·";
const DURATION_MS = 620;
/** De quanto em quanto os caracteres ainda soltos são sorteados de novo. */
const ROLL_MS = 45;

const running = new WeakMap<HTMLElement, () => void>();

function scramble(original: string, resolved: number, offset: number): string {
  let out = "";
  for (let index = 0; index < original.length; index += 1) {
    const char = original.charAt(index);
    if (offset + index < resolved || char.trim() === "") {
      out += char;
      continue;
    }
    const glyph = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
    out += char === char.toLowerCase() ? glyph.toLowerCase() : glyph;
  }
  return out;
}

function play(node: HTMLElement): () => void {
  const texts: Text[] = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  while (walker.nextNode() !== null) texts.push(walker.currentNode as Text);
  const originals = texts.map((text) => text.data);
  const total = originals.reduce((sum, original) => sum + original.length, 0);

  const wait = Number.parseFloat(getComputedStyle(node).getPropertyValue("--wait"));
  let elapsed = Number.isFinite(wait) ? -wait : 0;
  let rolled = -ROLL_MS;

  const unsubscribe = subscribeToFrame((deltaMs) => {
    // Voltar de uma aba em segundo plano entrega um delta de segundos.
    elapsed += Math.min(deltaMs, 100);
    if (elapsed < 0) return;
    if (elapsed >= DURATION_MS) {
      stop();
      return;
    }
    if (elapsed - rolled < ROLL_MS) return;
    rolled = elapsed;

    const resolved = Math.floor((elapsed / DURATION_MS) * total);
    let offset = 0;
    texts.forEach((text, index) => {
      const original = originals[index] as string;
      text.data = scramble(original, resolved, offset);
      offset += original.length;
    });
  });

  const stop = () => {
    unsubscribe();
    running.delete(node);
    texts.forEach((text, index) => {
      text.data = originals[index] as string;
    });
  };
  return stop;
}

/**
 * Toca (ou interrompe, com `lit` falso) a leitura de todo `[data-readout]`
 * dentro de `root`. Interromper devolve o texto original.
 */
export function runReadouts(root: HTMLElement, lit: boolean): void {
  for (const node of root.querySelectorAll<HTMLElement>("[data-readout]")) {
    running.get(node)?.();
    if (lit) running.set(node, play(node));
  }
}
