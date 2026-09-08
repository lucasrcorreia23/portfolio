<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portfólio — guia do repositório

Site pessoal de Lucas Rodrigues Correia. Produção: https://www.lucasrc.com.br

> **A regra dos dois arquivos.** Este arquivo responde "o que vai me morder se
> eu mexer aqui": mapa de pastas, stack e travas de versão, comandos,
> arquitetura, orçamento de pacote, armadilhas conhecidas. **`MEASUREMENTS.md`**
> responde "o que medimos e por quê": as tabelas de aceite de cada beat, o
> histórico de método, a comparação de alvos, as armadilhas de **medição** e as
> do banco de prova.
>
> **Escreva aqui, não lá — e o inverso.** Uma regra de arquitetura, um mapa de
> arquivos, uma trava de versão ou algo que quebra ao editar um arquivo entram
> aqui. Uma tabela de números medidos, um método de verificação ou uma
> armadilha de medição entram em `MEASUREMENTS.md`. Cada seção medida abaixo
> tem o resumo e o número que importa aqui, com um link para o resto lá — não
> reabra a tabela inteira aqui só porque é mais fácil colar.

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

**Fundação, portão, e a cena com os quatro primeiros beats — com o descolamento,
o poleiro e o corredor do rio.** Sobre o esqueleto — rotas, idiomas, tokens,
escala tipográfica, driver de scroll, hooks de capacidade, pipeline de MDX —
existem o **preloader e o portão de entrada**, a **cena contínua de R3F** de 0.00
a 0.85 e a **HUD lateral fixa**: câmara, névoa em três paradas, bando de 16.384
corpos em FBO ping-pong, estrutura gravada, corpo de prova em
`troika-three-text` com oclusão real, o poleiro colunar de Quem sou e a corrente
de sete cards do beat de Trabalho.

**O descolamento está feito e medido** (ver "O descolamento, medido"): campo de
distância assado do próprio mesh do troika, aresta de ataque pelo gradiente,
turbulência nas contra-formas e atrator de baixa pressão na esteira. O desvio de
campo distante — a caixa de cantos macios contra `SPECIMEN_HALF_*` — foi
removido; `world.ts` guarda essas duas constantes agora só para as cotas
gravadas da `Structure`.

