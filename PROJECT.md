# PROJECT.md

Arquivo de contexto permanente do projeto. Fica na raiz do repositório e é lido pelo agente em toda sessão. Não é o prompt de build. É a verdade do projeto contra a qual todo prompt e toda crítica são medidos.

---

## 0. PREENCHER ANTES DE COMEÇAR

Substitua os valores entre chaves. O agente deve parar e perguntar se algum ainda estiver vazio.

```
NOME            = Lucas Correia
DOMINIO         = lucasrc.com.br
EMAIL           = lucas_rc15@live.com
LINKEDIN        = https://linkedin.com/in/lucasrcorreia
GITHUB          = https://github.com/lucasrcorreia23
OUTRO_PERFIL    = X/Twitter — https://x.com/lucasrcpd
UNIFIQUE_1LINHA = Plataforma de contratação de energia por assinatura, onde um simulador
                  de economia vira a porta de entrada e o fluxo comercial é automatizado —
                  a contratação tratada como produto, não como formulário.
```

---

## 1. O que este site é

Portfólio pessoal de um product designer e design engineer brasileiro. Trabalha nas três pontas: design de produto, front-end e marca.

O objetivo não é vender serviço nem caçar vaga. É presença e autoridade. O site **é** a peça principal do portfólio. Se alguém sair sem lembrar de nada além de "que trabalho legal", o site falhou. A pessoa precisa sair lembrando de uma imagem específica.

Isso muda a hierarquia. O trabalho aparece, mas a experiência de chegar até ele carrega tanto peso quanto ele. Não há CTA gritando. Há uma porta aberta.

**Teste único de sucesso.** Alguém que trabalha em estúdio digital de primeira linha abre o site, e antes de ler qualquer palavra pensa "quem fez isso sabe o que está fazendo".

---

## 2. A metáfora central

**Natureza imersa em tecnologia.** Não natureza *versus* tecnologia, não tecnologia *imitando* natureza. Algo vivo existindo dentro de algo construído, e os dois se acomodando um ao outro.

As duas referências que geraram isso:

1. Uma árvore gigante e luminosa crescendo dentro de uma megacidade cyber densa. A árvore não está lutando contra a cidade. Ela mora ali.
2. Um cardume atravessando uma névoa granulada que vai de teal profundo a coral quente. Movimento coletivo, sem líder, sem grade.

O que isso significa em decisão de design:

- Sempre existe **um organismo** e sempre existe **uma estrutura**. Nunca só um dos dois.
- O organismo se move por física, não por keyframe. Deriva, corrente, cardume, respiração.
- A estrutura é fina, precisa e discreta. Coordenadas, medidas, marcadores, régua. Ela mede o organismo, não o prende.
  > **Decisão do Lucas, 2026-09-30:** a medida mora na HUD e no portão. Na câmara, a estrutura é o concreto e a natureza que cresce nele — fósseis gravados, musgo e líquen bioluminescente, raízes, água no piso. Ver o bloco de decisões no topo do `DIRECTION.md`.
- A luz vem de dentro da cena, nunca de um `box-shadow`.

### O que isso NÃO é

Cyberpunk neon. Grade infinita roxa com horizonte, HUD de videogame, glitch RGB, letreiro em japonês, chuva de código verde. Essa estética foi considerada e descartada. Se o agente derivar para lá, ele errou.

---

## 3. Sistema visual

### 3.1 Cor

Base escura, com a luz nascendo dentro da névoa. Tokens em CSS custom properties, consumidos por Tailwind e pelos uniforms dos shaders.

```css
--void:   #030A12;  /* fundo absoluto, o começo e o fim */
--abyss:  #071624;  /* profundidade média */
--deep:   #0C2B3E;  /* estrutura submersa */
--teal:   #16A5B8;  /* cor primária do organismo */
--cyan:   #5CE1E6;  /* realce, luz próxima */
--rose:   #F58BA8;  /* corpo do cardume */
--coral:  #FF7A4D;  /* calor, ponto de fuga */
--peach:  #FFC8A2;  /* luz mais alta */
--mist:   #DCE9EC;  /* texto sobre escuro */
```

