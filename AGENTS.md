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

**Fundação, portão, e a cena com os três primeiros beats — com o descolamento e
o poleiro.** Sobre o esqueleto — rotas, idiomas, tokens, escala tipográfica,
driver de scroll, hooks de capacidade, pipeline de MDX — existem o **preloader e
o portão de entrada**, a **cena contínua de R3F** de 0.00 a 0.45 e a **HUD
lateral fixa**: câmara, névoa em três paradas, bando de 16.384 corpos em FBO
ping-pong, estrutura gravada, corpo de prova em `troika-three-text` com oclusão
real, e o poleiro colunar de Quem sou.

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

Os dois beats de baixo — Trabalho e Superfície — continuam sem conteúdo, e os
pontos de controle da câmera de 0.65 em diante são provisórios (ver
`lib/scene/curve.ts`).

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

Estado medido, com o portão, a HUD e a cena dos três primeiros beats:

| Rota / chunk | gz | contra |
|---|---|---|
| `/` e `/pt` — a descida, com portão, preloader e HUD | **182.8 kB** | 200 kB ✅ |
| `/work` e `/work/[slug]` — acervo e case, sem portão e sem cena | 176.0 kB | 200 kB ✅ |
| **chunk da cena** — three, R3F, `Text` do drei, troika, compositor, shaders, campo de distância, descolamento, **poleiro e véu medido** | **298.6 kB** | 350 kB ✅ |
| chunk do driver de scroll (gsap + ScrollTrigger + lenis) | 48.1 kB | fora da rota inicial |

O descolamento inteiro — o assado do campo (`type-field.ts` + `shaders/field.ts`)
e as três forças no shader dos boids — custou **10.1 kB gz**, de 284.0 para 294.1.
Quem sou custou **4.5 kB**, de 294.1 para 298.6: o poleiro no shader dos boids e
no proxy, e as três passadas novas do véu no compositor. Sobram 51.4 kB do teto
para o rio e a transição para o case.

A HUD inteira — contato, acervo, filtros com estado, régua com as cotas dos
beats, leitura por beat, controle de áudio, colapso no mobile — custou **1.7 kB**
na rota inicial, de 181.1 para 182.8. Nenhuma dependência nova: o que entrou
foram componentes de cliente e dois stores de trinta linhas.

**A sonda de medição não aparece nesta conta porque não existe em produção.**
Verificado neste build: nenhum chunk de `.next/static/chunks` menciona `__probe`,
`installProbe`, `readTextRects` nem `veilFootprint` — e nenhum menciona
`__lenis`, o atalho de desenvolvimento que a varredura de contraste usa para
rolar a página. Ver "A sonda" abaixo.

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
lib/scene/type-field.ts    o assado do campo de distância, do próprio mesh
lib/scene/probe.ts         a sonda de medição (`?probe=1`, só em dev)
lib/scene/probe-contrast.ts a varredura de contraste e a conferência do véu
lib/scene/probe-measure.ts as quatro medidas de aceite e seus controles
lib/scene/curve.ts         a coreografia: câmera, ângulo de ataque, abertura
lib/scene/proxy-sim.ts     64 macro-partículas a 15 Hz — luz, estrutura, véu
lib/scene/veil.ts          lê do DOM as caixas de texto que o véu protege
lib/scene/readout-store.ts o fio da cena para a HUD (DENS., Z) — sem three
lib/scene/gpu.ts           o triângulo de tela cheia e o blit
lib/scene/type-article.ts  o dono do corpo de prova
lib/scene/settings.ts      dof, contagem do bando e ?bench, lidos da URL
lib/scene/bench.ts         o banco de prova: escada de K, estatística, coletor
components/scene/          Scene → SceneWorld → {Chamber, Structure, Flock,
                           Specimen, Composer,
                           SceneClock | ComposedClock | BenchClock}
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

##### A oclusão se prova alternando a peça, e ela tem duas metades

`window.__probe.occlusion()` intercala **três condições quadro a quadro** e conta
corpos por mil pixels dentro da silhueta. Mesmo assentamento, mesma semente,
mesma máscara; a única coisa que muda é o estado da peça.

**E o botão certo é o `depthTest`, não o `depthWrite`.** Os corpos são opacos e
desenham **antes** do glifo, que é transparente — então nada no bando é
descartado por profundidade por causa das letras. O que acontece é o contrário: o
glifo é recortado onde um corpo está mais perto. Desligar o `depthWrite` da peça
não muda nada para o bando; desligar o `depthTest` faz o glifo pintar a silhueta
inteira.

| condição | corpos por mil na silhueta |
|---|---|
| **A** — peça normal | **41.05** |
| **B** — glifo sem `depthTest` (pinta a silhueta inteira) | **1.11** |
| **C** — peça invisível (todos os corpos ao longo do raio) | **53.36** |

- **A / C = 0.769** → a peça esconde **23.1%** do que apareceria sem ela. É a
  oclusão do que está atrás.
- **A / B = 37×** → praticamente tudo que se vê na silhueta some quando o glifo
  deixa de ser recortado. É a prova de que aqueles corpos estão **na frente** e
  sobrevivem pelo teste de profundidade.

Um número sem o outro não decide: `A/C < 1` sozinho poderia ser distribuição, e
`A/B` sozinho não diz nada sobre o que está atrás.

**Por que 23% e não 80%.** A peça está a 14 unidades da câmera e o duto tem 66,
então ela esconde ~50 das 64 unidades de trajeto. Se a cobertura de pixel fosse
uniforme com a profundidade, `A/C` daria 0.22. Dá 0.77 porque **os corpos perto
da lente dominam a área**: um corpo a 2 unidades cobre ordens de grandeza mais
pixels que um a 30. Esse é o mesmo motivo pelo qual a faixa horizontal deixou de
funcionar como instrumento — ver abaixo.

**As três condições são intercaladas, não repetidas no mesmo timestamp.** Um
segundo `advance()` com o mesmo tempo roda a simulação com `dt = 0`, e aí
`energy = |Δv| / (dt·9 + 1e-5)` estoura para 1 em todo corpo: o quadro
"idêntico" sairia com a rampa emissiva inteira diferente. Intercalando, cada
condição vê a mesma evolução amostrada nos mesmos intervalos.

##### O tripleto de faixas foi refeito depois do descolamento, e ele deixou de funcionar

Com a geometria agora registrada em `lib/scene/probe.ts` (τ = 0.070, coluna do
título, faixa das letras `|y| ≤ 0.5 · H`, vizinhas em `[0.6, 1.1] · H` acima e
abaixo, 40 quadros espaçados por um trânsito):

| | por mil |
|---|---|
| acima | 44.71 |
| abaixo | 44.52 |
| **faixa das letras** | **46.69** |

As duas de fora concordam em **0.4%** — controle melhor do que o original. Mas a
do meio **não cai**: sobe 4.7%.

