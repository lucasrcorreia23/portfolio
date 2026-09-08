"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/capabilities/use-reduced-motion";
import { clamp01, easeStrong } from "@/lib/motion";
import { getScrollProgress, subscribeToScroll } from "@/lib/scroll/scroll-store";

type BeatRevealProps = {
  /** Progresso normalizado onde a revelação começa. */
  from: number;
  /** Progresso normalizado onde ela termina. */
  to: number;
  className?: string;
  children: ReactNode;
};

/**
 * Publica `--reveal` (0 a 1, já com `easeStrong`) no próprio elemento, a cada
 * quadro, e não renderiza nada além dos filhos.
 *
 * **Por que uma custom property e não estado.** O progresso muda a cada quadro
 * e nenhum consumidor aqui precisa de um `render` por quadro — é a mesma razão
 * pela qual o contador do portão escreve `textContent` em vez de `setState`. A
 * revelação vira CSS: quem desenha lê `var(--reveal)`, e o React sai do
 * caminho depois da montagem.
 *
 * **Por que não é `fade-up` de 20 px.** O PROJECT.md §3.3 veta isso pelo nome e
 * pede entrada própria por seção. `--reveal` é só a variável; a entrada
 * específica de cada beat mora no CSS que a consome (`styles/globals.css`) —
 * o nome da Emergência aperta o tracking como uma leitura assentando, e as
 * linhas da Identidade são varridas de cima para baixo como cota sendo
 * gravada, escalonadas. Nenhuma das duas translada.
 *
 * Com `prefers-reduced-motion` a variável é escrita uma vez em 1 e não há
 * assinatura de scroll nenhuma: o texto está lá, inteiro, desde o começo. É a
 * mesma paridade que o portão entrega — o modo calmo mostra o mesmo conteúdo,
 * sem o movimento.
 */
export function BeatReveal({
  from,
  to,
  className = "",
  children,
}: BeatRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;

    // `null` é "ainda não dá para saber". Não escrever nada é o certo: assumir
    // que pode mover e corrigir depois produz o lampejo que a preferência
    // existe para evitar.
    if (reducedMotion === null) return;

    if (reducedMotion) {
      node.style.setProperty("--reveal", "1");
      return;
    }

    const span = to - from;
    let last = -1;

    const write = (progress: number) => {
      const local = span <= 0 ? 1 : clamp01((progress - from) / span);
      const eased = easeStrong(local);
      // Três casas bastam para o olho e evitam reescrever o estilo por ruído
      // de ponto flutuante — o navegador reavalia o CSS a cada escrita.
      const rounded = Math.round(eased * 1000) / 1000;
      if (rounded === last) return;
      last = rounded;
      node.style.setProperty("--reveal", rounded.toFixed(3));
    };

    // Do progresso atual, não de zero: um reload no meio da descida restaura a
    // posição, e começar em zero pediria um quadro para se corrigir.
    write(getScrollProgress());
    return subscribeToScroll((snapshot) => {
      write(snapshot.progress);
    });
  }, [from, to, reducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
