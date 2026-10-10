"use client";

import { useEffect, useRef } from "react";
import { beatAt } from "@/components/beats/beats";
import { VEIL_CEILING } from "@/lib/scene/veil";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";

/**
 * O modo sem WebGL — PROJECT.md §5: "Sem WebGL, entra um poster estático por
 * seção e o conteúdo continua inteiro."
 *
 * **Os posters são as composições do modo calmo**, lidas do buffer do WebGL
 * pelo mesmo relógio que as desenha (`ComposedClock`, gancho `__calm` de
 * desenvolvimento) e gravadas em `public/posters/<beat>.webp`. O DIRECTION.md
 * §5 pede exatamente isto — "renderizado destas mesmas composições" —, e é o
 * que garante que quem não tem WebGL vê o mesmo site parado, e não uma
 * ilustração de outro site. Mexer na cena e não regerar os cinco deixa este
 * modo mentindo.
 *
 * Troca por beat, pelo mesmo progresso que dirige tudo o mais, e é **corte**:
 * o poster não tem movimento para suavizar.
 *
 * ## O véu, sem compositor
 *
 * O véu de legibilidade mora no compositor da cena (`shaders/post.ts`), e sem
 * WebGL não há compositor: o texto em DOM ficaria direto sobre as frestas acesas
 * da Superfície — medido, **0.88:1** debaixo da frase de despedida. Um filtro
 * no poster inteiro teria que baixá-lo a um sexto para passar, ou seja apagá-lo.
 *
 * Então o poster é desenhado num canvas 2D e o véu é o mesmo mecanismo, em 2D:
 * debaixo de cada caixa `[data-veil]` ele lê a luminância **máxima** do próprio
 * poster e mistura para `--void` só o quanto falta para ela ficar abaixo do
 * mesmo teto (`VEIL_CEILING`) — com a borda macia, e nada onde a imagem já é
 * escura. Continua dentro do canvas: o DOM não ganha fundo, scrim nem sombra.
 */
export function ScenePoster() {
  const { value } = useScrollProgress({ steps: 200 });
  const beat = beatAt(value).id;
  // Rodada 18: há um conjunto de posters por hora do dia.
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null) return;

    const voidColor =
      getComputedStyle(document.documentElement).getPropertyValue("--void").trim() ||
      "#000";
    const image = new Image();
    image.decoding = "async";
    image.src = `/posters/${beat}.webp`;

    // A luminância do poster num mapa de 1/8 — lido uma vez por imagem, e não
    // a cada quadro. Cada célula guarda o **máximo** do bloco, pelo mesmo motivo
    // que a redução do compositor guarda: o critério é o pior pixel.
    const SCALE = 8;
    let luminance: Float32Array | null = null;
    let mapWidth = 0;
    let mapHeight = 0;
    const toLinear = (v: number) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };

    const readLuminance = () => {
      const probe = document.createElement("canvas");
      probe.width = image.naturalWidth;
      probe.height = image.naturalHeight;
      const g = probe.getContext("2d");
      if (g === null) return;
      g.drawImage(image, 0, 0);
      const data = g.getImageData(0, 0, probe.width, probe.height).data;
      mapWidth = Math.ceil(probe.width / SCALE);
      mapHeight = Math.ceil(probe.height / SCALE);
      luminance = new Float32Array(mapWidth * mapHeight);
      for (let y = 0; y < probe.height; y += 1) {
        for (let x = 0; x < probe.width; x += 1) {
          const i = (y * probe.width + x) * 4;
          const l =
            0.2126 * toLinear(data[i] ?? 0) +
            0.7152 * toLinear(data[i + 1] ?? 0) +
            0.0722 * toLinear(data[i + 2] ?? 0);
          const cell = Math.floor(y / SCALE) * mapWidth + Math.floor(x / SCALE);
          if (l > (luminance[cell] ?? 0)) luminance[cell] = l;
        }
      }
    };

    let frame = 0;
    const draw = () => {
      frame = 0;
      if (!image.complete || image.naturalWidth === 0) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
      if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      // `object-fit: cover`, à mão: o mesmo mapeamento serve para desenhar e
      // para achar, no mapa de luminância, o pedaço que fica atrás de cada caixa.
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawnWidth = image.naturalWidth * scale;
      const drawnHeight = image.naturalHeight * scale;
      const offsetX = (width - drawnWidth) / 2;
      const offsetY = (height - drawnHeight) / 2;
      context.filter = "none";
      context.drawImage(image, offsetX, offsetY, drawnWidth, drawnHeight);

      if (luminance === null) return;
      const map = luminance;
      const pad = 10;
      const soft = 24;
      for (const node of document.querySelectorAll<HTMLElement>("[data-veil]")) {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.bottom < 0 || rect.top > height) continue;
        const x0 = Math.floor((rect.left - pad - offsetX) / scale / SCALE);
        const x1 = Math.ceil((rect.right + pad - offsetX) / scale / SCALE);
        const y0 = Math.floor((rect.top - pad - offsetY) / scale / SCALE);
        const y1 = Math.ceil((rect.bottom + pad - offsetY) / scale / SCALE);
        let peak = 0;
        for (let y = Math.max(0, y0); y < Math.min(mapHeight, y1); y += 1) {
          for (let x = Math.max(0, x0); x < Math.min(mapWidth, x1); x += 1) {
            const l = map[y * mapWidth + x] ?? 0;
            if (l > peak) peak = l;
          }
        }
        if (peak <= VEIL_CEILING) continue;
        // L' = L·(1 − a) + L_void·a ≤ teto, com L_void ≈ 0.
        const alpha = Math.min(1, (peak - VEIL_CEILING) / peak);
        context.globalAlpha = alpha;
        context.fillStyle = voidColor;
        context.filter = `blur(${soft}px)`;
        const grow = pad + soft * 2;
        context.fillRect(
          rect.left - grow,
          rect.top - grow,
          rect.width + grow * 2,
          rect.height + grow * 2,
        );
        context.globalAlpha = 1;
        context.filter = "none";
      }
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(draw);
    };

    image.onload = () => {
      readLuminance();
      draw();
    };
    // As caixas sticky andam enquanto entram no quadro: o véu as acompanha.
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      image.onload = null;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [beat]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
