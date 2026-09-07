<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portfólio — guia do repositório

Site pessoal de Lucas Rodrigues Correia. Produção: https://www.lucasrc.com.br

**O site novo substitui o antigo no mesmo domínio, sem redirects.** Os caminhos
do site anterior (`/nestle`, `/prime8-project`, `/zoomtech-project`,
`/decision-suite`, `/portfolio`, `/construcao`) simplesmente deixam de existir e
respondem 404. Não escreva rewrites, redirects nem rotas de compatibilidade —
não é economia de esforço, é decisão: uma camada de redirects para um site
descartado seria manutenção permanente a serviço de links que ninguém tem.

O site antigo fica **arquivado no próprio repositório**, na tag
`template-legado` — não no deploy. Recuperar qualquer coisa dele é
`git show template-legado:<caminho>`, não visitar uma URL. O deploy é
substituído inteiro.

**Leia `PROJECT.md` e `DIRECTION.md` antes de qualquer coisa.** O `PROJECT.md` é
a verdade do projeto; o `DIRECTION.md` é como essa verdade se parece; onde os
dois divergirem, o `PROJECT.md` ganha. Este arquivo é só o mapa do código.

> **Escreva a documentação aqui, não no `CLAUDE.md`.**
> O `CLAUDE.md` é um ponteiro de uma linha (`@AGENTS.md`), que o Claude Code
> resolve como import — manter conteúdo nos dois cria duas fontes de verdade que
> divergem.
>
> Só o bloco entre os marcadores acima é gerado. O `next dev` faz *upsert*: troca
> apenas o conteúdo entre `BEGIN`/`END` e **preserva todo o resto do arquivo**
> (ver `writeAgentFiles` em `node_modules/next/dist/server/lib/generate-agent-files.js`).
> Ele só sobrescreve `AGENTS.md` e `CLAUDE.md` com um scaffold se **nenhum** dos
> dois existir — cuidado com `git stash -u`/`git clean`, que os levam por serem
> untracked.

---

## Estado atual

**Fundação montada. Sem conteúdo e sem 3D.** O que existe é o esqueleto: rotas,
idiomas, tokens, escala tipográfica, o driver de scroll, os hooks de capacidade
e o pipeline de MDX. Nenhum beat tem conteúdo; a cena é uma camada vazia.

O template HTML comprado que ocupava este repositório foi **descartado, não
migrado** (PROJECT.md §5). Nada dele sobreviveu: nem SCSS, nem jQuery, nem
Bootstrap, nem `src/`, nem os plugins locais do GSAP, nem o portão de tema.
O estado anterior está na tag `template-legado`, que inclui as modificações não
commitadas da árvore de trabalho da época. **Se alguma instrução ou memória
falar de `src/`, `public/assets/scss`, `pagepiling`, `swiper`, `wowjs`,
`ScrollSmoother` vindo de arquivo local ou de um `tp-theme` no `<html>`, ela é
do projeto que deixou de existir — ignore.**

## Stack

```
Next.js 16 (App Router, Turbopack)   React 19.2   TypeScript 6 estrito
Tailwind v4 (tokens em CSS custom properties)
Lenis + GSAP/ScrollTrigger
next-intl (pt/en)
MDX via @next/mdx, cases em content/cases/*.mdx
Deploy Vercel
```

Ainda **não** instalados, e listados no PROJECT.md §5 para quando a cena entrar:
`three`, `@react-three/fiber` 9, `@react-three/drei` 10,
`@react-three/postprocessing` 3, `troika-three-text`.

Travas de versão, todas com motivo:

| Pacote | Trava | Por quê |
|---|---|---|
| `react` / `react-dom` | `~19.2.8` | o R3F 9 declara peer `react >=19 <19.3`. O `~` impede o salto para 19.3 num `npm update` inocente. |
| `typescript` | `^6` | `typescript-eslint@8` declara peer `<7`. TS 7 quebra o lint. |
| `eslint` | `^9` | o `eslint-plugin-react` embutido no `eslint-config-next@16` ainda chama `context.getFilename()`, removido no ESLint 10. |