Regras não negociáveis:

- Nada de gradiente linear de duas paradas. Toda transição de cor é volumétrica e granulada, feita em shader ou em textura, com pelo menos três paradas e ruído.
- ~~Coral e rosa são **eventos**, não fundo. Ocupam menos de 15 dos 100 por cento de qualquer tela.~~
  > **Decisão do Lucas, 2026-09-30:** a regra cai. A referência passou a ser o nível de cor do activetheory.net — rosa, magenta, violeta e azul como massa, não evento. A cor é governada pelo contraste do texto e pelo equilíbrio de cada quadro. A paleta ganha `--violet` e `--magenta` (ver `styles/tokens.css`).
- Branco puro `#FFFFFF` é proibido. Texto claro usa `--mist`.
- Grão de filme real aplicado em pós-processamento, animado por frame, com intensidade entre 0.03 e 0.06. Nunca um PNG de ruído estático repetido.

### 3.2 Tipografia

Duas famílias, papéis separados e rígidos.

**Display (grotesca larga).** Títulos enormes, nome, títulos de case. Escolher entre Archivo Expanded, Bricolage Grotesque ou PP Neue Montreal. Peso alto, tracking negativo, caixa alta ou versalete nos títulos maiores.

**Mono (técnica).** HUD, rótulos, coordenadas, metadados, navegação, números, legendas. Escolher entre Geist Mono, Martian Mono ou JetBrains Mono. Caixa alta, tracking positivo, tamanho pequeno, opacidade reduzida.

Regras:

- Escala de display extrema. O maior título ocupa no mínimo 80 dos 100 por cento da largura da viewport. Se cabe confortavelmente, está pequeno.
- Texto de leitura de case usa a grotesca em peso regular, medida entre 60 e 70 caracteres, nunca a mono.
- Nenhuma terceira família entra no projeto.

### 3.3 Movimento

O movimento é o produto. Se ele estiver errado, nada mais salva.