**Quem sou está feito e medido** (ver "Quem sou, medido" e "O véu de
legibilidade"): manifesto em coluna na margem esquerda com a lâmina de medida
descendo por ela, poleiro colunar do bando contra a parede de estibordo, HUD
permanente com contato, acervo, filtros, régua, áudio e idioma — e o véu de
legibilidade **refeito**, porque a varredura de contraste reprovou o mecanismo
antigo com 1.21:1.

**O corredor do rio está feito e medido** (ver "O rio, medido"): sete cards
montados em cinco estações ao longo de 27 unidades, planos na cena com
perspectiva real, capa de teste procedural, cota gravada, e **esteira própria por
card** — a mesma física do descolamento com o campo de distância resolvido
analiticamente no shader, sem assado. A curva da câmera de 0.45 a 0.85 deixou de
ser provisória.

**Não entraram nesta rodada, e é deliberado:** conteúdo real nos cards (as capas
são procedurais e a placa de cota não carrega número), os filtros do rio
mexendo na composição, e a transição do card para `/work/[slug]`. A Superfície
continua sem conteúdo e os pontos de controle da câmera **de 0.85 em diante**
seguem provisórios (ver `lib/scene/curve.ts`).

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
three 0.185 + @react-three/fiber 9 + @react-three/drei 10 (só core/Text)
troika-three-text
next-intl (pt/en)
MDX via @next/mdx, cases em content/cases/*.mdx
Deploy Vercel
```

**O `@react-three/postprocessing` não está na stack; a pós-produção é um
compositor próprio.** Isso já **não** é um desvio: o PROJECT.md §5 foi corrigido
e passou a registrar a saída da biblioteca, o motivo e a consequência — ver
"Pós-produção: compositor próprio, não biblioteca". Os dois documentos dizem a
mesma coisa, e o que segue aqui é o detalhe verificado no código.

Verificado no `node_modules`, não estimado: o pacote exporta um barril só
(`"exports": "./dist/index.js"`, sem importação profunda) e esse arquivo importa
`n8ao` no topo. O `n8ao` não declara `sideEffects`, então o bundler não pode
descartá-lo com segurança — são ~50 kB comprimidos de SSAO que esta cena nunca
usa, mais ~110 kB do `postprocessing` inteiro. O compositor próprio
(`lib/scene/shaders/post.ts` + `components/scene/Composer.tsx`) entrega bloom,
grão, aberração e DOF em ~200 linhas, e o chunk da cena fechou em **284 kB gz**.

**Nenhum efeito de biblioteca entra depois sem reabrir essa conta** (PROJECT.md
§5). Os 66 kB de folga entre 284 e 350 são o espaço do que a cena ainda vai
ganhar — o SDF do descolamento, os corpos de prova do rio, a transição para o
case. Efeito novo aqui é passada nova no compositor.

Do `drei` entra **só** `@react-three/drei/core/Text`, por importação profunda.
O barril arrasta `three-stdlib`, `camera-controls` e `@mediapipe/tasks-vision`.

Travas de versão, todas com motivo:

| Pacote | Trava | Por quê |
|---|---|---|
| `react` / `react-dom` | `~19.2.8` | o R3F 9 declara peer `react >=19 <19.3`. O `~` impede o salto para 19.3 num `npm update` inocente. |
| `three` | `~0.185.1` | as 0.x menores do three são quebra-tudo; o `~` prende na 0.185.x, que é a faixa em que R3F 9 e o `@types/three` instalado foram verificados. |
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
npm run collect    # o coletor de medições, em :3131 (ver "Desempenho da cena")
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
                       Hud (servidor) → HudPanel (colapso no mobile) → régua,
                       leitura por beat, filtros do rio, áudio, idioma, acervo
components/beats/      as cinco seções da descida
components/type/       DisplayLine — a linha de display que se auto-dimensiona
content/cases/         os cases, em .mdx
content/messages/      dicionários, um arquivo por beat, por idioma
lib/                   audio/, capabilities/, i18n/, preload/, scene/, scroll/
lib/scene/shaders/     o GLSL, em módulos .ts
public/fonts/          o Archivo Expanded que o troika consome (ver §Corpo de prova)
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
| **Chunk da cena** | 350 kB gz | `three`, R3F, o `Text` do drei, troika, o compositor e os shaders — num import dinâmico que só começa a baixar **depois** do primeiro quadro útil. |

Não existe mais "sem contar a three": a three não é isenta, ela mora na segunda
caixa. Um pacote que apareça na primeira caixa por engano — um `import`
estático que escapou para o `SceneGate`, por exemplo — não é 350 kB de cena, é
350 kB de rota inicial estourada.

Estado medido, com o portão, a HUD e a cena dos quatro primeiros beats:

| Rota / chunk | gz | contra |
|---|---|---|
| `/` e `/pt` — a descida, com portão, preloader e HUD | **182.4 kB** | 200 kB ✅ |
| `/work` e `/work/[slug]` — acervo e case, sem portão e sem cena | 175.6 kB | 200 kB ✅ |
| **chunk da cena** — three, R3F, `Text` do drei, troika, compositor, shaders, campo de distância, descolamento, poleiro, véu medido e **o corredor do rio** | **302.9 kB** | 350 kB ✅ |
| chunk do driver de scroll (gsap + ScrollTrigger + lenis) | 47.9 kB | fora da rota inicial |

O descolamento inteiro — o assado do campo (`type-field.ts` + `shaders/field.ts`)
e as três forças no shader dos boids — custou **10.1 kB gz**, de 284.0 para 294.1.
Quem sou custou **4.5 kB**, de 294.1 para 298.6: o poleiro no shader dos boids e
no proxy, e as três passadas novas do véu no compositor.

**O rio custou 4.1 kB**, de 298.6 para 302.7: a corrente (`cards.ts`), o material
dos cards com a capa procedural e a cota gravada (`shaders/cards.ts` +
`Cards.tsx`), e o SDF analítico com as três forças no shader dos boids. É o beat
mais barato dos três em pacote, e o motivo é o SDF: um retângulo de cantos
arredondados são cinco linhas de GLSL, enquanto o glifo precisou de um assado com
jump flood.

Subir `MAX_VEIL_BOXES` de 4 para 8 (ver "O que falta", item 2, e
`lib/scene/veil.ts`) custou mais **0.2 kB**, de 302.7 para 302.9 — bytes de um
array de uniforms, não um efeito novo. **Sobram 47.1 kB do teto** para a
Superfície e a transição para o case.

A rota inicial **não mudou**: 182.8 → 182.4 kB, dentro da variação de hash de
build. O rio inteiro vive no chunk dinâmico, como tem que ser.

A HUD inteira — contato, acervo, filtros com estado, régua com as cotas dos
beats, leitura por beat, controle de áudio, colapso no mobile — custou **1.7 kB**
na rota inicial, de 181.1 para 182.8. Nenhuma dependência nova: o que entrou
foram componentes de cliente e dois stores de trinta linhas.

**A sonda de medição não aparece nesta conta porque não existe em produção.**
Verificado neste build: nenhum chunk de `.next/static/chunks` menciona `__probe`,
`installProbe`, `installCorridor`, `cardWake`, `readTextRects` nem
`veilFootprint` — e nenhum menciona `__lenis`, o atalho de desenvolvimento que a
varredura de contraste usa para rolar a página. Ver "A sonda" abaixo.

**Uma única afordância de medição viaja em produção, e ela é declarada:**
`uCardMask`, no vertex shader dos cards. Ela esconde instâncias **do quadro** sem
tirá-las do escoamento, e custa uma divisão e um `mod` em vinte e oito vértices.
O que ela compra está em "O rio, medido": sem ela, a pegada entregue de um card
mede peça **mais** esteira, porque tirar o card do escoamento muda o bando.

Os dois chunks dinâmicos são separados **por conteúdo**, não por momento: o
preloader pede a cena antes do clique, então dividir por "o que chegou depois de
entrar" mede zero. A medição procura `WebGLRenderer`/`troika` num, `lenis`/
`ScrollTrigger` no outro.

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
# 2. build limpa — SEM apagar .next/dev, ver abaixo — e confirmar o "Ready in"
find .next -mindepth 1 -maxdepth 1 ! -name dev -exec rm -rf {} +
npm run build && npm run start -- -p 3100
# 3. somar só as tags <script src>, e FALHAR se um chunk não existir no disco
```

Um chunk citado no HTML e ausente no disco não vale zero — vale "a medição está
errada". Se o número cair de repente, desconfie da medição antes de comemorar.

**Nunca `rm -rf .next` com um `next dev` no ar.** Na 16 o servidor de
desenvolvimento vive em `.next/dev`; apagar a pasta inteira o derruba com
*"The directory at .next/dev was deleted... Restarting the server to recover"*, e
as recompilações seguintes levam dezenas de segundos — que depois aparecem como
sintoma em qualquer coisa que dependa de tempo, inclusive no próprio manifesto
do preload. O `find` acima limpa a build de produção e preserva o dev.

**E confirme contra qual servidor você está medindo.** Um `npm run dev -- -p
3101` sai com *"Another next dev server is already running"* se já houver um, e
a porta simplesmente não abre; medir contra ela devolve "não completou" para
tudo. Cheque o `lsof` da porta antes de acreditar num número ruim.

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
- A cena é carregada por `import()` a partir de `lib/scene/load-scene.ts`, que é
  cópia estrutural de `load-driver.ts` — promessa memoizada, desmemoizada no
  erro. **Nenhum arquivo importa `components/scene/Scene` estaticamente**, e um
  que o fizesse não custaria 284 kB de chunk de cena, custaria 284 kB de rota
  inicial estourada.
- **A cena é mais uma tarefa do manifesto do preloader**
  (`lib/preload/manifest.ts`), com peso 4 contra 1 das outras. Não invente um
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

### A cena

```
lib/scene/load-scene.ts    promessa memoizada — espelho de load-driver.ts
lib/scene/world.ts         as medidas da câmara; uma unidade ≈ um metro
lib/scene/cards.ts         a corrente do rio: corpo, estações, espaçamento
lib/scene/type-field.ts    o assado do campo de distância, do próprio mesh
lib/scene/probe.ts         a sonda de medição (`?probe=1`, só em dev)
lib/scene/probe-contrast.ts a varredura de contraste e a conferência do véu
lib/scene/probe-measure.ts as quatro medidas de aceite e seus controles
lib/scene/probe-cards.ts   a separação em profundidade e a esteira por card
lib/scene/curve.ts         a coreografia: câmera, ângulo de ataque, abertura,
                           névoa, fonte a montante, esteiras do rio
lib/scene/proxy-sim.ts     64 macro-partículas a 15 Hz — luz, estrutura, véu
lib/scene/veil.ts          lê do DOM as caixas de texto que o véu protege
lib/scene/readout-store.ts o fio da cena para a HUD (DENS., Z) — sem three
lib/scene/gpu.ts           o triângulo de tela cheia e o blit
lib/scene/type-article.ts  o dono do corpo de prova
lib/scene/settings.ts      dof, bando, rio, ?bench e ?probe, lidos da URL
lib/scene/bench.ts         o banco de prova: escada de K, estatística, coletor
components/scene/          Scene → SceneWorld → {Chamber, Structure, Cards,
                           Flock, Specimen, Composer,
                           SceneClock | ComposedClock | BenchClock | ProbeClock}
```

**Um laço mestre.** `SceneWorld` tem o único `useFrame` que lê o progresso e o
transforma em outra coisa — câmera, ângulo da peça, abertura, névoa, proxy, véu.
Prioridade −10; o bando roda em −5, o compositor em 1. Espalhar essa leitura por
cinco componentes daria cinco interpretações do mesmo número.

**Um relógio, e é o do scroll.** `frameloop="never"`: quem avança a cena é o
ticker do GSAP, publicado pelo `ScrollDriver` em `lib/scroll/frame-bus.ts` — o
mesmo desenho do `scroll-store`, para o tempo. A cena **não importa o gsap**:
publicando de dentro do `tick` que já existe, a ordem "progresso publicado →
cena avançada" vira estrutural em vez de acidental, e o gsap não tem chance de
entrar na caixa de 350 kB.

Duas armadilhas do R3F que já custaram caro e estão resolvidas em `SceneClock`:

- **`clock.autoStart = false` é obrigatório.** No modo `never` o R3F calcula o
  delta como `timestamp − clock.elapsedTime`, mas chama `clock.getDelta()`
  **antes** disso — e `getDelta()` com `autoStart` ligado soma o tempo de parede
  em `elapsedTime`. O delta colapsa para ~0 a partir do segundo quadro, e todo
  `damp` da cena congela sem erro nenhum no console.
- **O tempo começa em zero.** O primeiro argumento do ticker do GSAP é o
  *uptime* dele; passá-lo direto daria um primeiro delta do tamanho de quanto
  tempo a aba está aberta.

Se o chunk do scroll nunca chegar, ninguém publica quadro e a cena seria um
retângulo preto para sempre — daí o cão de guarda de 500 ms no `SceneClock`. É o
único segundo `requestAnimationFrame` do projeto, e só liga quando o primeiro
não existe.

#### O bando

FBO ping-pong, RGBA32F, `NearestFilter` **explícito nos dois filtros** — o padrão
de `minFilter` é linear, filtrar float exige `OES_texture_float_linear`, e o
three não lança quando falta: ele avisa e amarra `LINEAR` assim mesmo, o que
corromperia a simulação em silêncio.

Vizinhança por **passo rotativo**: 24 amostras com passo que gira por quadro, em
vez de O(N²) ou hash espacial. O raio de vizinhança é curto (3 unidades) de
propósito — a amostra sorteia do bando inteiro, e com raio largo a coesão vira
atração contra a média global. Isso não é murmuração, é gravidade: o bando
colapsa num aglomerado. Separação domina, coesão é fraca, alinhamento entra com
o bando formado.

A reciclagem é **relativa à câmera**, não ao duto, senão o bando fica para trás
conforme a descida avança. O proxy da CPU recicla igual, pelo mesmo motivo.

`<mesh>` com `InstancedBufferGeometry`, e não `<instancedMesh>`: este último
carrega um `instanceMatrix` de 16 floats por corpo que a CPU teria que preencher
e que o material nunca leria. `frustumCulled = false` e uma esfera envolvente
enorme não são opcionais — a CPU não sabe onde os corpos estão.

#### O corpo de prova

`@react-three/drei/core/Text` (importação profunda), não o troika direto: o
`troika-three-text` não publica tipos utilizáveis sob este `tsconfig`.

Duas restrições do troika que decidiram o arquivo de fonte, as duas verificadas
na fonte da biblioteca:

1. **`.woff2` não é suportado** — o parser lança ao ver a assinatura `wOF2`.
2. **Eixos de fonte variável não são aplicados** — `fontWeight` só escolhe
   fallback. O eixo `wdth: 125` que o `.type-display` usa no DOM não chegaria.

Por isso `public/fonts/ArchivoExpanded-ExtraBold.ttf`, uma instância estática do
mesmo tipo (OFL-1.1, do repositório upstream, branch `master`). O DOM continua
com o Archivo variável do `next/font`; `lib/fonts.ts` não muda. Mesmo desenho,
segundo formato — a regra de "nenhuma terceira família" do PROJECT.md §3.2
continua inteira.

O material é GLSL 1.00 **obrigatoriamente**: o troika injeta código que escreve
`gl_FragColor`. Com `glslVersion: GLSL3` o three deixa de emitir o
`#define gl_FragColor pc_fragColor` e o texto injetado referencia um símbolo que
não existe.

#### Como a oclusão funciona, e o que a quebra

Os **corpos são opacos** (`transparent: false`, `depthWrite`, `depthTest`). É o
ponto que decide o beat inteiro. `AdditiveBlending` num corpo emissivo é a
armadilha: o three só honra blend com `transparent: true`, e material
transparente sai da lista opaca e passa a ser ordenado **por objeto** — um
`InstancedBufferGeometry` tem um centroide só, então ou o bando todo fica na
frente das letras ou todo atrás. Nenhum ajuste de `renderOrder` conserta: a
divisão opaco/transparente acontece antes de qualquer ordenação.

O glifo fica `transparent: true` com `depthWrite: true`, de propósito: a borda
macia do SDF é o que dá antisserrilhado a um título de 84% da tela. A oclusão não
depende disso — depende de os corpos serem opacos e desenharem antes.

O brilho vem de HDR linear num alvo de meio-float, com o bloom pegando o que
passa de 1.0. Medido no quadro composto de 0.18: **3.88 corpos visíveis por mil
pixels dentro da faixa das letras contra 6.84 acima e 6.72 abaixo** — maior que
zero prova corpos na frente, e um terço a menos prova os de trás ocluídos.

**O critério de aceite tem três números, e o do meio sozinho não vale.** A queda
na faixa das letras só significa oclusão porque as **duas faixas vizinhas
concordam entre si**: 6.84 contra 6.72 é 1.8% de diferença, e é essa concordância
que descarta a explicação alternativa — um bando mais rarefeito na altura do
título produziria exatamente a mesma queda no meio, sem ocluir nada. Se as
vizinhas divergirem (9 acima e 4 abaixo, digamos), a medição está lendo
distribuição, não oclusão, e a faixa central não decide nada. Ver PROJECT.md §7,
"Toda medição é feita no ponto de entrega".

##### A oclusão, e a esteira do rio: medidas em MEASUREMENTS.md

Ver **MEASUREMENTS.md, "A oclusão se prova alternando a peça"** para o método
(três condições intercaladas, câmera oclusão A/B/C) e por que o tripleto de
faixas horizontais parou de servir depois do descolamento. Números que
importam: **A/C = 0.769** (a peça esconde 23.1% do que existe atrás dela),
**A/B = 37×** (o que se vê na frente sobrevive ao teste de profundidade).

#### O descolamento, medido

O beat de 0.10 a 0.28. Assado do campo de distância a partir do próprio mesh do
troika (jump flood), três forças no shader dos boids (aresta de ataque,
turbulência, recolamento), tudo verificado contra a **faixa medida da
entrada** — não contra o que pareceria razoável. Método completo, as quatro
medidas com dois controles cada, as armadilhas (viés de contração, lâmina
viajante, limiares inalcançáveis) e as letras das pontas: ver
**MEASUREMENTS.md, "O descolamento, medido"**.

**O número que importa**: recolamento fecha até **88% do fluxo livre** a
quatro larguras de letra (sinal sobre controle, mesma laje); coral em **1.84%**
da população, **0.61%** de pixels quentes na tela (teto 15%).

#### Quem sou, medido

O beat de 0.28 a 0.45. Poleiro colunar em casca (não poço), captura calibrada
por relógio, leitura `DENS.` da HUD saindo de um censo do proxy — não de
energia. Duas armadilhas de simulação (arrasto do proxy em passo diferente do
da GPU, contenção do tubo cedendo para o poleiro) e a margem de calor mais
apertada da cena inteira: ver **MEASUREMENTS.md, "Quem sou, medido"**.

**O número que importa**: `columnShare` medido de 0.00 a 1.00 (mediana 0.70,
p90 0.75); calor com pico de **11.5–13.5%** contra o teto de 15%, bem em cima
da fronteira com o rio (0.44→0.45) — remedir junto de qualquer ajuste na
densidade do poleiro ou na paleta dos primeiros cards.

#### O véu de legibilidade

Resolvido da **luminância medida do próprio quadro** (redução por máximo em
três passadas, depois do bloom e do tonemap) — não mais estimado pelo proxy da
CPU, que fazia o véu descer justamente quando a cena clareava. A varredura de
contraste, as duas armadilhas do método e a comparação dos quatro alvos
testados (4.5 a 7.5:1) estão em **MEASUREMENTS.md, "O véu de legibilidade"**.

**O número que importa**: pior contraste medido **4.62:1** (piso 4.5:1);
`VEIL_TARGET_CONTRAST` travado em **5.5** — setpoint provisório, reavaliado
depois que o rio existisse (ver "O rio, medido" abaixo: já reavaliado, e o
alvo ficou curto).

#### O rio, medido

O beat de 0.45 a 0.85. Sete cards, esteira própria por SDF analítico, critério
de aceite (largura projetada por perspectiva, oclusão entre peças, esteira
fechando contra o controle), custo de GPU e a medição de que o pior contraste
sob capa de card fica abaixo do alvo de 5.5 do véu: tudo em
**MEASUREMENTS.md, "O rio, medido"**.

**O número que importa**: razões de largura projetada entre vizinhos de
**1.56 a 1.08** (piso 1.30); esteira fechando **13% → 58% → 92%** do
escoamento não perturbado (1/2/4 larguras de card); pior contraste medido com
capa de card atrás do texto, **5.16:1** — abaixo do alvo de 5.5, mas **não**
por falta de slot: `MAX_VEIL_BOXES` já subiu de 4 para 8 e a causa segue aberta
(ver item 2 de "O que falta" e MEASUREMENTS.md, "A legibilidade, com capa de
card atrás do texto").

#### O compositor

Cena → DOF → **campo do véu** → composite, tudo sobre `WebGLRenderTarget`. Ele
desliga o render automático do R3F ao se inscrever com prioridade 1.

O alvo da cena é multiamostrado **e** tem `DepthTexture`: o three inclui
`DEPTH_BUFFER_BIT` no blit de resolução, então dá para ter antisserrilhado
geométrico e círculo de confusão por pixel ao mesmo tempo.

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

Campos além do PROJECT.md §6: `disciplines` e `river_rank` (os dois
obrigatórios, DIRECTION.md §4) e `generated` (opcional, PROJECT.md §6).

`content/cases/exemplo.mdx` é um **fixture descartável**, não conteúdo: existe
só para o pipeline ter o que compilar enquanto os cases não chegam. Ele fica
até o **Prompt 5B**, onde é **apagado inteiro** — não renomeado, não copiado,
não usado como molde para os cases reais. Os sete cases nascem do PROJECT.md
§6, não deste arquivo; herdar a estrutura dele significaria herdar os travessões
de placeholder e o `generated: true` que ele carrega só para não fingir ser
conteúdo. Se ele ainda existir depois do Prompt 5B, alguma coisa deu errado.

`river_rank: 99` (ver acima) é a mesma regra aplicada ao ranking: um posto
fora da faixa real de propósito, para nunca ser confundido com curadoria nem
copiado para dentro de um case novo junto com o resto do arquivo.

**São sete cases no repositório**, não três: Perfecting, WeCann Atena e
Unifique Energia escritos do zero, mais Decision Suite, ZOOMtecnologia, Prime8
e Nestlé migrados do portfólio antigo. Organiconecta e Orbsofty ficam de fora
por ora — não foram descartados, só não entram nesta rodada.

**Os quatro migrados já existem em `content/cases/`** — `decision-suite.mdx`,
`nestle.mdx`, `prime8.mdx`, `zoomtecnologia.mdx` —, todos com um `river_rank`
provisório de nascença (ver abaixo). Faltam os três escritos do zero, e com eles o momento
de apagar `exemplo.mdx`. A migração não passou pelo `resgatar-midia.sh` que
esta seção descrevia: o arquivo nunca existiu no repositório. Como a tag
`template-legado` já está local, o resgate saiu direto dela — `git checkout
template-legado -- <caminho>` para os diretórios que não mudaram de nome
(`decision-suite`, `nestle`) e `git show template-legado:<caminho> ><destino>`
para os que mudaram (`prime8-project` → `prime8`, e os arquivos
`zoomtech-*`/`tablet-id.jpg`/`arquitetura-marcas.jpg` espalhados em
`portfolio/`, que foram para `zoomtecnologia/`) — sem clone, sem `.migracao/`.
Texto extraído dos componentes em `src/components/<slug>/*.tsx` da mesma tag,
verbatim; os campos claramente falsos do tema comprado (`features: ["Placeat
laborum quam."...]`, `counter_data` com "Average daily signups") não foram
migrados — são lorem ipsum do template, nunca renderizados, não conteúdo do
Lucas.

**`summary_en` e os `alt_en` de mídia não são traduções.** A rodada de
migração foi só de português — "não traduza nada nesta rodada" —, então
`summary_en` dos quatro cases é hoje uma cópia literal de `summary_pt` (o
schema em `lib/cases.ts` exige os dois campos; duplicar em vez de inventar uma
versão em inglês foi a única leitura que não desrespeita a instrução), e
precisa virar tradução de verdade antes de `en` ser uma rota que alguém visita
de propósito. Os `alt_pt`/`alt_en` de cada imagem, ao contrário, **não** são
cópia: são descrição de acessibilidade escrita para esta migração — o site
antigo não tinha alt text nenhum, só placeholders como `"image-here"` — então
escrever os dois idiomas ali não fere a regra de não traduzir conteúdo do
Lucas, porque não é conteúdo dele.

**`disciplines`, `accent` e `river_rank` dos quatro são palpite de primeira
passada, não curadoria.** O DIRECTION.md §4 adia deliberadamente a
classificação por disciplina e o ranking do rio até ver os cards montados na
cena, mas `parseFrontmatter` exige os dois campos — `disciplines` não vazio,
`river_rank` um inteiro positivo e único em todo o acervo — sem isso `next
build` quebra (`assertUniqueRiverRank` em `lib/cases.ts` verificado: um
segundo case com o mesmo posto derruba a build, e um case sem o campo
também). A saída: um palpite editorial pelo conteúdo do case (não pela
composição da câmara), seguro por agora porque não é isso que decide a
garantia "nenhum filtro devolve menos de dois cases" nem o corte por
aparelho — os dois só passam a valer quando a curadoria de verdade escolher
a ordem. Ficou: Decision Suite produto+sistema, cyan, posto 1; Nestlé
marca+produto, coral, posto 2; Prime8 produto+marca+sistema, rose, posto 3;
ZOOMtecnologia produto+marca, teal, posto 4 — ordem alfabética dos slugs,
arbitrária, revisitável inteira no Prompt 5A.

**Contagem de palavras dos quatro migrados** (corpo do MDX, título+parágrafos+
listas, sem contar frontmatter nem legenda de imagem): Decision Suite 566,
ZOOMtecnologia 283, Prime8 335, Nestlé 130 — **1.314 no total**. É o número
para dimensionar a tradução de `en`; ele não inclui os três cases que ainda
não existem.

**Estar no repositório não é estar no rio.** A curadoria é um ranking único
obrigatório no frontmatter, `river_rank` — não um booleano, e não duas listas
por aparelho —, decidido olhando os cards montados na cena, não lendo a lista
de projetos. É obrigatório e único de propósito: um padrão implícito
decidiria a curadoria em silêncio, e dois cases no mesmo posto não formam uma
ordem.

**Nenhum case é apagado para sair do corte de um aparelho.** Ficar fora do
corte mantém tudo o mais — o arquivo, a rota `/work/[slug]`, a indexação. Use
`getRiverCases()` para pegar o rio inteiro **em ordem de `river_rank`** e
cortar pela capacidade do aparelho que estiver montando (7 no desktop, 4 no
mobile — DIRECTION.md, "Capacidade do rio"); `getAllCases()` é o acervo
inteiro, sem ordenar por rank, e é o que gera as rotas.

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

**Cada beat tem uma entrada própria, e nenhuma esmaece nem translada** — o
PROJECT.md §3.3 veta o `fade-up` de 20 px pelo nome, e o piso de contraste vale
durante a entrada, não só no repouso. Uma opacidade em rampa mostraria o texto
inteiro com contraste reduzido; um recorte mostra menos texto, com cada pixel já
em `--mist` cheio. Emergência aperta o tracking e varre da esquerda; Identidade
varre cada linha de cima para baixo, escalonada; **Quem sou é uma lâmina de
medida que desce pela coluna** — recorte do bloco inteiro, com um fio de um pixel
e uma marca de intervalo na ponta correndo na fronteira do recorte. A lâmina é
ornamento e por isso pode ter alpha; o texto atrás dela não tem nenhum.

### A HUD

`components/hud/` — a navegação permanente do PROJECT.md §4. **O site não tem
rodapé.** `Hud` é Server Component e resolve as strings; `HudPanel` é a casca de
cliente que colapsa a coluna num acionador no topo do mobile.

**Ela reage ao beat, e cada estado tem motivo:**

| beat | o que muda |
|---|---|
| Emergência · Identidade | leitura de profundidade, `Z −38` |
| **Quem sou** | a leitura vira `DENS. 0.62` — é o único beat em que a estrutura chega perto o bastante para medir o bando contra ela (DIRECTION.md §4) |
| Trabalho · Superfície | entram os filtros por disciplina; antes do rio não há o que promover |

A régua de progresso tem **as cotas nas fronteiras dos beats**, lidas de
`BEATS` — não uma graduação regular a cada dez por cento, que seria papel
milimetrado. Mexer na tabela de beats move as cotas sozinho.

Três coisas que parecem detalhe e não são:

- **A leitura da cena não existe sem cena.** `readout-store.ts` publica
  `live: false` no poster, antes do chunk e depois dele; a HUD esconde a linha
  em vez de mostrar `0.00`, que seria um instrumento inventado.
- **A preferência de áudio mora no módulo de áudio**, não no componente: o
  controle existe antes do `AudioContext`, e "mudo antes de entrar" tem que
  continuar mudo no clique de entrada.
- **O filtro do rio já faz efeito hoje.** Ele vai como `?d=` para a entrada de
  acervo, e `/work` filtra a lista. O rio ainda não existe; um controle que só
  publicasse estado seria um botão morto na tela.

---

## Armadilhas conhecidas

- **Nunca uma crase dentro de um literal de GLSL.** O shader mora num template
  literal, e uma crase de markdown num comentário do GLSL **fecha o literal**. O
  erro sai como `TS1005: ',' expected` apontando para o meio de um shader, e em
  dev o `import()` dinâmico do módulo passa a **lançar de forma síncrona** — o
  que já derrubou o manifesto do preload inteiro. Custou três rodadas; escreva
  `uFlockAhead`, não `` `uFlockAhead` ``.
- **`body` não pode ter `background`.** Quem pinta o fundo é o `html`. A ordem de
  pintura do CSS põe as camadas de z-index negativo **antes** do fundo dos
  descendentes em fluxo, então um `bg-void` no `body` pinta por cima do canvas da
  cena, que é `-z-10`. Fica invisível enquanto a camada é uma div da mesma cor, e
  esconde a cena inteira no instante em que ela vira a câmara.
- **Billboard orientado pela velocidade degenera nesta cena.** O bando voa na
  direção da câmera, então `cross(forward, paraCâmera)` colapsa e o plano da
  lasca passa a conter a direção do olhar: área projetada zero, 16 mil instâncias
  desenhadas e nenhum fragmento. É a mesma armadilha dos 90° que o DIRECTION.md
  §5 descreve para o corpo de prova. O corpo é **lenticular** — volume, oito
  triângulos —, e a base ortonormal sai só da velocidade.
- **Uma promessa não pode ter `requestAnimationFrame` como única saída.** rAF não
  dispara em aba oculta e passa fome quando a thread principal está travada. O
  `prepareAudio` dependia disso e travava o portão. Use rAF como atalho e um
  `setTimeout` como caminho garantido.
- **Filtro linear numa redução por máximo devolve média, não máximo.** O campo
  do véu é reduzido em três passadas de 4×4 guardando o maior valor de cada
  bloco; com `LinearFilter` cada amostra vira a média de quatro texels vizinhos,
  e o máximo que a redução existe para achar some. O sintoma foi o véu resolver
  para L = 0.16–0.20 com o teto em 0.125. É a mesma armadilha que o FBO do bando
  já documenta — `NearestFilter` **nos dois** filtros, sempre que a textura
  guarda dado e não imagem.
- **`advance()` com o mesmo timestamp congela a posição, não o quadro.** O
  `hold()` da sonda entrega `dt = 0`, então ninguém anda — mas o arrasto de
  `boids.ts` é **por chamada**, não por segundo: a velocidade ainda encolhe 1.5%
  e `energy = |Δv| / (dt·9 + 1e-5)` satura em 1 para a população inteira. Dois
  `hold()` seguidos só ficam idênticos depois de ~8 quadros parados, e a essa
  altura o bando está na rampa emissiva máxima, esticado e florescendo. Medido:
  85% do quadro acima de `L = 0.01`, e a pegada de um card caindo de 68 mil
  pixels para 7 — porque o bando saturado **cobre** a peça e o tonemap esmaga o
  que sobra. Congelar serve para geometria de pixel; o preço é que uma medição de
  pegada precisa de **vários pares** com o bando movido entre eles.
- **Esconder do quadro e tirar do escoamento são perguntas diferentes.** A
  medição de pegada precisa que o bando siga a **mesma** trajetória nas duas
  condições — senão a diferença de pixel passa a incluir a esteira, e ela mede
  peça mais esteira (medido: três vezes a projeção calculada, de forma estável e
  repetível, o que é pior que ruído porque parece um resultado). A medição de
  esteira precisa do contrário. Daí as duas alavancas: `uCardMask` esconde do
  render, e a sonda **estaciona** o card reescrevendo `uCards[i]` fora do duto.
- **Assentar com o progresso travado dentro do corredor represa o escoamento.**
  `settle(p, 700)` são onze segundos de simulação com a câmera parada e sete
  obstáculos: o bando empilha contra eles e a soltura vira uma nuvem de `--rose`
  de tela cheia. A primeira contact sheet do rio saiu assim. Uma folha de
  travessia tem que **descer** até o beat a partir de um progresso calmo, como a
  varredura de contraste já fazia — é o `warmFrom` de `__probe.sheet`.
- **O `settle` da sonda rodava com a câmera do progresso anterior.** Ele mandava
  o `Flock` avançar N passos antes de qualquer `advance()`, e quem escreve
  `cameraZRef` é o `useFrame` do `SceneWorld`. Como a reciclagem do bando é
  relativa à câmera, os planos de nascimento e de reciclagem ficavam onde a
  câmera **estava**. Com doze unidades entre dois progressos medidos o erro
  passou despercebido; com as quarenta e quatro do rio, um `settle(0.5)` seguido
  de `settle(0.18)` deixava o bando inteiro preso entre `z = −83` e `−61` e a
  leitura seguinte descrevia uma câmara vazia. Consertado com um quadro em branco
  antes do laço.
- **Ruído de valor mostra a rede dele em superfícies alinhadas aos eixos.** As
  paredes do duto são planos em X e Z, e a rede de inteiros do `sceneNoise`
  aparecia como um moiré retangular no fundo da câmara — uma grade, que o
  PROJECT.md §2 veta. A rede é girada para fora dos eixos do mundo dentro da
  própria função.
- **Tailwind v4 varre o código-fonte procurando nomes de classe inteiros.**
  `` className={`text-${step}`} `` não gera utility nenhuma. Escreva o nome por
  extenso (ver `STEP_CLASS` em `DisplayLine.tsx`).
- **`ElementType` vira `never` com o R3F instalado.** Ele aumenta
  `JSX.IntrinsicElements` com ~200 primitivas do three, e uma tag dinâmica tipada
  como `ElementType` faz o TypeScript intersectar as props de todas elas. Mantenha
  o union estreito (ver `DisplayLine.tsx`).
- **`react-hooks/immutability` está desligado só em `components/scene/`.** O
  modelo do R3F é mutar objetos devolvidos por hooks sessenta vezes por segundo;
  a regra descreve outra coisa. Fora dessa pasta ela continua valendo.
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

## Desempenho da cena, medido

Banco de prova (`?bench=1`), a sonda (`?probe=1`), a escada de amplificação
K contra o cronômetro de query (que mede o vsync, não a GPU), o 2×2 do iPhone
e as quatro armadilhas de medição que o harness resolve: tudo em
**MEASUREMENTS.md, "Desempenho da cena, medido"**.

**O número que importa**: M5 **4.87 ms**/quadro (16.7 ms de orçamento a 60 Hz);
iPhone **4.62 ms** (17.0 ms de orçamento, 55.6 fps) — os dois fecham com
folga, e a DOF e a contagem do bando somam **0.85 ms** de manopla, o resto é
preenchimento irredutível.

## O que falta

Nesta ordem, porque cada uma depende da anterior:

1. Os sete cases em `content/cases/` (e apagar o fixture). **Quatro já
   migrados** — Decision Suite, ZOOMtecnologia, Prime8, Nestlé, todos com
   `river_rank` provisório — ver "São sete cases no repositório" acima. Faltam os
   três escritos do zero (Perfecting, WeCann Atena, Unifique Energia); só
   depois deles o fixture sai.
2. O conteúdo do rio e da Superfície em DOM — capas reais, placas de cota com
   cliente/ano/estação, contato. **O manifesto já existe**
   (`components/beats/AboutBeat.tsx`), e a **geometria** do rio também: o que
   falta ali é conteúdo, não corredor. Com a capa real vêm três decisões que esta
   rodada deixou explicitamente na mesa, todas com o número já medido ao lado:
   o alvo do véu (5.16:1 medido contra um alvo de 5.5 — ver MEASUREMENTS.md, "A
   legibilidade, com capa de card atrás do texto"; **não é o número de slots**,
   que já foi verificado ao vivo e descartado como causa — nunca existiram mais
   de três `[data-veil]` simultâneos contra um teto de quatro. O teto subiu para
   oito mesmo assim, por outro motivo — ver `lib/scene/veil.ts` —, mas se isso
   move o 5.16:1 ainda **não foi reconfirmado**, bloqueado nesta sessão pela
   mesma aba-fora-do-primeiro-plano que também trava o banco de GPU), o
   `accent` de cada card, e se `--coral` passa a acender nas esteiras do rio.
3. ~~O descolamento~~ — **feito e medido**, ver "O descolamento, medido". Sobrou
   dele **o tempo de GPU num iPhone**: o banco mede tempo de parede e por isso
   precisa de uma janela de navegador em primeiro plano no próprio aparelho. No
   M5 os planos `grid` e `cards` já rodaram nesta sessão, os dois na resolução
   errada (ver a nota abaixo, "Débito de resolução"); no iPhone, nenhum plano
   desta rodada — nem `grid`, nem `detach`, nem `cards`, e o véu (abaixo) nunca
   foi medido em tempo nenhum, nem aqui nem lá.

   **As três dívidas — `detach`, `cards` e o véu — agora cabem num carregamento
   só: `?bench=1&plan=debts&port=3131`.** Seis células chained (`chain`
   automático), cada par na faixa em que o efeito importa — ver `DEBTS_PLAN` em
   `lib/scene/bench.ts`. Com `npm run collect` no ar na máquina que serve a
   página, abrir essa URL **no aparelho, com a janela em primeiro plano**
   (a mesma condição que já derrubou esta medição duas vezes nesta sessão — ver
   abaixo) resolve as três de uma vez, no M5 e no iPhone, em ~2 a 2.5 minutos
   cada. **O orçamento de pacote já está fechado** (302.9 kB de chunk de cena
   contra 350, com o véu incluído), então o que falta é confirmar o quadro, não
   caber.

   > ⚠️ **Débito de resolução, achado remedindo isto.** As três rodadas de banco
   > registradas mais acima nesta sessão (`grid` e `cards` × 2) saíram todas a
   > 1456×817–873 (1.19–1.27 Mpx) — metade do buffer canônico do M5 (2160×1254,
   > 2.71 Mpx), porque a janela do navegador não estava no tamanho nativo.
   > Numa cena limitada por preenchimento, "11 a 12% do quadro" medido naquela
   > resolução não é o número real. **Ainda não refeito**: a tentativa de rodar
   > `?bench=1&plan=cards` na resolução certa, nesta mesma sessão, ficou presa
   > em "aba oculta — medição pausada" — o banco mede tempo de parede e por isso
   > exige a janela em primeiro plano, e a janela perdeu o foco para outros
   > aplicativos em uso no momento. O que **foi** refeito na resolução certa é a
   > geometria da pegada (largura projetada, oclusão, borda) via `corridor()`,
   > que não depende de foco — ver a tabela e a investigação em "O rio, medido".
   > O tempo de GPU continua pendente, e `?bench=1&plan=debts` é o caminho: ele
   > mede isto junto com as outras duas dívidas, na mesma janela.
4. **A lâmina do bando.** Não é acabamento: é o bando atravessando o corredor em
   bloco e deixando trechos do rio sem tecido conjuntivo — ver a nota corrigida em
   MEASUREMENTS.md, "Três armadilhas do método, e é aqui que elas ficam
   registradas". O conserto é espalhar o renascimento em `z`, e
   ele muda a densidade que chega ao corpo de prova, ou seja obriga a re-medir os
   critérios de aceite da Identidade e de Quem sou. É uma rodada inteira, e é a
   primeira coisa que o rio pede depois do conteúdo.

   **Agendado: depois do Prompt 5B, antes do Prompt 6.** Não antes: os sete cases
   ainda não existem em `content/cases/`, e a remedição da Identidade e de Quem
   sou não ganha nada rodando contra o fixture `exemplo.mdx`. Não depois: o
   Prompt 6 é o que quer que venha a seguir — hoje candidatos são a Superfície e
   os filtros do rio —, e os dois herdariam uma densidade de bando que ainda vai
   mudar. A remedição do **3B** (descolamento) e do **4** (Quem sou) entram no
   mesmo lote do conserto, não depois dele: é a mesma correção de fonte de dados
   invalidando os dois critérios de aceite ao mesmo tempo, então uma sessão só —
   consertar, remedir os dois, atualizar as duas seções deste arquivo.

   **E o próprio instrumento do rio herdou o problema.** A medição de largura
   projetada de `corridor()` (ver "O rio, medido") mostrou, nesta sessão, o mesmo
   sintoma: dois dos sete cards devolveram larguras **bimodais** entre chamadas
   repetidas no mesmo progresso — a lâmina entrando e saindo da janela de busca
   de um card entre uma amostra e outra. O conserto que espalha o renascimento em
   `z` corrige isto de graça; até lá, `corridor()` precisa de várias chamadas e
   da mediana entre elas para não reportar a fase da lâmina como se fosse a peça.
   Ver o docblock de `footprint` em `lib/scene/probe-cards.ts`.
5. A Superfície, e com ela os pontos de controle definitivos da curva da câmera
   de 0.85 em diante (hoje provisórios, em `lib/scene/curve.ts`), a migração da
   cor da fonte a montante para `--cyan` e `--peach`, e o valor de topo de
   `sourceStrengthAt`, que hoje é um palpite documentado.

   **E, por regra do PROJECT.md §7, a faixa medida de toda entrada que dispara
   um portão visual sai junto.** O `L_cena` do véu já está feito, e o resultado
   foi trocar o mecanismo — ver "O véu de legibilidade": o `f` não é mais
   estimado nem clampado, ele é resolvido da luminância medida do próprio
   quadro, e a faixa está registrada por caixa.
6. Os posters do modo `poster`. O DIRECTION.md §5 manda renderizá-los "destas
   mesmas composições", e três das cinco existem — gerar três agora garantiria
   regerar as cinco depois.
7. A rolagem sintética a 0.6 vh/s até o quadro de separação (DIRECTION.md §4),
   cronometrada — o outro teste de portão. **A varredura de contraste está
   feita** e mora em `__probe.contrast()`: ela desce na mesma taxa de 0.6 vh/s,
   mede cada quadro e cada linha de texto, e passou em quatro condições (ver "O
   véu de legibilidade"). O que falta dela é rodá-la na Superfície quando ela
   existir — **no rio ela já rodou**, e o resultado está em MEASUREMENTS.md, "A
   legibilidade, com capa de card atrás do texto".

O item que era o sétimo — verificar a cena num iPhone contra o piso de 30 fps —
**está feito**: 4.62 ms de GPU por quadro, 55.6 fps, ver "Desempenho da cena,
medido". O que sobrou dele é térmico, e é uma pergunta menor: ninguém mediu a
cena aberta por dez minutos.