**Next 16, não 15.** O PROJECT.md §5 fixa a 16 (é a estável e é o que o R3F 9
suporta). Se um prompt pedir 15, o PROJECT.md ganha — mas diga que está fazendo
isso.

## Comandos

```bash
npm run dev        # dev server (Turbopack)
npm run build      # build de produção
npm run start      # roda o build
npm run lint       # eslint (flat config)
npm run typecheck  # tsc --noEmit
```

Node 24 (`.nvmrc`); o mínimo do Next 16 é 20.9. Não há suíte de testes.

---

## Arquitetura

### Estrutura de pastas

```
app/[locale]/          rotas; o layout raiz é app/[locale]/layout.tsx
components/scene/      a cena 3D e o portão que escolhe qual versão roda
components/hud/        a HUD lateral fixa (substitui o rodapé; não há rodapé)
components/beats/      as cinco seções da descida
components/type/       DisplayLine — a linha de display que se auto-dimensiona
content/cases/         os cases, em .mdx
content/messages/      dicionários, um arquivo por beat, por idioma
lib/                   capabilities/, i18n/, scroll/ e módulos soltos
styles/                globals.css + tokens.css
```

Não existe `src/`. O alias é um só: `@/*` → raiz do repositório.

### Rotas e idiomas

`/` em inglês, `/pt` em português; cases em `/work/[slug]` e `/pt/work/[slug]`
(`localePrefix: "as-needed"`). Tudo mora sob `app/[locale]/`, e
`app/[locale]/layout.tsx` **é** o layout raiz — não há `app/layout.tsx`.

O `middleware.ts` do Next virou **`proxy.ts`** na 16; o `createMiddleware` do
next-intl continua com o nome antigo, e é ele que roda ali.

`params.locale` chega como `string`. `requireLocale()` (`lib/i18n/locale.ts`) é
o único ponto de estreitamento para o union `"en" | "pt"`, e responde 404 em vez
de cair para o idioma padrão.

O dicionário é **separado por beat**: `content/messages/<locale>/<beat>.json`,
montados pelo `index.ts` de cada idioma. O `index.ts` do inglês é o shape
canônico — `lib/i18n/augment.d.ts` deriva o tipo `Messages` dele, e o `index.ts`
do português é anotado com `typeof enMessages`, então uma chave faltando não
compila.

### Orçamento de JS — a regra que mais restringe o código

O PROJECT.md §5 mede JavaScript **por momento de carregamento, não por
biblioteca**. Duas caixas, cada uma com seu teto:

| Caixa | Teto | O que entra |
|---|---|---|
| **Rota inicial** | 200 kB gz | tudo no caminho crítico até o primeiro quadro útil. Nada é isento. |
| **Chunk da cena** | 350 kB gz | `three`, R3F, drei, postprocessing, troika, shaders — num import dinâmico que só começa a baixar **depois** do primeiro quadro útil. |

Não existe mais "sem contar a three": a three não é isenta, ela mora na segunda
caixa. Um pacote que apareça na primeira caixa por engano — um `import`
estático que escapou para o `SceneGate`, por exemplo — não é 350 kB de cena, é
350 kB de rota inicial estourada.

Estado medido nesta fundação, com a cena ainda vazia:

| Estado | Rota inicial gz |
|---|---|
| `useTranslations` em componentes de cliente | 236 kB |
| HUD virando Server Component, strings como props | 169 kB |
| Zero next-intl no cliente (sem `NextIntlClientProvider`) | **112 kB** |

Daí a regra: **nenhum componente de cliente importa o next-intl.** Traduza no
servidor e desça strings como props. O formatador ICU e o dicionário inteiro
custam 67 kB comprimidos por si só; a HUD está em toda página.

Sobram 88 kB de folga na primeira caixa. Eles são para o resto do site, não
para a cena — a cena tem caixa própria.

Consequências práticas:

