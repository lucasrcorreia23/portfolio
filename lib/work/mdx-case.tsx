import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import type { MDXComponents } from "mdx/types";
import type { CaseFrontmatter } from "@/lib/cases";
import type { MediaSize } from "@/lib/media-size";
import type { Locale } from "@/lib/i18n/config";

/**
 * O corpo de um case, com a mídia dele intercalada no texto.
 *
 * ## Por que este mapa é por case, e não global
 *
 * `mdx-components.tsx` é o mapa de todo MDX do projeto e não pode saber de qual
 * case veio a imagem nem em que idioma a página está. Aqui dá: o componente
 * compilado do MDX aceita a prop `components`, então a página monta um mapa que
 * já tem o `frontmatter` e o idioma na mão — sem contexto, sem componente de
 * cliente, sem estado.
 *
 * ## O texto alternativo sai do `media[]`, não do Markdown
 *
 * O `![alt](src)` dos quatro cases migrados carrega o alt em português, porque
 * foi assim que o corpo foi escrito. Mas o `frontmatter.media[]` já tem
 * `alt_pt` **e** `alt_en` — descrições escritas para a migração, não tradução de
 * conteúdo do Lucas (o site antigo não tinha alt text nenhum). Buscar ali pelo
 * `src` é o que faz a rota em inglês parar de descrever imagens em português, e
 * de graça: os dois campos já existem e já são validados.
 *
 * O alt do Markdown fica como reserva, para uma imagem que esteja no corpo e não
 * no `media[]`.
 */

type CaseComponentDeps = {
  frontmatter: CaseFrontmatter;
  locale: Locale;
  sizes: Readonly<Record<string, MediaSize>>;
  /** `work.case.generated`, para marcar a imagem que ainda não é a definitiva. */
  generatedLabel: string;
};

/**
 * Imagens não são otimizadas quando são animação.
 *
 * O otimizador do Next reamostra para um formato estático, e os cases migrados
 * têm GIF animado de verdade (`decisiongif01.gif`, `gif1.gif`). Passar reto é o
 * comportamento certo, e declará-lo é melhor do que torcer para a heurística
 * dele acertar.
 */
const isAnimated = (src: string) => src.toLowerCase().endsWith(".gif");

/**
 * Uma imagem num parágrafo não pode continuar dentro do parágrafo.
 *
 * O MDX embrulha nós de nível de texto em `<p>`, e uma `<figure>` dentro de um
 * `<p>` é HTML inválido: o navegador fecha o parágrafo sozinho ao encontrar a
 * figura, e a árvore que ele monta deixa de ser a que o React renderizou —
 * divergência de hidratação, no meio do corpo do case.
 *
 * **A comparação é com o componente, não com a string `"img"`.** Foi assim que
 * a primeira versão errou: o MDX compila `![alt](src)` para
 * `_jsx(_components.img, …)`, então o `type` do elemento é a **função deste
 * mapa**, não o nome da tag intrínseca. O teste passava por cima de toda imagem
 * e o Next abriu o erro de hidratação na cara. A string fica na comparação como
 * segunda via, para um MDX que traga um `<img>` literal.
 */
function countImages(children: ReactNode, Img: unknown): {
  images: number;
  others: number;
} {
  let images = 0;
  let others = 0;
  for (const child of Children.toArray(children)) {
    if (typeof child === "string") {
      if (child.trim() !== "") others += 1;
      continue;
    }
    if (isValidElement(child) && (child.type === Img || child.type === "img")) {
      images += 1;
      continue;
    }
    others += 1;
  }
  return { images, others };
}

export function caseComponents({
  frontmatter,
  locale,
  sizes,
  generatedLabel,
}: CaseComponentDeps): MDXComponents {
  const bySrc = new Map(frontmatter.media.map((item) => [item.src, item]));

  const Img: MDXComponents["img"] = (props) => {
    const src = typeof props.src === "string" ? props.src : "";
    const entry = bySrc.get(src);
    const alt =
      entry === undefined
        ? (props.alt ?? "")
        : locale === "pt"
          ? entry.alt_pt
          : entry.alt_en;
    const size = sizes[src];

    return (
      <figure className="case-figure">
        {size === undefined ? (
          // Formato que o leitor de cabeçalho não reconheceu. Sem dimensão não
          // há `next/image` — e sem `aspect-ratio` também não há reserva de
          // espaço, então esta é a única imagem da página que pode empurrar o
          // texto. Ver `lib/media-size.ts`.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} loading="lazy" decoding="async" />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={size.width}
            height={size.height}
            sizes="(max-width: 48rem) 100vw, min(100vw - 18rem, 68rem)"
            unoptimized={isAnimated(src)}
          />
        )}
        {entry?.generated === true ? (
          <figcaption className="type-mono text-hud-sm">
            {generatedLabel}
          </figcaption>
        ) : null}
      </figure>
    );
  };

  return {
    img: Img,

    /**
     * **Nenhum bloco aqui carrega `data-veil`**, e isso é uma decisão medida.
     *
     * A primeira versão marcou cada parágrafo, cada título e cada lista. No
     * desktop passou (5.26 a 5.48 de contraste); no mobile **reprovou em
     * 2.87:1**, e a causa não era o véu: eram nove blocos disputando os oito
     * slots de `MAX_VEIL_BOXES`, com os menores — a placa de metadados, um
     * subtítulo — perdendo a disputa e ficando descobertos.
     *
     * O erro era de granularidade. O DIRECTION.md §5 diz "véu ancorado à
     * **coluna de texto**", e uma página de leitura tem uma coluna, não trinta
     * caixas. Quem carrega o `data-veil` do corpo é a âncora da coluna, em
     * `.case-veil` (ver a página do case): uma caixa só, da largura da medida,
     * aparada pela janela em `readVeilBoxes`.
     */
    p: (props) => {
      const { images, others } = countImages(props.children, Img);
      // Só imagens: o parágrafo desaparece e as figuras ficam no fluxo do
      // artigo, que é onde elas pertencem.
      if (images > 0 && others === 0) return <>{props.children}</>;
      // Mistura de texto e imagem: o `<p>` vira `<div>`. Nunca acontece com o
      // corpo como ele está escrito hoje — cada imagem tem o próprio bloco —,
      // mas um `<p>` com uma figura dentro é HTML inválido, e uma edição futura
      // do MDX não deveria poder produzir isso sem querer.
      if (images > 0) {
        return <div className="measure mb-6 text-body">{props.children}</div>;
      }
      return <p {...props} className="measure mb-6 text-body" />;
    },
  };
}
