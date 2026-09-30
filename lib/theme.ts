/**
 * A hora do dia — `night` (a câmara escura, o padrão) ou `dawn` (o amanhecer,
 * rodada 18).
 *
 * O contrato é o atributo `data-theme` no `<html>`: os tokens de
 * `styles/tokens.css` trocam por ele, e a cena relê a paleta quando ele muda.
 * Quem o escreve na primeira pintura é `THEME_SCRIPT`, antes da hidratação
 * (senão a página nasceria escura e piscaria); depois, só `setTheme`.
 *
 * Sem imports: este módulo é lido pela rota inicial (o controle da HUD) e pela
 * cena, e não pode puxar nada de nenhuma das duas.
 */

export type Theme = "night" | "dawn";

const KEY = "theme";

/**
 * O script da primeira pintura: a escolha guardada, ou a preferência do
 * sistema (`prefers-color-scheme: light` → amanhecer). Escrito à mão, curto,
 * e dentro de `try`: um `localStorage` bloqueado não pode derrubar a página.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t!=="dawn"&&t!=="night"){t=matchMedia("(prefers-color-scheme: light)").matches?"dawn":"night"}if(t==="dawn")document.documentElement.setAttribute("data-theme","dawn")}catch(e){}`;

type Listener = (theme: Theme) => void;
const listeners = new Set<Listener>();

export function getTheme(): Theme {
  if (typeof document === "undefined") return "night";
  return document.documentElement.getAttribute("data-theme") === "dawn" ? "dawn" : "night";
}

export function setTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dawn") root.setAttribute("data-theme", "dawn");
  else root.removeAttribute("data-theme");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Sem armazenamento a escolha vale só para esta visita.
  }
  for (const listener of listeners) listener(theme);
}

export function subscribeToTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