- `Hud` é `async` e Server Component. `SceneReadout`, `ScrollRule` e
  `LanguageToggle` são de cliente e recebem rótulos por prop.
- Não existe `lib/i18n/navigation.ts`. Para montar um href localizado use
  `localizePath()` de `lib/i18n/config.ts` com o `next/link` normal —
  `config.ts` não importa o next-intl de propósito.
- O que se perde: o `Link` do next-intl gravava um cookie `NEXT_LOCALE`. Sem
  ele, uma visita futura a `/` volta a negociar por `Accept-Language`.
- Antes de adicionar qualquer dependência de cliente, meça: rode o build,
  some o gzip dos `<script>` da home e compare com a tabela acima.
- Quando a cena entrar, ela é carregada por `next/dynamic` com `ssr: false`,
  a partir do `SceneGate` e só depois do primeiro quadro útil. Meça as duas
  caixas separadamente: os `<script>` do HTML inicial contra 200 kB, e o
  chunk da cena contra 350 kB.

### A variável única

PROJECT.md §3.3: um progresso normalizado de 0 a 1 dirige a câmera, os uniforms
e as revelações de texto. Isso é literal no código.

- `lib/scroll/scroll-store.ts` é a fonte. Fica **fora do React**, porque o
  progresso muda a cada frame e quase nenhum consumidor quer um render por
  frame. O snapshot é mutado no lugar; não guarde a referência, copie os
  números.
- `lib/scroll/ScrollProvider.tsx` é o **único** publicador. Ele instancia o
  Lenis (`lerp` 0.075), roda o `raf` pelo ticker do GSAP com
  `lagSmoothing(0)`, e chama `ScrollTrigger.update()` a cada scroll. Com
  `prefers-reduced-motion` ele troca o Lenis por scroll nativo — e continua
  publicando o mesmo progresso.
- `lib/scroll/use-scroll-progress.ts` é o **único** acesso de leitura.
  Sem argumento devolve um ref atualizado por frame e nenhum render; com
  `{ steps: N }` devolve também o valor quantizado como estado, para quem
  precisa desenhar (a régua da HUD usa 100 degraus).

`velocity` existe no store como leitura de HUD e **não dirige nada**. A regra
da variável única continua valendo.

### Capacidades e o portão da cena

`useReducedMotion` e `useWebGLSupport` devolvem `boolean | null`, onde `null` é
"ainda não dá para saber" (servidor e primeiro paint). Não é `false`: assumir
que pode mover e corrigir depois produz exatamente o lampejo que a preferência
existe para evitar.

Os dois são consumidos por **um** hook, `useSceneMode()`, que devolve
`pending | driven | composed | poster`, e por **um** componente, `SceneGate`.
Nenhum outro lugar chama os dois hooks direto — senão cada um inventa sua
própria combinação. O modo escolhido fica no DOM em `data-scene-mode`.

`lib/capabilities/scene-mode.ts` (sem `"use client"`) guarda os nomes dos
modos, porque quem traduz os rótulos é o servidor.

### Tipografia e a regra dos 80%

Duas famílias, papéis rígidos (PROJECT.md §3.2), **carregadas por `next/font`**
com `display: "swap"` e subset `latin`:

- **Archivo** — variável em `wght` e `wdth` (62–125). Pedir o eixo `wdth` é o
  que dá acesso ao Expanded. A classe `.type-display` usa `font-stretch: 125%`;
  o texto de leitura usa a mesma família em largura normal e peso regular.
  Uma família, dois papéis, um arquivo baixado.
- **Geist Mono** — HUD, cotas, estações, metadados.

Nenhuma terceira família entra no projeto.

**"O maior título ocupa no mínimo 80% da largura da viewport" não é um tamanho,
é um resultado** — depende de quantas letras a linha tem. Então `--text-display-1`
não é um número, é uma conta (`styles/tokens.css`):

```
F = --display-fill × 100vw ÷ (--display-chars × --display-advance)
```

