# DIRECTION.md — Vento Medido

Rota estética escolhida. Lido junto com o `PROJECT.md` em todo prompt.
O `PROJECT.md` é a verdade do projeto; este arquivo é **como essa verdade se
parece**. Onde os dois divergirem, o `PROJECT.md` ganha.

---

## 1. A imagem central

Uma câmara escura e comprida, cheia de névoa granulada teal. Um bando de
estorninhos vem contra você, laminar, e ao encontrar o título display montado no
meio da câmara **se descola na aresta de ataque das letras, vira turbulento
dentro dos contra-formas e se recompõe na esteira**. O bando é a única luz da
cena — quando ele passa raspando as paredes, aparecem por um instante cotas e
réguas gravadas no concreto, e depois o escuro volta.

**Esse frame é o projeto.** O descolamento na aresta e o recolamento na esteira
não são um efeito dentro do site; são o motivo do site existir. Todo o resto —
preloader, manifesto, rio de projetos, contato — é desenhado *em volta* dele:
como se chega até ele, e como se desce dele sem anticlímax. É ele que vira o
poster de `prefers-reduced-motion`, a OG image e o primeiro quadro que alguém
vai lembrar. Se um beat compete com esse frame, o beat está errado.

Ele precisa ser alcançável em menos de oito segundos de scroll a partir do
clique de entrada. Ninguém deve ter que merecer o momento principal.

---

## 2. Vocabulário visual

**Substantivos da cena.** Aresta de ataque. Esteira. Descolamento. Recolamento.
Onda de densidade. Corpo de prova. Câmara. Veneziana. Cota. Régua. Estação.
Gravação. Chanfro. Grão. Pó.

**O organismo.** Murmuração. Nenhum indivíduo é legível — o que se lê são ondas
de densidade correndo pelo bando como sombra atravessando trigo. Corpos
lenticulares, não pássaros modelados: lascas com direção, sem asa animada, sem
silhueta ornitológica reconhecível de perto.

**A estrutura.** Medida gravada, nunca instrumento numerado. Cotas recessadas no
concreto, réguas graduadas correndo pela parede, números de estação, setas de
escala, marcas de intervalo. Recessadas de propósito: o brilho pega a quina da
gravação, não a face. A estrutura é **vista de relance** — ela existe entre os
lampejos, não sob holofote. Se em algum frame dá pra ler a câmara inteira, a
névoa está fina demais.

**O escuro.** A câmara é preta. `--void` no fundo, `--abyss` nas paredes, e a
névoa fazendo a transição em pelo menos três paradas com ruído — nunca gradiente
linear de duas paradas.

**O calor.** `--rose` só onde o bando comprime. `--coral` só na turbulência da
esteira, atrás do corpo de prova. Nunca mais de ~10% da população em coral ao
mesmo tempo, o que mantém o teto de 15% de tela do `PROJECT.md`.

> **Decisão do Lucas, 2026-09-25: o coral não entra nas esteiras dos cards, por
> enquanto.** Continua só na esteira do corpo de prova.

**Léxico da HUD** (mono, caixa alta, tracking positivo, opacidade baixa):
`EST. 040` · `COTA +12.40` · `DENS. 0.62` · `V 14.6 M/S` · `Z −38`.
Numérico por escolha: atravessa pt/en quase sem tradução.

---

## 3. A profundidade de campo

Enxertada da rota Foco Raso, mas **sem substituir a câmera**. A câmera continua
atravessando a câmara a montante; o desfoque é uma segunda variável, dirigida
pelo mesmo progresso normalizado do scroll.

A abertura respira por beat:

| Beat | Abertura | Para quê |
|---|---|---|
| Portão | máxima (tudo borrado) | não existe escala ainda |
| Emergência | aberta, fechando devagar | você não sabe o tamanho do espaço |
| **Identidade (entrada)** | **borrão → corte de navalha em ~600 ms** | **a assinatura do beat** |
| Quem sou | fechada, tudo nítido | é beat de leitura |
| Trabalho | parcial, só para separar cards em profundidade | nunca sobre o título do card |
| Superfície | reabre só na fresta de luz | o fora ainda não tem foco |

**"Parcial" no rio virou dois números, e o primeiro foi medido errado antes.**
A abertura fica em **0.26** e a profundidade do plano nítido fecha de 26 para
**12 unidades** (`apertureAt` e `focusRangeAt`, em `lib/scene/curve.ts`). Os dois
juntos entregam uma rampa: o card na distância de leitura fica na navalha, o
seguinte lê perceptivelmente mais macio, e o fundo do corredor satura em ~63% de
borrão.

A primeira tentativa usou 0.42, e o resultado não foi "parcial": a resposta do
compositor satura em `coc = 0.35`, então tudo além de ~26 unidades ficava
**inteiramente** borrado, e o corredor virava um mingau de luz uniforme — medido,
40% do quadro acima de `L = 0.02` contra 9.8% no quadro do descolamento. Com
0.26 o mesmo número volta para 8%. Abertura que satura não separa camadas: ela
apaga o que está atrás da primeira.

Regras duras:

- **Texto de leitura nunca tem desfoque.** Nem o texto, nem o que está atrás
  dele encostando na caixa. Nas rotas `/work/[slug]` a DOF está **desligada** —
  a abertura é multiplicada pelo complemento da travessia, então ela fecha
  **junto** com a aproximação e mede **zero** no repouso do case (medido).
- DOM nunca recebe `filter: blur()`. O desfoque acontece dentro do canvas.
- A transição de abertura usa `cubic-bezier(0.16, 1, 0.3, 1)`, como todo o resto.
- Implementação barata: círculo de confusão + kernel duplo, não bokeh completo.
  Se não fechar o orçamento de fps, a DOF cai antes de qualquer outra coisa.

---

## 4. Os beats

### Comprimento e ritmo

As linhas por beat são a verdade; os totais abaixo são **derivados delas**,
nunca o contrário. Se uma linha mudar, os totais e a verificação dos oito
segundos são recalculados — não arredondados de volta ao número anterior.

**Altura virtual total: 22.05 alturas de viewport no desktop** (21.05 vh de
faixa rolável, mais a viewport). Distribuídas pelos beats:

| Beat | Progresso | vh |
|---|---|---|
| Emergência | 0.00 – 0.10 | 2.1 |
| Identidade | 0.10 – 0.28 | 3.8 |
| Quem sou | 0.28 – 0.45 | 3.6 |
| Trabalho | 0.45 – 0.85 | 8.4 |
| Superfície | 0.85 – 1.00 | 3.15 |

**O comprimento do beat de Trabalho é fixo.** 8.4 vh no desktop, 5.1 no
mobile, com três cases ou com sete. A contagem de cases não estica o rio: ela
determina o **espaçamento entre os cards** dentro de um comprimento que não
muda. Rio mais longo a cada case novo transformaria o portfólio numa punição
por ter trabalhado.

> ✅ **RESOLVIDO — prompt de migração.** O dimensionamento antigo, para três
> cases, não vale mais como regra:
>
> - ~~2.8 vh por case no desktop~~ (8.4 ÷ 3)
> - ~~1.7 vh por case no mobile~~ (5.1 ÷ 3)
>
> Eram comprimento derivado da contagem, e a relação agora é a inversa. Ficam
> riscados porque foram o raciocínio original, não porque ainda valem.

> ✅ **RECONFERIDO — o beat de Trabalho existe.** O que segue nesta subseção é
> o raciocínio original, feito antes do card e da curva definitiva, e ele fica
> porque é de onde o piso de 4.5 unidades saiu — esse piso continua valendo e
> continua sendo o que decide tudo. O que mudou foi a **contagem**, e a
> reconferência está logo abaixo, em "Capacidade do rio, medida".

**Capacidade do rio — valor derivado, calculado antes de o beat de Trabalho
existir.** O componente de card ainda não foi escrito e a curva de câmera de
0.45 a 0.85 continua provisória (`lib/scene/curve.ts`, docblock de `STOPS`),
então este número não pode vir de medir pixel entregue como o resto deste
documento exige — ele é uma extensão do mesmo método já usado para
`SPECIMEN_SIZE` (`lib/scene/world.ts`): ocupação angular a uma distância de
leitura conhecida. **Precisa ser reconferido** quando o card e a curva
definitiva existirem — ele entra como piso de planejamento, não como medição.

