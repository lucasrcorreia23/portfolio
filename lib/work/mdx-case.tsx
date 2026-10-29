import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import type { MDXComponents } from "mdx/types";
import type { CaseFrontmatter } from "@/lib/cases";
import type { MediaSize } from "@/lib/media-size";

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
 * O `frontmatter.media[]` chega do loader já no idioma da rota, com o `alt`
 * resolvido. Buscar ali pelo `src` é o que garante a mesma descrição nos dois
 * idiomas, validada no build. O alt do Markdown fica como reserva, para uma
 * imagem que esteja no corpo e não no `media[]`.
 */

type CaseComponentDeps = {
  frontmatter: CaseFrontmatter;
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

const isVideo = (src: string) => src.toLowerCase().endsWith(".mp4");

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
  sizes,
  generatedLabel,
}: CaseComponentDeps): MDXComponents {
  const bySrc = new Map(frontmatter.media.map((item) => [item.src, item]));

  const Img: MDXComponents["img"] = (props) => {
    const src = typeof props.src === "string" ? props.src : "";
    const entry = bySrc.get(src);
    const alt = entry === undefined ? (props.alt ?? "") : entry.alt;
    const size = sizes[src];

    // Vídeo é um loop curto e mudo, no lugar de um GIF: toca sozinho, sem
    // controles, e o poster reserva o espaço com as dimensões dele.
    if (isVideo(src)) {
      return (
        <figure className="case-figure">
          <video
            src={src}
            poster={entry?.poster}
            width={size?.width}
            height={size?.height}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-label={alt}
          />
        </figure>
      );
    }

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
        return <div className="case-text">{props.children}</div>;
      }
      return <p {...props} className="case-text" />;
    },

    // As listas entram aqui para não herdar as margens do mapa global
    // (`mdx-components.tsx`), que são utilities e venceriam o `.case-list`.
    ul: (props) => <ul {...props} className="case-list" />,
    ol: (props) => <ol {...props} className="case-list" />,
    li: (props) => <li {...props} />,

    /**
     * **Os títulos descem um nível.** A página já tem o `h1` (o título do case,
     * em `page.tsx`); o `#` do MDX é a manchete do texto, não o nome da peça.
     * Os papéis, do maior para o menor:
     *
     * - `#` manchete, e os números grandes de "Em números" — corpo display-3 na
 *   família de leitura (a display Expanded é do nome da peça, não de frase);
     * - `##` afirmação longa, no corpo grande com peso;
     * - `###` subtítulo de item e parágrafo de destaque, no corpo grande;
     * - `####` rótulo de seção, em mono caixa alta — o léxico da HUD, que é o
     *   do site inteiro para "onde você está".
     *
     * Nenhum carrega `data-veil`, pelo mesmo motivo do `p` acima: quem protege a
     * coluna é a âncora `.case-veil`.
     *
     * **Uma classe por papel, sem utility de tipo.** `text-display-3` e as
     * irmãs moram na camada `utilities`, que vence a `components`: com elas no
     * elemento, a entrelinha e o peso declarados em `.case-*` não valiam. O
     * tamanho sai dos mesmos tokens, lidos no CSS do case.
     */
    h1: (props) => <h2 {...props} className="case-headline" />,
    h2: (props) => <h3 {...props} className="case-statement" />,
    h3: (props) => <h4 {...props} className="case-subhead" />,
    h4: (props) => <h5 {...props} className="case-label type-mono" />,
    hr: () => <hr className="case-rule" />,
    strong: (props) => <strong {...props} className="case-strong" />,
    a: (props) => <a {...props} className="case-link" />,
  };
}
