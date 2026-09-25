"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * O convite do portão — DIRECTION.md §4: "o convite ocupa exatamente a casa que
 * o número ocupava".
 *
 * ## A casa não desaba
 *
 * A versão anterior trocava o número pela seta dentro de uma casa sem largura
 * própria, e a casa desabava de ~680 px para ~107 px: sobrava um glifo de seta
 * num canto. Agora o número continua ocupando o layout (invisível) e o convite
 * é desenhado **por cima dele**, com a altura dos algarismos, a linha de base e
 * a margem esquerda da leitura. O botão cobre a casa inteira, então o alvo de
 * clique é o tamanho do número, não o de um traço.
 *
 * ## A marca gravada — decisão do Lucas, 2026-09-25
 *
 * Havia duas variantes lado a lado (`.screens/065-convite.png`): o glifo `↓` da
 * mono, reescalado, e esta marca, desenhada no traço das gravações da câmara —
 * haste de um fio, marca de intervalo no topo, ponta aberta como a da seta de
 * escala. Ficou a marca; o glifo saiu do código.
 */

/**
 * Mede na fonte real, no mesmo corpo em que a leitura é desenhada: a altura
 * **dos algarismos** acima da linha de base, que é o que o olho compara.
 */
function measureDigit(host: HTMLElement): number {
  const style = getComputedStyle(host);
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return 0;
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const digit = context.measureText("14617").actualBoundingBoxAscent;
  return digit > 0 ? digit : 0;
}

export function GateInvite() {
  const ref = useRef<HTMLSpanElement>(null);
  const [digit, setDigit] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const update = () => setDigit(measureDigit(node));
    update();
    // A mono é `display: swap`: se ela chegar depois, a medida de fallback
    // estaria errada para sempre.
    void document.fonts.ready.then(update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <span ref={ref} className="gate-invite" aria-hidden="true">
      {digit > 0 ? <EngravedArrow height={digit} /> : null}
    </span>
  );
}

/**
 * A marca, no traço das gravações: um fio de 1.5 px, a marca de intervalo no
 * topo (a mesma das réguas) e a ponta aberta da seta de escala. Assenta na
 * linha de base porque um SVG em linha é alinhado pela borda de baixo.
 */
function EngravedArrow({ height }: { height: number }) {
  const w = height * 0.46;
  const stroke = Math.max(1.5, height * 0.012);
  const mid = w / 2;
  const head = height * 0.2;
  return (
    <svg
      width={w}
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      className="gate-invite-mark"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="butt"
    >
      <line x1={0} y1={stroke / 2} x2={w} y2={stroke / 2} />
      <line x1={mid} y1={stroke / 2} x2={mid} y2={height - stroke / 2} />
      <polyline
        points={`${mid - head * 0.55},${height - head} ${mid},${height - stroke / 2} ${mid + head * 0.55},${height - head}`}
      />
    </svg>
  );
}