**Isso não é oclusão que sumiu; é o teste que deixou de medir oclusão.** O
tripleto antigo funcionava porque o desvio de campo distante *esvaziava* a faixa
das letras — empurrava todo mundo para fora de uma caixa de 3.2 unidades de
margem. O descolamento faz o contrário: ele **comprime** contra a aresta (anel a
1.361× o fluxo livre). Os dois efeitos — menos corpos atrás por oclusão, mais
corpos na frente por compressão — caem na mesma faixa de tela e se cancelam.

Há um segundo motivo, e ele vale para qualquer medida de oclusão feita a partir
desta câmera: a **cobertura de pixel é dominada pelos corpos perto da lente**.
Um corpo a 2 unidades cobre ordens de grandeza mais pixels que um a 30, e a peça
está a 14 — então esconder tudo que está entre 14 e 66 unidades tira pouca área
da conta. A faixa de tela é o instrumento errado para esta pergunta nesta pose.

**O que continua valendo, e por quê.** A oclusão é estrutural e está no código,
não na calibragem: os corpos são opacos, com `depthWrite` e `depthTest`, e
desenham antes do glifo (ver acima). O que a medição de hoje mostra é a
consequência disso na região que a projeção *consegue* recortar — dentro da
silhueta só aparece o que está entre a peça e a câmera —, e ali o número responde
ao efeito como deve: **56.9 por mil com `?detach=0` contra 28.9 com o
descolamento ligado**, que é o buraco da esteira aparecendo.

O teste feito para a pergunta certa está acima, e é ele que vale: alternar o
estado da peça e comparar o mesmo quadro. O tripleto de faixas fica registrado
como o instrumento que **deixou** de servir, não como o que serve.

#### O descolamento, medido

O frame que o DIRECTION.md §1 chama de "o motivo do site existir". Três forças
no passo de velocidade (`lib/scene/shaders/boids.ts`), todas amostrando **um
campo de distância assado do próprio mesh do troika** — nunca de uma
rasterização paralela.

**O assado** (`lib/scene/type-field.ts`) roda no `onSync` do troika, **uma vez**
por carregamento de fonte, troca de idioma ou troca de corpo: máscara → semente
→ jump flood (11×) → enclausuramento → empacotamento, num RGBA16F de 1024×256
com ~114 texels por caixa alta. A máscara é o **mesh vivo com o material vivo**
numa passagem ortográfica: o troika termina o fragmento com
`gl_FragColor.a *= edgeAlpha`, então o alfa do alvo já é a cobertura do glifo.
Não há segundo material, segundo kerning nem segundo arredondamento.

Três coisas que **não** funcionam e custaram tempo:

- **`scene.overrideMaterial` não serve para a máscara.** O `onBeforeRender` do
  troika pula `_prepareForRender` quando o material não é dele, os uniforms
  `uTroika*` ficam vazios e os quads de glifo rasterizam como retângulos
  sólidos — um campo de distância de uma cerca.
- **Semear o jump flood no centro do texel não basta.** O envelope de raspagem
  do DIRECTION.md §5 (`0.015 · H`) tem 1.7 texels de largura, então ±0.5 texel
  seria 30% de erro. A semente guarda a posição sub-texel da fronteira,
  estimada da cobertura.
- **O alvo precisa ser religado no nulo antes de `readPixels`.** O `blit()`
  restaura o alvo anterior, então o composite final devolve o alvo da cena: os
  pixels chegaram à tela e a leitura sai toda preta.

Verificação do campo, e ela é forte: gradiente unitário (mediana 0.9998);
**marchar 4 texels na direção do gradiente muda `d` em 4 texels** (mediana
0.9994, ou seja o campo é métrico e não um borrão da silhueta); o anel de um
texel fora da tinta tem `d` espalhado pelo texel inteiro (p10 0.121, mediana
0.500, p90 0.907, só 0.44% em zero — semeadura sub-texel de verdade); e o
enclausuramento é **exatamente zero** além de 0.30 · H da tinta.

##### As quatro medidas, com dois controles cada

Instrumento e geometria estão em `lib/scene/probe.ts` e `probe-measure.ts`, e é
de propósito que estejam em código: os três números da prova de oclusão ficaram
sem nenhum registro de onde eram as faixas, qual o limiar ou como se contava, e
por isso não são comparáveis com nada. Aqui a geometria é o código, e os
parâmetros abaixo são o registro.

Progresso 0.18, locale `en`, buffer 1456×857, DPR 1. **700 quadros de
assentamento e 1300 de medição** (ver "a lâmina viajante" abaixo). Controles:
fluxo livre deslocado `3 · H` a montante — mesma pegada de x e y, volume
idêntico — e a mesma máscara com `?detach=0`.

| medida | descolamento on | `?detach=0` |
|---|---|---|
| corpos dentro da pegada da tinta, no plano | **0.154×** o fluxo livre | 1.075× |
| densidade no anel de 0 a 0.12 · H | **1.224×** | 1.075× |
| dispersão angular na contra-forma | **0.049** contra 0.004 | 0.004 contra 0.004 |
| desvio angular médio | **16.3°** contra 4.8° | 4.8° contra 5.0° |
| **comprimento de correlação da direção** | **0.162 · H** contra 0.630 · H | 0.707 · H contra 0.656 · H |
| **sombra a 1, 2 e 4 larguras de letra** | 178.5 · 270.7 · 296.4 por mil | 334.1 · 337.5 · 337.3 |
| **↳ razão sinal sobre controle, mesma laje** | **0.534 → 0.802 → 0.879** | — |
| quadro composto: esteira dentro da silhueta | **33.5 por mil** | 56.6 por mil |
| quadro composto: aresta externa | 39.1 por mil | 58.8 por mil |
| discordância cima/baixo do perfil | 14.7% | 4.6% |
| **coral, fração da população** | **1.84%** | 0.00% |
| rose, fração da população | 4.33% | 5.68% |
| pixels quentes (rose + coral) na tela | **0.61%** | — |

Sensibilidade ao limiar, em 0.8τ / τ / 1.25τ, monotônica nas duas regiões:
aresta 41.1 → 36.5 → 31.7 e esteira 34.6 → 31.8 → 28.3.

##### O recolamento se mede contra a mesma laje, não contra o fluxo livre a montante

A linha em negrito acima é o número honesto, e ela substitui a que estava aqui
antes (0.599 → 0.937 → 1.080). O erro não era de conta, era de **referência**.

O bando **se aperta em direção ao eixo conforme escoa**. Medido com `?detach=0`,
onde não existe efeito nenhum: o raio médio cai de 3.81 para 3.50 entre
`lz = −17` e `lz = +11`, e a fração de corpos dentro da pegada da tinta sobe de
264 para 342 por mil — **+29%, monotônico, sem descolamento**. A contração é de
só 8% no raio, mas a pegada da tinta é uma faixa fina perto de `y = 0` num tubo
de 3.31 de meia-altura, então um aperto pequeno atravessa muita gente para
dentro dela. A causa é uma catraca de mão única: a coesão só puxa para dentro, a
contenção do tubo só empurra para dentro, e os corpos nascem na borda da elipse.