**O piso de distância.** Dois cards se atropelam quando o mais distante não
encolheu o bastante, na perspectiva, para o olho ler "o próximo", e não "o
mesmo, ainda". Usando a mesma distância de leitura do corpo de prova (14
unidades, `SPECIMEN_Z` + `ROOST_AHEAD`-like approach) e o mesmo FOV vertical
de 45°, exigir que o card seguinte projete pelo menos 30% menos largura que o
atual — o suficiente para ler como duas camadas de profundidade distintas sem
exigir um vão desproporcional — dá `D_seguinte ≥ 1.3 × D_atual`. Com a
distância de leitura em torno de 14, isso é `ΔZ ≈ 0.3 × 14 ≈ 4.2`, arredondado
para **4.5 unidades de mundo entre centros de card**: o piso abaixo do qual
eles se atropelam.

**A extensão do beat.** Sem curva definitiva, o comprimento em mundo do rio é
estimativa, pela taxa das duas esticadas já fechadas nesta mesma curva:
Identidade percorre 16 unidades em 3.8 vh (4.2 u/vh) e Quem sou percorre 20 em
3.6 vh (5.6 u/vh). Com a média das duas, ~5 u/vh, os 8.4 vh do desktop valem
**~42 unidades**. Descontando meio piso de margem para a entrada e a saída do
beat, `(42 − 4.5) ÷ 4.5 ≈` **8 cards no desktop**.

**O mobile não herda o mesmo comprimento em mundo.** Este documento já pede
uma "travessia mais curta" para o rio no mobile (PROJECT.md §5), não a mesma
travessia rolada mais rápido — então o corredor do mobile encolhe na mesma
proporção que o vh encolheu (5.1 ÷ 8.4 ≈ 0.61), o que dá **~26 unidades**, e
com o mesmo piso de 4.5, `(26 − 4.5) ÷ 4.5 ≈` **4 cards no mobile**.

~~**A meta de curadoria é 8 cards no desktop e 4 no mobile.**~~ São **7 e 4** —
ver a subseção seguinte. O que não mudou é o que a meta existia para garantir:
com sete cases no acervo (PROJECT.md §6), o desktop comporta o acervo inteiro se
a curadoria decidir por isso; o mobile não — exige um corte de até quatro.

### Capacidade do rio, medida

A corrente existe (`lib/scene/cards.ts`), a curva de 0.45 a 0.85 deixou de ser
provisória, e a reconferência que a estimativa acima pedia foi feita. **A
capacidade do desktop é sete, não oito**, e o motivo é que a estimativa não
contava duas coisas que só aparecem com a curva na mão:

- **O primeiro card entra à distância de leitura, não colado.** Treze unidades à
  frente da câmera em 0.45, que é onde `SPECIMEN_SIZE` foi resolvido. Começar o
  rio com um card explodindo em cima de quem acabou de sair do manifesto não é
  entrada, é susto.
- **O último tem que ser *lido* antes de 0.85, não só ultrapassado.** A leitura
  acontece catorze unidades antes da passagem. Com o último card no limite de
  passagem, a última décima do beat fica sem nada à frente — e ficou: a primeira
  contact sheet do corredor tinha dois quadros de doze com a câmara vazia.

Sobram 27 unidades entre o primeiro e o último. Com o piso de 4.5, `27 ÷ 6 = 4.5`
— **sete cards, exatamente no piso**. Oito exigiriam 3.86, abaixo dele.

Isso não muda a meta de curadoria: o motivo declarado para "~8 no desktop" é que
"o desktop comporta o acervo inteiro se a curadoria decidir por isso", e o
acervo tem sete cases. Sete cabem.

**E o mobile percorre o mesmo corredor em mundo.** A estimativa de ~26 unidades
supunha que o corredor encolhesse na proporção do vh, e a curva definitiva não
pode fazer isso: ela é função do **progresso**, e progresso não sabe de
breakpoint — dois corredores em mundo seriam duas curvas, e a regra da variável
única (PROJECT.md §3.3) tem uma só. O que encolhe no mobile é o **custo em
rolagem**: as mesmas 44 unidades em 5.1 vh em vez de 8.4. É a "travessia mais
curta" do PROJECT.md §5 lida como tempo, que é como uma pessoa a sente.

A contagem cai para quatro pelo mesmo motivo de ritmo que sempre a governou:
`8.4 ÷ 7 = 1.20` vh por card no desktop, `5.1 ÷ 4 = 1.28` no mobile — a mesma
respiração por card. Com quatro cards no mesmo corredor o espaçamento vai a 9.0
unidades, o dobro do piso, e as razões de largura projetada entregue ficam em
2.12 · 1.45 · 1.49 (medidas; o piso pede 1.30).

**A curadoria é um ranking único, não duas listas por aparelho.** `river_rank`
(`lib/cases.ts`) é uma ordem só — **a ordem atual é provisória e aguarda
decisão do Lucas**, ver a pendência em "Filtros por disciplina" —; cada
aparelho corta essa mesma ordem pela capacidade que couber — o mobile não
ganha uma seleção própria, ele é sempre os quatro primeiros postos do ranking
que o desktop também usa. Duas listas independentes permitiriam o mobile
mostrar um conjunto sem relação com o do desktop, e essa divergência não serve
a nada: o rio é um só projeto de curadoria, só o corte muda por tela. **O
comprimento do beat continua sem crescer com a contagem** — só o espaçamento
entre os cards escolhidos muda, sempre respeitando o piso de 4.5.

Soma: `2.1 + 3.8 + 3.6 + 8.4 + 3.15 = ` **21.05 vh** de faixa rolável.

**O viewport que falta para os 22.05 totais não é rolável, e é da
Superfície.** Toda página rolável termina assim: quando o scroll esgota a
faixa rolável, o último viewport de conteúdo continua na tela sem custar
rolagem nenhuma — é por isso que a altura virtual total sempre excede a faixa
rolável em exatamente um viewport, não por escolha deste projeto. Ele não é
um sexto beat nem um espaçador solto entre beats: é a continuação da própria
Superfície, *depois* de progresso 1.00. É onde mora o quadro final que esta
seção já descreve mais abaixo — a câmera chegou à veneziana, o bando já saiu,
e o que fica parado na tela é a luz, o contato em DOM e o último número
gravado. Progresso trava em 1.00 e nada mais se move; nada de novo entra em
cena ali.

Esse vh fica **fora da faixa de progresso** — ele nunca teve, e não ganha, um
intervalo de `from`–`to` próprio. Se uma linha da tabela mudar e os totais
forem recalculados, este vh não se redistribui entre os beats: ele é o resto
que qualquer documento rolável tem, sempre exatamente 1, e continua pertencendo
à Superfície. No código é `TERMINAL_HOLD_VH` em `components/beats/beats.ts`,
somado à altura renderizada da própria seção de Superfície — nunca à sua `vh`,
que continua sendo só a parte rolável e é o que entra nesta soma e na
verificação abaixo.

**Verificação contra a regra dos oito segundos.** O quadro do descolamento cai
em progresso ≈ 0.18, ou seja, `0.18 × 21.05 = 3.79 vh` de rolagem a partir do
topo. Lenis com lerp 0.075 a 60 fps converge a 95% em `ln(0.05)/ln(0.925) ≈ 38`
quadros, cerca de **0.64 s** de assentamento — é atraso de acomodação, não
multiplicador de distância.

Com uma taxa conservadora de 1.0 vh/s (roda de mouse a ~1000 px/s numa viewport
de 900 px), 3.79 vh levam 3.79 s; somando o assentamento, **~4.4 s**. Num
visitante lento a 0.6 vh/s, 6.32 s + 0.64 = **~7.0 s**. Os dois passam. Para a
regra falhar seria preciso rolar abaixo de `3.79 ÷ (8 − 0.64) = ` **0.52 vh/s**,
mais devagar que um único gesto decidido de trackpad.

Isso vira teste: rolagem sintética a 0.6 vh/s a partir do clique de entrada,
cronometrando até o quadro de separação máxima. Portão: ≤ 8 s.

**Mobile:** o rio comprime para **5.1 vh** — fixo, como no desktop — e os
outros beats são mantidos, o que dá `2.1 + 3.8 + 3.6 + 5.1 + 3.15 = ` **17.75
vh** de faixa rolável, **18.75 de altura virtual total** — o mesmo viewport
parado do fim, descrito acima, sempre 1 inteiro independente do breakpoint.

