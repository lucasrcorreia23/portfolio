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

### Migração do site antigo

**`github.com/lucasrcorreia23/portfolio` precisa continuar existindo.** É este
mesmo repositório — o `origin` não mudou —, e é de lá que sai a mídia e o texto
dos quatro cases migrados. Concretamente: **não apague a tag `template-legado`,
não force-push por cima dela, não recrie o repositório do zero.** Enquanto os
quatro cases não estiverem escritos em `content/cases/`, aquela tag é a única
cópia do material.

Onde as coisas estão dentro da tag:

```bash
git show template-legado:<caminho>                    # um arquivo
git ls-tree -r --name-only template-legado | grep -i nestle   # achar arquivos
git checkout template-legado -- public/assets/img/nestle      # trazer mídia
```

- **Texto e estrutura:** `src/components/<case>/` — `nestle`,
  `decision-suite-project`, `prime8-project`, `zoomtech-project`.
- **Imagens:** `public/assets/img/<case>/`.
- **Rotas antigas, para achar o que era público:** `src/app/`.

Sobre os dois que ficaram de fora: **Organiconecta** tem componentes e imagens
na tag mas nunca teve rota em `src/app`, e **Orbsofty** só tem um diretório de
imagens, sem página. É material incompleto, e é bom saber disso antes de
alguém propor trazê-los de volta.

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

