import type { MDXComponents } from "mdx/types";

/**
 * Exigido pelo `@next/mdx` no App Router: sem este arquivo na raiz, o MDX
 * não compila.
 *
 * O mapeamento aqui é só de papel tipográfico — texto de leitura na grotesca
 * regular, na medida de 60 a 70 caracteres, nunca na mono (PROJECT.md §3.2).
 * Componentes de verdade (mídia, placas de cota, blocos de citação) entram
 * quando os cases entrarem.
 */
const components = {
  h2: (props) => (
    <h2 {...props} className="type-display text-display-3 mt-24 mb-6" />
  ),
  h3: (props) => (
    <h3 {...props} className="type-mono text-label mt-16 mb-3" />
  ),
  p: (props) => <p {...props} className="measure mb-6 text-body" />,
  ul: (props) => (
    <ul {...props} className="measure mb-6 list-disc pl-5 text-body" />
  ),
  li: (props) => <li {...props} className="mb-2" />,
  a: (props) => (
    <a
      {...props}
      className="underline decoration-teal underline-offset-4 transition-colors hover:decoration-cyan"
    />
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