> ✅ **RESOLVIDO — prompt de migração.** ~~O 5.1 nasceu de `1.7 × 3 cases`~~,
> uma derivação que não vale mais. O número permanece como o comprimento fixo
> do rio no mobile — o que mudou é que ele deixou de ser consequência da
> contagem: ~~com o piso de 4.5 unidades e o corredor estimado de ~26 unidades~~
> (ver "Capacidade do rio, medida", acima: o corredor do mobile é o **mesmo** de
> 44 unidades, percorrido em menos rolagem), 5.1 vh comportam **4 cards**, que é
> a meta de curadoria do mobile. Se a curadoria eventual pedir mais que isso no
> mobile, é o **espaçamento** que cede primeiro, ou o subconjunto exibido —
> nunca o comprimento do beat, porque esticá-lo quebraria os totais e a regra
> dos oito segundos.

O quadro do descolamento cai em `0.18 × 17.75 = 3.20 vh`. O polegar cobre 2 a
3 vh/s: a 2 vh/s são 1.60 s + 0.64 de assentamento = **~2.2 s**; a 3 vh/s,
**~1.7 s**. A margem é enorme — para a regra falhar seria preciso rolar abaixo
de `3.20 ÷ 7.36 = ` **0.43 vh/s**, o que no celular não é rolar, é hesitar. O
PROJECT.md já diz: ninguém abre um portfólio no celular para rolar dez minutos.

Se um beat precisar de mais ar, ele tira do rio, nunca da Identidade — encurtar
a Identidade encurta a aproximação, e a aproximação é o que faz o descolamento
valer.

Isso **não** contradiz o comprimento fixo do rio: fixo é em relação à
**contagem de cases**, não a uma decisão de composição. O rio pode encolher
para dar ar a outro beat; o que ele nunca faz é **crescer porque entrou um
case** — crescer quebraria os totais e a regra dos oito segundos, e é
exatamente a direção que a contagem empurraria se deixassem.

### pré — Portão

Preto absoluto. Só mono, DOM, nítida. O contador não é porcentagem de
carregamento: é uma leitura de velocidade subindo, `00.000` → `14.617 M/S`,
com a cota da câmara ao lado. Uma linha: entrar.

O clique abre a veneziana: um baque grave de pressão, o áudio destrava, e a
primeira onda de densidade atravessa o quadro antes de qualquer texto aparecer.
Sem animação de logotipo. Sem barra de progresso.

**Três casas decimais, e o desconforto é o ponto.** A instrumentação tem uma
casa a mais do que o olho acompanha: a terceira borra durante a subida, e é
isso que faz a leitura parecer medida em vez de animada. `87%` é uma promessa;
`07.284 M/S` é um instrumento. O valor terminal é `14.617` e não `14.600` pelo
mesmo motivo — número redondo em leitura de instrumento é a marca de que
alguém digitou o número. A cota é `COTA −38.402`, do léxico da §2 (`Z −38`),
e não sobe: é onde a câmara está, e a câmara não saiu do lugar.

**O que o contador conta é o carregamento de verdade**, e ele nunca mostra mais
do que já chegou. `import()` e `fonts.ready` só sabem informar "pronto", em
degraus; quem transforma dois degraus numa subida é o amortecimento, não um
temporizador fingindo ser rede.

**A mono carrega o papel de display, e só aqui.** O `PROJECT.md` §3.2 descreve
a mono em corpo pequeno porque a descreve como HUD. No portão não há HUD nem
display — "só mono, DOM, nítida" —, então ela é a única tipografia do quadro.
Fora do portão a regra do §3.2 continua inteira.

**Ao chegar a 100 o contador vira uma marca só: uma seta gravada.** Não um
botão com rótulo, não "entrar" escrito: o convite ocupa exatamente a casa que o
número ocupava, e a palavra continua existindo como nome acessível do controle.
A seta é a única coisa que o site pede — a §4 do `PROJECT.md` é uma descida
vertical, e o gesto é esse.

> **Decisão do Lucas, 2026-09-25: a marca gravada, não o glifo.** Das duas
> variantes comparadas lado a lado (`.screens/065-convite.png`), fica a marca
> desenhada no traço das gravações da câmara — haste de um fio, marca de
> intervalo no topo, ponta aberta como a da seta de escala. O glifo `↓` da mono
> saiu do código.

> **Decisão do Lucas, 2026-09-25: pelas frestas aparece a câmara real, não o
> campo 2D.** Quando a cena pinta o primeiro quadro, o que se vê entre as
> lâminas é a própria câmara em p = 0, com "uns poucos corpos isolados"
> passando perto da lente — a Emergência começando atrás da veneziana. O campo
> dormente descrito abaixo continua valendo para o intervalo antes disso e para
> o caminho sem WebGL.

**A veneziana fechada não é opaca.** Sobra uma fresta por lâmina — cobertura de
0.86 da faixa —, e é por ela que o organismo dormente aparece enquanto o site
carrega. Uma veneziana cem por cento fechada seria uma tela preta com um número
em cima, e o portão precisa ter alguma coisa viva nele. Ver de relance é a
regra da §2, não uma concessão.

Esse número tem os dois lados, e os dois já foram furados na prática. Fresta
larga demais (0.76, um quarto da tela exposta em nove faixas parelhas) faz a
câmara virar textura de fundo — dá para ler a câmara inteira num quadro, que é
exatamente o sintoma de névoa fina do §2. Fresta estreita demais (0.92) apaga
o organismo junto e deixa o portão sem nada vivo dentro. **Não corrija um dos
dois mexendo só neste número**: a vida do portão não cabe inteira na fresta, e
quem a sustenta é a gravação reativa descrita a seguir.

**A gravação da veneziana acende quando o organismo passa.** A quina de cada
lâmina não tem brilho fixo: ela responde a quem está passando perto dela
naquele quadro, amortecido, crescendo e sumindo — "uma marca gravada pegando
luz de raspão quando um corpo isolado passa perto dela, e some", que é como a
§4 já descrevia a primeira aparição da estrutura na Emergência. Isto não é
enfeite: nove linhas idênticas e **imóveis** atravessando a tela em intervalos
exatos leem como grade desenhada ou HUD, e grade é vetada pelo `PROJECT.md`
§2. O que separa estrutura de grade aqui é o tempo — "de relance" é uma coisa
que acontece, não uma opacidade. Pelo mesmo motivo as marcas de intervalo
correm em dois períodos primos entre si, que nunca batem em fase dentro de uma
tela: gravação em concreto não é papel milimetrado.