Comparar uma laje a jusante (`lz = +kW`) com uma laje deslocada a montante
(`lz = −(3 · H + kW)`) compara **dois pontos diferentes dessa rampa**, e a
distância entre eles cresce com `k`. Daí o controle "plano" subir sozinho de
1.111 para 1.241: com `?detach=0` a sombra é **plana** em 334–338 por mil nas
três lajes, e quem se move é o denominador — 300.6, 290.5, 271.7.

O estimador certo é o mesmo `shadow` das duas rodadas, laje a laje:
`178.5/334.1`, `270.7/337.5`, `296.4/337.3`. **A esteira fecha até 88% do fluxo
livre em quatro larguras de letra**, subindo monotonicamente. Não até 108%.

O perfil de contração sai em `sim.contraction` em toda medição, para o viés
ficar visível na rodada em vez de virar folclore.

**A linha da correlação é a que fecha o argumento, e ela não estava no plano
original.** Variância angular sozinha não prova turbulência aqui: a força foi
desenhada perpendicular à velocidade, ou seja para produzir exatamente essa
grandeza — um tremor branco passaria. O que separa vórtice de tremor é escala. E
a primeira versão da força **era** tremor: ela montava a base ortonormal a
partir da velocidade de cada corpo, então dois vizinhos recebiam o mesmo ruído
em direções diferentes, e C(r) partia de 0.26 e zerava em 0.45 · H. Com o ruído
virando campo vetorial do espaço, o comprimento medido é 0.162 · H contra
0.630 · H no fluxo livre. E a coluna do `?detach=0` mostra por que isso é a
turbulência e não a geometria do vazio: **sem o efeito, a contra-forma mede o
mesmo que o fluxo livre** (0.707 contra 0.656).

**A escala não é a célula do ruído, e isso também foi medido.** A célula foi de
0.29 para 0.59 e depois para 1.0 caixa alta, e o comprimento ficou entre 0.16 e
0.20 nas três. Quem fixa a escala são o tempo de trânsito (um corpo cruza a
contra-forma em pouco mais de um décimo de segundo, andando 0.3 · H, e amostra
células diferentes mesmo que elas sejam grandes) e o próprio SDF (dentro de um
olho de letra o gradiente aponta para o centro, e lados opostos recebem
empurrões opostos). Fica em 0.85 porque subir mais só uniformiza a força sem
mudar a medida — e força uniforme demais vira lufada, que é o oposto de vórtice.

##### Duas das quatro cores da rampa eram inalcançáveis, e a guarda não sabia dizer isso

> Este é o caso que gerou a regra do **PROJECT.md §7, "Todo limiar é validado
> contra a faixa medida da entrada"**. O que está abaixo é a evidência; a regra
> é que vale para o resto do projeto.

`vDensity` é a contagem de vizinhos dentro de 3 unidades **dividida por 24
amostras**, e o bando é rarefeito. Medido em 16.384 corpos: mediana 0.033, p90
0.073, p99 0.111, **máximo 0.170**.

Os limiares eram `smoothstep(0.45, 1.0)` para o `--rose` e `smoothstep(0.30,
0.90)` para o `--coral`. **Os dois começavam acima do máximo que o canal
consegue produzir.** Duas das quatro cores do DIRECTION.md §5 não existiam na
cena, e a guarda de coral marcava 0.00% não porque a cena estava dentro do teto
de ~10% da §2, mas porque a cor não estava lá. Uma guarda que diz o mesmo número
para "dentro do teto" e para "não existe" não é guarda — é o modo de falha que o
PROJECT.md §7 descreve, medir o modelo mental de quem escreveu em vez do
resultado.

Havia um segundo bloqueio, independente, e ele sobreviveria a qualquer
recalibragem de densidade: **a energia esfriava antes de chegar à esteira.** O
canal usava `mix(anterior, novo, 0.24)` nos dois sentidos, uma constante de
tempo de quatro quadros — 0.07 s, ou 0.4 unidade de deslocamento. A janela de
esteira do coral subia em nove unidades. Medido na esteira, a energia tinha p99
de **0.19** contra o 0.35 que o limiar pedia: um corpo jogado pela turbulência já
estava frio antes de entrar na região onde o coral podia acender.