- **Nada é linear.** Toda transformação passa por amortecimento (`damp` a cada frame) ou por easing de saída forte, `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Scroll com inércia.** Lenis, `lerp` em torno de 0.075. O scroll nunca para de repente.
- **Uma variável só.** O progresso normalizado de 0 a 1 do scroll dirige a câmera, os uniforms dos shaders e as revelações de texto. Uma fonte de verdade, muitos consumidores.
- **Nada aparece com `fade-up` de 20 pixels.** Cada seção tem uma entrada própria e específica.
- **Latência de resposta abaixo de 100 milissegundos** em qualquer interação de ponteiro.

---

## 4. Arquitetura da narrativa

Uma descida vertical contínua. O visitante começa no escuro absoluto e termina na superfície, com luz. A jornada é a mesma coisa que a estrutura de informação.

| Progresso | Beat | O que acontece |
|---|---|---|
| pré | Portão | Preloader com contador. Nada carrega além do necessário para o primeiro frame. Um clique para entrar, que também libera o áudio. |
| 0.00 a 0.10 | Emergência | Escuro quase total. Partículas suspensas, quase paradas. Uma luz distante. O nome aparece pequeno, em mono. |
| 0.10 a 0.28 | Identidade | O título display gigante atravessa o organismo em profundidade. Parte da tipografia passa na frente do objeto 3D, parte passa atrás. Ao lado, coluna mono com posicionamento em três linhas curtas. |
| 0.28 a 0.45 | Quem sou | O organismo se organiza. Uma estrutura de medida se sobrepõe a ele. Texto de manifesto em coluna estreita, alinhada a uma das margens, nunca centralizada. |
| 0.45 a 0.85 | Trabalho | O rio. Os cards **curados** — o topo do ranking `river_rank` até onde couber no aparelho, não o acervo inteiro — flutuam em perspectiva real e a câmera atravessa por dentro deles. Filtros na HUD lateral reorganizam o rio sem recarregar a página. |
| 0.85 a 1.00 | Superfície | A luz chega ao topo. Contato, sem formulário, sem "vamos construir algo incrível juntos". Só o e-mail, os perfis e o seletor de idioma. |

### Princípio: o acervo é maior que o rio

**O acervo é maior que o rio. Todo case tem rota própria e é alcançável por
link direto, inclusive os que não estão no rio. O rio é curadoria, não é o
índice.**

O rio responde a uma pergunta de composição — quantos corpos de prova a câmara
comporta antes de o escoamento virar galeria. O acervo responde a outra — o que
existe. Confundir as duas transformaria uma decisão de ritmo numa exclusão, e
faria um link antigo apontar para lugar nenhum.

Três consequências, e todas valem em qualquer modo de renderização:

1. **Nenhum case é apagado para sair do rio.** A curadoria é `river_rank`
   (§6), um ranking único, não um booleano por aparelho: ficar fora do corte
   de um aparelho não muda mais nada — o arquivo continua, a rota continua, a
   indexação continua.
2. **A HUD tem uma entrada de acervo.** Ela abre a lista completa dos cases em
   DOM puro, sem cena, com o link de cada um. É a única forma de chegar num
   case fora do corte, e por isso não é opcional. Custa texto em mono.
3. **Promover um case depois é reordenar um número**, não reconstruí-lo. A
   alternativa — cases fora do rio sem rota — deixaria de existir para quem
   chega por link antigo e transformaria cada promoção futura em trabalho novo.

**HUD lateral fixa.** Coluna estreita e permanente em uma das laterais, em mono pequena. Contém contato, **a entrada de acervo**, filtros do trabalho, indicador de progresso do scroll, controle de áudio e o toggle de idioma. Substitui o rodapé. O site não tem rodapé.

**Rotas.** A home é a descida completa. O acervo é a lista em `/work` e `/pt/work`. Cada case tem rota própria em `/work/[slug]` e `/pt/work/[slug]`, esteja no rio ou não. A transição da home para o case é contínua: o card se aproxima da câmera e vira a capa do case, sem tela branca no meio.

---

## 5. Stack e restrições

```
Next.js 16, App Router, TypeScript estrito
React Three Fiber 9 + drei 10  (só o core/Text, por importação profunda)
three
troika-three-text  (tipografia display dentro da cena, para oclusão real)
compositor próprio  (lib/scene/shaders/post.ts — ver "Pós-produção" abaixo)
GSAP com ScrollTrigger
Lenis
Tailwind v4, tokens em CSS custom properties
MDX em content/cases/*.mdx  (sem CMS externo)
next-intl  (pt e en, toggle na HUD)
Deploy Vercel
```

**Next 16** é a estável atual e é o que o `@react-three/fiber` 9 suporta. A
única trava de versão a respeitar: o R3F 9 declara peer `react >=19 <19.3`, então
**o React fica abaixo de 19.3** até o R3F alargar essa faixa.

### Pós-produção: compositor próprio, não biblioteca

**O `@react-three/postprocessing` saiu da stack.** Esta seção listava a
biblioteca e, no mesmo parágrafo, fixava o teto de 350 kB comprimidos para o
chunk da cena. Os dois não cabem juntos, e onde a §5 briga consigo mesma ganha o
lado que tem número.

Verificado no `node_modules`, não estimado: o pacote exporta **um barril só**
(`"exports": "./dist/index.js"`, sem caminho de importação profunda) e esse
arquivo importa `n8ao` no topo. O `n8ao` não declara `sideEffects`, então o
bundler não pode descartá-lo com segurança — são ~50 kB comprimidos de SSAO que
esta cena nunca usa, mais ~110 kB do `postprocessing` inteiro. Cerca de 160 kB
para ter bloom, profundidade de campo, grão e aberração cromática. O compositor
escrito à mão entrega os quatro em ~200 linhas de GLSL
(`lib/scene/shaders/post.ts` + `components/scene/Composer.tsx`), e com ele o
chunk da cena fechou em **284 kB comprimidos** contra o teto de 350.
A aberração cromática saiu depois, na rodada 12: deslocar canais é separação
RGB, que a §2 veta pelo nome.

**A consequência é permanente: nenhum efeito de biblioteca entra depois sem
reabrir esta conta.** Os 66 kB entre 284 e 350 são a folga de tudo que a cena
ainda vai ganhar — o SDF do descolamento, os corpos de prova do rio, a transição
para o case. Um `import` de biblioteca de efeito gasta essa folga inteira de uma
vez e ainda estoura o teto. Aqui, efeito novo é passada nova no compositor. Quem
propuser o contrário mede antes: o custo comprimido real do pacote, quanto sobra
do teto depois dele, e o que deixa de caber por causa disso.

**Repositório limpo.** O template HTML comprado que ocupava este repositório foi
descartado, não migrado: nenhuma das rotas dele (`nestle`, `prime8-project`,
`zoomtech-project`, `decision-suite`, `portfolio`, `construcao`) corresponde aos
três cases deste projeto, e as 19.695 linhas de SCSS, o jQuery preso no 3.x, o
Bootstrap por CSS compilado e o portão de tema que esconde o site atrás de um
preloader até um check client-side passar são incompatíveis com o orçamento de
performance abaixo. Nada foi preservado além dos arquivos de contexto
(`PROJECT.md`, `DIRECTION.md`, `AGENTS.md`, `CLAUDE.md`).

Recomeçar não significa repositório novo no GitHub: o remote e o projeto Vercel
continuam os mesmos, com o domínio já apontado, e o estado antigo fica guardado
numa tag.

### Como a tipografia cruza o 3D

Este é o truque central e ele tem uma implementação certa e várias erradas.

**Certo.** O título display grande é renderizado *dentro* da cena com `troika-three-text`, como um objeto 3D com profundidade própria. Aí ele oclui e é ocluído de verdade pelo organismo, com o mesmo fog e a mesma pós-produção.

**Errado.** Empilhar `div` com `z-index` sobre o canvas e fingir profundidade. Isso quebra no momento em que o objeto passa pelo meio da letra, que é justamente o momento que importa.

Todo o resto do texto, ou seja, tudo que precisa ser lido, indexado e selecionado, é DOM real por cima do canvas.

### Orçamento de performance

- LCP abaixo de 2.5 segundos em 4G simulado.
- 60 fps no desktop, 30 fps ou mais em iPhone de gerações recentes.
- DPR do canvas limitado a 1.5.
- **O orçamento de JavaScript é por momento de carregamento, não por
  biblioteca.** Duas caixas, cada uma com seu teto:
  - **Rota inicial abaixo de 200 kB comprimido.** É tudo que o navegador
    precisa baixar e executar para o primeiro quadro útil. Nada aqui é
    isento: se está no caminho crítico, conta.
  - **Cena inteira num chunk dinâmico, com teto próprio de 350 kB
    comprimido.** `three`, R3F, o `Text` do drei, troika, o compositor e os
    shaders vivem aí dentro, e o chunk só começa a carregar depois do
    primeiro quadro útil. É este teto que tirou o `@react-three/postprocessing`
    da stack — ver "Pós-produção" acima.
- A cena 3D carrega depois do primeiro frame útil, nunca antes.

### Acessibilidade

- `prefers-reduced-motion` desliga a câmera dirigida por scroll, congela o organismo num frame bonito e devolve scroll nativo com transições curtas. Não é uma versão quebrada, é uma versão calma.
- Sem WebGL, entra um poster estático por seção e o conteúdo continua inteiro.
- Todo o conteúdo textual existe no DOM e navega por teclado. O canvas é `aria-hidden`.
- Contraste mínimo de 4.5 para 1 em todo texto de leitura. O grão não conta como fundo.

### Mobile

Não é a versão desktop encolhida. A descida continua, o organismo continua, mas o rio de projetos vira uma travessia mais curta e a HUD lateral colapsa num acionador no topo. Ninguém abre um portfólio no celular para ficar dez minutos rolando.

---

## 6. Conteúdo

Sete cases, em `content/cases/`. **O acervo é maior que o rio** — ver o
princípio na §4. A curadoria de quais aparecem no beat de Trabalho acontece
depois, olhando os cards montados na cena, e é gravada em `river_rank`, um
ranking único obrigatório do frontmatter — não duas listas, uma por aparelho:
cada aparelho corta a mesma lista ordenada pela capacidade que couber. Ficar
fora do corte de um aparelho **não apaga** o case: ele continua no acervo, na
lista de `/work`, na rota `/work/[slug]` e no índice dos buscadores.

Os três escritos do zero:

1. **Perfecting.** Produto B2B SaaS de roleplay e treino de vendas com IA. Case de produto ponta a ponta, com fluxo, sistema de marca e analytics.
2. **WeCann Atena.** Plataforma de prontuário eletrônico, feita pela Atomsix. Case de domínio complexo e design de sistema.
3. **Unifique Energia.** Plataforma de contratação de energia por assinatura, onde um
   simulador de economia vira a porta de entrada e o fluxo comercial é automatizado — a
   contratação tratada como produto, não como formulário. Trabalho feito no Estúdio Nákama;
   material de origem (imagens e texto) em
   https://www.estudionakama.com.br/projetos/unifique-energia

Os quatro migrados do portfólio antigo, cuja mídia e cujo texto saem do
repositório do site anterior (ver AGENTS.md, "Migração do site antigo"):

4. **Decision Suite**
5. **ZOOMtecnologia**
6. **Prime8**
7. **Nestlé**

**Fora por ora:** **Organiconecta** e **Orbsofty**. Não foram descartados — não
entram nesta rodada. O material dos dois continua no repositório antigo e a
decisão pode ser revista; até lá eles não existem em `content/cases/`, não têm
rota e não contam para nenhum dimensionamento.

Cada case tem no frontmatter: `title`, `client`, `year`, `role`, `stack`, `summary_pt`, `summary_en`, `accent` (um token da paleta), `cover`, `media[]`, `disciplines[]` e `river_rank`.

**Material visual.** Parte existe, parte falta. Onde faltar, o agente gera imagem em vez de deixar retângulo cinza ou emoji. As imagens geradas seguem a paleta e a metáfora, e são marcadas no frontmatter com `generated: true` para serem trocadas depois.

---

## 7. Definition of done

Um beat só está pronto quando todas estas forem verdadeiras.

- Roda a 60 fps no desktop com o profiler aberto.
- Funciona com `prefers-reduced-motion` ativo e continua bonito.
- Passa em teclado do começo ao fim.
- O texto está em português e em inglês.
- O agente crítico deu nota 9 ou mais em duas rodadas seguidas.
- Nenhum item da lista de marcas de IA (arquivo `PROMPTS.md`, seção Subtração) aparece na tela.
- Todo limiar que decide se algo aparece tem a **faixa medida da entrada**
  registrada ao lado, e toda guarda de teto sabe distinguir "dentro do teto" de
  "não existe" — ver abaixo.

### Toda medição é feita no ponto de entrega, nunca no ponto de cálculo

Ler o valor que o código calculou mede o modelo mental de quem o escreveu, não
o resultado. As duas coisas coincidem quase sempre — e é exatamente por isso
que, quando divergem, a verificação passa e o defeito fica.

- **Se a medição é de pixel, leia o pixel composto.** Não o token, não a
  variável, não a caixa que o layout diz ter: o pixel que saiu, depois de
  todas as camadas, na tela.
- **Se a medição é de tempo, meça do evento até o quadro pintado.** Não o
  tempo do handler, que é o pedaço que você escreveu; o tempo até a pessoa
  ver, que é o que ela sente.
- **Se a medição isola um efeito, ela precisa de um controle que descarte a
  explicação alternativa.** Um número sozinho nunca separa "o efeito
  aconteceu" de "a cena mudou de outro jeito". O critério de aceite da
  oclusão é o exemplo canônico e está no AGENTS.md: a queda de corpos
  visíveis dentro da faixa das letras só prova oclusão porque **as duas
  faixas vizinhas concordam entre si**. São elas que descartam variação de
  densidade do bando — um bando mais rarefeito na altura do título produziria
  a mesma queda no meio sem ocluir nada. A faixa central sozinha não prova
  coisa nenhuma, e uma verificação que reporte só ela não é verificação.

Isto não é zelo: é a regra que faltava. A caixa do véu de legibilidade do
portão passou por duas verificações reportando 248 px enquanto entregava 820,
porque as duas leram a caixa calculada em vez de enganchar o desenho. E o
clique de entrada passou por sete rodadas dentro do orçamento aparente
enquanto custava 110 ms contra o teto de 100 desta mesma §3.3 — ninguém tinha
medido do evento ao quadro.

Vale para tudo que já está descrito nestes documentos, e em especial para a
varredura de contraste em 600 passos do DIRECTION.md §5: ela amostra a
**luminância composta** sob cada caixa de texto, no quadro renderizado, e não
a cor de origem do token nem a densidade que o véu diz ter resolvido.

### Todo limiar é validado contra a faixa medida da entrada

Um limiar decide se alguma coisa aparece. O intervalo dele tem que ser comparado
com **a faixa que a entrada realmente produz na cena**, medida, e não com a
faixa que pareceu razoável na hora de escrever. As duas quase sempre coincidem —
e é exatamente por isso que, quando não coincidem, o efeito simplesmente não
existe e ninguém percebe: uma cor que nunca acende parece uma cor usada com
parcimônia.

O caso que gerou esta regra. A rampa emissiva do bando pedia densidade acima de
**0.30** para o `--coral` e acima de **0.45** para o `--rose`, num canal cujo
máximo medido em 16.384 corpos é **0.170** (mediana 0.033, p99 0.111). Duas das
quatro cores do DIRECTION.md §5 eram **matematicamente inalcançáveis**, e nada
na tela denunciava. Quem descobriu foi uma guarda de teto medindo zero — e ela
descobriu por acidente, porque tinha sido escrita para pegar o excesso.

Em prática são duas obrigações, e nenhuma delas é trabalho novo de medição: é a
mesma medição, escrita onde alguém vai ler.

**A faixa medida sai ao lado do limiar, no código.** Não numa mensagem de
commit, não num relatório de revisão: no comentário que acompanha a constante,
com o `n` da amostra e os percentis. Um limiar sem a faixa da entrada ao lado é
um número sem unidade.

**A guarda precisa distinguir "dentro do teto" de "não existe".** Uma guarda que
reporta 0.00% nos dois casos não é guarda. Todo teto tem piso: se o efeito é
obrigatório em algum quadro — e o `--coral` é, o DIRECTION.md §5 dá a ele um
lugar único no site inteiro —, a verificação falha tanto por passar do teto
quanto por nunca aparecer, e os dois lados são reportados.

Isto vale para qualquer limiar entre uma entrada e um pixel, e vale já no
**Prompt 4**:

- **O véu de legibilidade.** O `f` é resolvido por quadro e clampado em
  `[0.15, 0.85]`, com o DIRECTION.md §5 dimensionando o pior caso em
  `L_cena = 0.62`, a luminância de um aglomerado de `--cyan` no auge. **Ninguém
  mediu qual faixa de `L_cena` a simulação proxy de fato entrega.** Se ela nunca
  chega perto de 0.62, o teto de 0.85 é decoração e o véu está resolvendo um
  problema que não tem; se passa de 0.62, o clamp está cortando a solução no
  exato quadro que a regra existe para cobrir. Medir a faixa vem **antes** da
  varredura de contraste em 600 passos, não depois.
- **A reatividade da HUD ao beat.** Todo limiar que decida quando a régua, a
  cota ou o realce mudam de estado sai com a faixa medida da grandeza que os
  dispara — e com a verificação de que cada estado é alcançado em algum ponto da
  descida.
- **Qualquer outro portão visual**: as revelações de texto por progresso, a
  abertura da DOF por beat, o realce de quina da estrutura quando o bando passa,
  os filtros do rio.