`components/type/DisplayLine.tsx` fornece os dois termos variáveis:
`--display-chars` sai do próprio texto, e `--display-advance` é **medido** na
fonte real depois de `document.fonts.ready`, no mesmo peso, largura e tracking
em que a linha vai ser desenhada. Com o avanço medido a largura final é
`fill × 100vw` de verdade: **84% da viewport**, quatro pontos acima do mínimo.

Antes da medição vale o padrão de `tokens.css` (0.74 em/caractere),
deliberadamente subestimado — errar para baixo produz fonte maior, e um título
grande demais por um instante é melhor que um pequeno demais. O padrão sozinho
já sustenta a regra enquanto o avanço real ficar em [0.705, 0.881] em.

Use `DisplayLine` para qualquer título de display, uma instância por linha.

### Tokens

`styles/tokens.css` é a fonte única. Os nomes do `:root` são exatamente os do
PROJECT.md §3.1 (`--void`, `--teal`, …). O `@theme inline` do Tailwind faz
alias para `--color-*`, então `bg-void` compila para `background-color:var(--void)`
sem duplicar o valor.

`lib/palette.ts` **lê os tokens de volta do DOM** em vez de repetir os
hexadecimais — é assim que os uniforms dos shaders vão consumir a mesma verdade
que o Tailwind consome. Ele só roda no cliente, e lança no servidor de
propósito: um fallback hardcoded seria a segunda fonte de verdade que o arquivo
existe para evitar.

A única duplicação consciente é o movimento: `lib/motion.ts` (números, para o
GSAP) e `--ease-strong`/`--dur-*` em `tokens.css` (para transições de CSS).
Se um mudar, o outro muda junto.

### Cases e MDX

`content/cases/*.mdx`, sem CMS. **O frontmatter não é YAML**: cada arquivo
declara `export const frontmatter = { … }`, que é ESM nativo do MDX e o caminho
que o próprio doc do Next 16 documenta.

O ganho não é economizar duas dependências (`remark-frontmatter` +
`remark-mdx-frontmatter`, que ainda arrastam um advisory alto em `toml`): é que
os valores chegam como JS de verdade — arrays continuam arrays, `year` continua
número — em vez de passarem por coerção de YAML. E há **uma via de parse só**,
a mesma que renderiza.

`lib/cases.ts` lista os slugs com `fs`, carrega cada arquivo com
`import(\`@/content/cases/${slug}.mdx\`)` e valida o frontmatter à mão. Como as
rotas são estáticas, um frontmatter errado quebra `next build`, não a página em
produção.

Campos além do PROJECT.md §6: `disciplines` (obrigatório — os filtros do rio são
por disciplina, DIRECTION.md §4) e `generated` (opcional, PROJECT.md §6).

`content/cases/exemplo.mdx` é um **fixture descartável**, não conteúdo: existe
só para o pipeline ter o que compilar enquanto os cases não chegam. Ele fica
até o **Prompt 5**, onde é **apagado inteiro** — não renomeado, não copiado,
não usado como molde para os cases reais. Os nove cases nascem do PROJECT.md
§6, não deste arquivo; herdar a estrutura dele significaria herdar os travessões
de placeholder e o `generated: true` que ele carrega só para não fingir ser
conteúdo. Se ele ainda existir depois do Prompt 5, alguma coisa deu errado.

**São nove cases no repositório**, não três: os três escritos do zero e os seis
já publicados no site antigo. Estar no repositório não é estar no rio — a
curadoria de quais aparecem no beat de Trabalho é decidida depois, olhando os
cards montados na cena. Os que ficarem de fora continuam existindo, indexáveis
e acessíveis por `/work/[slug]`.

### Beats

`components/beats/beats.ts` tem a tabela do DIRECTION.md §4 — intervalo de
progresso e altura em `vh`, desktop e mobile. As alturas viram custom
properties inline e o `min-height` mora no CSS, para o componente não saber de
breakpoint.

