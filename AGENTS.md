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

### Rodada 14 (2026-09-30): o rio pára em cada card

Primeira das rodadas 14 a 18 do plano de 2026-09-30 (ritmo do rio, cor no
bando, vida nas paredes, natureza no lugar das cotas, assinatura LRC,
variante amanhecer — as decisões estão no topo do DIRECTION.md). Feito: um
gesto de roda leva a um card (antes: uma tela atravessava 2, duas telas 4), a
câmera repousa em cada leitura, e o mobile deixou de ter a câmera num beat e o
DOM em outro. Números em MEASUREMENTS.md, "Rodada 14, medida"; folha em
`.screens/14-rio.png`. **Próximo: rodada 15, cor no bando e luz colorida nas
paredes.**

### Onde paramos (2026-09-25, fim da rodada 13)

Branch `fundacao`, árvore limpa, último commit da rodada: `72a9bcb`. Nada foi
enviado ao remoto. As folhas de conferência estão em `.screens/13-*.png` (a
pasta é ignorada pelo git): `13-frame.png` e `13-frame-sem-peca.png` (o quadro
do descolamento, 0.14 a 0.24), `13-descida.png` (0.00 a 1.00), `13-capas.png`,
`13-quem.png`, `13-emergencia.png`.

**O que está de pé e medido** (MEASUREMENTS.md, "Rodada 12, medida" e "Rodada
13, medida"):
- a descida inteira sem retângulos: Emergência, Identidade e Quem sou;
- o bando de volta como massa: 1042 corpos no terço central em 0.18, contra
  1007 na rodada 8, sem borda recortada;
- cada card lido de perto (0.47 a 0.51 da largura);
- capas com luz própria e as geradas com teto de 2.5× o original;
- saída do case por clique fora, `Esc`, `← RIO` e voltar, com Δ 0;
- console limpo;
- contraste de 5.67:1 ou mais na descida (pt e en) e 5.95:1 no case;
- pacotes dentro dos tetos (188.0 / 187.0 / 332.2 kB).

**Próximos passos, e de quem é cada um:**
1. **Do Lucas: material real para Perfecting, WeCann e Unifique.** Uma captura
   de tela de produto já serve. Enquanto forem gradientes gerados, são os pontos
   mais fracos do rio, e dois estão no topo do ranking.
2. **Do Lucas: colar a "Regra de governança"** no topo deste arquivo, sem edição.
   Ela nunca chegou ao repositório.
3. **Do Lucas: a Superfície sépia** (hoje sépia, não teal com luz peach). É
   decisão de estilo: se for escolha, risca-se a pendência; se não, entra no
   próximo prompt.
4. **Rodar o crítico**, agora que o bando voltou a passar pela peça. A
   referência é a `13-frame.png`.
5. **Rodada própria: a silhueta a 3:1 no pixel** (0.74:1 hoje). Pede o bando
   como massa finita atravessando as letras (item 9 de "O que falta").
6. **A GPU como fração dos 16.7 ms.** O cronômetro de query satura nesta
   bancada (tela de 75 Hz): falta um método que não dependa dele. Hoje só vale
   o teto: quadro mediano de 13.3 ms, p95 de 14.1 ms.

**Para retomar a bancada** (servidor `next dev` na 3000, Chrome próprio por CDP
na 9222, coletor na 3131): ver MEASUREMENTS.md, "A bancada da rodada 13".

**A rodada 13 devolveu o bando e tirou três retângulos.** O teto de 6 px da 12
tinha transformado o bando em pó; agora o corpo é um **núcleo** pequeno e opaco
(que escreve profundidade e mantém a oclusão) mais um **halo** gaussiano, do
tamanho que o corpo teria, misturado pelo **máximo** — e o critério passou de
tamanho para borda (MEASUREMENTS.md, "Rodada 13, medida"). As capas geradas
têm teto de ganho (entregue ≤ 2.5× o original), e o halo em volta dos cards —
que era a DOF puxando a peça nítida para o fundo borrado — saiu. Os retângulos:
o de Quem sou era a quantidade de névoa desenhando as seções (o concreto sem
luz agora é a própria névoa); o bloco solto era a face de um quadro acesa pelo
poleiro (a luz do bando no quadro caiu para 30%); e a Emergência ficou igual.

**A rodada 12 corrigiu oito defeitos de imersão, sem mudar o estilo.** Ver
MEASUREMENTS.md, "Rodada 12, medida", para os números. Em uma linha cada:
o script do portão saiu do componente (`next/script` no layout) e o console
está limpo; o case sai pelo clique no vazio e pelo `Esc` (`CaseExit`); as capas
têm luz própria (um ganho por imagem); cada card é lido de perto, com uma
parada da curva por card (`riverStops()`); os corpos têm teto de tamanho na
tela e brilho por densidade; a névoa não desenha mais a seção da câmara (o
`--deep` virou halo da fonte, por direção); a câmera não atravessa mais a
palavra no fim da Identidade; e a placa perdeu a franja (bisel acromático, sem
aberração cromática). Fora da lista, e achado medindo as saídas do case: o
portão reabria ao voltar para o rio, e ficava em `opening` se desmontado no
meio da abertura — os dois consertados em `GateOverlay`.

**A descida existe de ponta a ponta (rodada 11).** A Superfície fecha 0.85–1.00:
a câmera vira do último card para a tomada de ar — aletas verticais na
abertura, a luz de fora entrando em lâminas pela névoa, a cota ±00.000 gravada
na soleira —, o bando dá a volta e sai pelas frestas, e o último quadro fica
parado no viewport terminal com a câmara vazia e a luz. Contato em DOM (e-mail
por extenso, perfis, idioma) e uma frase de despedida. Com ela vieram a passada
de robustez — modo calmo verificado **na imagem** (`.screens/11-calmo.png`),
posters para o modo sem WebGL, teclado de ponta a ponta, `hreflang`, Open Graph
com imagem da cena, `sitemap.xml`, telefone com menos corpos e menos pixels,
LCP de todas as rotas abaixo de 2.5 s — e **o véu trocou de mecanismo**: ele
comprime a luz atrás do texto em vez de pintar uma sombra (ver "O véu de
legibilidade"). Números em MEASUREMENTS.md, "A Superfície e a robustez,
medidas".

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
permanente com contato, acervo, filtros, régua e idioma — e o véu de
legibilidade **refeito**, porque a varredura de contraste reprovou o mecanismo
antigo com 1.21:1.

**O corredor do rio está feito e medido** (ver "O rio, medido"): sete cards
montados em cinco estações ao longo de 27 unidades, planos na cena com
perspectiva real e **esteira própria por card** — a mesma física do descolamento
com o campo de distância resolvido analiticamente no shader, sem assado. A curva
da câmera de 0.45 a 0.85 deixou de ser provisória.

**E o rio tem conteúdo, curadoria e filtros que mexem no escoamento.** Os sete
cases existem em `content/cases/` — quatro migrados com mídia real e três
(Perfecting, Unifique Energia, WeCann Atena) como **placeholder de frontmatter
real com corpo por escrever**; o fixture `exemplo.mdx` foi apagado. A curadoria
é o `river_rank` de cada um, e o corte por aparelho sai dela (7 no desktop, 4 no
mobile). Sobre isso, nesta rodada:

- **capas reais** no material dos cards, numa `sampler2DArray` por camada, com o
  campo procedural rebaixado a estado de espera — nunca um cinza (`card-atlas.ts`);
- **placa de cota gravada com cliente, título e ano**, em dois níveis de detalhe
  num só par de canais, com o segundo entrando na aproximação (`card-layout.ts`);
- **resposta de ponteiro** por raycast analítico contra os quads projetados,
  medida do evento ao quadro pintado: **28.2 ms de mediana, 29.0 de pior caso**
  contra o teto de 100 ms (`card-pick.ts`);
- **filtros que reorganizam o rio** promovendo ao eixo e recuando à periferia,
  sem recarregar e sem trocar de rota, com o bando mudando de rota junto
  (`river-flow.ts`);
- a varredura de contraste refeita com o rio no ar: **5.79:1 no pior quadro**,
  contra o piso de 4.5 e o alvo de 5.5 do véu.

Ver, no MEASUREMENTS.md, "A legibilidade, com capa de card atrás do texto", "A
placa de cota, e a resposta de ponteiro" e "O filtro reorganiza o escoamento".
Contact sheet da travessia em `.screens/05b-rio.png`.

**E a travessia do rio para o case existe, medida.** O canvas **não remonta**
entre a home e um case: a cena subiu para o layout de um grupo de rotas
(`app/[locale]/(scene)/`) que cobre `/` e `/work/[slug]` e deixa `/work` de fora.
O clique num card leva a câmera até ele, a peça casa com o retângulo da capa em
DOM — **0.0024 px** de desencontro contra 212 px de controle — e entrega o pixel
com 252 ms de sobreposição, sem nenhum quadro em que nenhuma das duas desenhe.
Sair devolve a câmera ao progresso exato de onde saiu (Δ = 0.00000), pelos três
caminhos: o controle da HUD, a lista de estações (hoje os links invisíveis dos
cards) e o botão voltar do navegador.
Ver "A travessia para o case, medida" no MEASUREMENTS.md.

Com ela vieram **a rota de case de verdade** (capa, metadados em mono, corpo com
a mídia intercalada e medida de leitura conferida no pixel) e **o caminho de
teclado, de sem-JS e de indexação para os sete cases** — até aqui o rio existia
só na cena e não tinha `href` nenhum. Ele nasceu como uma lista de estações
visível e foi **retirado da tela** na rodada seguinte (6.5): hoje são links
invisíveis, e o foco é mostrado pelo próprio card. Ver "Beats".

**E a câmara deixou de ser uma caixa (rodadas 6.5 e 7).** A 6.5 só tirou: a
lista de estações visível (os links dos cards ficaram, invisíveis, com o foco
mostrado pela peça), o controle de áudio da HUD, e a afirmação de que a
curadoria tinha sido decidida olhando os cards — ela está **pendente**. A 7
construiu a câmara: seção que varia ao longo do eixo, quadros com chanfro,
portais no rio, nichos nas estações, gravação recessada, números gravados, uma
parede de fundo com a abertura da fonte, bolsões de névoa, e o portão mostrando a
câmara de verdade pelas frestas. Ver "A câmara" abaixo e MEASUREMENTS.md, "A
câmara, medida".

**E o bando mudou na rodada 8.** O rim da peça acende pela contagem de corpos
diante da face, por coluna, na GPU; o brilho dos corpos segue a densidade; uma
onda de pressão atravessa o duto; o renascimento se espalha em z (a lâmina saiu);
o rosa só aparece na compressão diante de uma peça. Ver MEASUREMENTS.md, "O
bando e o frame, medidos".

**E a câmara voltou a ser escura na rodada 9.5.** O concreto não tem termo
ambiente; a luz dos aglomerados tem alcance curto; cinco quadros em vez de onze;
o frame é visto fora do eixo (decisão do Lucas); o portão mostra corpos isolados
perto da lente. A silhueta sem a malha **não chegou a 3:1 no pixel** — ver
MEASUREMENTS.md, "O escuro e o ângulo, medidos", e a decisão pendente lá.

**Não entraram nesta rodada, e é deliberado:** o corpo dos três cases
placeholder e a tradução de `summary_en` (hoje cópia do português nos quatro
migrados). A Superfície continua sem conteúdo e os pontos de controle da câmera
**de 0.85 em diante** seguem provisórios (ver `lib/scene/curve.ts`).

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
grão e DOF em ~200 linhas (a aberração cromática saiu na rodada 12 — separação
de canal, vetada pelo PROJECT.md §2), e o chunk da cena fechou em **284 kB gz**.

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
npm run measure    # o orçamento de JS, lido do prerender desta build (ver abaixo)
npm run covers     # regera as capas provisórias dos cases sem mídia real
npm run covers:derive # a capa de entrega de cada case (public/covers/) — rode ao trocar uma capa
```

Node 24 (`.nvmrc`); o mínimo do Next 16 é 20.9. Não há suíte de testes.

---

## Arquitetura

### Estrutura de pastas

```
app/[locale]/          rotas; o layout raiz é app/[locale]/layout.tsx
app/[locale]/(scene)/  o grupo que **é dono da cena**: home + /work/[slug]
app/[locale]/(archive)/ o acervo, deliberadamente fora dele — /work sem 3D
components/gate/       o preloader e o portão de entrada (o beat "pré")
components/scene/      a cena 3D e o portão que escolhe qual versão roda
components/work/       o DOM da rota de case: chegada e volta ao rio (o `← RIO`,
                       e `CaseExit`: clique no vazio e `Esc`; a escolha de
                       histórico mora em `lib/work/leave-case.ts`)
components/hud/        a HUD lateral fixa (substitui o rodapé; não há rodapé)
                       Hud (servidor) → HudPanel (colapso no mobile) → régua,
                       leitura por beat, filtros do rio, idioma, acervo
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
(`driven | composed | poster`) e informa em qual rota do grupo ela está. Nomes
parecidos, papéis sem interseção.

Não existe `src/`. O alias é um só: `@/*` → raiz do repositório.

### Os dois grupos de rota, e por que a cena mudou de casa

O layout raiz continua sendo `app/[locale]/layout.tsx` (html/body,
`ScrollProvider`, `Hud`). Abaixo dele há **dois grupos**, que não aparecem em
nenhuma URL:

```
app/[locale]/(scene)/layout.tsx             monta <SceneGate>, resolve o rio
app/[locale]/(scene)/page.tsx               a home — o portão continua só aqui
app/[locale]/(scene)/work/[slug]/page.tsx   o case
app/[locale]/(archive)/work/page.tsx        o acervo, sem cena
```

**O mecanismo inteiro da travessia é essa divisão.** Quem está no mesmo grupo
divide a mesma instância de layout, então navegar de `/` para `/work/[slug]`
reconcilia o `(scene)/layout.tsx` em vez de remontá-lo: o `<div>` do
`SceneGate`, o `<Canvas>` e o contexto WebGL atravessam a troca de rota **vivos**.
Sem isso não existe "sem tela branca" — existe um canvas novo com um bando novo,
e nada que se possa animar entre os dois.

`/work` fica de fora de propósito: o DIRECTION.md §4 quer o acervo em "DOM puro,
sem cena, sem 3D", e ali a cena **deve** cair. Isso é medido, e é o controle da
verificação de persistência (MEASUREMENTS.md).

**O comentário do layout raiz que recusava hospedar a cena foi revertido, com o
motivo preservado.** Ele existia para um link direto de case não pagar 350 kB no
caminho crítico — e isso continua verdade, porque `loadScene()` continua sendo
`import()` memoizado pedido depois do primeiro quadro útil. O que mudou é que o
case também tem cena, porque o DIRECTION.md §4 sempre disse que tem.

> **Não mova o `<Gate />` para o layout do grupo.** Ele é o beat "pré" da
> descida, e quem chega direto num case por link não tem descida para destravar.

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
| `/` e `/pt` — a descida, com portão, preloader, HUD, os links dos cards, o controle de áudio, a Superfície e o poster sem WebGL | **186.6 kB** | 200 kB ✅ |
| `/work/[slug]` — o case, sem portão, **com a cena em chunk dinâmico** | **184.9 kB** | 200 kB ✅ |
| **chunk da cena** — three, R3F, `Text` do drei, troika, compositor, shaders, campo de distância, descolamento, poleiro, véu medido, o corredor do rio, o conteúdo dele e **a travessia para o case** e **a câmara** (planta, loft, quadros, gravação, números) e **a Superfície** (aletas, soleira, lâminas de luz, saída do bando) | **332.2 kB** | 350 kB ✅ |
| chunk do driver de scroll (gsap + ScrollTrigger + lenis) | 48.0 kB | fora da rota inicial |

**Rodada 13.** Chunk da cena **332.2 kB** (+2.7: o halo do bando, a guarda da
DOF, o piso de névoa do concreto). Rota inicial sem mudança. Sobram 17.8 kB.

**Rodada 12.** 188.0 kB na home (+1.4: o `next/script` do layout), 187.0 kB no
case (+2.1: `CaseExit` e `leaveCase`) e **329.5 kB** no chunk da cena (+3.6: o
ganho das capas, o teto dos corpos, o halo da névoa, o campo próximo da DOF).
Sobram 20.5 kB do teto da cena.

**Rodadas 10 e 11.** O som custou 0.9 kB na rota inicial (o controle e os dois
stores; o leito é um `import()` depois do gesto, num chunk à parte) e 0.2 kB no
chunk da cena. A Superfície custou **5.8 kB** no chunk da cena (319.9 → 325.9 com
o som): aletas e soleira na malha, o céu, as lâminas, a luz de fora no concreto
e nos corpos, e a saída do bando nos boids e no proxy. Na rota inicial, 1.3 kB:
o `ScenePoster` com o véu em 2D e o DOM da Superfície. **Sobram 24.1 kB do teto
da cena** e 13.4 da rota inicial.

`/work` não entra na tabela e não é esquecimento: ele lê `searchParams`, então é
renderizado sob demanda e não há HTML pré-renderizado no disco para o
`npm run measure` ler — e o script existe justamente para não levantar servidor.
O que ele carrega é um subconjunto do que o case carrega, menos a cena.

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

**O conteúdo do rio custou 4.4 kB**, de 302.9 para 307.3: as duas texturas em
camadas e o desenho da placa (`card-atlas.ts`), a geometria das duas regiões
(`card-layout.ts`), o raycast analítico do ponteiro (`card-pick.ts`), o desvio
lateral do filtro (`river-flow.ts`) e o material novo.

**A travessia para o case custou 3.2 kB**, de 307.3 para 310.5 (a retirada da
rodada 6.5 — foco de teclado no card, `projectCard` — levou a 310.8, e **a câmara
da rodada 7 a 315.9**, +5.1 kB, sem arquivo de modelo: a geometria é gerada da
planta): as duas poses e
a inversão da curva (`case-pose.ts`), a máquina de estados por quadro
(`case-drive.ts`), a textura de entrega com o recorte e as quatro passagens
novas no material dos cards. Sobravam 39.5 kB do teto; com a câmara da 7, o bando da 8 e as capas da 9, **sobram 30.1 kB** para a Superfície.

Na rota inicial ela custou 1.6 kB na home (a lista de estações — hoje os links
invisíveis dos cards — e o store da travessia) e 7.4 kB no case, que ganhou três coisas que não tinha: a montagem da
cena, o mesmo store e o `next/image` do corpo do artigo.

As **texturas** não entram nesta conta e não deveriam: sete camadas de capa a
640×326 mais sete de placa a 1024×118 são ~9 MB de VRAM, e VRAM não é pacote —
o que o teto de 350 kB mede é o que a rede entrega e o motor de JS executa. As
imagens de capa são baixadas dentro do chunk da cena, depois do primeiro quadro
útil, e enquanto não chegam quem desenha é o campo procedural.

**E o payload da curadoria fica na rota inicial, medido.** A ordem dos sete
cases desce do servidor como prop do `SceneGate` (`lib/scene/river-content.ts`),
ou seja no payload RSC dentro do HTML: **0.43 kB gz** dos 6.0 kB do HTML da home.
A conta das tags `<script src>` — que é a régua com que todo o histórico desta
tabela foi levantado — não se move: 182.4 kB antes e depois. O `npm run measure`
imprime as duas ao lado uma da outra, para a diferença nunca ficar fora da
conta.

A rota inicial **não mudou**: 182.8 → 182.4 kB, dentro da variação de hash de
build. O rio inteiro vive no chunk dinâmico, como tem que ser.

A HUD inteira — contato, acervo, filtros com estado, régua com as cotas dos
beats, leitura por beat, controle de áudio, colapso no mobile — custou **1.7 kB**
na rota inicial, de 181.1 para 182.8. Nenhuma dependência nova: o que entrou
foram componentes de cliente e dois stores de trinta linhas.

**As sondas de medição não aparecem nesta conta porque não existem em
produção.** Verificado neste build: nenhum chunk de `.next/static/chunks`
menciona `__probe`, `installProbe`, `installCorridor`, `cardWake`,
`readTextRects`, `veilFootprint`, `installCaseTrace` nem `__caseTrace` — e
nenhum menciona `__lenis`, o atalho de desenvolvimento que a varredura de
contraste usa para rolar a página. Ver "A sonda" abaixo.

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

**Hoje é `npm run build && npm run measure`**, e o script
(`scripts/measure-bundle.mjs`) fecha o erro abaixo por construção: ele não
levanta servidor nenhum. O HTML que ele lê é o prerender que **aquela** build
escreveu em `.next/server/app/*.html`, os chunks citados nele são resolvidos no
disco da mesma build, e um chunk citado e ausente **derruba a medição com erro**
em vez de valer zero. Ele também acha os dois chunks dinâmicos por conteúdo
(three+troika para a cena, ScrollTrigger+lenis para o driver), confere que a cena
não vazou para a rota inicial, e confere que a sonda não existe em produção.

O erro que produziu números falsos, e que o script existe para tornar
impossível: eu media contra um **servidor antigo ainda no ar**
(`pkill -f "next start"` não pega o processo) enquanto o `.next` já tinha sido
reconstruído. O HTML servido citava chunks com hash velho, o laço de medição
pulava em silêncio os arquivos que não existiam mais, e o total encolhia a cada
rebuild. As três precauções, para quando alguém medir à mão:

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

**A exceção declarada: a deriva da Emergência** (rodada 12, `SceneWorld`). Com
a câmera parada no eixo, qualquer borda ficava imóvel na tela como moldura; até
0.11 a pose ganha uma deriva de ~0.2 unidade que corre no **tempo**, não no
progresso — do mesmo tipo do bando, que também anda sem scroll. Não existe no
modo calmo.

`velocity` existe no store como leitura de HUD e **não dirige nada**. A regra
da variável única continua valendo.

**A rolagem não é o progresso: há um mapa por beat entre os dois** (rodada 14,
`lib/scroll/descent-map.ts`). As seções medem `vh` no desktop e `mobileVh` no
mobile, e o progresso é o dos `from`/`to` de `BEATS`; o store publica
`descentFromScroll(rolagem)` na descida, e `consumeScrollRequest` devolve
`scrollFromDescent(pedido)` ao driver. Sem o mapa, no mobile a câmera entrava
no rio com Quem sou na tela. **Quem rola o documento a partir de um progresso
passa pelo mapa** — o driver, o passo do rio e a varredura de contraste.

**O rio anda um card por gesto de roda** (rodada 14, `stepRiver` no
`ScrollDriver`, pelo gancho `virtualScroll` do Lenis). Um evento de roda com a
leitura vizinha a no máximo um intervalo vira uma viagem de 1.1 s até ela, e o
resto do gesto é engolido até a viagem acabar e a roda silenciar 240 ms. Nas
pontas do rio não há vizinha e a rolagem é livre. As leituras vêm de
`lib/scene/river-readings.ts`, que **não importa three** porque o driver o lê
(senão a cena entraria no chunk do scroll). E a curva repousa em cada leitura
(`RIVER_HOLD` em `curve.ts`): 56% da rolagem entre dois cards deixa a câmera
parada, o que segura o toque, onde o passo não vale.

**E a variável é da descida, não da rota em que se está.** O driver publica
`lenis.progress`, que é a rolagem do documento atual — na home isso **é** a
variável, num case é a leitura de um artigo. Sem separar as duas, rolar o corpo
de um case varreria o progresso de 0 a 1 e mandaria a câmera atravessar a câmara
inteira enquanto alguém lê. Então o store tem um **papel**
(`ScrollRole = "descent" | "page"`), derivado do `pathname` num lugar só, o
`ScrollProvider`:

- `"descent"` — a rolagem é a variável, como sempre foi;
- `"page"` — a rolagem vai para `pageProgress` (leitura, não dirige nada) e
  `progress` **congela** no último valor. Esse congelamento é o que faz "a câmera
  volta para a posição do rio de onde saiu" ser consequência, e não restauração.

`requestScrollTo(progresso)` é o único jeito de pedir uma rolagem de fora, e o
driver continua sendo o único dono do Lenis. **O pedido é retido até o papel
virar `descent`**: entre o clique de voltar e o commit da rota passam quadros em
que o documento ainda é o do case, e atender ali levaria a página errada para o
lugar errado.

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
lib/scene/card-layout.ts   onde a capa e a placa ficam no card, e a resolução delas
lib/scene/card-atlas.ts    as capas e as placas, em texturas por camada
lib/scene/card-pick.ts     qual card está sob o ponteiro, o clique e a latência
lib/scene/river-content.ts o conteúdo curado que desce do servidor para a cena
lib/scene/river-flow.ts    para onde o filtro move cada card
lib/scene/case-pose.ts     o encaixe da capa, o repouso, e a estação da volta
lib/scene/case-drive.ts    a travessia quadro a quadro — o lado da cena
lib/scene/case-trace.ts    a sonda da travessia (dev): costura, buraco, linhas
lib/work/case-transition.ts o estado da travessia, fora do React e da cena
lib/scene/type-field.ts    o assado do campo de distância, do próprio mesh
lib/scene/probe.ts         a sonda de medição (`?probe=1`, só em dev)
lib/scene/probe-contrast.ts a varredura de contraste e a conferência do véu
lib/scene/probe-measure.ts as quatro medidas de aceite e seus controles
lib/scene/probe-cards.ts   a separação em profundidade e a esteira por card
lib/scene/probe-round12.ts ocupação na leitura, capas, corpo, onda, faces
                           chapadas e placa — as medições da rodada 12
lib/scene/curve.ts         a coreografia: câmera, ângulo de ataque, abertura,
                           névoa, fonte a montante, esteiras do rio
lib/scene/chamber-plan.ts  a planta da câmara: seção por z, quadros, nichos,
                           números gravados — a fonte única da geometria
lib/scene/chamber-geometry.ts a malha da câmara, lofteada da planta
lib/scene/engraving-atlas.ts o campo de altura dos números gravados (Geist Mono)
lib/scene/probe-chamber.ts presença, paralaxe e gravação — a sonda da câmara
lib/scene/scene-painted.ts "a cena pintou" — o fio do compositor para o portão
lib/scene/shaders/ahead.ts corpos diante da face da peça, por coluna, na GPU
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

**Núcleo e halo** (rodada 13; `BODY_VERT`/`GLOW_VERT` em `shaders/body.ts`).
O **núcleo** é o fuso, com teto por eixo em px de CSS (`BODY_MAX_PX` 3.5 ×
`BODY_MAX_WIDTH_PX` 2, com o fator (1 + tan²) de fora do eixo; `uFocalPx` vem
do `Flock`). Ele é opaco e escreve profundidade: a oclusão das letras depende
dele. O **halo** é um quad por corpo, gaussiano, alongado na direção do voo, com
o tamanho que o corpo da rodada 8 teria (1.5×, teto 45 px, largura 0.25 do
comprimento), testando a profundidade sem escrevê-la. Quatro coisas que
custaram uma medição cada:

- **Mistura pelo máximo, não pela soma.** Aditivo, o poleiro empilhava
  centenas de halos numa parede de luz.
- **Teto na amplitude, antes da gaussiana** (`GLOW_PEAK`). Um halo claro demais
  satura no tonemap e vira barra de ponta dura.
- **Só com o bando formado** (`uForming`), senão acende a Emergência; e **baixo
  no rio** (`uCardAmount`), senão a DOF do corredor o desmancha em névoa em
  volta das capas.
- **Alpha-to-coverage não serve** para amolecer a silhueta do fuso: com 4
  amostras vira pontilhado, e cada pixel pontilhado é borda nítida.

O brilho segue a densidade: isolado 0.5, aglomerado até 1.75 (a rampa da
rodada 8).

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

**Rodada 11: o véu comprime a luz; ele não pinta sombra.** Até aqui ele
misturava a caixa inteira para `--void` na força que o pixel mais claro atrás
dela exigia, e um corpo aceso atrás de uma palavra escurecia a caixa toda —
inclusive o que já era escuro. Na tela isso era um retângulo preto de borda
borrada atrás do texto, e o Lucas o apontou como amador, em todo beat. Agora
cada pixel é dobrado pela **própria** luminância: abaixo de 55% do teto nada
muda, acima disso um joelho exponencial o aproxima do teto sem cruzá-lo, com a
cor escalada (o matiz fica). O escuro continua escuro, então não existe caixa;
o que cede é só o que é claro. O `f` resolvido virou o **portão** do véu (liga
quando algo passa do teto, desliga devagar), não a força. Ver `applyVeil` em
`shaders/post.ts`. A regra que sobra é de composição: **texto mora onde a cena
já é escura** — a Superfície foi enquadrada assim, e é o que faz a compressão
quase não aparecer.

#### O rio, medido

> **Rodada 12: a leitura é de perto.** As paradas de 0.45 a 0.85 são geradas da
> corrente deste aparelho (`riverStops()` em `curve.ts`), uma por card, à
> distância em que ele ocupa `READING_FILL` = 0.48 da largura (6.2 unidades num
> 16:10, até 16 num telefone em pé). `stationProgress` é o `at` dessa parada.
> Os números abaixo, de largura projetada entre vizinhos, são da curva antiga.

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

#### A travessia para o case

O beat que não é um beat: ela não tem faixa de progresso, ela tem uma rota. Três
poses e dois escalares, misturados **dentro** do laço mestre — uma pose aplicada
depois dele seria sobrescrita no quadro seguinte.

```
curva(p) ──amount──▶ encaixe(card, retângulo da capa) ──recede──▶ repouso
```

Método, controles e números — costura de 0.0024 px, zero quadros de buraco,
volta com Δ de progresso 0.00000 — em **MEASUREMENTS.md, "A travessia para o
case, medida"**.

Quatro coisas que decidem se ela funciona, e todas custaram uma medição:

- **O `pathname` manda; o clique só adianta.** O clique publica `entering` na
  hora (senão há tempo morto até o payload chegar) e a rota confirma, corrige ou
  desfaz. É isso que faz o mecanismo cobrir o botão voltar, o link direto, o
  acervo, o reload e a navegação abortada — nenhum desses passa pelo clique.
- **A distância do encaixe sai do retângulo entregue**, o
  `getBoundingClientRect()` do `<img>` da capa, não de uma constante. Por isso a
  CSS é dona do corpo da capa e a cena só lê: não existe segunda fonte de verdade
  para desencontrar.
- **A entrega espera o DOM, nunca o contrário.** A cena avisa que atracou, o
  `<img>` sobe por cima com o corte de 120 ms, e só **depois** a peça sai do
  quadro. Esconder no instante em que o voo fecha abriria 120 ms sem nenhuma das
  duas — a tela em branco que a rodada existe para não ter.
- **A capa entregue vem do `currentSrc` do próprio `<img>`.** Pedir a URL do
  frontmatter baixaria uma segunda imagem, em outro tamanho, e as duas deixariam
  de ser a mesma imagem justamente no quadro em que uma substitui a outra.

#### A câmara

`lib/scene/chamber-plan.ts` é a planta, e tudo que tem forma lê dela: a malha
(`chamber-geometry.ts` → `Chamber.tsx`), os números gravados (`Structure.tsx`),
o proxy da CPU (que prende as luzes **dentro** das paredes de verdade) e a sonda.
Mexer numa medida da câmara é mexer num lugar só.

- **Seção variável**: garganta antes do corpo de prova (±8.8, teto 5), paredes a
  ±12 até o rio, alargamento assimétrico no rio (14.2 a bombordo, 13.8 a
  estibordo — mais largo que isso a parede some na névoa), piso descendo para
  −7.6. A parede de estibordo fica em 12 de −15 a −51: é a que o poleiro e a
  câmera de Quem sou raspam.
- **Quadros**: cinco, a 19 / 16.5 / 21.5 / 15 unidades — com onze, os portais
  do rio viravam um túnel de molduras concêntricas. No rio eles são **portais** (avançam 2.2,
  0.8 de espessura). Um quadro nunca cai dentro de um nicho — o filtro está na
  planta, e **já derrubou os portais uma vez em silêncio** quando a espessura
  subiu e a folga não: confira `plan.ribs` depois de mudar nicho ou quadro.
- **Nichos** alinhados aos cards **deste aparelho** (`resolveRiver()`): no mobile
  eles ficam em outros z.
- **Um material, três papéis**, pela normal: piso com luz direta, parede de
  raspão, teto quase sem luz. **Nada emite e não há ambiente** (rodada 9.5): a
  luz é `practicalLightNear` (alcance ~7.5) mais a fonte a montante,
  fraquíssima. O raspão da fonte só vale em superfície paralela ao eixo; na
  parede do fundo ele a transformava num retângulo aceso.
- **Gravação** é campo de altura com a normal derivada dele (`ENGRAVING_GLSL`):
  réguas, marcas 7/11, cota do piso e a seta de escala da peça são analíticas no
  shader; os números são placas instanciadas com um atlas em Geist Mono, que
  **descartam fora da vala** e usam o mesmo `shadeConcrete` da parede — por isso
  não há borda de decalque.
- **A fonte do fundo é a abertura, não a parede.** A luz a montante tem termo de
  incidência (com raspão só a mais de ~10 unidades da abertura). Sem ele a
  parede do fundo, coplanar à abertura, saía mais clara que a própria fonte.
- **A cor da névoa não depende da profundidade** além de ~14 unidades (rodada
  12): o `--deep` é o halo da fonte, **pela direção do raio** (`sourceHalo`).
  Pesar o halo pela profundidade redesenha as seções da câmara como retângulos
  concêntricos.
- **O concreto sem luz é a própria névoa** (rodada 13, `fogColorAt` como piso em
  `shadeConcrete`; o céu atrás da abertura também). Sem isso a **quantidade** de
  névoa, que cresce com a profundidade, pintava cada seção num tom, e o salão do
  rio lia como um retângulo claro visto de Quem sou. A estrutura aparece só onde
  a luz toca e nas valas. `PROBE_BLACK` devolve esse piso.
- **O quadro recebe pouca luz do bando** (30%, pelo `vKind`): a face interna de
  um quadro rente ao poleiro acendia inteira e lia como um bloco solto.
- **Bolsões de névoa** (`fogPocket`, em `shaders/fog.ts`) são fixos em z e
  amostrados ao longo do raio, não só no ponto: um bolsão entre a câmera e a
  parede vela a parede, um atrás dela não.

`PROBE_BLACK` é um `#define` que só a sonda liga (o concreto sai preto antes da
névoa); em produção o bloco não existe no programa compilado.

#### O rim da peça, e o bando que o acende

O rim do corpo de prova lê `flockAheadField`: uma textura 32×1 com a contagem
ponderada de corpos entre a face e a câmera, por coluna ao longo da largura da
peça, feita em **dois estágios** no `Flock` (32 × 128 somas parciais, depois 32
somas). Um estágio só — 32 fragmentos lendo o bando inteiro em série — custou
8.6 ms no M5: sem fragmentos o bastante, a GPU não esconde a latência. **Nada
volta para a CPU**; `flockAhead` (o do proxy) ficou como fallback enquanto o
campo não existe.

O rosa do bando depende de **densidade e** proximidade da aresta de ataque de
uma peça (`nearLeadingEdge`, em `shaders/body.ts`, lendo `uCards`). Sem a
segunda condição, qualquer aglomerado denso virava rosa e o teto de 15% caía.

#### O desfoque não pode riscar, nem virar quadrado

A profundidade de campo é separável, em meia resolução. Com poucas amostras e
passo largo, um corpo pequeno e claro vira um pente de riscas — lia como grade
no portão. Por isso o núcleo tem **dez** amostras com deslocamento por pixel
(`DOF_FRAG`), e a abertura máxima é **0.5** (`APERTURE_WIDE`). Subir qualquer um
dos dois é refazer a folha do portão.

**A gaussiana é truncada em ~3σ** (rodada 12): com σ de cinco amostras ela
parava em exp(−2), e o produto de duas passadas separáveis de uma gaussiana
cortada é um quadrado — todo corpo claro desfocado virava caixa. σ = 3.13 e
passo 13.4, mesmo raio.

**A peça nítida não sangra no fundo borrado** (rodada 13, `uLeakGuard`, pela
rampa do rio): uma amostra mais perto e mais nítida que o centro perde o peso.
Era o halo em volta de cada card.

**O campo próximo desfoca sempre** (`cocAt`, menos de 2.5 unidades), com a
abertura em zero inclusive; por isso as passadas rodam sempre que a DOF está
ligada, e não só com abertura > 0. Dentro do case ele sai junto com o resto
(`uNearBlur = 1 − caseRecess`).

#### A capa tem luz própria

Da rodada 9 à 11 a capa era placa fosca iluminada só pelo bando, e longe dele
sumia (0.003 a 0.054 de L entregue na leitura). Desde a rodada 12 ela é uma
impressão iluminada por trás: `uCoverGain[i]`, calculado em `card-atlas.ts` da
luminância média **linear** da camada quando ela chega, leva a imagem a
`COVER_SELF_TARGET` antes da névoa; o bando soma por cima; um joelho alto
(`COVER_KNEE` → `COVER_CEILING`) segura fundos brancos. **É um ganho por
imagem**, e é de propósito: a capa do ZOOM tem L média 0.03 e a da Decision
Suite 0.29. **O teto é 3.3** (rodada 13): com 16, as capas geradas chegavam a
9× o próprio valor e viravam telas acesas; o Lucas fixou entregue ≤ 2.5× o
original. **Na peça atracada tudo isso sai** — a entrega ao `<img>` do case
precisa dos mesmos bytes; é a rampa `docked` que faz a troca. Mexer nesse `mix`
é mexer na costura da travessia.

A tinta e o bisel da placa são **acromáticos**: somar mist→cyan de um lado do
traço e subtraí-lo do outro pintava franja vermelha e ciano, que lia como
separação de canais.

#### A Superfície

O beat de 0.85 a 1.00, e o último quadro depois dele. Tudo que a tomada de ar
tem mora em `chamber-plan.ts`, porque a malha, o concreto, as lâminas de luz e o
bando precisam concordar sobre onde ela está:

- **`OUTSIDE_LIGHT`** — a direção da luz de fora, quase axial (desce 0.55 por
  unidade, desvio lateral de 0.22). Quase axial de propósito: as lâminas são
  planos verticais, e só vistas de perfil elas se separam. A primeira versão
  (venezianas horizontais, luz de cima) empilhava as oito lâminas num cone só
  de névoa acesa.
- **As aletas** (`LOUVER_*`, `louverGaps()`) — nove, verticais, giradas em
  torno do próprio eixo: comem 48% do passo. A faixa acesa na soleira
  (`louverOpen` no concreto) e o feixe no ar saem das mesmas bordas.
- **As lâminas no ar** (`BEAM_*` em `shaders/chamber.ts`) — um prisma por
  fresta, e o fragmento resolve analiticamente quanto do raio de visão
  atravessa o prisma. De perfil, um fio claro; de frente, um véu fraco.
  Aditivas, sem escrever profundidade, e colapsadas fora do volume de recorte
  enquanto `uOutside` é zero.
- **`uOutside`** (`outsideAt` em `curve.ts`) — mora nos uniforms da névoa, então
  todo material o vê: o céu atrás das aletas, a névoa esquentando para
  `--peach` perto da abertura, a luz de fora no concreto e nos corpos que
  cruzam uma lâmina.
- **A saída do bando** (`exitAt`, `uExit` nos boids e no proxy). Três lições,
  cada uma de uma medição que deu zero corpo no quadro: a virada é
  **decisiva** (um `smoothstep` até 0.3 da rampa, não proporcional), só vira
  **quem está à frente da lente** (virar o bando em volta da câmera acende uma
  tempestade de lascas), e sai **mais rápido que a câmera anda** (a −0.4 × drive
  a câmera ultrapassava o bando e ele estacionava inteiro atrás dela). Quem
  passa pela abertura, ou fica atrás da lente, **estaciona** em `PARKED` e não
  renasce enquanto a saída durar — é isso que deixa o último quadro vazio.
- **A última cota** — `SURFACE_COTA`, `COTA ±00.000`, gravada no topo da
  soleira. O portão abre na cota −38.402, "onde se está antes de entrar"; a
  descida termina na referência de nível, com as mesmas três casas.

**O enquadramento serve ao texto.** A abertura fica na metade direita e a
coluna de contato na esquerda, sobre concreto escuro; as lâminas descem para a
direita, para longe dela. É o que dispensa o véu ali — medido com `?veil=0`.

#### O modo calmo, e a armadilha que ele tinha

`ComposedClock` assentava o bando **antes** de o laço mestre aplicar a pose da
composição nova — o bando assentava com a câmera, o poleiro e a saída da
anterior. O poleiro de Quem sou nunca ligava (a composição saía sem coluna) e
o rio assentava com a câmera da Identidade. Só apareceu quando a verificação
passou a ser **na imagem**. Agora há um quadro antes do assentamento, como a
sonda já fazia. O rio assenta 240 passos (700 represam o bando contra as
peças) e a Superfície 45 (700 levariam o bando inteiro embora).

**`window.__calm.capture(beat)`** (só em dev, no `ComposedClock`) devolve o
quadro composto lido do buffer do WebGL. É a fonte da folha `11-calmo.png`, dos
posters e da imagem de Open Graph — `npm run measure` confere que ele não
existe em produção.

#### Os posters e o véu em 2D

Sem WebGL, `ScenePoster` desenha `public/posters/<beat>.webp` num canvas 2D e
troca por beat. **O véu vem junto, em 2D**: sem compositor, o texto ficava
direto sobre as frestas (0.88:1); debaixo de cada `[data-veil]` o poster é
escurecido só o quanto a luminância máxima dele ali exige, contra o mesmo
`VEIL_CEILING`. **Regerar a cena é regerar os posters** — mexer num beat e não
recapturar deixa este modo mostrando outro site.

#### A capa de entrega

`cover` no frontmatter diz qual é a capa; `coverSrc` é o que viaja —
`public/covers/<slug>.webp`, derivado por `npm run covers:derive`. O case, a
cena e o Open Graph leem o mesmo arquivo, então a entrega da travessia continua
sendo os mesmos bytes. O original do Prime8 (PNG de 3840 px, 698 kB) punha o
LCP do case em 10.8 s. **A build cai se a capa de entrega faltar**
(`deliveryCover` em `lib/cases.ts`).

#### O compositor

Cena → DOF → **campo do véu** → composite, tudo sobre `WebGLRenderTarget`. Ele
desliga o render automático do R3F ao se inscrever com prioridade 1.

O alvo da cena é multiamostrado **e** tem `DepthTexture`: o three inclui
`DEPTH_BUFFER_BIT` no blit de resolução, então dá para ter antisserrilhado
geométrico e círculo de confusão por pixel ao mesmo tempo.

### O portão de entrada

**As frestas mostram a câmara de verdade** desde a rodada 7. Quando o compositor
pinta o primeiro quadro (`lib/scene/scene-painted.ts` — o `import()` resolver não
basta: o código chegou, os shaders não), o `GateOverlay` tira o próprio fundo e
o canvas 2D passa a limpar as frestas e desenhar só lâminas, sombra, véu e o grão
das faces (`setWindow`, em `dormant-field.ts`). A troca é de um quadro para o
seguinte. Antes disso, e sempre sem WebGL, é o campo dormente. **Enquanto
`data-gate` é `closed` ou `opening`, a HUD e a descida ficam `visibility:
hidden`** (`globals.css`), senão apareceriam pelas frestas; sem JS o atributo não
existe e o site aparece inteiro. As lâminas têm espessura em perspectiva a partir
do horizonte delas, chanfro e sombra na fresta vizinha.

> ⚠️ **Pendente, decisão do Lucas**: em p = 0 a câmara real é quase preta (névoa
> espessa da Emergência, os ~330 corpos do piso de população ficam dentro dela),
> então o portão em modo janela perdeu a vida que o campo dormente dava. O
> DIRECTION.md pede as duas coisas — a câmara verdadeira pela fresta e "o portão
> precisa ter alguma coisa viva nele". Não resolvido mexendo no bando.

**O convite ocupa a casa do número** (`GateInvite.tsx`): o número continua no
layout, invisível, e o convite é desenhado por cima com a altura dos algarismos.
É a **marca gravada** — decisão do Lucas, 2026-09-25; o glifo `↓` saiu do código.

`components/gate/` — o beat "pré" do PROJECT.md §4. Ele **mora na home**
(`app/[locale]/page.tsx`), não no layout: quem chega direto num case por link
não tem cena para carregar nem descida para destravar.

```
Gate.tsx           servidor: resolve os rótulos, escreve a trava e o <noscript>
GateOverlay.tsx    cliente: o relógio único — contador, veneziana, campo
dormant-field.ts   o organismo dormente, canvas 2D sem dependência
readout.ts         14.617 M/S, COTA −38.402 — e por que esses números
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
`closed` (trava `overflow: hidden`), `opening`, `open`. Quem o escreve é o
`GateOverlay`; a trava do primeiro paint é CSS sobre o `data-gate-phase` do
overlay, e o `scrollRestoration` de um reload na home é um `next/script`
`beforeInteractive` no layout raiz (`RESTORE_SCRIPT`), porque um `<script>`
dentro de um componente não roda quando ele monta por navegação de cliente.
Sem JS o `<noscript>` esconde o portão: o site sem JS é o site sem cena, não um
site trancado.

**O portão se atravessa uma vez por carga da página** (`crossed`, estado de
módulo): voltar de um case para o rio remonta o `Gate` por navegação de
cliente, e ele nascia fechado — o rio voltava ao progresso exato atrás da
veneziana. E a limpeza apaga `opening` além de `closed`: quem clica num card
antes de a veneziana terminar desmontava o portão no meio da abertura, e o case
ficava em `visibility: hidden` para sempre.

**O clique faz três coisas no mesmo handler, síncronas** — destrava o áudio,
libera a descida e dispara a veneziana. O `unlockAudio()` precisa ser síncrono
dentro do gesto; um `await` antes dele já perde o gesto em alguns navegadores.
E a descida é liberada no clique, não no fim da transição: prender o scroll por
mais 1.45 s comeria da regra dos oito segundos sem nada em troca.

**A camada sonora (rodada 10) também é sintetizada, e não tem laço.**
`lib/audio/sound-bed.ts` gera ruído ao vivo num AudioWorklet (texto levado ao
`addModule` por URL de blob) — um buffer em laço teria emenda audível. O leito
passa por um passa-baixa dirigido pela **abertura** da câmara e pela **pressão**
do bando perto da câmera, e por um passa-faixa largo que acompanha o progresso;
as duas leituras chegam por `lib/audio/field-store.ts` (sem imports, publicado
pelo laço mestre). Dois cues: atravessar um card (o laço dos cards) e abrir um
case (`enterCase`). O leito só existe com o áudio **ligado e destravado por um
gesto**; o controle da HUD voltou, começa desligado e guarda a escolha em
`localStorage` (lida depois de montar, para o HTML e a hidratação concordarem).
O módulo do leito é um `import()` feito depois do gesto: fora da rota inicial.

**O áudio é sintetizado, não é arquivo.** `lib/audio/audio-context.ts` monta o
baque de pressão com um oscilador grave caindo de tom mais um estouro de ruído
filtrado — ~1 kB de código contra dezenas de kB de mp3. O módulo já expõe
`getAudioContext()` e `setAudioMuted()` para o controle de áudio da HUD — que
saiu na rodada 6.5 (ligava e desligava silêncio) e **voltou na 10**, com a
camada sonora.

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

**As dimensões das imagens não estão no frontmatter, e não devem estar.** Elas
são um fato do arquivo, não autoria: escrevê-las à mão criaria um número que
diverge da imagem no dia em que alguém a trocar. `loadCase()` as lê do cabeçalho
na build (`lib/media-size.ts`, sem dependência nova — PNG, GIF, WEBP e JPEG, só
os primeiros 64 kB) e as devolve em `sizes`, por `src`. Sem elas não há
`next/image`, e sem `next/image` um JPEG de 3840 px viaja inteiro.

**A capa é a exceção, e é um `<img>` puro.** Toda a mídia do corpo passa por
`next/image`; a capa não, porque ela é a **superfície de entrega** da travessia —
a cena carrega o `currentSrc` dela e desenha os mesmos bytes no card. Duas
imagens do mesmo assunto em tamanhos diferentes seriam dois downloads e duas
versões que não coincidem justamente no quadro da troca.

**O fixture `exemplo.mdx` foi apagado**, e é assim que se sabe que os sete
cases existem: ele existia só para o pipeline de MDX ter o que compilar, com
`river_rank: 99` — um posto fora da faixa real, de propósito, para nunca ser
confundido com curadoria. Os três nomes que faltavam nasceram do PROJECT.md §6 e
não dele: nenhum travessão de placeholder e nenhum campo foram copiados de lá.
Se `exemplo.mdx` reaparecer, alguma coisa deu errado.

**São sete cases no repositório**, não três: Perfecting, WeCann Atena e
Unifique Energia escritos do zero, mais Decision Suite, ZOOMtecnologia, Prime8
e Nestlé migrados do portfólio antigo. Organiconecta e Orbsofty ficam de fora
por ora — não foram descartados, só não entram nesta rodada.

**Os sete existem em `content/cases/`.** Quatro migrados com mídia real —
`decision-suite.mdx`, `nestle.mdx`, `prime8.mdx`, `zoomtecnologia.mdx` — e três
como **placeholder**: `perfecting.mdx`, `unifique-energia.mdx`,
`wecann-atena.mdx` têm frontmatter real (título, cliente, resumo do PROJECT.md
§6, disciplinas da matriz do DIRECTION.md §4, acento, posto) e **corpo por
escrever**, com capa gerada marcada `generated: true`. O que falta neles é
conteúdo, não estrutura: o rio já os monta, a rota já existe e o acervo já os
lista. **Perfecting já tem corpo**: o texto é do Lucas, colado verbatim em
`perfecting.mdx` (com duas linhas que chegaram truncadas marcadas num
comentário MDX, e o espaço do reteste da FIESC reservado em outro), e o
frontmatter foi corrigido pelo próprio texto — `year` 2026, `role` "Sócio,
Design Engineer", `stack` só com as ferramentas que o texto cita. A capa segue
gerada. A hierarquia do texto (manchete, afirmações, subtítulos, rótulos em
mono, números) é o mapa de títulos de `lib/work/mdx-case.tsx`, que vale para
todo case. A migração dos quatro não passou pelo `resgatar-midia.sh` que
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

**`disciplines` e `river_rank` dos sete são curadoria, e a curadoria está
PENDENTE.** O DIRECTION.md §4 adiava a classificação por disciplina e o ranking
do rio até ver os cards montados na cena. A tabela abaixo **não** saiu disso: foi
escrita pelo agente no commit `0061582`, lendo a lista de projetos, e registrada
como decisão do Lucas sem ser. É **provisória** — o rio a monta porque precisa
de uma ordem, mas nenhum agente a trata como fechada nem mexe nela; o que se
entrega é a contact sheet dos sete cards montados, para o Lucas decidir (ver a
pendência no DIRECTION.md §4, depois da matriz de disciplinas):

| # | case | disciplinas | acento |
|--:|---|---|---|
| 1 | Perfecting | produto · marca | cyan |
| 2 | Unifique Energia | produto · sistema · marca | teal |
| 3 | Decision Suite | produto · sistema | cyan |
| 4 | WeCann Atena | produto · sistema | rose |
| 5 | Prime8 | produto · sistema · marca | rose |
| 6 | ZOOMtecnologia | produto · marca | teal |
| 7 | Nestlé | produto · marca | coral |

O corte do mobile são os quatro primeiros; 5, 6 e 7 continuam com rota
`/work/[slug]` e na lista de acervo, em qualquer aparelho. A lógica que o
agente deu à ordem ("profundidade primeiro, alcance em seguida, ofício de marca
fechando") está na mensagem do commit `0061582` — é argumento dele, não decisão
do Lucas.

**A garantia "nenhum filtro devolve menos de dois cases" virou guarda de
build**: `assertFilterFloor`, em `lib/cases.ts`, confere os três eixos contra o
corte mais apertado que existe (o do mobile, quatro cards) e distingue os dois
modos de falha que o PROJECT.md §7 exige — "esvaziaria o rio" (zero) e
"devolveria menos de dois" (um). Verificada nos dois sentidos, quebrando a
matriz de propósito: a build cai com a mensagem certa em cada caso.

**Contagem de palavras dos quatro migrados** (corpo do MDX, título+parágrafos+
listas, sem contar frontmatter nem legenda de imagem): Decision Suite 566,
ZOOMtecnologia 283, Prime8 335, Nestlé 130 — **1.314 no total**. É o número
para dimensionar a tradução de `en`; ele não inclui os três cases que ainda
não existem.

**Estar no repositório não é estar no rio.** A curadoria é um ranking único
obrigatório no frontmatter, `river_rank` — não um booleano, e não duas listas
por aparelho —, a ser decidido olhando os cards montados na cena, não lendo a
lista de projetos (a ordem de hoje é provisória, ver acima). É obrigatório e único de propósito: um padrão implícito
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
**Trabalho não tem texto em DOM visível** além da HUD e do rótulo do beat —
quem fala ali é o rio.

**O DOM do beat de Trabalho são sete links invisíveis, e é isso que torna o rio
navegável.** `components/beats/StationList.tsx` monta um `<a>` de verdade por case
curado, na ordem do `river_rank`, no HTML servido: é o caminho de teclado, de
leitor de tela e de indexação, e funciona sem JavaScript. **Nenhum deles é
visto.** Com a cena viva o foco é mostrado pela peça:

- o link publica o índice em `lib/work/card-focus.ts` (fora do React, desenho do
  `filter-store`);
- `Cards.tsx` troca `uHoverCard` pelo card focado — a mesma marcação da passagem
  do ponteiro: chanfro no acento, placa revelada —, pede `requestScrollTo` para o
  `stationProgress` daquele card, e escreve o `transform` do link sobre a
  projeção dele (`projectCard`, exportado de `card-pick.ts`, é a mesma conta do
  teste de acerto);
- sem cena (`poster`) não há peça para acender, e o link focado aparece em DOM
  (`.card-link` em `globals.css`).

**Por que não há lista visível.** A primeira versão era uma lista mono fixa na
margem durante o beat inteiro. Nenhum documento a pedia, e ela pôs um índice de
projetos por cima de um rio de projetos — onde texto sempre ganha de peça escura.
O índice em DOM do site é o acervo, `/work`. **Não reintroduza.**

O clique do link e o clique no card 3D continuam sendo o mesmo clique: os dois
chamam `enterCase()` com o mesmo slug, posto e progresso antes de navegar.

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
| **dentro de um case** | a régua sai e entra o caminho de volta (`← RIO`); ver `DescentSlot` |

A régua de progresso tem **as cotas nas fronteiras dos beats**, lidas de
`BEATS` — não uma graduação regular a cada dez por cento, que seria papel
milimetrado. Mexer na tabela de beats move as cotas sozinho.

Três coisas que parecem detalhe e não são:

- **A leitura da cena não existe sem cena.** `readout-store.ts` publica
  `live: false` no poster, antes do chunk e depois dele; a HUD esconde a linha
  em vez de mostrar `0.00`, que seria um instrumento inventado.
- **O controle de áudio só existe porque o leito sonoro existe** (rodada 10).
  A preferência mora no módulo de áudio, não no componente: "mudo antes de
  entrar" continua mudo no clique, e o leito nunca toca antes do portão.
- **O filtro do rio move o rio e o acervo.** Na descida ele promove as peças que
  casam e recua as outras; na HUD ele viaja como `?d=` para a entrada de acervo,
  e `/work` filtra a lista. Mesmo eixo, dois efeitos, nenhum botão morto.
- **Dentro de um case a régua da descida sai, e o caminho de volta ocupa a casa
  dela.** Quem troca é `DescentSlot`, pelo `pathname`. A régua mede a descida, e
  ali não há descida acontecendo: o progresso está congelado no ponto do rio de
  onde se saiu, então ela mostraria um cursor parado numa escala que não descreve
  a página. É o mesmo argumento que faz `readout-store` publicar `live: false` em
  vez de `0.00` — um instrumento apontando para outra coisa é pior que nenhum.

---

## Armadilhas conhecidas

- **Uma `<figure>` dentro de um `<p>` é HTML inválido, e o MDX produz isso
  sozinho.** Ele embrulha nós de nível de texto em `<p>`, então uma imagem que
  vire figura sai dentro do parágrafo: o navegador fecha o `<p>` ao encontrar a
  figura, a árvore deixa de ser a que o React renderizou, e o erro é de
  hidratação, no meio do corpo do case. Quem desfaz o embrulho é o `p` de
  `lib/work/mdx-case.tsx` — e **a comparação é com o componente, não com a
  string `"img"`**: o MDX compila para `_jsx(_components.img, …)`, então o `type`
  do elemento é a função do mapa. A primeira versão comparou com `"img"`, passou
  por cima de toda imagem, e o Next abriu o erro na cara.
- **O véu é ancorado à coluna, e a caixa precisa ser aparada pela janela.** Um
  artigo de cinco viewports não tem uma caixa: convertida inteira para UV de
  tela, ela cobre o quadro — o scrim de sangria total que o DIRECTION.md §5 veta
  pelo nome. `readVeilBoxes` apara pela janela mais a margem de antecipação, o
  que na descida é no-op (lá todo bloco marcado já cabe numa viewport) e no case
  transforma a coluna na fatia visível dela. Marcar bloco a bloco **não** é a
  saída: nove blocos disputando os oito slots reprovaram em 2.87:1.
- **Uma variável GLSL chamada `step` esconde a função `step()`.** O DOF tem
  `vec2 step` (o passo da amostragem); a guarda nova chamou `step(a, b)` ali
  dentro, o shader deixou de compilar sem erro visível no quadro, e todo pixel
  desfocado saiu preto — a Emergência inteira virou um retângulo preto. Compare
  com `a < b ? 1.0 : 0.0`.
- **`hold()` satura a energia do bando**, então os corpos mudam de cor entre
  duas leituras "no mesmo instante". Uma máscara de outra coisa (a palavra, por
  exemplo) tem que sair de dois quadros **sem** o bando.
- **Dois quadros comparados precisam ser o mesmo instante.** Uma medição por
  diferença (peça com e sem máscara, superfície normal e preta) feita em dois
  `step(1)` seguidos compara também o que o tempo mudou — a névoa tem ruído no
  tempo, e a "pegada do card 5" começava 200 px antes da borda dele. O segundo
  quadro é `hold()`.
- **A sonda projeta no retângulo do canvas, não na janela.** Com barra de
  rolagem clássica `innerWidth` inclui 15 px que o canvas não tem, e a costura
  da travessia saiu 13.8 px — igual antes e depois de uma mudança, que é como
  se reconhece erro de instrumento.
- **Nunca uma crase dentro de um literal de GLSL.** O shader mora num template
  literal, e uma crase de markdown num comentário do GLSL **fecha o literal**. O
  erro sai como `TS1005: ',' expected` apontando para o meio de um shader, e em
  dev o `import()` dinâmico do módulo passa a **lançar de forma síncrona** — o
  que já derrubou o manifesto do preload inteiro. Custou três rodadas; escreva
  `uFlockAhead`, não `` `uFlockAhead` ``.
- **Array de samplers não aceita índice de varying, e a saída é `sampler2DArray`.**
  Os sete cards são uma malha instanciada só, então o fragmento escolhe a capa
  pelo índice da instância — que chega num varying e por isso **não é
  dinamicamente uniforme**. GLSL ES 3.00 proíbe `uCovers[vIndex]`: não compila.
  Atlas em tira compila e sangra (com filtragem linear o texel da borda de uma
  linha mede a média com a vizinha). Numa textura em **camadas** o índice é
  parte da coordenada — `texture(tex, vec3(uv, layer))` —, não um índice de
  array: é legal com índice não uniforme e cada camada filtra sozinha. Ver
  `lib/scene/card-atlas.ts`.
- **Varying de instância precisa de `flat`, e não é estilo.** `vIndex` e
  `vAccent` são constantes por instância, então interpolar não muda o valor —
  **mas muda os bits**. Um `vIndex` de 3 chega como 2.9999997 no meio do
  triângulo, e `int(vIndex)` trunca para 2: o card leria a capa e a placa do
  vizinho. Com `flat` o valor atravessa exato.
- **`useMemo` no StrictMode cria duas instalações, e só uma tem limpeza.** A
  fábrica de um `useMemo` é invocada **duas vezes** no mesmo render em
  desenvolvimento. Para um valor puro isso é inofensivo; para algo que registra
  ouvintes no `window` ou publica um gancho global, nascem dois e o React usa
  um — e a limpeza mora no efeito, que pertence ao que ficou. O órfão vaza
  ouvintes, e o sintoma é pior que o vazamento: o gancho publicado no `window`
  pode ser o **dele**, respondendo sobre um objeto que ninguém mais chama
  (`debug()` reportando `calls: 0` para sempre enquanto o laço de quadro
  resolvia normalmente — custou vinte minutos). Quem registra efeito colateral
  nasce num `useEffect`, que o React emparelha; e estado de diagnóstico é de
  **módulo**, não de instância. Ver `installCardPick` e o docblock dele.
- **A câmera parada no eixo da câmara fica dentro do bando.** A reciclagem é
  relativa à câmera (`uCameraZ + 2`), então uma pose de repouso no eixo tem
  corpos **atravessando a lente**: um corpo emissivo a duas unidades é um borrão
  claro do tamanho de meia tela. Na rota de case isso reprovou a varredura de
  contraste em 3.47:1 com o resto do quadro em 0.01. Toda pose que fique parada
  por mais de um instante sai do tubo (`FLOCK_TUBE_WIDE = 8.6`) — a de repouso do
  case fica em `x = −10.2`, entre o tubo e a parede.
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

2. ~~**O véu não se ancora à coluna de texto no mobile.**~~ **Corrigido na
   rodada 6.5**, com o `w-fit` que este item prescrevia, na casa da leitura e na
   `<p>` da cota. Medido a 390×844: caixa do véu com **216 px** (a largura do
   número) numa viewport de 390, contra os 342 px esticados de antes.
3. ~~**O véu salta em vez de acompanhar.**~~ **Deixou de existir na rodada 6.5**,
   pela raiz: a casa da leitura não desaba mais quando o contador vira o convite
   (o número continua ocupando o layout, invisível, e o convite é desenhado por
   cima dele — ver `GateInvite.tsx`). Sem desabamento a cota não se move, o FLIP
   foi removido, e a caixa do véu é a mesma do carregamento à abertura.

**O convite ocupa a casa do número** (DIRECTION.md §4), com altura de
algarismo, linha de base e margem idênticas às da leitura — medido: a seta
reescalada ocupa de 65 a 190 px do recorte, os algarismos também. As duas
variantes, `glyph` e `mark`, foram comparadas lado a lado em
`.screens/065-convite.png`; **o Lucas escolheu a marca** (2026-09-25) e o glifo
saiu do código.

Contraste sob a leitura remedido depois da mudança de casa, lendo os pixels do
canvas 2D atrás de cada caixa, quadro a quadro (1440×813, `pt`):

| fase / caixa | `glyph` | `mark` |
|---|---|---|
| carregamento / número | 9.44:1 | 6.60:1 |
| carregamento, pronta / cota | 14.79:1 | 14.79:1 |
| pronta / convite | 12.56:1 | 12.66:1 |
| abertura / convite | 10.97:1 | 9.08:1 |
| abertura / cota | 10.40:1 | 10.13:1 |

A diferença no carregamento entre as duas colunas não é do convite (que ainda
não existe nessa fase): é o campo dormente, que é aleatório por carga. O piso de
4.5:1 passa com folga nas duas.

### O que já está verificado e não precisa ser refeito

Contraste sob a leitura, pior caso em quatro fases: carregamento 7.75:1,
pronta 12.15:1, deslize 13.12:1, abertura 8.71:1 (antes da rodada 6.5; os
números de agora estão na tabela acima) — piso de 4.5:1 do
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

1. **O corpo dos dois cases placeholder que sobraram** — WeCann Atena e
   Unifique Energia existem em `content/cases/` com frontmatter real, curadoria e
   capa gerada, e o que falta neles é o texto. O material de origem de Unifique é
   `estudionakama.com.br/projetos/unifique-energia`; WeCann tem só a linha do
   PROJECT.md §6, então precisa de briefing ou de mídia do Lucas. **Perfecting
   já tem o texto**; faltam nele a mídia e a capa real (e com ela o
   `generated: false`), as duas linhas truncadas e o resultado do reteste.

   Ao lado, e independente: **`summary_en` dos quatro migrados é cópia literal
   do português**, porque a rodada de migração foi só de PT. São 1.314 palavras
   de corpo para dimensionar a tradução (ver a contagem acima), mais os sete
   resumos. **A rota de case já entrega o idioma onde pode**: os `alt` das
   imagens do corpo saem de `media[]` por idioma, e é o corpo do MDX e o
   `summary_en` que continuam em português. `en` não é uma rota que alguém deva visitar de propósito até isso
   ser resolvido.
2. **As duas decisões de cor que o rio deixou na mesa.** Nenhuma bloqueia nada
   e as duas têm número medido ao lado — a Superfície, que é o beat que falta de
   verdade, está no item 5.

   - ~~**Duas capas leem como caixa de luz na câmara escura.**~~ **Capas
     trocadas por decisão do Lucas, 2026-09-25**: Prime8 usa `fotocapa.png` e
     ZOOMtecnologia usa `ZOOMtech-home.jpg`. Antes disso, resolvido
     pela física na rodada 9, não por troca de capa: a capa virou placa fosca
     com teto de valor (L ≤ 0.2 entregue, medido em 0.115 no pior quadro). A
     escolha entre as capas de hoje e as alternativas mais escuras continua
     sendo do Lucas, agora vendo-as em `.screens/09-curadoria.png`. O texto
     abaixo é o registro de antes. Prime8
     (`poster-prime8.png`) e ZOOMtecnologia (`zoomtech-hero.jpg`) entregam
     L = 0.286 e 0.236 depois do ganho da capa, contra ~0.03 das geradas e 0.059
     da Decision Suite. Elas passam o contraste e o calor, e são as imagens que
     o Lucas escolheu como capa — então trocá-las é curadoria, não conserto.
     Existem alternativas reais mais escuras nos mesmos diretórios
     (`prime8/fotocapa.png` a 0.063, `zoomtecnologia/ZOOMtech-home.jpg` a
     0.032), e a régua para comparar é a luminância da imagem **recortada na
     razão do card** — não a da imagem inteira, que é outra coisa.
   - **`--coral` não acende no rio, e é decisão**: o Lucas decidiu
     (2026-09-25) que ele não entra nas esteiras dos cards por enquanto. A
     janela de esteira da rampa emissiva continua ancorada ao corpo de prova.

   **A capa da Nestlé já foi trocada, e essa não era curadoria: era bug.**
   `capa.jpg` é uma tira de 3840×500 (7.68:1), e recortada para a razão do card
   (1.96:1) sobrava o vermelho de fundo — um retângulo de cor chapada, que o
   PROJECT.md §2 chama de cenário. Entrou `post2.jpg`, material migrado igual,
   1.91:1 e escura. O motivo está no comentário do frontmatter.
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
4. ~~**A lâmina do bando.**~~ **Consertada na rodada 8** (renascimento
   espalhado por 28 unidades de z, todas a mais de 36 da lente), com o 3B e o
   poleiro remedidos no mesmo lote — ver MEASUREMENTS.md, "O bando e o frame,
   medidos". O texto abaixo é o registro de antes. Não é acabamento: é o bando atravessando o corredor em
   bloco e deixando trechos do rio sem tecido conjuntivo — ver a nota corrigida em
   MEASUREMENTS.md, "Três armadilhas do método, e é aqui que elas ficam
   registradas". O conserto é espalhar o renascimento em `z`, e
   ele muda a densidade que chega ao corpo de prova, ou seja obriga a re-medir os
   critérios de aceite da Identidade e de Quem sou. É uma rodada inteira, e é a
   primeira coisa que o rio pede depois do conteúdo.

   **Agendado: agora é a próxima coisa.** A condição que segurava — "os sete
   cases ainda não existem" — caiu, e a travessia para o case também. A remedição
   do **3B** (descolamento) e do **4** (Quem sou) entra no mesmo lote do conserto,
   não depois dele: é a mesma correção de fonte de dados invalidando os dois
   critérios de aceite ao mesmo tempo, então uma sessão só — consertar, remedir os
   dois, atualizar as duas seções deste arquivo. **Antes da Superfície**, que
   herdaria uma densidade de bando que ainda vai mudar.

   **E o próprio instrumento do rio herdou o problema.** A medição de largura
   projetada de `corridor()` (ver "O rio, medido") mostrou, nesta sessão, o mesmo
   sintoma: dois dos sete cards devolveram larguras **bimodais** entre chamadas
   repetidas no mesmo progresso — a lâmina entrando e saindo da janela de busca
   de um card entre uma amostra e outra. O conserto que espalha o renascimento em
   `z` corrige isto de graça; até lá, `corridor()` precisa de várias chamadas e
   da mediana entre elas para não reportar a fase da lâmina como se fosse a peça.
   Ver o docblock de `footprint` em `lib/scene/probe-cards.ts`.
5. ~~A Superfície~~ — **feita na rodada 11**, com a curva de 0.85 em diante
   resolvida, a cor da fonte viajando `--teal` → `--cyan` → `--peach`
   (`sourceColorAt`) e o topo de `sourceStrengthAt` resolvido em 0.06 — a luz de
   fora é `outsideAt`, não esta rampa. Ver "A Superfície".
6. ~~Os posters do modo `poster`~~ — **feitos**, das cinco composições, com o
   véu em 2D. Ver "Os posters e o véu em 2D".
7. A rolagem sintética a 0.6 vh/s até o quadro de separação (DIRECTION.md §4),
   cronometrada — o outro teste de portão. A varredura de contraste, que desce
   na mesma taxa, **rodou na descida inteira** com o véu novo (rodada 11). O que
   falta é a cronometragem do quadro de separação em si.
8. **A composição do case no modo calmo.** O `ComposedClock` corta entre cinco
   composições fixas, uma por beat; a rota de case entra hoje pelo mesmo caminho
   da travessia, com o corte instantâneo em vez do voo — que é o que o
   DIRECTION.md §5 pede ("a troca é corte, não movimento de câmera") —, mas
   ninguém **mediu** o quadro que ela produz. É uma pose a mais na tabela do §5,
   e `__calm.capture` já é o instrumento para ela.
9. **A silhueta a 3:1 no pixel — o critério fica (decisão do Lucas,
   2026-09-25).** O melhor medido é 1.02; chegar a 3 pede o bando atravessando
   as letras como uma **massa finita**, e não como um rio infinito
   (MEASUREMENTS.md, "O escuro e o ângulo, medidos"). É mudança de desenho do
   bando na Identidade, e obriga a remedir o 3B, o calor e o véu da Identidade.
   Rodada própria.
10. **O tempo de GPU na resolução certa e num celular.** Na rodada 12 o plano
   `descent` rodou no buffer nativo (2160×1350, DPR 2 emulado, que o teto de
   1.5 corta) e o cronômetro de query **saturou** (4.1× o teto físico, numa
   tela de 75 Hz): a fração de GPU não sai dali. O que saiu é o teto: quadro
   mediano de 13.3 ms em todas as faixas, igual ao estado anterior. Falta um
   método que não dependa do cronômetro (a escada de K, com a janela em primeiro
   plano). No telefone ele não rodou. E a linha 0 dos planos diz
   `flock: 16384`, que desde a rodada 11 **não** é o padrão do telefone (9.216):
   num celular, o passo 0 roda com 9.216 e reporta 16.384. Corrigir antes de
   medir lá.
11. ~~A varredura de contraste em inglês~~ — **feita na rodada 12**, com o
   cookie `NEXT_LOCALE=en` antes da carga (`lang` conferido na página).
12. **A onda de densidade no pixel.** A rodada 8 registrou amplitude 0.315
   contra 0.032 do controle, e o método descrito não reproduz isso: com
   `__probe.wave()` e o controle `PROBE_NO_WAVE`, a onda **não se separa** do
   controle nem no estado anterior à rodada 12 nem depois. A onda existe na
   simulação (`surge` em `boids.ts`, intocado); falta um instrumento que a veja
   no quadro entregue.
13. **A silhueta a 3:1 no pixel continua sem passar** (0.74:1 na rodada 13, com
   o bando de volta). O item 9 descreve o que falta.
14. **A "Regra de governança" não está no repositório.** Pedida duas vezes; o
   texto não foi colado, e nenhum agente a escreve de memória.
15. **A Superfície está sépia**, não teal com luz peach: pergunta do crítico ao
   Lucas, sem decisão ainda.

O item que era o sétimo — verificar a cena num iPhone contra o piso de 30 fps —
**está feito**: 4.62 ms de GPU por quadro, 55.6 fps, ver "Desempenho da cena,
medido". O que sobrou dele é térmico, e é uma pergunta menor: ninguém mediu a
cena aberta por dez minutos.