**Fundação montada, mais o portão. Sem conteúdo de beat e sem 3D.** O que
existe é o esqueleto — rotas, idiomas, tokens, escala tipográfica, driver de
scroll, hooks de capacidade, pipeline de MDX — e, em cima dele, o **preloader
e o portão de entrada**, que já são um beat de verdade e não andaime.
Nenhum dos cinco beats da descida tem conteúdo; a cena é uma camada vazia.

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
components/gate/       o preloader e o portão de entrada (o beat "pré")
components/scene/      a cena 3D e o portão que escolhe qual versão roda
components/hud/        a HUD lateral fixa (substitui o rodapé; não há rodapé)
components/beats/      as cinco seções da descida
components/type/       DisplayLine — a linha de display que se auto-dimensiona
content/cases/         os cases, em .mdx
content/messages/      dicionários, um arquivo por beat, por idioma
lib/                   audio/, capabilities/, i18n/, preload/, scroll/ e soltos
styles/                globals.css + tokens.css
```

**Dois "portões", e eles não são a mesma coisa.** `components/gate/` é o portão
de entrada — o preloader, o contador, a veneziana. `components/scene/SceneGate`
é o portão *da cena*, que decide qual das três versões dela roda
(`driven | composed | poster`). Nomes parecidos, papéis sem interseção.

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

Estado medido, com o portão montado e a cena ainda vazia:

| Rota | gz | contra |
|---|---|---|
| `/` e `/pt` — a descida, com portão e preloader | **178.8 kB** | 200 kB ✅ |
| `/work/[slug]` — case, sem portão | 174.3 kB | 200 kB ✅ |
| chunk do driver de scroll (gsap + ScrollTrigger + lenis) | 49.0 kB | fora da rota inicial |

Histórico da medição, porque as duas linhas explicam a arquitetura:

| Composição da rota inicial | gz |
|---|---|
| Next 16 + React 19 + o DOM deste site, sem gsap e sem lenis | 175 kB |
| \+ gsap/ScrollTrigger e lenis estaticamente no layout (estado antigo) | 223 kB |
| \+ next-intl no cliente (estado descartado) | 236 kB |

**O que fechou o orçamento foi tirar o driver de scroll da rota inicial**, que
era o conserto que esta tabela já prescrevia. Ele não serve ao primeiro quadro:
o portão é DOM, não rola, e a descida só começa no clique de entrada. Hoje
`lib/scroll/ScrollProvider.tsx` é uma casca leve que renderiza os filhos na
hora e monta o `ScrollDriver` — gsap e lenis — por `import()` dinâmico depois
do primeiro quadro. Na home o preloader do portão pede o mesmo chunk e conta
o carregamento como progresso; a promessa memoizada em
`lib/scroll/load-driver.ts` faz os dois convergirem num download só.

O piso do framework continua sendo 175 kB. **Sobram ~21 kB para tudo que este
site escrever de cliente**, e o portão já gastou 4.5 deles. Nenhuma dependência
de cliente entra sem medição.

A regra do next-intl continua valendo — **nenhum componente de cliente importa
o next-intl**, traduza no servidor e desça strings como props —, mas pela razão
certa: são 13 kB, não os 67 kB que uma medição errada sugeriu. Vale porque 13 kB
é muito quando o piso é 175 e o teto é 200, e porque manter a tradução no
servidor é mais simples, não porque seja um corte dramático.

#### Como medir, e como eu errei

O erro que produziu números falsos: eu media contra um **servidor antigo ainda
no ar** (`pkill -f "next start"` não pega o processo) enquanto o `.next` já
tinha sido reconstruído. O HTML servido citava chunks com hash velho, o laço de
medição pulava em silêncio os arquivos que não existiam mais, e o total
encolhia a cada rebuild. Três precauções:

```bash
# 1. matar pela porta, não pelo nome do processo
P=$(lsof -nP -tiTCP:3100 -sTCP:LISTEN); [ -n "$P" ] && kill -9 $P
# 2. build limpa, e confirmar que o servidor subiu ("Ready in ...")
rm -rf .next && npm run build && npm run start -- -p 3100
# 3. somar só as tags <script src>, e FALHAR se um chunk não existir no disco
```

Um chunk citado no HTML e ausente no disco não vale zero — vale "a medição está
errada". Se o número cair de repente, desconfie da medição antes de comemorar.

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
- Quando a cena entrar, ela é carregada por import dinâmico com `ssr: false`,
  a partir do `SceneGate` e só depois do primeiro quadro útil. Meça as duas
  caixas separadamente: os `<script>` do HTML inicial contra 200 kB, e o
  chunk da cena contra 350 kB.
- **A cena entra como mais uma tarefa do manifesto do preloader**
  (`lib/preload/manifest.ts`), com peso maior que as outras — é o chunk de
  350 kB, e o portão é exatamente o momento de baixá-lo. Não invente um
  segundo mecanismo de carregamento; há um, e o contador já sabe medi-lo.

### A variável única

PROJECT.md §3.3: um progresso normalizado de 0 a 1 dirige a câmera, os uniforms
e as revelações de texto. Isso é literal no código.

- `lib/scroll/scroll-store.ts` é a fonte. Fica **fora do React**, porque o
  progresso muda a cada frame e quase nenhum consumidor quer um render por
  frame. O snapshot é mutado no lugar; não guarde a referência, copie os
  números.
- `lib/scroll/ScrollDriver.tsx` é o **único** publicador. Ele instancia o
  Lenis (`lerp` 0.075), roda o `raf` pelo ticker do GSAP com
  `lagSmoothing(0)`, e chama `ScrollTrigger.update()` a cada scroll. Com
  `prefers-reduced-motion` ele troca o Lenis por scroll nativo — e continua
  publicando o mesmo progresso. **Ele não está na rota inicial**: quem o monta
  é o `ScrollProvider`, uma casca de layout que o carrega por `import()`
  depois do primeiro quadro (ver "Orçamento de JS"). Se o chunk não chegar, o
  scroll continua nativo e o progresso fica em 0 — perde-se a cena e a régua
  da HUD, não o conteúdo.
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

A regra é sobre **combinar** as duas capacidades, não sobre tocar em uma:
`ScrollDriver` e `GateOverlay` consultam `useReducedMotion` sozinho, porque
nenhum dos dois depende de WebGL. Quem precisa das duas juntas usa
`useSceneMode`.

### O portão de entrada

`components/gate/` — o beat "pré" do PROJECT.md §4. Ele **mora na home**
(`app/[locale]/page.tsx`), não no layout: quem chega direto num case por link
não tem cena para carregar nem descida para destravar.

```
Gate.tsx           servidor: resolve os rótulos, escreve a trava e o <noscript>
GateOverlay.tsx    cliente: o relógio único — contador, veneziana, campo
dormant-field.ts   o organismo dormente, canvas 2D sem dependência
readout.ts         14.617 M/S, COTA −38.402, ↓ — e por que esses números
```

**O contador não é uma barra e não mente.** Ele conta o manifesto real
(`lib/preload/manifest.ts`) e mostra uma leitura de velocidade. Como
`import()` e `fonts.ready` só sabem informar "pronto", o progresso avança em
degraus; quem os transforma numa subida é o amortecimento, travado por
`Math.min(perseguidor, alvo)` para **nunca mostrar mais do que já chegou**.
O perseguidor mira 1.03 e não 1 — é o que faz a leitura *chegar* a 14.617 num
tempo finito em vez de se aproximar dele para sempre. Detalhe tipográfico e
justificativa dos números: `readout.ts` e DIRECTION.md §4.

**Um relógio só.** O `GateOverlay` tem um `requestAnimationFrame` que dirige o
contador, o `transform` de cada lâmina e o avanço da câmera no canvas. Não é
transição de CSS: a mesma curva (`easeStrong`, em `lib/motion.ts`) precisa
valer para o DOM e para o canvas, e dois relógios divergem em 1.45 s. O React
só re-renderiza na troca de fase — o número é escrito em `textContent`, pela
mesma razão que o progresso do scroll fica fora do React.

**No modo calmo não existe `requestAnimationFrame` nenhum.** O campo vira uma
composição fixa, o contador é escrito no callback do carregamento (dois ou três
eventos), e a abertura vira o corte de 120 ms — que é a única coisa do portão
que esmaece.

**`data-gate` no `<html>` é o contrato**, e vale para CSS e para teste:
`closed` (trava `overflow: hidden`), `opening`, `open`. Ele é escrito no parse
por um script inline, e não na hidratação — senão a página rola por trás de um
portão opaco e um reload restaura a posição no meio da descida. Sem JS o
script não roda e o `<noscript>` esconde o portão: o site sem JS é o site sem
cena, não um site trancado.

**O clique faz três coisas no mesmo handler, síncronas** — destrava o áudio,
libera a descida e dispara a veneziana. O `unlockAudio()` precisa ser síncrono
dentro do gesto; um `await` antes dele já perde o gesto em alguns navegadores.
E a descida é liberada no clique, não no fim da transição: prender o scroll por
mais 1.45 s comeria da regra dos oito segundos sem nada em troca.

**O áudio é sintetizado, não é arquivo.** `lib/audio/audio-context.ts` monta o
baque de pressão com um oscilador grave caindo de tom mais um estouro de ruído
filtrado — ~1 kB de código contra dezenas de kB de mp3. O módulo já expõe
`getAudioContext()` e `setAudioMuted()` para o controle de áudio da HUD.

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

Campos além do PROJECT.md §6: `disciplines` e `in_river` (os dois obrigatórios,
DIRECTION.md §4) e `generated` (opcional, PROJECT.md §6).

`content/cases/exemplo.mdx` é um **fixture descartável**, não conteúdo: existe
só para o pipeline ter o que compilar enquanto os cases não chegam. Ele fica
até o **Prompt 5**, onde é **apagado inteiro** — não renomeado, não copiado,
não usado como molde para os cases reais. Os sete cases nascem do PROJECT.md
§6, não deste arquivo; herdar a estrutura dele significaria herdar os travessões
de placeholder e o `generated: true` que ele carrega só para não fingir ser
conteúdo. Se ele ainda existir depois do Prompt 5, alguma coisa deu errado.

**São sete cases no repositório**, não três: Perfecting, WeCann Atena e
Unifique Energia escritos do zero, mais Decision Suite, ZOOMtecnologia, Prime8
e Nestlé migrados do portfólio antigo. Organiconecta e Orbsofty ficam de fora
por ora — não foram descartados, só não entram nesta rodada.

**Estar no repositório não é estar no rio.** A curadoria é um booleano
obrigatório no frontmatter, `in_river`, decidido olhando os cards montados na
cena — não lendo a lista de projetos. É obrigatório de propósito: um padrão
implícito decidiria a curadoria em silêncio.

**Nenhum case é apagado para sair do rio.** `in_river: false` tira o card do
beat de Trabalho e mantém tudo o mais — o arquivo, a rota `/work/[slug]`, a
indexação. Use `getRiverCases()` para montar o rio e aplicar os filtros por
disciplina; `getAllCases()` é o acervo inteiro e é o que gera as rotas.

### Beats

`components/beats/beats.ts` tem a tabela do DIRECTION.md §4 — intervalo de
progresso e altura em `vh`, desktop e mobile. As alturas viram custom
properties inline e o `min-height` mora no CSS, para o componente não saber de
breakpoint.

**O comprimento do beat de Trabalho é fixo** (8.4 vh no desktop, 5.1 no
mobile), com três cases ou com sete. A contagem determina o **espaçamento entre
os cards**, não o comprimento do rio — a capacidade real sai do **prompt de
migração, que roda antes do rio**, e entra como valor derivado. Até lá não
existe número de espaçamento; não invente um. Um rio que cresce a cada case
seria uma punição por ter trabalhado, e esticá-lo quebraria os totais e a regra
dos oito segundos.

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

No código isso é literal: `SCROLL_VH` e `SCROLL_VH_MOBILE`, em
`components/beats/beats.ts`, são somas calculadas sobre `BEATS`, nunca
constantes digitadas. `TOTAL_VH`/`TOTAL_VH_MOBILE` são derivados por cima
delas — `SCROLL_VH + TERMINAL_HOLD_VH` — e não somam `BEATS` diretamente,
porque o viewport final não pertence a nenhuma linha da tabela (ver abaixo).
Mexer numa linha move os dois totais sozinho. **Não reintroduza um total
literal** — foi exatamente assim que a divergência nasceu.

A regra dos oito segundos foi reverificada com os números novos e passa com
folga nos dois: o descolamento cai em 3.79 vh no desktop e 3.20 vh no mobile,
e para falhar seria preciso rolar abaixo de 0.52 vh/s (desktop) ou 0.43 vh/s
(mobile). A conta completa está no DIRECTION.md §4.

**O viewport que separa "rolável" de "total" agora existe no DOM.** Antes, as
seções renderizadas somavam só `SCROLL_VH` (21.05 vh) — a página era um
viewport mais curta do que devia, e `scrollHeight − innerHeight` media 20.05
vh em vez de 21.05. O viewport que faltava é o quadro parado do fim da
descida: pertence à Superfície e fica fora da faixa de progresso — progresso
trava em 1.00, nada mais se move (DIRECTION.md §4). `TERMINAL_HOLD_VH` em
`beats.ts` nomeia esse vh, e `beatHoldVh(id)` diz quem o carrega (só
`"surface"`); `BeatSection` soma isso à própria altura da seção — sem
elemento novo, sem espaçador. Verificado: `scrollHeight − innerHeight` bate
com `SCROLL_VH × 100vh` de novo.

## O portão: onde ele parou, e por quê

O portão passou por **sete rodadas do agente crítico** (PROJECT.md §7). Notas:
6 → 6 → 7 → 8 → 8.5 → 8.5 → **8.5**. Não fechou o corte de 9, e a decisão foi
parar aí — não porque o que falta seja difícil, mas porque as três coisas
abertas estão medidas, nomeadas e são pequenas. Ficam registradas com número
para ninguém ter que redescobri-las.

> **A nota 8.5 é provisória, e o portão volta ao crítico depois do Prompt 3.**
> Com uma pergunta diferente: não "o portão está bom", que já foi respondido
> sete vezes, mas **"a passagem do portão para a cena funciona"**. É a única
> parte dele que ainda não existe para ser julgada — hoje a veneziana abre
> para uma camada vazia. Enquanto a cena não entra, nenhuma rodada nova do
> portão sozinho tem o que descobrir.

**A lição de método, que vale para o resto do projeto e custou duas rodadas:
medir o que o código *calcula* não é medir o que ele *entrega*.** O véu de
legibilidade passou por duas verificações minhas lendo
`getBoundingClientRect()` — a caixa que o código computa — e as duas passaram.
Enganchando o `drawImage` e lendo o retângulo realmente desenhado, ele estava
2,4× maior que o calculado, porque a reancoragem nunca disparava. Quando for
escrever a varredura de contraste em 600 passos (item 6 abaixo), instrumente a
saída, não a entrada.

### O que continua aberto

1. ~~**O clique custa ~110 ms; o PROJECT.md §3.3 fixa 100.**~~ **Corrigido.**
   Praticamente todo o custo era o construtor do `AudioContext` — 95.2 / 107.7
   / 115.9 ms sozinho, contra 0.0–0.1 ms do `resume()` —, cobrado no único
   gesto que o site pede. O gesto é exigido pelo `resume()`, não pelo
   construtor: o contexto passou a ser criado suspenso como tarefa do preload
   (`prepareAudio`, em `lib/audio/audio-context.ts`), onde essa espera é o que
   o portão existe para cobrir, e o handler ficou só com `resume()` e o baque.
   Medido depois **do evento ao quadro pintado**, que é o ponto de entrega:
   **40–56 ms**, com o trecho síncrono do handler em **3.3–6.0 ms** contra
   97.7–118.9 antes. E verificado que não é acaso: instrumentando o construtor
   de `AudioContext` antes do clique, **zero construções** no caminho do gesto.

2. **O véu não se ancora à coluna de texto no mobile.** A 390×844 a casa da
   leitura é item de flex em `flex-col`, e `align-items: stretch` faz a caixa
   dela **não mudar** na virada do contador (342 → 342 px); quem encolhe é o
   filho (342 → 29.8). O `ResizeObserver` observa a casa, então nunca dispara,
   e o véu entregue fica em 718 px numa viewport de 390 — 184% da tela, com
   luminância plana nos três terços (46.8 / 46.7 / 46.9 ×10⁻⁴), ou seja um
   scrim de sangria total, que é o que o DIRECTION.md §5 veta pelo nome. No
   desktop o mesmo código entrega erro de largura 0.0 px, porque ali o layout
   resolve sozinho. Correção mínima: `w-fit` (ou `self-start`) na casa da
   leitura e na `<p>` da cota — no-op em `md:flex-row`, e em `flex-col` faz a
   caixa observada voltar a mudar. **Não invente um segundo caminho de
   medição para o mobile.**
3. **O véu salta em vez de acompanhar.** O comentário no código diz que
   durante o deslize da cota "o véu acompanha o texto". Não acompanha: fica
   congelado na caixa pré-deslize os 600 ms inteiros e vira de uma vez no
   `transitionend` — 1723 → 520 px em 17 ms, degrau de +14.6% de luminância
   sem curva, contra o PROJECT.md §3.3. E se a pessoa clicar *durante* os
   600 ms — o instante mais provável, porque a seta acabou de aparecer — o
   cleanup do efeito remove o `transitionend` e o véu nunca reancora.
   Correção: reancorar por quadro enquanto o FLIP roda, em vez de esperar o
   fim. São dois `getBoundingClientRect()` num DOM de seis nós por 600 ms.

> **Os itens 2 e 3 precisam estar corrigidos antes do beat de manifesto**, e a
> ordem não é arbitrária: o `w-fit` do item 2 **muda a caixa do véu**, e a
> caixa do véu é justamente o que a varredura de contraste em 600 passos do
> DIRECTION.md §5 vai medir. Corrigir depois de escrever a varredura invalida
> a varredura; corrigir antes custa uma linha de CSS.

### O que já está verificado e não precisa ser refeito

Contraste sob a leitura, pior caso em quatro fases: carregamento 7.75:1,
pronta 12.15:1, deslize 13.12:1, abertura 8.71:1 — piso de 4.5:1 do
PROJECT.md §5, com folga em 1440×900, 1200, 1024, 800, 768, 390×844 e nos dois
idiomas. Grão como pós sobre 100% do quadro (tripleto modal 5.5–6.6%, contra
78.8% quando as lâminas eram DOM). Geometria da veneziana com ponto de fuga:
passos de 143 → 37 → 147 px, razão 4:1, vértice em 40.2% da altura. Gravação
saindo junto com a lâmina na abertura (α 1.0 até 884 ms, 0.0002 aos 1384 de
1450). Modo calmo com paridade real: 3 renders, zero `requestAnimationFrame`,
mesma quantidade de realce de quina que o modo normal. Rota inicial em 180 kB
gz.

## O que falta

Nesta ordem, porque cada uma depende da anterior:

1. Os sete cases em `content/cases/` (e apagar o fixture).
2. O conteúdo dos beats em DOM — manifesto, contato, placas de cota.
3. A cena: `three` + R3F, a câmara, a névoa, o bando. Ela entra como mais uma
   tarefa do manifesto do preloader, e aí o portão passa a esperar por ela —
   que é o que o PROJECT.md §4 sempre quis dizer com "nada carrega além do
   necessário para o primeiro frame".
4. `TypeArticle` e o `troika-three-text` — o corpo de prova dentro da cena.
   Atenção: o troika precisa de um **arquivo** de fonte, e o `next/font` não
   expõe uma URL estável. Vai ser preciso servir o `.woff2` do Archivo por
   `public/` também, e garantir que é o mesmo arquivo das duas vias.
5. O descolamento: SDF fino assado do próprio mesh, força de separação pelo
   gradiente.
6. Os testes de portão: varredura de contraste em 600 passos (DIRECTION.md §5)
   e a rolagem sintética a 0.6 vh/s até o quadro de separação (DIRECTION.md §4).
