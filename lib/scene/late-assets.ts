import { getEntry } from "@/lib/preload/entered";
import { whenScenePainted } from "./scene-painted";

/**
 * O que a cena carrega depois do loading: as texturas das placas e a porta.
 *
 * Nada disso está no primeiro quadro. As placas nascem com texturas de um
 * pixel (os programas compilam junto com o resto) e ficam dentro da névoa, a
 * mais de cem metros da câmera, enquanto os arquivos chegam.
 */

/**
 * Resolve quando a cena já pintou e o loading já fechou. `idle` também serve:
 * é a rota que não tem loading (um case aberto direto, uma captura).
 */
export function whenEntered(): Promise<void> {
  return whenScenePainted().then(
    () =>
      new Promise<void>((resolve) => {
        const check = () => {
          if (getEntry().phase !== "pending") resolve();
          else window.setTimeout(check, 120);
        };
        check();
      }),
  );
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