A leitura sai da simulação da CPU, nunca do canvas renderizado — é a mesma
escolha que o §5 faz para o rig de luz da cena ("nada de `readPixels` no
caminho de render"), e aqui sai de graça, porque o campo dormente já é CPU.

**A veneziana é desenhada dentro do canvas, e a ordem das passadas é regra.**
Névoa → corpos → lâminas → véu → grão. Enquanto as lâminas foram `div`
opacos empilhados por cima do canvas, duas regras deste documento eram
inalcançáveis por construção, não por calibragem: o grão é pós e não encostava
nos 79% da tela que as lâminas cobriam (o §3.1 pede pós no **quadro
composto**), e o véu de legibilidade ficava numa camada *abaixo* do realce de
quina que ele existe para abafar — uma guarda debaixo do que ela guarda não
guarda nada. Medido depois da mudança: o tripleto modal caiu de 78,8% para
5,6% do quadro, e a pior luminância sob a caixa da leitura, varrendo 300
quadros, é L = 0.0385 contra o teto de 0.138 do §5 — 9,6:1. **Não reintroduza
lâmina em DOM.**

**O organismo do portão é dormente, e é um degrau antes da Emergência.** Nem
bando nem boids: matéria à deriva numa corrente lenta, respirando, com corpos
lenticulares. Ele não é a cena — a cena é o chunk que ainda está baixando —,
então é canvas 2D e custa algumas centenas de bytes.

**A abertura dura 1.45 s e não é um fade.** As lâminas encolhem a partir do
próprio centro, escalonadas do meio para as bordas, com opacidade cheia do
começo ao fim; atrás delas o bolsão de névoa abre e os corpos passam pela
câmera. Nada esmaece para revelar o que está atrás. O que muda de opacidade é
a densidade da névoa quando a câmera sai do bolsão e a energia dos corpos que
incham ao passar pela lente — as duas são física, não transição.

**As três coisas do clique acontecem juntas.** O áudio destrava, a veneziana
abre e a descida é liberada no mesmo handler, síncronas. Prender o scroll até
o fim da transição comeria 1.45 s da regra dos oito segundos da §1 sem nada em
troca.

**Com `prefers-reduced-motion` o portão continua inteiro** — contador, convite,
áudio, descida — e só a abertura vira o corte de 120 ms da §5. O campo dormente
vira uma composição fixa e não roda `requestAnimationFrame` nenhum.

### 0.00 – 0.10 — Emergência

Ar parado. Ainda não há bando: uns poucos corpos isolados, suspensos, quase sem
deriva. Névoa espessa, abertura escancarada — não dá pra saber se a câmara tem
três metros ou trezentos. Uma fonte distante a montante, fraquíssima, `--teal`.

O nome aparece pequeno, em mono, na margem inferior, com um número de estação.
Primeiro sinal da estrutura: **uma** marca gravada pegando luz de raspão quando
um corpo isolado passa perto dela, e some.

### 0.10 – 0.28 — Identidade

O bando se formou a montante e vem na sua direção.

O corpo de prova — o título display, `troika-three-text`, geometria real dentro
da cena — entra primeiro **de perfil**, então é quase invisível: uma lâmina
fina. A câmera avança, a paralaxe abre as letras de face, e a abertura fecha:
borrão → navalha.

Então acontece o frame. O bando chega laminar, encontra a aresta de ataque, se
descola em duas lâminas, entra em turbulência dentro dos vazios das letras,
solta uma esteira de vórtices atrás das hastes e **se recompõe** rio abaixo. As
letras não são desenhadas por nada: são provadas sólidas pelo que desvia nelas.
Oclusão verdadeira, corpos passando na frente e atrás, mesmo fog, mesma pós.

> **Decisão do Lucas, 2026-09-25: o frame é visto fora do eixo.** A aproximação
> continua como está — a peça entra de perfil e o bando vem contra a câmera —,
> mas no trecho do frame, de cerca de 0.16 a 0.22, a câmera sai do eixo do duto
> e para numa pose oblíqua, entre 20 e 35 graus, de onde o escoamento **cruza**
> o quadro e a curva em volta das letras aparece como curva. Olhando ao longo do
> escoamento o descolamento é invisível por geometria: os corpos vêm
> radialmente contra a lente e o desvio é lateral, no plano das letras. A regra
> dos oito segundos e o piso de 4 graus de face continuam valendo. O tubo do
> bando cobre a peça inteira vista dessa pose, pontas incluídas.

Ao lado, coluna mono com o posicionamento em três linhas curtas. Ao fundo, a
parede cotada dá escala ao corpo de prova — o título é dimensionado como peça de
ensaio, com seta de escala e cota.

### 0.28 – 0.45 — Quem sou

O bando se organiza: assenta num poleiro colunar de rotação lenta, densidade
estável. Aqui a estrutura chega mais perto da câmera do que em qualquer outro
momento — a câmera passa rente a uma parede que é uma régua graduada, e a
densidade do bando é **medida contra ela**, com a leitura correndo na HUD.

Abertura fechada, tudo nítido, velocidade dos corpos caindo para planeio longo.
Manifesto em coluna estreita alinhada a uma margem, nunca centralizada, grotesca
regular, medida de 60 a 70 caracteres.

> **A medida era 66ch e entregava 80 caracteres.** `ch` é a largura do algarismo
> zero, que no Archivo é bem mais largo que a média de um texto em minúsculas —
> então o token descrevia uma coluna e a página desenhava outra. Contado no que
> foi desenhado (o offset em que `Range.getClientRects()` ganha uma caixa nova),
> `--measure` foi para **54ch** e a superfície de leitura longa passou a entregar
> mediana **66**, p10 58, p90 69. Ver MEASUREMENTS.md, "A medida de leitura,
> contada no que foi desenhado".

### 0.45 – 0.85 — Trabalho

O rio. Os cards são outros corpos de prova montados ao longo da câmara, em
perspectiva real, e a câmera atravessa por entre eles.

**O rio mostra os cases curados, não o acervo.** Só entram na câmara os cases
no topo do ranking `river_rank`, até onde a capacidade do aparelho couber; o
acervo completo é maior e vive na lista em DOM da HUD. Isso não é uma
limitação da cena, é o princípio do PROJECT.md §4 — o acervo é maior que o
rio, e o rio é curadoria, não índice. Ver PROJECT.md §6 para a lista dos cases
e §4 para o princípio.

Cada card tem sua própria esteira: ao se aproximar, o bando se descola nele
também. O bando é o tecido conjuntivo entre os projetos — é a mesma física do
beat de identidade, em escala menor, e é o que impede o rio de virar uma galeria.

Cada card carrega uma placa de cota gravada: cliente, ano, estação.

> ✅ **A física está feita e medida** — `lib/scene/shaders/boids.ts`, bloco
> `CARD_FORCE`. Os mesmos três efeitos do descolamento (aresta de ataque,
> turbulência, recolamento), nas mesmas frações da altura da peça, com uma
> diferença de fonte e uma de desenho.
>
> A de fonte: a distância com sinal do card é **analítica**, um retângulo de
> cantos arredondados resolvido no shader, e não um campo assado. O assado com
> jump flood existe porque glifo tem forma arbitrária; card não tem, e assar um
> campo por card trocaria precisão infinita por sete texturas.
>
> A de desenho: a turbulência do glifo mora nas **contra-formas**, e um card não
> tem nenhuma. Ela passa a morar na **camada de cisalhamento** — a fronteira
> entre a esteira parada e o escoamento que passou raspando a borda —, que é
> onde uma placa larga solta vórtice. É a mesma leitura física que pôs a do
> glifo dentro do olho da letra.
>
> Medido pelo método do descolamento (sombra da tinta a uma, duas e quatro
> larguras de card a jusante, sinal sobre controle na mesma laje): **0.13 → 0.58
> → 0.92**, monotônico, sem passar do escoamento não perturbado. Os números por
> card, os controles e o que eles custaram estão no AGENTS.md, "O rio, medido".
>
> **E a esteira só age dentro do beat.** As sete peças estão montadas de trinta
> a cinquenta e oito unidades a montante do corpo de prova, e agindo desde 0.00
> elas entortavam o escoamento que chega no quadro do descolamento — a
> discordância entre as metades do perfil vertical, que é o **controle** do
> critério de aceite daquele beat, dobrava de 14.8% para 26.0%. A força entra com
> o beat, pela mesma disciplina que o poleiro e o tubo do bando já seguem. O que
> não é coreografado é a geometria: os cards estão montados na câmara desde
> sempre, e se veem de longe, atrás da névoa.

**A curadoria é um ranking único, não um booleano por aparelho.** `river_rank`
(um número, obrigatório e único em todo o acervo — `lib/cases.ts` falha a
build se dois cases colidirem no mesmo posto) deve ser decidido **olhando os
cards montados na cena**, não lendo a lista de projetos — e **ainda não foi**:
a ordem que está no frontmatter é provisória (ver a pendência abaixo, depois da
matriz). **Não existem duas listas
de curadoria, uma por aparelho**: existe uma ordem só, e cada aparelho corta
essa mesma ordem pela capacidade que couber — 7 cards no desktop e 4 no
mobile (ver "Capacidade do rio", abaixo). Editar a curadoria é reordenar um
número; o corte por tela é derivado, não escolhido caso a caso.

Isto substitui o desenho anterior, em que cada case tinha um `in_river:
true/false` e "quem está no rio" era a mesma pergunta em toda tela. Um
booleano por aparelho exigiria decidir a curadoria duas vezes e permitiria as
duas listas divergirem sem ordem nenhuma entre si — o mobile poderia mostrar
um conjunto sem relação com o do desktop, quando o que este documento sempre
pediu foi um corte mais curto da mesma fila, não uma segunda fila.

**Nenhum case é apagado para sair do corte de um aparelho.** Ele continua em
`content/cases/`, continua na lista de acervo, continua com rota própria em
`/work/[slug]`, continua indexável e linkável. Ficar fora do corte é uma
decisão de composição — quantos corpos de prova a câmara comporta antes de o
escoamento virar galeria —, não um julgamento sobre o trabalho. Apagar um case
para encurtar o rio confundiria as duas coisas e perderia a única cópia do
material migrado.

**Filtros por disciplina, não por categoria.** Três eixos — **produto**,
**sistema**, **marca** — e cada case aparece em mais de um. A matriz dos sete,
na ordem da curadoria (`river_rank`):

| # | | produto | sistema | marca |
|--:|---|:--:|:--:|:--:|
| 1 | Perfecting | ● | | ● |
| 2 | Unifique Energia | ● | ● | ● |
| 3 | Decision Suite | ● | ● | |
| 4 | WeCann Atena | ● | ● | |
| 5 | Prime8 | ● | ● | ● |
| 6 | ZOOMtecnologia | ● | | ● |
| 7 | Nestlé | ● | | ● |

Nenhum filtro devolve menos de dois cases, e nenhum esvazia o rio.

> ⏳ **PENDENTE — decisão do Lucas.** A ordem da curadoria (`river_rank`) e a
> marcação por disciplina da matriz acima **não foram decididas pelo Lucas**.
> Elas foram escritas pelo agente no commit `0061582`, lendo a lista de
> projetos, e registradas aqui como se tivessem sido decididas olhando os cards
> montados — o que não aconteceu. **As duas são provisórias.** A ordem atual
> (Perfecting 1, Unifique Energia 2, Decision Suite 3, WeCann Atena 4, Prime8 5,
> ZOOMtecnologia 6, Nestlé 7) põe no corte do mobile três dos três cases com
> capa gerada. Nenhum agente mexe no `river_rank` nem na matriz até a decisão; o
> que um agente entrega é a contact sheet dos sete cards montados, à distância
> de leitura, para ela ser tomada.
>
> A matriz cobre os sete cases e é a que os filtros do rio usam hoje.
>
> **Quando decidir, segundo o Lucas (2026-09-25): só depois de as três capas
> geradas virarem material real.** Decidir antes seria ordenar três retângulos
> de campo procedural contra quatro fotografias.
>
> **A garantia deixou de ser uma expectativa e virou uma guarda de build.**
> `assertFilterFloor` (`lib/cases.ts`) confere os três eixos contra o corte
> **mais apertado** que existe — os quatro primeiros postos, que é o rio do
> mobile —, porque um corte maior só pode aumentar as contagens. Ela distingue
> os dois modos de falha que o PROJECT.md §7 exige de toda guarda: um eixo com
> **zero** cases é "o filtro esvaziaria o rio", um eixo com **um** é "o filtro
> devolveria menos de dois", e cada mensagem nomeia o eixo, a contagem e os
> postos do corte. **Verificada nos dois sentidos**, quebrando a matriz de
> propósito: a build cai nos dois casos, com a mensagem certa.
>
> Contagens: no desktop (7) produto 7 · sistema 4 · marca 5; no corte do mobile
> (4) produto 4 · sistema 3 · marca 2.
>
> Os filtros operam sobre **quem está no rio** — o topo do ranking `river_rank`
> até a capacidade do aparelho —, não sobre o acervo inteiro — senão promover
> um card que não está montado na câmara não teria o que promover.

**E o filtro nunca remove.** Ele **promove**: as peças que casam vêm para o eixo
da câmara, as outras recuam para a periferia e continuam montadas, ainda
visíveis de raspão. O rio nunca encolhe — ele muda de rota, e o bando muda junto.
A reorganização é legível como mudança de escoamento, não como cards sumindo.
Sem recarregar a página.

**Transição para o case.** O card se aproxima da câmera e vira a capa; o bando
continua escoando atrás dele, e é a esteira que te leva para `/work/[slug]`. Sem
tela branca. Dentro do case: DOF desligada, névoa parada, texto plano e imóvel.

> ✅ **FEITA E MEDIDA.** O canvas **não remonta**: a cena mora no layout de um
> grupo de rotas que cobre a home e o case, e `/work` fica de fora — o acervo
> continua sem 3D, e é ele o controle da medição.
>
> "O card vira a capa" é literal e é uma medida: a região de capa projetada casa
> com o `<img>` da página em **0.0024 px** de pior aresta, contra **212 px** de
> controle no meio do voo. "Sem tela branca" é o invariante que a sustenta —
> **zero quadros** em que a peça já saiu e a capa em DOM ainda não está opaca,
> com 252 ms de sobreposição entre as duas. A abertura chega a **zero** no fim
> do voo, então o encaixe acontece na navalha.
>
> **A câmera de repouso ficou fora do tubo do bando** (`x = −10.2`, entre o tubo
> de 8.6 e a parede de 12), e isso não foi composição: parada no eixo, ela tem
> corpos atravessando a lente, e a varredura de contraste do artigo reprovou em
> **3.47:1**. Fora dele, o bando **cruza** o quadro em vez de vir contra ele — que
> é a diferença entre observar o organismo e continuar dentro dele — e o mesmo
> número vai a **10.95**. Junto com ela, dentro do case a capa das peças vizinhas
> cai a um décimo e a gravação da placa a 12%: elas continuam montadas e continuam
> se vendo de relance, que é como o §2 descreve a estrutura.
>
> Números, controles e as três reprovações que mudaram o desenho: MEASUREMENTS.md,
> "A travessia para o case, medida".

### 0.85 – 1.00 — Superfície

A câmera chega à tomada de ar. Venezianas, a última cota gravada na soleira, e
luz de fora entrando em lâminas — `--peach` atravessando a névoa, que finalmente
lê quente no topo. O bando sai pela abertura e se dispersa.

Contato em DOM: e-mail, perfis, seletor de idioma. Sem formulário, sem frase de
convite. O último frame é a câmara vazia, com luz, e um número gravado.

> **Como foi construída (rodada 11), e o que o Lucas decidiu sobre ela em
> 2026-09-25.**
>
> - **As venezianas são aletas verticais — aceito pelo Lucas.** Com lâminas
>   horizontais e a luz vindo de cima, as oito lâminas de luz se empilhavam num
>   cone só de névoa — de frente, uma lâmina não se separa da outra. Aletas
>   verticais com a luz quase ao longo do duto ficam de perfil para a câmera, e
>   as lâminas se leem uma a uma.
> - **O número gravado é `COTA ±00.000` — aceito pelo Lucas**, no topo da
>   soleira: o portão abre na cota −38.402, e a descida termina na referência de
>   nível, com as mesmas três casas.
> - **A frase de despedida é "Cota −38.402 na entrada, ±00.000 na saída." —
>   decisão do Lucas**: a proposta tinha uma segunda metade ("O resto não cabe
>   num instrumento."), cortada porque o número já diz o resto.
> - **O enquadramento** põe a abertura na metade direita e a coluna de contato
>   sobre concreto escuro na esquerda, com as lâminas descendo para longe dela:
>   é a composição, e não o véu, que dá contraste ao texto aqui.
> - **O bando dá a volta** e sai pelas frestas; quem cruza uma lâmina acende em
>   `--peach`. O último quadro não tem corpo nenhum.

### HUD lateral fixa

Coluna estreita permanente, mono pequena, em uma das laterais. Contato, acervo,
filtros do trabalho, controle de áudio, toggle de idioma — e o **indicador de
progresso desenhado como régua graduada com cotas**, não como barra. Substitui
o rodapé; o site não tem rodapé. No mobile colapsa num acionador no topo.

**A entrada de acervo** abre a lista completa dos cases em `/work`: DOM puro,
mono, sem cena, sem 3D, com o link de cada um e a cota de cliente e ano. É a
única forma de chegar num case fora do rio (PROJECT.md §4), e é a peça que
impede a curadoria de virar exclusão. Ela é deliberadamente sem graça — quem
chega ali está procurando uma coisa específica, não sendo apresentado ao
trabalho. A cena é o argumento; o acervo é o índice.

---

## 5. Material e luz da cena 3D

### Luz

- **O bando é a única luz prática** entre 0.00 e 0.85. Os corpos são emissivos e
  se leem como fonte; além deles, um rig pequeno (3 a 5 luzes) segue os
  aglomerados mais densos. Nada de key light, fill light ou HDRI de ambiente.

**Rig de luz, sem readback síncrono.** Ler o centroide do FBO a cada quadro
trava o pipeline — a GPU tem que terminar antes de a CPU receber, e o frame
morre. A posição das luzes vem de uma **simulação proxy barata na CPU**: ~64
macro-partículas rodando as mesmas forças em baixa resolução, a 15 Hz,
interpoladas com `damp` entre atualizações. As 3 a 5 luzes seguem os
aglomerados dessa nuvem grosseira. O proxy não precisa bater com a simulação da
GPU corpo a corpo; precisa concordar sobre **onde está a massa**, e isso ele
faz. Nada de `readPixels` no caminho de render, nunca.

**O proxy dirige a luz e a estrutura, e não dirige mais o véu.** Ele dirigiu, e
a medição mostrou por que não podia: a energia dele é massa × velocidade, e num
beat em que a velocidade cai de propósito ele conclui que a cena escureceu
justamente quando ela clareia. Para "onde está a massa" isso não importa —
para "quanta luz há atrás desta linha de texto" importa tudo. Ver "Legibilidade
sobre luz variável".
- **Uma fonte distante a montante**, quase zero no começo, subindo para o máximo
  só entre 0.85 e 1.00. É a luz para a qual você está andando. A cor viaja
  `--teal` → `--cyan` → `--peach` ao longo da descida.

  > **A rampa estava chegando ao máximo em 0.28, e o rio denunciou.** Enquanto a
  > câmera ficava a oitenta unidades da tampa do fundo ninguém via — a névoa
  > comia o disco inteiro. No corredor ela fecha para quarenta e sete, o disco
  > cresce na tela, e a fonte passava a lavar o meio do quadro justamente onde os
  > cards do fundo precisam ser lidos como silhuetas. O sintoma é do beat novo, o
  > desvio desta linha é antigo. Corrigido em `sourceStrengthAt`
  > (`lib/scene/curve.ts`): platô baixo pela descida inteira, subida onde este
  > documento sempre a pôs. O valor de topo é **provisório**, como os pontos de
  > controle de 0.85 em diante — quem o resolve é o beat da Superfície.
- A luz nasce dentro da cena. Nenhum `box-shadow` participa da iluminação.
- Bloom sim, mas apertado e com threshold alto: só corpos emissivos e a fresta
  da tomada de ar. Bloom não é o efeito, é o transbordo dele.

### Legibilidade sobre luz variável

> **O véu comprime a luz; ele não pinta sombra — pedido do Lucas, 2026-09-25.**
> O mecanismo abaixo misturava a caixa do texto para `--void` na força que o
> pixel mais claro atrás dela exigia; na tela, isso era um retângulo preto de
> borda borrada atrás de todo texto sobre luz, e ele o apontou como uma forma
> amadora de resolver. Desde a rodada 11 cada pixel é comprimido pela própria
> luminância — o escuro fica como está, o claro cede até o teto —, e o teto do
> §5 continua valendo pixel a pixel. O resto desta seção descreve o problema e o
> teto, que não mudaram; o "mix em direção à névoa" é o mecanismo antigo. E a
> regra que ganha peso: **texto mora onde a cena já é escura** — o véu é a
> garantia, não a composição.

Se o bando é a única luz prática até 0.85, a luminância atrás de todo texto em
DOM muda a cada frame. Contraste médio não vale nada aqui; o que vale é o pior
frame.

**O alvo, em número.** `--mist` (#DCE9EC) tem luminância relativa L ≈ 0.796.
Para 4.5:1 contra ela:

```
(0.796 + 0.05) / (L_fundo + 0.05) ≥ 4.5   →   L_fundo ≤ 0.138
```

Esse é o teto duro: **nenhum pixel sob a caixa de um texto de leitura pode
passar de L = 0.138.** Com a câmara vazia sobra folga enorme — `--void` dá
16.0:1 e `--abyss` dá 14.7:1. O problema é um só: um aglomerado em `--cyan`
emissivo no auge vale L ≈ 0.619, ou seja **1.26:1**. Um cacho brilhante
cruzando atrás da coluna destrói a leitura por dois segundos.

**Mecanismo: véu ancorado à coluna de texto, feito de névoa.** Não é um scrim
preto por cima do canvas. É um `mix` em direção à cor da névoa, em luz linear,
ancorado à caixa da coluna de texto e com queda suave:

```
L_saída = (1 − f) · L_cena + f · L_névoa      →      f = (L_cena − alvo) / (L_cena − L_névoa)
```

Como `L_névoa` é uma constante conhecida (~0.003), dá para **resolver `f` para o
alvo** em vez de escolher um valor bonito e torcer.

**E `L_cena` é medido, não estimado.** O compositor reduz o próprio quadro — cena
mais bloom, já tonemapado — por **máximo**, em três passadas de 4×4, até 1/64 da
resolução; uma quarta passada varre a região de cada caixa nesse campo e resolve
o `f` dali. Máximo, e não média, porque o critério é "nenhum pixel sob a caixa
passa do teto". Tudo na GPU: nada volta para a CPU, e a proibição de `readPixels`
no caminho de render continua de pé.

- **O véu entra depois do bloom e depois do tonemap.** Depois do bloom porque é
  o bloom que espalha a luz de um corpo que está *fora* da caixa para dentro
  dela; depois do tonemap porque é ali que a cor vira a luminância relativa que
  a conta de contraste usa — o teto deixa de precisar de conversão e passa a
  ser o próprio número que a medição lê no pixel.
- **`f` não tem piso nem teto.** Onde a cena já está abaixo do alvo ele é zero e
  o véu não existe; onde um cacho passa ele vai até onde precisar. O véu fica
  baixo quase o tempo todo porque a cena está escura quase o tempo todo, e não
  porque um clamp o segura.
- **Ele sobe no quadro e desce devagar** (~0.27 s), num ping-pong de dois alvos
  de poucos texels. Um quadro sem véu já é um quadro ilegível; um quadro com véu
  a mais é só um quadro com névoa.
- O véu vive na cena, atrás do texto. O DOM nunca ganha `background`, `scrim`
  nem `text-shadow` para compensar.

**Por que este mecanismo substituiu o anterior.** A primeira versão resolvia `f`
uma vez por caixa por quadro a partir da **simulação proxy da CPU** — o mesmo
proxy do rig de luz —, com a justificativa de que ele roda adiantado e faria o
véu subir antes do cacho chegar. Implementado e medido no pixel entregue,
varrendo o beat de Quem sou a 0.6 vh/s: **1.21:1 no pior quadro**, com L = 0.65
sob a coluna de manifesto e o `f` parado no piso de 0.15.

A causa não é calibragem. A energia de um aglomerado do proxy é massa ×
velocidade, e no poleiro de Quem sou a velocidade **cai de propósito**: o
estimador desce exatamente enquanto o bando se junta atrás do texto e fica mais
brilhante. Era um modelo da cena decidindo pela cena — o erro que o PROJECT.md §7
proíbe para instrumentos, cometido aqui pelo próprio mecanismo. Consertar o proxy
não resolveria: proxy consertado continua sendo palpite.

Com a luminância medida do quadro, a mesma varredura devolve **4.62:1 no pior
quadro** (en, 1440×900) e uma mediana de 5.21 — o véu pousa no teto e fica lá,
que é como se reconhece um mecanismo exato. As faixas medidas por caixa estão no
AGENTS.md.

**O alvo que o solucionador mira e o piso de reprovação são dois números
diferentes, não um só.** Essa medição pousou o `f` exatamente em cima do piso
de 4.5:1 — margem zero, por construção — e isso deixou de fazer sentido assim
que se pensa no que vem depois de Quem sou: o rio (0.45) entra com capas de
card, que são brilho de imagem atrás de texto, e a HUD — a caixa mais exposta
do site, na tela o tempo todo — fica na borda por onde os cards passam. O
piso de 4.5:1 continua sendo o critério de reprovação, e não muda. O alvo que
o `f` mira para chegar lá é outra constante (`VEIL_TARGET_CONTRAST` em
`lib/scene/veil.ts`), e **está travado em 5.5** — o primeiro ponto, entre
quatro comparados lado a lado com screenshot do beat, em que o retângulo do
véu passa a ser visível sem virar um scrim opaco (ver AGENTS.md, "Comparação
do alvo do véu", para os quatro valores e as capturas).

**E 5.5 é setpoint de controlador, não valor final.** A comparação que o
escolheu rodou sem o beat de Trabalho existir — nenhum card, nenhuma capa de
imagem atrás de texto, exatamente o caso que motivou separar o alvo do piso.
Ele volta à mesa depois que o rio existir de verdade, com cards montados e
capas de brilho variável passando atrás da HUD; 5.5 é o ponto de partida para
essa etapa, não a palavra final sobre o assunto.

> ✅ **VOLTOU À MESA, e 5.5 fica — Prompt 5A.** O caso que faltava agora
> existe: sete cards montados com **capas reais**, duas delas fotografias de
> produto quase brancas (Prime8 e ZOOMtecnologia entregam L = 0.286 e 0.236
> depois do ganho da capa, contra ~0.03 do campo procedural que estava lá),
> passando por baixo da HUD durante a travessia inteira.
>
> Medido em cinco condições, todas com o rio no ar: **pior quadro 5.64 a 5.82
> de 1**, contra o piso de 4.5 do PROJECT.md §5 e o alvo de 5.5 daqui. Os
> números por caixa e a faixa de luminância atrás de cada uma estão no
> MEASUREMENTS.md, "A legibilidade, com capa de card atrás do texto".
>
> O que a medição mostra é o alvo funcionando como alvo: o teto entregue pousa
> em L = 0.0955–0.0962 em **todas** as caixas piores, contra o
> `VEIL_CEILING` de 0.0868 mais os até 0.013 do grão. O véu não está sobrando
> nem faltando — ele está exatamente onde foi mandado, e o pior quadro fica ~0.3
> acima do alvo porque a conta do grão é margem, não erro.
>
> **A hipótese que estava registrada aqui e no `veil.ts` estava errada.** O
> 5.16:1 da rodada anterior foi atribuído a `MAX_VEIL_BOXES` (então 4) sendo
> disputado pelas caixas da HUD e dos filtros. Contado ao vivo em cinco
> progressos do rio: existem no **máximo duas** caixas com área visível ao
> mesmo tempo — o painel da HUD, e o rótulo da Superfície quando ele entra.
> Nunca houve disputa de slot. O teto em 8 é folga para uma HUD futura, e não
> o conserto de nada.

**O teto de 0.138 só vale para `--mist` em opacidade cheia.** Isso colide com a
mono "de opacidade reduzida" do `PROJECT.md` §3.2: a 60% sobre `--void` a mono
compõe para L ≈ 0.271, e o teto despenca de 0.138 para **0.021** — sete vezes
mais apertado, abaixo do próprio `--abyss`, e o véu teria que ficar quase opaco
o tempo todo. Então:

- **Nada que carregue informação usa opacidade.** A mono da HUD, os rótulos, as
  cotas, o nome no beat Emergência e a coluna de posicionamento na Identidade
  são `--mist` cheio. O tom baixo vem de **corpo pequeno e tracking largo**, não
  de alpha — e mono pequena com tracking largo já lê discreta.
- Opacidade reduzida fica só para o que é ornamento puro e não precisa ser lido.
  Se some e ninguém perde informação, pode ter alpha.
- A varredura de teste mede a **cor composta final** de cada caixa, não o token
  de origem: se alguém baixar o alpha em algum lugar, o teste acusa.

Os beats com texto em DOM sob luz variável são **quatro**, não um: Emergência
(nome), Identidade (coluna de posicionamento), Quem sou (manifesto) e Trabalho
(placas e títulos de card), mais a HUD lateral, que está na tela **o tempo
todo** e por isso é a caixa mais exposta do site.

**Por que não a região de exclusão.** Um volume onde o bando não entra desenha
um retângulo de ausência em volta da coluna de texto — e a proibição desta rota
é justamente que o bando nunca desenhe nada. Além disso, ausência local de
corpos não controla a luminância: a névoa espalha luz de cachos que estão longe,
atrás, fora da região. Exclusão não é garantia, é esperança.

**Como isso é testado.** Não se olha um frame bonito. **Desce-se**, na taxa de
rolagem do visitante lento (0.6 vh/s), medindo **cada quadro**; em cada quadro,
para cada **linha** de texto desenhada — as caixas saem de `Range.getClientRects`
dos nós de texto, não da caixa do elemento —, amostra-se a **luminância máxima**
sob a linha, lida do quadro composto. O resultado do teste é o `argmin` de
contraste sobre todos os quadros e todas as linhas, com o progresso que o causou,
mais a **faixa medida** da luminância atrás de cada caixa. Portão: mínimo ≥ 4.5.
A varredura roda nos dois idiomas (pt e en mudam as caixas) e em três larguras de
viewport.

Duas coisas mudaram aqui depois de a primeira versão ser escrita, e as duas por
medição:

- **A caixa do véu é aparada pela janela.** Uma coluna de leitura de cinco
  viewports não tem uma caixa: convertida inteira para UV de tela ela cobre o
  quadro, e o resultado é o scrim de sangria total que este documento veta pelo
  nome. Aparada, ela é a **fatia visível** da coluna — largura da coluna, altura
  da janela —, que é literalmente o "véu ancorado à coluna de texto" acima. Na
  descida a mudança é um no-op (lá todo bloco marcado já cabe numa viewport), e
  foi conferido que os números dela não se moveram. A alternativa — marcar bloco
  a bloco — foi implementada e **reprovou em 2.87:1**: nove blocos disputando os
  oito slots de `MAX_VEIL_BOXES`, com os menores perdendo.
- **Descida, não varredura de poses.** Travar o progresso e rodar alguns quadros
  em cada passo mede uma cena que não existe: com o progresso parado, o poleiro
  de Quem sou acumula corpos que na descida real já teriam passado. Um quadro de
  medição tem que ser um quadro de site.
- **O grão conta.** O documento dizia que ele não contava como fundo, e isso
  vale para a *intenção* — grão não é iluminação. Mas ele é somado depois do véu
  e o pixel entregue o inclui: medido, ele soma até 0.013 de luminância, e é por
  isso que o teto do véu é 0.017 abaixo do alvo em vez de igual a ele. Descontá-
  lo na hora de medir seria medir o quadro que não foi entregue.

### Névoa (não é fumaça)

Névoa exponencial com ruído 3D modulando densidade — atmosfera. **Fumaça é meio
advectado com campo de velocidade, e está proibida nesta rota.** Sem pluma de
curl noise, sem visualização de escoamento, sem pente de fumaça, sem tufos.

Rampa de cor com no mínimo três paradas: `--void` → `--abyss` → `--deep`,
migrando para `--peach` só acima de 0.85.

Grão de filme em pós, animado por frame, intensidade 0.03 a 0.06. Nunca PNG de
ruído estático.

### Corpos (o bando)

- Instanciado, 4k a 16k. Boids na GPU em FBO ping-pong (posição e velocidade em
  RGBA32F). **Nada volta da GPU para a CPU** — quem informa luz e véu é a
  simulação proxy descrita em "Rig de luz".
- Corpo lenticular de poucos triângulos, sem asa animada. A orientação segue a
  velocidade; o brilho segue a aceleração.
- Material unlit com rampa emissiva: `--teal` em cruzeiro, `--cyan` em
  aceleração, `--rose` em compressão de densidade, `--coral` só na turbulência
  da esteira.

### Corpo de prova (a tipografia)

- `troika-three-text`, geometria real, opaca, escrevendo profundidade. Nunca
  `div` com `z-index` fingindo profundidade.
- Material fosco: rugosidade alta, metalness zero, cor base `--deep`, um passo
  só acima do valor da névoa. **Não é emissivo.** Ele é a coisa sólida.
- Um rim de fresnel em `--cyan` cuja intensidade é dirigida pela densidade local
  do bando à frente dele. As letras clareiam **porque o bando está perto**, e é
  isso que faz a luz nascer de dentro da cena.

### Uma fonte de verdade só, e os dois finos

Um módulo único — `TypeArticle` — é dono de **arquivo de fonte, string, corpo,
tracking, âncora e transform** da peça. Nada mais no projeto escreve esses
valores.

- O texto visível é o mesh do troika, gerado a partir desse módulo.
- O campo de distância é assado **a partir desse mesmo mesh**, renderizando-o
  numa passagem ortográfica fora de tela, no referencial local da peça, e
  passando a máscara por jump flood. Nunca a partir de uma rasterização
  paralela da mesma string: um segundo rasterizador significa um segundo
  kerning, um segundo arredondamento, e o escoamento passa a se descolar alguns
  pixels ao lado de onde a letra está.
- Assar só quando muda o que importa: troca de idioma, conclusão do
  carregamento da fonte (dentro do callback de `sync()` do troika, nunca antes)
  e mudança de corpo por breakpoint. Nunca por frame.
- A resolução do assado é amarrada à altura de caixa alta, não à viewport, para
  o SDF não depender de onde a câmera está.
- O mesmo módulo alimenta o poster de movimento reduzido e a OG image, para o
  quadro congelado ser exatamente o quadro do site.

**Espessura: os dois finos.** O troika continua plano, com espessura zero, e o
SDF continua **fino** — uma banda estreita em Z, não uma laje extrudada. Laje
contradiz a entrada de perfil: se a peça é um volume, a lâmina do beat de
identidade vira um bloco e o momento se perde.

- Banda do **sólido** em Z: `t = 0.02 · H` (H = altura de caixa alta), com queda
  suave até `±0.05 · H`.

  > **Esta linha dizia "banda de influência", e a releitura tem motivo.** Os
  > `±0.05 · H` são 0.20 unidade de mundo. O escoamento anda a ~6 u/s e o quadro
  > dura 1/60 s, ou seja **0.10 unidade por quadro**: um corpo atravessa a banda
  > inteira em dois quadros, e num quadro lento, em nenhum. Lida como alcance da
  > força, ela produz um repuxo em vez de um descolamento — e, pior, um repuxo
  > cuja intensidade **depende da taxa de quadros**, o que é um defeito, não uma
  > escolha estética.
  >
  > Então os `±0.05 · H` passam a descrever a **espessura da lâmina** (que é o
  > que "os dois finos" sempre quis dizer), e a força ganha uma rampa de
  > aproximação a montante de `1.5 · H`, derivada do gradiente do mesmo SDF. Não
  > é invenção: é a linha logo abaixo desta lista — "em escoamento real a
  > separação começa **antes** do corpo, e é isso que o olho espera ver".
  >
  > A banda do sólido continua fina e continua sendo integrada com cuidado: o
  > impulso dentro dela é calculado por Simpson ao longo do deslocamento do
  > quadro, e não amostrado na posição final, para não perder corpos que a
  > cruzam inteira num passo. Ver o docblock de `lib/scene/shaders/boids.ts`.
- Envelope de desvio lateral: isosuperfície deslocada `d = 0.015 · H` para fora
  da silhueta. É pouco — os corpos raspam a letra.
- Nada disso é trapaça: em escoamento real a separação começa **antes** do
  corpo, e é isso que o olho espera ver.
- Finura é segura porque o glifo é opaco e escreve profundidade: um corpo que
  atravesse o plano é ocluído corretamente, metade na frente e metade atrás. Não
  existe "corpo dentro da letra".
- O ângulo de aproximação nunca chega a 90°. Piso em ~4°, sempre uma nesga de
  face: em 90° exatos uma peça de espessura zero desaparece e o bando se descola
  em volta de nada.

### Como o descolamento é obtido

Sem simulação de fluido. O shader dos boids amostra o SDF fino descrito acima e
deriva a força de separação do gradiente, que é lateral — o escoamento vem pelo
eixo da câmara e as letras estão de face para ele, então a fuga acontece no
plano das letras. Atrás da peça, um atrator de baixa pressão puxa o escoamento
de volta ao eixo, e é ele que produz o recolamento na esteira. Aresta de ataque
e esteira reais a custo de uma textura, sem nunca virar shader de fluido.

### Estrutura (paredes e cotas)

Planos foscos, base `--abyss`, com as gravações em normal e height map;
geometria real só onde a câmera passa rente. Elas **nunca** têm emissivo
próprio — existem apenas como realce de raspão quando o bando passa. Números
gravados na família mono, recessados.

Os cards usam o mesmo substrato fosco, com a capa do case como textura unlit,
levemente recuada atrás da placa de cota.

### Movimento

Reorganização do bando estala em ~120 ms; o planeio entre estalos dura de 1,5 a
3 s. Nada linear: `damp` por frame ou `cubic-bezier(0.16, 1, 0.3, 1)`. Lenis com
lerp em torno de 0.075. Uma variável só — o progresso normalizado — dirige
câmera, uniforms, abertura da DOF, rampa da névoa e revelação de texto.

### Movimento reduzido: uma composição por beat

**O modo calmo é o mesmo site, mais calmo.** Ele nunca mostra nem esconde
conteúdo diferente do modo normal — não é uma versão reduzida do portfólio, é o
mesmo portfólio sem câmera em movimento. Qualquer coisa que apareça só num dos
dois modos é bug, não adaptação.

Congelar a cena inteira num quadro só apagaria o rio de projetos — os cards são
objetos na câmara, e câmera parada nunca chega neles. Então `prefers-reduced-
motion` não congela o site: ele o transforma numa **sequência de composições
fixas, uma por beat** — cinco ao todo —, e a câmera **corta** entre elas.

| Beat | Composição estática |
|---|---|
| Emergência | câmara quase vazia, um corpo isolado raspando a primeira cota |
| Identidade | **o quadro do descolamento**, no auge da separação |
| Quem sou | o poleiro colunar assentado contra a parede graduada |
| Trabalho | **os cards do rio**, de face, cada um com sua esteira parada |
| Superfície | a veneziana aberta, bando saindo, luz em lâminas |

**Uma composição por beat, não uma por case.** A composição do beat de Trabalho
enquadra **os cases do rio** — o topo do ranking `river_rank` até a capacidade
do aparelho —, os mesmos que o modo normal mostra, pelo mesmo motivo: o modo
calmo não cura de novo. Cada card continua sendo um link.

Os cases **fora** do rio são alcançados pela lista de acervo em DOM, exatamente
como no modo normal. Ela já é estática por natureza — é texto em mono, sem cena
— e por isso **não precisa de tratamento especial neste modo**. É também o que
garante que o modo calmo não esconde nada: o acervo inteiro continua a um
clique de distância nos dois modos.

- A troca é **corte**, não movimento de câmera: 120 ms de dissolve, nada de
  interpolação de posição. Movimento de câmera é exatamente o que o modo tira.
- Cada composição é uma pose diferente do bando, não a mesma congelada cinco
  vezes.
- Scroll nativo, cada composição presa à sua seção. Névoa e grão estáticos em
  0.03. Abertura de DOF fixa por composição, sem transição.
- Dentro de `/work/[slug]` não há composição a escolher: a rota de case já é
  texto plano e névoa parada nos dois modos.

### Outros estados degradados

- Sem WebGL: poster estático por seção, renderizado destas mesmas composições.
- Canvas `aria-hidden`, todo conteúdo textual em DOM, navegável por teclado.

---

## 6. Proibições desta rota

Além de tudo que o `PROJECT.md` já veta (cyberpunk neon, grade roxa, HUD de
videogame, glitch RGB, `fade-up` de 20px, `#FFFFFF`, gradiente linear de duas
paradas, ruído estático em PNG):

- **Nada de fumaça volumétrica.** É exatamente onde essa estética vira shader de
  fluido genérico. Névoa é atmosfera; fumaça é simulação. Só a primeira entra.
- **Nada de branco de laboratório.** Sem seção de ensaio clara, sem parede
  branca, sem aparato exposto sob luz plena. A câmara é escura e a estrutura
  aparece de relance.
- **Nada de pente de fumaça, tufo de fio ou tomada de pressão numerada.** A
  linguagem da medida é gravada no material: cota, régua, estação, marca.
- **O bando nunca desenha nada.** Nem letra, nem logotipo, nem silhueta, nem
  rosto, nem seta. Ele só reage ao que está montado na câmara. No instante em
  que ele forma uma figura legível, a rota morreu.
- Nada de asa animada em close, nada de pássaro reconhecível como ilustração.
- Nenhum beat pode disputar atenção com o frame do descolamento.
- Nada de laje extrudada no lugar do corpo de prova. Os dois finos.
- Nada de `readPixels` síncrono no caminho de render.