**O comprimento do beat de Trabalho é fixo** (8.4 vh no desktop, 5.1 no
mobile), com três cases ou com nove. A contagem determina o **espaçamento entre
os cards**, não o comprimento do rio — a capacidade real sai do Prompt 4.5 e
entra como valor derivado. Até lá não existe número de espaçamento; não invente
um. Um rio que cresce a cada case seria uma punição por ter trabalhado, e
esticá-lo quebraria os totais e a regra dos oito segundos.

---

## Armadilhas conhecidas

- **Tailwind v4 varre o código-fonte procurando nomes de classe inteiros.**
  `` className={`text-${step}`} `` não gera utility nenhuma. Escreva o nome por
  extenso (ver `STEP_CLASS` em `DisplayLine.tsx`).
- **React 19 removeu o namespace global `JSX`.** Use `React.JSX.Element` ou
  `import type { JSX } from "react"`.
- **`exactOptionalPropertyTypes` está ligado.** `{ prop: undefined }` não é o
  mesmo que omitir a prop. Em JSX, prefira `aria-current="false"` a
  `aria-current={cond ? "true" : undefined}`.
- **Todos os `params` são `Promise`** no App Router da 16. `PageProps<"/rota">`
  e `LayoutProps<"/rota">` são globais gerados — use-os.
- **`setRequestLocale(locale)` no topo de toda página**, senão a rota cai para
  render dinâmico.
- **CSS de `node_modules` dentro do CSS**: use o caminho do pacote
  (`@import "lenis/dist/lenis.css"`). Prefixar com `node_modules/` quebra.
- **O GSAP 3.15 traz `ScrollTrigger`, `ScrollSmoother` e `SplitText` no pacote
  do npm.** Importe de `gsap/ScrollTrigger`. Não existe mais nada em
  `public/assets/plugins`.
- **`gsap.registerPlugin` dentro do `useEffect`**, não no topo do módulo: um
  módulo `"use client"` também executa no servidor durante o SSR.

## Alturas da descida: as linhas mandam

O DIRECTION.md §4 declarava totais que não batiam com as próprias linhas da
tabela (21.0 contra 21.05 no desktop; 16 contra 17.75 no mobile). Resolvido na
direção certa: **as linhas por beat são a verdade e os totais são derivados
delas**, e o DIRECTION.md foi corrigido para dizer isso.

|  | rolável | total |
|---|---|---|
| desktop | 21.05 vh | 22.05 vh |
| mobile | 17.75 vh | 18.75 vh |

No código isso é literal: `SCROLL_VH`, `SCROLL_VH_MOBILE`, `TOTAL_VH` e
`TOTAL_VH_MOBILE` em `components/beats/beats.ts` são somas calculadas sobre
`BEATS`, nunca constantes digitadas. Mexer numa linha move os totais sozinho.
**Não reintroduza um total literal** — foi exatamente assim que a divergência
nasceu.

A regra dos oito segundos foi reverificada com os números novos e passa com
folga nos dois: o descolamento cai em 3.79 vh no desktop e 3.20 vh no mobile,
e para falhar seria preciso rolar abaixo de 0.52 vh/s (desktop) ou 0.43 vh/s
(mobile). A conta completa está no DIRECTION.md §4.

## O que falta

Nesta ordem, porque cada uma depende da anterior:

1. Os três cases em `content/cases/` (e apagar o fixture).
2. O conteúdo dos beats em DOM — manifesto, contato, placas de cota.
3. A cena: `three` + R3F, a câmara, a névoa, o bando.
4. `TypeArticle` e o `troika-three-text` — o corpo de prova dentro da cena.
   Atenção: o troika precisa de um **arquivo** de fonte, e o `next/font` não
   expõe uma URL estável. Vai ser preciso servir o `.woff2` do Archivo por
   `public/` também, e garantir que é o mesmo arquivo das duas vias.
5. O descolamento: SDF fino assado do próprio mesh, força de separação pelo
   gradiente.
6. Os testes de portão: varredura de contraste em 600 passos (DIRECTION.md §5)
   e a rolagem sintética a 0.6 vh/s até o quadro de separação (DIRECTION.md §4).
