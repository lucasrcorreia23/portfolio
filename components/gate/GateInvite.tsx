"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ENTER_GLYPH } from "./readout";

/**
 * O convite do portão — DIRECTION.md §4: "o convite ocupa exatamente a casa que
 * o número ocupava".
 *
 * ## A casa não desaba
 *
 * A versão anterior trocava o número pela seta dentro de uma casa sem largura
 * própria, e a casa desabava de ~680 px para ~107 px: sobrava um glifo de seta
 * num canto. Agora o número continua ocupando o layout (invisível) e o convite
 * é desenhado **por cima dele**, com altura de caixa alta, linha de base e
 * margem esquerda idênticas às da leitura. O botão cobre a casa inteira, então
 * o alvo de clique é o tamanho do número, não o de um caractere.
 *
 * ## Duas variantes, e a escolha não é minha
 *
 * - `glyph` — o caractere `↓` da mono, reescalado para a altura dos algarismos
 *   e assentado na linha de base deles (o glifo da fonte tem outra altura e
 *   desce abaixo da linha).
 * - `mark` — uma marca desenhada no traço das gravações da câmara: haste de um
 *   fio, marca de intervalo no topo, ponta aberta como a da seta de escala.
 *
 * O padrão é `glyph`, que é o que o DIRECTION.md descreve. `?invite=mark` só
 * existe em desenvolvimento, para a comparação lado a lado; a variante que
 * perder sai do código quando a escolha for feita.
 */

export type InviteVariant = "glyph" | "mark";

/** Lida uma vez, no cliente, e só fora de produção. */
export function readInviteVariant(): InviteVariant {
  if (process.env.NODE_ENV === "production") return "glyph";
  if (typeof window === "undefined") return "glyph";
  return new URLSearchParams(window.location.search).get("invite") === "mark"
    ? "mark"
    : "glyph";
}

type Metrics = {
  /** Altura dos algarismos acima da linha de base, em px. */
  digit: number;
  /** Escala do glifo `↓` para ele medir `digit` de altura. */
  glyphScale: number;
  /** Quanto o glifo reescalado desce abaixo da linha de base, em px. */
  glyphDrop: number;
};

/**
 * Mede na fonte real, no mesmo corpo em que a leitura é desenhada.
 *
 * Canvas e não `cap` de CSS: o que importa é a altura **dos algarismos** da
 * leitura (é ela que o olho compara), e o glifo da seta tem caixa própria — a
 * única forma de casar os dois é medir os dois.
 */
function measure(host: HTMLElement): Metrics | null {
  const style = getComputedStyle(host);
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return null;
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const digits = context.measureText("14617");
  const arrow = context.measureText(ENTER_GLYPH);
  const digit = digits.actualBoundingBoxAscent;
  const arrowHeight =
    arrow.actualBoundingBoxAscent + arrow.actualBoundingBoxDescent;
  if (!(digit > 0) || !(arrowHeight > 0)) return null;
  const glyphScale = digit / arrowHeight;
  return {
    digit,
    glyphScale,
    glyphDrop: arrow.actualBoundingBoxDescent * glyphScale,
  };
}

export function GateInvite({ variant }: { variant: InviteVariant }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const update = () => setMetrics(measure(node));
    update();
    // A mono é `display: swap`: se ela chegar depois, a medida de fallback
    // estaria errada para sempre.
    void document.fonts.ready.then(update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  if (variant === "mark") {
    const h = metrics?.digit ?? 0;
    return (
      <span ref={ref} className="gate-invite" aria-hidden="true">
        {h > 0 ? <EngravedArrow height={h} /> : null}
      </span>
    );
  }

  return (
    <span ref={ref} className="gate-invite" aria-hidden="true">
      <span
        className="gate-invite-glyph"
        style={
          metrics === null
            ? { visibility: "hidden" }
            : {
                fontSize: `${metrics.glyphScale}em`,
                transform: `translateY(${(-metrics.glyphDrop).toFixed(2)}px)`,
              }
        }
      >
        {ENTER_GLYPH}
      </span>
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