E havia uma contradição interna: o coral exigia **densidade alta na esteira**,
que é justamente onde a densidade cai — é o buraco que as letras deixam. O §5
separa os dois casos de propósito ("rose em compressão de densidade, coral só na
turbulência da esteira"), e o produto das três condições juntava o que o
documento separa.

Os três consertos:

- **Energia com ataque rápido e decaimento lento** (0.5 subindo, 0.03 descendo).
  A constante de descida vira 33 quadros, 0.55 s, ~3.4 unidades: o corpo esfria
  **ao longo** da esteira em vez de dentro dela. É a diferença entre "o brilho
  segue a aceleração" e "o brilho pisca na aceleração".
- **Limiares tirados da distribuição medida**: rose em `smoothstep(0.07, 0.13)`
  sobre a densidade — o topo ~10% da população.
- **Coral sem o termo de densidade**, com a janela de esteira subindo em uma
  largura de letra e morrendo em sete.

Depois: **coral em 1.84% da população** (teto do §2: ~10%), rose em 4.33%, e
**0.61% da tela** em pixels quentes (teto do PROJECT.md §3.1: 15%). Com
`?detach=0` o coral volta a 0.00%, que é o controle certo — sem turbulência não
há esteira turbulenta para acender.

##### Três armadilhas do método, e é aqui que elas ficam registradas

1. **O limiar de "corpo visível" é τ = 0.070 em luminância linear, e não podia
   sair do vale do histograma.** O vale óbvio do quadro em 0.18 fica em L ≈
   0.045, e 0.045 **é a face das letras**: a densidade dentro da silhueta cai de
   666 por mil em τ = 0.040 para 12.4 em τ = 0.048, e de lá até 0.14 é um platô
   suave. O 0.070 fica no meio do platô e foi escolhido para que **também o
   braço de 0.8×** da varredura de sensibilidade (0.056) fique acima do degrau.
   Sensibilidade medida: aresta 44.1 → 39.4 → 34.3 e esteira 39.2 → 36.3 → 32.2
   em 0.8τ / τ / 1.25τ, monotônicas.
2. **Não existe faixa de fluxo livre nas mesmas alturas nesta cena.** As letras
   alcançam 0.5 · H, a força alcança mais 0.5 · H, e o tubo do bando acaba em
   1.5 · H (raio 4.6 achatado a 0.72 em Y). As duas fronteiras coincidem: uma
   faixa em `[1.2, 2.0] · H` mede a borda do tubo, não escoamento livre. Entram
   no lugar o **perfil vertical inteiro**, com as metades de cima e de baixo
   tendo que concordar (15.1% de discordância média, contra 5.9% sem o efeito),
   e o `?detach=0`.
3. **Com o progresso travado, o bando vira uma lâmina viajante.** Todo corpo que
   passa pela lente renasce em `uCameraZ − 64`, que é um **plano**; com a câmera
   parada é sempre o mesmo plano, e a população se organiza numa lâmina — medido,
   um terço do bando (5.7 mil de 16.4 mil) num único bin de quatro unidades, com
   bins vizinhos vazios. A lâmina cruza o duto em ~640 quadros. Medir menos que
   isso mede a fase dela: a mesma configuração devolveu razão de compressão 1.60
   numa rodada e 1.12 na seguinte, e controles de fluxo livre com **zero**
   corpos. Daí os 700 + 1300 quadros, e daí tudo ser **fração da própria laje**
   em vez de contagem — assim a lâmina se cancela entre numerador e denominador.
   Na descida real a câmera desce, o plano de renascimento se move junto e a
   lâmina se desmancha: é artefato de medir parado, não defeito do bando.

##### As letras das pontas, e o tubo que abre

O título tem meia-largura **7.97** unidades. Com o tubo cilíndrico de raio 4.6
que a cena tinha, os corpos que cruzavam o plano da peça, por quinto do título,
eram **`[0, 96, 308, 114, 0]`**: o C e o A não recebiam **um único corpo**, em
nenhum dos 1300 quadros, com ou sem descolamento. As letras das pontas eram
cenário — e um corpo de prova que só é atravessado no meio não é um corpo de
prova, é um pano de fundo com um jato na frente.

O tubo passou a ser uma **elipse que abre com o progresso**: meia-largura de 4.6
para 8.6 entre 0.05 e 0.16, meia-altura constante em 3.31
(`flockTubeHalfWidth()` em `curve.ts`, constantes em `world.ts`). A Emergência
fica intacta — ela precisa do tubo estreito para "não dá pra saber se a câmara
tem três metros ou trezentos" — e a abertura termina antes de 0.18.

Depois: **`[66, 125, 119, 127, 75]`**. Todos os quintos recebem escoamento, e as
pontas ficam em 53–60% do meio, que é o que a perspectiva e o afinamento da
elipse fazem. O `?detach=0` dá `[74, 119, 124, 124, 77]` — praticamente igual,
que é a prova de que essa distribuição é **geometria do tubo** e não efeito do
descolamento.

O preço está medido: a área da seção quase dobra (47.8 → 89.4 unidades²), então
a mesma população de 16.384 corpos fica quase metade tão densa no plano. É uma
corrente mais fina cobrindo a peça inteira em vez de uma mais densa cobrindo o
meio dela. A contact sheet (`.screens/03b-descolamento.png`) mostra os doze
quadros com o tubo aberto.

#### Quem sou, medido

O beat de 0.28 a 0.45. A composição é uma divisão: **manifesto na margem
esquerda, poleiro do bando à direita, parede graduada correndo entre os dois**.
A câmera deriva para a parede de estibordo e fecha em 3.2 unidades dela em 0.45,
contra 12 no eixo do duto — é o "a estrutura chega mais perto da câmera do que em
qualquer outro momento" do DIRECTION.md §4.

**O poleiro é uma casca cilíndrica, não um poço**, e os dois números que
decidiram isso saíram de medição:

- **Puxar para o eixo produz um caroço.** Com 16.384 corpos, a pressão de
  separação equilibra o puxão só depois de a pilha virar uma bola de ~5 de raio
  — na tela, um borrão redondo de 30% da largura, com `--rose` no meio inteiro.
  Puxando para um **raio** (`ROOST_RADIUS`, em `world.ts`), a mesma população se
  distribui numa superfície, o limbo fica mais denso que o miolo, e é esse limbo
  que se lê como cilindro girando.
- **A captura a 2.5 não formava o poleiro dentro do beat.** Com o arrasto que os
  corpos têm, 2.5 dá velocidade terminal de 2.8 u/s, e um corpo na borda do tubo
  está a dez unidades do eixo: 3.5 s, num beat que dura 3.6. Medido com
  `__probe.descend()` — que desce na taxa de rolagem real em vez de assentar num
  progresso travado —, o que se via em 0.36 era o bando da Identidade ainda
  escoando **atravessado na frente da coluna de texto**. A 6.0 o poleiro está
  formado antes do meio do beat.

O tubo do bando **abre em altura** só aqui (`FLOCK_TUBE_TALL`), de 3.31 para 6.0:
com a meia-altura de cruzeiro a pilha media 6.6 de altura por ~5 de largura, o
que é um aglomerado, não uma coluna.

**A leitura `DENS.` da HUD sai do proxy, e é um censo, não energia.** A energia
de um aglomerado é massa × velocidade, e no poleiro a velocidade cai de
propósito — usá-la como leitura de densidade mostraria o bando ficando *menos*
denso enquanto ele se organiza. `columnShare` conta quantas macro-partículas
estão dentro da coluna. Faixa medida, descendo de 0.28 a 0.45 a 0.6 vh/s, 357
amostras: **mínimo 0.00, p10 0.45, mediana 0.70, p90 0.75, máximo 1.00**. O zero
é a entrada do beat; o platô em 0.70–0.75 é a coluna formada.

**Duas armadilhas de simulação que custaram tempo e estão resolvidas.**

1. **O proxy e a GPU usam o mesmo arrasto por passo com passos diferentes** —
   0.985 a 1/60 s lá, a 1/15 s aqui. Isso é `k = 0.92/s` contra `k = 0.23/s`:
   mesma velocidade terminal, **quatro vezes** a constante de tempo. Copiando a
   aceleração do shader, os centroides do proxy pararam em `x ≈ 2–5` com a
   coluna em 8.6, e a HUD leu `DENS. 0.00` num quadro cheio de bando. A captura
   entra no proxy como **alvo de velocidade** (`força / k`), que é imune ao
   arrasto.
2. **A contenção do tubo cede para o poleiro.** A coluna fica encostada na
   parede, ou seja fora do tubo; uma contenção que continuasse valendo ali
   puxaria os corpos de volta para o eixo do duto e a coluna nunca se formaria
   contra a parede.

**Calor.** O poleiro é compressão, e compressão é `--rose` (DIRECTION.md §5).
Medido, a fração de pixels quentes na tela ao longo do beat é `0.0 · 5.5 · 2.8 ·
2.4 · 2.2 · 2.8 · 6.9 · 11.5 · 4.5` por cento, de 0.30 a 0.46 — **pico de 11.5%
contra o teto de 15% do PROJECT.md §3.1**, e uma segunda rodada mediu 13.5% no
mesmo ponto. É a margem mais apertada da cena inteira, e ela cai justo em 0.44,
onde o poleiro está mais denso pouco antes de soltar. Quem mexer na densidade do
poleiro mede isto de novo.

**E 0.44 não é um progresso qualquer: é a fronteira do beat de Trabalho, que
começa em 0.45.** O ponto mais apertado da cena inteira contra o teto de calor
cai exatamente onde o rio — com capas de card, ou seja mais brilho atrás de
texto — está prestes a entrar. Quem calibrar a cor do rio herda 1.5 a 3.5
pontos de margem, não os ~9 a ~11 que o resto da descida tem, e deve remedir o
pico de 0.44 depois de qualquer mudança na densidade do poleiro ou na paleta
dos primeiros cards.

#### O véu de legibilidade, e por que o mecanismo mudou

O DIRECTION.md §5 desenhou o véu como um termo de densidade ancorado à caixa do
texto, com **um `f` por caixa por quadro resolvido a partir do proxy da CPU**.
Implementado assim e medido no pixel entregue — `__probe.contrast()`, descendo o
beat a 0.6 vh/s —, o pior contraste sob a coluna de manifesto deu **1.21:1**, com
L = 0.65 sob o texto e o `f` parado no piso de 0.15.

**A causa não é calibragem.** A energia do proxy é massa × velocidade, e no
poleiro a velocidade cai: o estimador desce exatamente enquanto o bando se junta
atrás do texto e fica mais brilhante. Era um modelo da cena decidindo pela cena —
o erro que o PROJECT.md §7 proíbe para instrumentos, cometido pelo mecanismo.

O véu agora lê **a própria cena**: o compositor reduz o quadro (cena + bloom, já
tonemapado) por **máximo**, em três passadas de 4×4, até 1/64; uma quarta varre a
região de cada caixa nesse campo e resolve `f = (L − teto) / (L − L_névoa)`. Tudo
na GPU, sem readback. Ver `lib/scene/shaders/post.ts`.

Quatro detalhes que são a diferença entre passar e não passar:

- **`NearestFilter` no campo reduzido.** Com filtro linear, cada amostra é a
  média de quatro texels, e **média de máximos não é máximo**: o véu resolvia
  para L = 0.16–0.20 com o teto em 0.125. É a mesma armadilha do FBO do bando.
- **O véu entra depois do bloom e depois do tonemap.** O bloom é o que espalha a
  luz de um corpo que está *fora* da caixa para dentro dela; e depois do tonemap
  a cor já é a luminância relativa que a conta de contraste usa, então o teto
  deixa de precisar de conversão.
- **As caixas são relidas por quadro.** A cada quatro quadros, uma coluna que
  entrava na tela ficava até 67 ms sem véu, e a varredura acusou: 0.97:1 nos
  primeiros quadros. O custo é 0.68 ms no pior caso para cinco caixas, e é
  sobretudo trabalho antecipado — o layout já está sujo porque o `BeatReveal`
  escreve uma custom property por quadro.
- **A queda do envelope caiu de 0.16 para 0.07 de UV.** A queda larga foi
  desenhada para o mecanismo antigo, em que ela escondia a borda de um retângulo
  que escurecia por igual; com o `f` medido, quem escurece são os corpos. E 0.16
  fazia o envelope da coluna de manifesto chegar a 82% da largura e **apagar o
  poleiro**, que é o assunto do beat.

O teto é `VEIL_CEILING` (`lib/scene/veil.ts`): 0.017 abaixo do alvo de 0.138 do
DIRECTION.md §5, porque o grão é somado depois do véu e mede-se o pixel com grão
e tudo. Com o teto em 0.125 a varredura pousou em **exatamente 0.138**, ou seja
4.50 em cima da linha; a margem existe porque a linha não é lugar de pousar.

##### A varredura, e a faixa medida atrás de cada caixa

`__probe.contrast({ from: 0.26, to: 0.47, rate: 0.6 })`. Ela **desce** na taxa do
visitante lento do DIRECTION.md §4 e mede **cada quadro** — 442 quadros, ~10.7
mil leituras de retângulo —, lendo a luminância máxima sob **cada linha de
texto** (as caixas saem de `Range.getClientRects`, não da caixa do elemento).

Resultado, `en` a 1440×900, com a faixa medida da luminância atrás de cada caixa:

| caixa | pior razão | em | L mín | L mediana | L máx |
|---|---|---|---|---|---|
| about "And I measure what I…" | **4.62** | 0.310 | 0.007 | 0.092 | 0.133 |
| about "The work I want has…" | **4.62** | 0.294 | 0.008 | 0.093 | 0.133 |
| about "I design product and…" | 4.63 | 0.296 | 0.006 | 0.072 | 0.133 |
| hud `ARCHIVE` | 4.67 | 0.340 | 0.006 | 0.009 | 0.131 |
| hud `CONTACT` | 4.72 | 0.329 | 0.006 | 0.010 | 0.129 |
| hud `PROGRESS` | 4.74 | 0.436 | 0.006 | 0.010 | 0.128 |
| hud (nome do beat) | 4.75 | 0.263 | 0.006 | 0.010 | 0.128 |
| hud `EST. NNNN` | 4.78 | 0.276 | 0.006 | 0.009 | 0.127 |
| hud `AUDIO ON` | 4.80 | 0.324 | 0.006 | 0.009 | 0.126 |
| about (rótulo "Who I am") | 4.80 | 0.262 | 0.007 | 0.046 | 0.126 |
| hud `EMAIL` · `IN` · `GH` · `X` · `en` · `pt` | 4.81–4.91 | 0.29–0.35 | 0.006 | 0.009–0.012 | 0.122–0.126 |
| identity (três linhas de posicionamento) | 5.08–5.20 | 0.27 | 0.007 | 0.067–0.096 | 0.113–0.117 |
| work (rótulo) | 5.12 | 0.427 | 0.008 | 0.014 | 0.115 |

**O pior quadro é 4.62:1**, e a distribuição por quadro é p5 4.70, p25 4.84,
mediana 5.21, p95 12.72. Três rodadas do mesmo script devolveram 4.60, 4.62 e
4.63: o bando não é determinístico entre rodadas — o ruído ambiente anda com o
relógio —, e o que é estável não é o pior número, é **o teto onde ele pousa**. A leitura importante é a coluna de L máximo: todas as
caixas param entre 0.113 e 0.133, ou seja **o véu pousa no teto e fica lá** —
é assim que se reconhece um mecanismo exato. A coluna de L mínimo (0.006) é a
mesma cena sem corpo nenhum atrás do texto: a faixa que a entrada percorre é de
duas ordens de grandeza, e é ela que valida o teto.

Nas outras condições exigidas pelo DIRECTION.md §5:

| condição | pior razão | mediana por quadro |
|---|---|---|
| `en`, 1440×900 | **4.62** | 5.21 |
| `pt`, 1440×900 | **4.65** | 5.38 |
| `pt`, 1024×900 | **4.59** | 5.06 |
| `pt`, 500×844 (layout mobile, HUD colapsada) | **4.62** | 4.89 |

**A caixa do véu é conferida antes de qualquer número de contraste**, com
`__probe.veilFootprint()`: o mesmo estado de simulação é renderizado com e sem
véu (dois `advance()` no mesmo timestamp, `dt = 0`, nada se move) e a pegada é o
conjunto de pixels que mudaram. Medido: a caixa reivindicada é `[214, 242, 952,
658]` px, a união das linhas de texto realmente desenhadas é `[224, 256, 914,
643]` — ou seja a caixa contém os glifos com ≥10 px de folga em todos os lados —,
e **96.4% da mudança de pixel cai dentro da pegada prevista**. O resto é o halo
do bloom, que espalha a diferença com amplitude baixa até ~98 px além dela.

##### Duas armadilhas do método

1. **A sonda tranca o scroll, e o Lenis nasce com limite zero.** O portão trava a
   descida com `overflow: hidden` até o clique, e a sonda entra sem clicar: o
   Lenis calcula limite zero e todo `scrollTo` vai para o topo e fica lá. O
   sintoma não é um erro — a varredura roda inteira, mede quadros de verdade, e
   o pior contraste sai de uma caixa do beat errado, com a HUD marcando
   `EST. 0000`. Destravar e **mandar o Lenis remedir**, nessa ordem.
2. **O React não redesenha dentro de um laço síncrono.** A varredura roda tudo
   numa tarefa só, então o *conteúdo* da HUD fica congelado no que ele era
   quando a varredura começou — o rótulo de beat pode dizer "Emergence" no meio
   de Quem sou. A **posição** das caixas está certa (ela sai de layout, que é
   síncrono), então a medição de luminância vale; o que não vale é ler o nome do
   beat no identificador da caixa.

##### Comparação do alvo do véu

O mecanismo mirava exatamente no piso de 4.5:1 — `VEIL_TARGET_CONTRAST` em
`lib/scene/veil.ts` era o mesmo número que `CONTRAST_FLOOR`. Medido, isso
produz margem zero: as quatro condições da tabela acima pousam em 4.59–4.65,
a poucas centenas de um por cento da reprovação. Enquanto a cena inteira até
0.44 é escura o bastante para o véu quase nunca precisar agir, isso não
custava nada; o rio (0.45) entra com capas de card — brilho de imagem atrás
de texto — e a HUD, que está na tela o tempo todo, fica na borda por onde os
cards passam por baixo dela. Antes de decidir a curadoria, valia comparar o
que subir o alvo custa em imagem.

`VEIL_TARGET_CONTRAST` foi desacoplado de `CONTRAST_FLOOR` (que continua
sendo só o piso de reprovação, aplicado em `probe-contrast.ts`), e três
valores acima do piso foram testados um de cada vez — editar a constante,
recarregar, e para cada um: `__probe.contrast()` para o pior quadro medido no
beat de Quem sou (0.28–0.45, en, 1440×757, mesma metodologia da tabela
acima), e `__probe.descend({from:0.20, to:0.40, rate:1, settleSteps:700})`
seguido de screenshot para ver a cena no momento em que o poleiro já está
formado (roost.amount = 1) e o manifesto está na tela.

| alvo | pior razão medida | mediana por quadro | L teto entregue |
|---|---|---|---|
| 4.5 (piso, sem margem) | 4.55 | 5.02 | ~0.121 |
| 5.5 | 5.57 | 6.02 | ~0.087 |
| 6.5 | 6.73 | 7.21 | ~0.063 |
| 7.5 | 7.97 | 8.45 | ~0.046 |

Todos os quatro passam pelo piso com folga crescente — o pior quadro medido
fica sempre ~0.05–0.07 acima do alvo, a mesma margem de grão de sempre. A
captura visual, no mesmo quadro (progresso 0.40, poleiro formado, manifesto na
tela):

- **4.5** — o retângulo do véu não é visível a olho nu: a coluna de texto lê
  contra a cena viva, o cacho rose/cyan do poleiro continua brilhante logo
  atrás dela. É o estado atual do repositório.
- **5.5** — o retângulo escurecido atrás do texto passa a ser visível — não
  como um scrim opaco, mas como uma região claramente mais escura que a
  vizinhança, com a queda de `VEIL_FALLOFF` suavizando a borda.
- **6.5** — o retângulo é sensivelmente mais escuro que em 5.5; o salto de 4.5
  para 5.5 e de 5.5 para 6.5 são visíveis em quantidade parecida.
- **7.5** — quase indistinguível de 6.5 a olho nu neste quadro. A luminância
  linear segue caindo (0.063 → 0.046), mas depois do tonemap e num quadro que
  já não estava no pico de brilho, a diferença marginal fica pequena. Subir o
  alvo além de 6.5 compra mais margem numérica do que efeito visível.

Os quatro screenshots foram gerados nesta sessão e não fazem parte do
repositório — refazer é reproduzir a tabela acima e capturar de novo.

**Escolhido: 5.5.** Olhando as quatro imagens lado a lado, foi o primeiro
ponto em que o retângulo do véu passa a ser visível sem virar um scrim — 6.5
já lia perceptivelmente mais escuro pelo mesmo motivo que 7.5 quase não lia
diferente de 6.5 (ver acima). `VEIL_TARGET_CONTRAST` está travado nesse valor
em `lib/scene/veil.ts`, com o piso de reprovação (`CONTRAST_FLOOR`, em
`probe-contrast.ts`) intocado em 4.5.

**E 5.5 é setpoint de controlador, não valor final — DIRECTION.md §5
registra isso.** Esta comparação rodou sem o beat de Trabalho existir: nenhum
card, nenhuma capa de imagem atrás de texto. O rio entra em 0.45 com
exatamente esse caso — brilho de foto, não de bando —, e a HUD (a caixa mais
exposta do site, na tela o tempo todo) fica na borda por onde os cards
passam por baixo dela. 5.5 é o ponto de partida para o beat de Trabalho, não
a palavra final; reavaliar quando o rio existir.

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
cortar pela capacidade do aparelho que estiver montando (~8 no desktop, ~4 no
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

Varredura sintética de 0.00 a 0.28, passo de relógio fixo em 1/60 s, DPR travado
em 1.5. O harness é `?bench=1` (`components/scene/BenchClock.tsx` +
`lib/scene/bench.ts`); leia o cabeçalho daquele módulo antes de mexer em
qualquer número desta seção.

**Como repetir isto num aparelho.** Suba a build de produção na rede local
(`npx next start -H 0.0.0.0 -p 3100`) e abra `http://<ip-da-máquina>:3100/?bench=1`
no aparelho. Ele entra no portão sozinho, roda as quatro configurações do plano
— dof on/off cruzado com 16.384 e 4.096 corpos — e recarrega entre elas; um
painel no canto mostra o progresso e, no fim, os números. `?chain=0` mede uma
configuração só, e `?dof=`/`?flock=` escolhem qual. O relatório é postado em
`http://<mesmo-ip>:3131/report`. **Agora existe um coletor** — `npm run collect`
(`scripts/collector.mjs`, só builtins do Node): ele grava
`.screens/bench/<run>.json`, imprime uma linha por configuração e imprime na
subida o endereço para digitar no telefone. Sem ele o painel continua dizendo
"COLETOR MUDO" e os números ficam na tela para serem copiados à mão — e
transcrição à mão já produziu número falso neste projeto. **Nada disso existe
sem `?bench=1`** — o banco custa 3.1 kB gz no chunk da cena e não roda sozinho.

**`?plan=detach`** roda o plano focado de duas células — descolamento ligado
contra desligado, com dof e bando no padrão. Duas e não oito porque o
comportamento térmico do aparelho é a única coisa desta seção que continua **não
verificada**: cada configuração roda 22 a 25 s, e um 2×2×2 são três minutos e
meio de telefone na mão. `?plan=grid` (o padrão) continua sendo o 2×2 de
regressão. A **linha 0 de todo plano tem que ser igual aos `DEFAULTS` de
`settings.ts`**: o primeiro passo é entrado por um `?bench=1` pelado, então ele
renderiza o padrão — um plano que diga outra coisa na linha 0 reporta uma
configuração e mede outra, em silêncio.

O relatório ganhou `gpuPerFrameMedianMs` ao lado do p95 e da manchete. As três
juntas, nunca a mediana sozinha: **a mediana descreve o quadro típico e a média
descreve o trabalho** — é a distinção que o cabeçalho de `lib/scene/bench.ts`
existe para defender.

### A sonda — medição de pixel e de simulação, fora do pacote

`?probe=1`, e ela **não existe na build de produção**: o ramo em `SceneWorld`
começa com `process.env.NODE_ENV !== "production"`, que o Next substitui por
literal, e o import inteiro cai. Verificado no build — nenhum chunk menciona
`__probe`. Enquanto o banco mede **tempo** e por isso precisa rodar em produção,
a sonda mede **pixel e estado da simulação**, e esses são idênticos nas duas
builds (mesmos shaders, mesmo three, mesmo teto de DPR). Os 57 kB que sobram do
teto de 350 são para o rio, não para instrumentação.

A sonda não roda laço: a cena fica parada e cada chamada avança o relógio em
passos fixos de 1/60 s antes de ler. `window.__probe` expõe `meta()`,
`settle()`, `step()`, `viewport()`, `readField()`, `readSim()`, `planeMap()`,
`measure()` e `sheet()` — a última monta a contact sheet num canvas 2D e a POSTa
em `/shot` no coletor.

**Duas armadilhas de ambiente, e as duas custam uma hora se não estiverem
escritas.** A primeira: o portão é aberto **por atributo**, não por clique. O
contador dele é dirigido por `requestAnimationFrame`, que o Chrome congela
quando a janela está coberta ou a aba não está ativa — e esse é o estado normal
de uma sessão dirigida por ferramenta. Esperando a fase "ready" como o banco
faz, a sonda esperaria para sempre. A segunda, e é a que decide se dá para medir
alguma coisa: **`document.visibilityState` precisa ser `"visible"` para o R3F
sequer criar o canvas** — o `react-use-measure` depende de `ResizeObserver`, que
não entrega callback em aba oculta, e sem tamanho o R3F não cria a raiz. O
sintoma é um `<canvas>` de 300×150 dentro de um container de 1456×857 e nenhuma
mensagem de erro em lugar nenhum.

**Pelo mesmo motivo o banco não roda numa aba oculta**, e aí não há contorno: ele
mede tempo de parede quadro a quadro, o que exige quadros de verdade. O banco
precisa de uma janela em primeiro plano. No celular, tire o Modo de Baixo Consumo (ele trava o rAF em 30 Hz e
você mediria a bateria) e o Reduzir Movimento (ele troca a cena pelo modo calmo,
que é outra carga); o relatório traz `displayMs` e `sceneMode` justamente para
denunciar as duas coisas.

| aparelho | buffer | dof | bando | **GPU/quadro** | p95 | quadro em K=1 |
|---|---|---|---|---|---|---|
| **M5** (ANGLE/Metal) | 2160×1254 · 2.71 Mpx | on | 16.384 | **4.87 ms** | 6.26 | 16.7 ms · 59.9 fps |
| M5 † | 2160×1170 · 2.53 Mpx | on | 16.384 | 4.36 | 13.54 | 16.7 · 59.9 |
| M5 † | 2160×1254 | off | 16.384 | 3.91 | 10.43 | 16.7 · 59.9 |
| M5 † | 2160×1254 | on | 4.096 | 4.34 | 13.54 | 16.7 · 59.9 |
| M5 †‡ | 2160×1254 | off | 4.096 | 3.67 | — | 16.7 · 59.9 |
| **iPhone** (iOS 18.7, 60 Hz) | 585×1048 · 0.61 Mpx | on | 16.384 | **4.62 ms** | 4.81 | 18.0 ms · 55.6 fps |
| iPhone | 585×1048 | off | 16.384 | 4.20 | 4.56 | 17.0 · 58.8 |
| iPhone | 585×1048 | on | 4.096 | 4.20 | 4.25 | 17.0 · 58.8 |
| iPhone | 585×1048 | off | 4.096 | 3.77 | 3.94 | 17.0 · 58.8 |

† **As quatro linhas do M5 vieram de duas corridas**, com alturas de janela um
pouco diferentes (2.53 e 2.71 Mpx), e o normalizado por pixel entre elas varia
~4%. Elas servem para a comparação entre aparelhos e **não** para montar um 2×2
do desktop; as diferenças de DOF e de bando no M5 estão dentro dessa dispersão.
As quatro do iPhone, essas sim, são um quadrado limpo — mesmo buffer, mesma
sessão. ‡ o ponto mais fundo limpo desta linha foi K=8, não K=16: a aba ficou
oculta durante o K=16 e a média de 1020 ms denunciou.

**O iPhone fecha, e fecha com folga.** 4.62 ms num quadro de 17.0 ms são 28% do
orçamento a 60 Hz e 14% do piso de 30 fps do PROJECT.md §5. Nenhuma configuração
mediu abaixo de 55 fps, e o pior quadro das três foi 23 ms. A cena **não** precisa
ser estruturalmente diferente no celular — isso estava em dúvida e deixou de
estar.

O porquê é aritmética de preenchimento, e ela quase se cancela: a GPU do telefone
é **4.2× mais lenta por pixel** (7.53 contra 1.80 ms por Mpx) e desenha **4.4×
menos pixels**, porque o DPR travado em 1.5 sobre uma viewport de 390×699 dá
0.61 Mpx contra 2.71 do desktop. O teto de DPR do PROJECT.md §5 não é higiene:
é ele que faz a conta fechar.

### O 2×2 do iPhone, e o que ele diz sobre a regra de corte

As quatro células do celular saíram do mesmo aparelho, com o mesmo buffer e zero
paradas, então dá para lê-las como um quadrado:

| GPU/quadro | 16.384 corpos | 4.096 corpos | **Δ bando** |
|---|---|---|---|
| **dof on** | 4.62 ms | 4.20 ms | 0.42 |
| **dof off** | 4.20 ms | 3.77 ms | 0.43 |
| **Δ dof** | 0.42 | 0.43 | |

**As duas economias somam e não se sobrepõem** — 4.62 − 3.77 = 0.85 = 0.42 +
0.43, com as diagonais batendo em 0.01 ms. Isso dá o número que importa para
qualquer decisão futura de corte: **3.77 ms são irredutíveis** e 0.85 ms é tudo
que existe de manopla. Cortar a DOF *e* três quartos do bando compra 18% do
quadro.

Consequências, e a primeira contraria o que estava escrito:

- **A DOF custa 0.42–0.45 ms, não 1.72.** Ela continua sendo o primeiro item da
  lista de corte do DIRECTION.md §3, mas agora se sabe que cortá-la devolve
  pouco — ~9% do quadro. A regra continua certa por outro motivo: ela é o corte
  mais barato em imagem, não o mais rendoso em tempo.
- **A contagem do bando não é grátis no celular, e é no desktop.** No M5, 4.096
  e 16.384 corpos ficam dentro do ruído — é por isso que a contagem foi ao teto
  de 16k do DIRECTION.md §5. No iPhone os mesmos dois pontos diferem 0.42 ms, o
  mesmo que a DOF inteira. É a única medida aqui que se comporta diferente nos
  dois aparelhos.
- **Nenhuma das duas salva um aparelho que não fecha.** Se algum dia faltar
  quadro, as manoplas dão 0.85 ms e o resto está no preenchimento. A alavanca de
  verdade é resolução — e ela já está travada em DPR 1.5.

### O método, e o número que ele derrubou

**O 13.77 ms que esta seção trazia não existia.** Ele vinha de
`EXT_disjoint_timer_query_webgl2`, e a query envolve o blit final para o
framebuffer padrão: a espera pelo *drawable* acontece **dentro** dela. Medindo
assim, um quadro de 16.70 ms de parede reporta 16.41 ms de "GPU" — o cronômetro
estava cronometrando o vsync. Pela mesma razão, a DOF a 1.72 ms e o par
13.91/13.93 do bando são leituras do mesmo instrumento e não valem.

O que mede é **renderizar o mesmo quadro K vezes e olhar a vazão**: tudo que
acontece uma vez por quadro — vsync, drawable, composição da página — vira
coeficiente linear e sai da conta. As passadas extras usam o mesmo timestamp,
então o R3F entrega delta 0 e nada na cena se move; o que se paga K vezes é o
desenho.

E o que **reprova** a query é um teto físico, não uma preferência: em 60 quadros
de 77.86 ms com K=16, a GPU não pode ter feito 16 × 9.95 ms de trabalho por
quadro. A parede tem esse teto; a query não. Em três configurações independentes
a query pediu 2.00×, 2.06× e 2.10× mais do que a parede permite.

Quatro armadilhas que custaram rodadas e estão resolvidas no harness:

- **A mediana do tempo de quadro mente sobre trabalho.** Com K=16 no M5 ela é
  16.70 ms — a mesma de K=1 —, porque o navegador continua chamando o rAF no
  vsync enquanto a fila da GPU cresce, e a conta chega de vez em quando num quadro
  de 216 ms. Quem mede trabalho é a média.
- **Aba oculta não mede nada.** Janela do Chrome coberta pelo terminal derruba o
  rAF, e a escada vira ficção sem parecer errada. O banco pausa em
  `document.hidden` e descarta quadros acima de 400 ms, contando as paradas no
  relatório. As três corridas do iPhone tiveram **zero**.
- **O período da tela é medido, não suposto.** Quarenta quadros vazios no começo:
  17.00 ms no iPhone (58.8 Hz), 16.70 no M5. Sem isso não dá para saber se um
  quadro de 16.7 ms é a GPU ou o monitor — e num ProMotion seria 8.3.
- **A cerca (`fenceSync` + `clientWaitSync`) não funciona** num laço que não
  devolve a thread: o Chrome só atualiza o objeto de sincronização entre voltas do
  laço de eventos, então a sondagem bate no teto de espera todo quadro.

**O que continua não verificado:** comportamento térmico. Cada configuração roda
22–25 s e o telefone foi medido frio. Para uma descida de oito segundos isso é o
regime certo, mas ninguém mediu a cena aberta por dez minutos.

## O que falta

Nesta ordem, porque cada uma depende da anterior:

1. Os sete cases em `content/cases/` (e apagar o fixture). **Quatro já
   migrados** — Decision Suite, ZOOMtecnologia, Prime8, Nestlé, todos com
   `river_rank` provisório — ver "São sete cases no repositório" acima. Faltam os
   três escritos do zero (Perfecting, WeCann Atena, Unifique Energia); só
   depois deles o fixture sai.
2. O conteúdo dos beats de baixo em DOM — contato e placas de cota. **O
   manifesto já existe** (`components/beats/AboutBeat.tsx`).
3. ~~O descolamento~~ — **feito e medido**, ver "O descolamento, medido". Sobrou
   dele **o tempo de GPU**: o banco mede tempo de parede e por isso precisa de
   uma janela de navegador em primeiro plano, que esta sessão não teve. Rodar
   `?bench=1&plan=detach&port=3131` com `npm run collect` no ar, no M5 e no
   iPhone, e escrever os números na tabela de "Desempenho da cena". **O
   orçamento de pacote já está fechado** (298.6 kB de chunk de cena contra 350),
   então o que falta é confirmar o quadro, não caber. Junto com ele vai o custo
   do poleiro e das três passadas do véu, que também não foi medido em tempo de
   GPU — o banco precisa de uma janela em primeiro plano, e esta sessão não teve.
4. Os dois beats de baixo, e com eles os pontos de controle definitivos da curva
   da câmera de 0.65 em diante (hoje provisórios, em `lib/scene/curve.ts`) e a
   migração da cor da fonte a montante para `--cyan` e `--peach`.

   **E, por regra do PROJECT.md §7, a faixa medida de toda entrada que dispara
   um portão visual sai junto.** O `L_cena` do véu já está feito, e o resultado
   foi trocar o mecanismo — ver "O véu de legibilidade": o `f` não é mais
   estimado nem clampado, ele é resolvido da luminância medida do próprio
   quadro, e a faixa está registrada por caixa.
5. Os posters do modo `poster`. O DIRECTION.md §5 manda renderizá-los "destas
   mesmas composições", e só duas das cinco existem — gerar duas agora garantiria
   regerar as cinco depois.
6. A rolagem sintética a 0.6 vh/s até o quadro de separação (DIRECTION.md §4),
   cronometrada — o outro teste de portão. **A varredura de contraste está
   feita** e mora em `__probe.contrast()`: ela desce na mesma taxa de 0.6 vh/s,
   mede cada quadro e cada linha de texto, e passou em quatro condições (ver "O
   véu de legibilidade"). O que falta dela é rodá-la nos beats de baixo quando
   eles existirem.

O item que era o sétimo — verificar a cena num iPhone contra o piso de 30 fps —
**está feito**: 4.62 ms de GPU por quadro, 55.6 fps, ver "Desempenho da cena,
medido". O que sobrou dele é térmico, e é uma pergunta menor: ninguém mediu a
cena aberta por dez minutos.
