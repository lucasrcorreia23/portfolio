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

Regras duras:

- **Texto de leitura nunca tem desfoque.** Nem o texto, nem o que está atrás
  dele encostando na caixa. Nas rotas `/work/[slug]` a DOF está **desligada**.
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

> ⏳ **PENDENTE — prompt de migração, antes do rio.** Todo o dimensionamento
> abaixo foi feito para **três cases** e não vale mais como regra:
>
> - **2.8 vh por case no desktop** (8.4 ÷ 3)
> - **1.7 vh por case no mobile** (5.1 ÷ 3)
>
> Eram comprimento derivado da contagem, e a relação agora é a inversa. Ficam
> registrados porque foram o raciocínio original, não porque ainda valem.
>
> A capacidade real do rio — quantos cards cabem em 8.4 vh sem virar galeria,
> e qual o espaçamento mínimo entre esteiras — é calculada no **prompt de
> migração, que roda antes do rio**, olhando os cards montados na cena, e
> entra aqui como **valor derivado**. **Até lá não existe número de
> espaçamento**, e inventar um seria escolher a curadoria antes de ver o rio.

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

> ⏳ **PENDENTE — prompt de migração, antes do rio.** O 5.1 nasceu de
> `1.7 × 3 cases`, uma derivação que não vale mais (ver o aviso acima). O
> número permanece como o comprimento fixo do rio no mobile; o que muda é que
> ele deixou de ser consequência da contagem. Se a capacidade calculada no
> prompt de migração mostrar que 5.1 vh não comporta os cards escolhidos com
> espaçamento legível, é o **espaçamento** que cede, ou a curadoria — nunca o
> comprimento, porque esticá-lo quebraria os totais e a regra dos oito
> segundos.

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

**Ao chegar a 100 o contador vira um caractere só: `↓`.** Não um botão com
rótulo, não "entrar" escrito: o convite ocupa exatamente a casa que o número
ocupava, e a palavra continua existindo como nome acessível do controle. A
seta é a única coisa que o site pede — a §4 do `PROJECT.md` é uma descida
vertical, e o gesto é esse.

**A veneziana fechada não é opaca.** Sobra uma fresta por lâmina — cobertura de
0.76 da faixa —, e é por ela que o organismo dormente aparece enquanto o site
carrega. Uma veneziana cem por cento fechada seria uma tela preta com um número
em cima, e o portão precisa ter alguma coisa viva nele. Ver de relance é a
regra da §2, não uma concessão.

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

### 0.45 – 0.85 — Trabalho

O rio. Os cards são outros corpos de prova montados ao longo da câmara, em
perspectiva real, e a câmera atravessa por entre eles.

**O rio mostra os cases curados, não o acervo.** Só entram na câmara os cases
com `in_river: true` no frontmatter; o acervo completo é maior e vive na lista
em DOM da HUD. Isso não é uma limitação da cena, é o princípio do PROJECT.md §4
— o acervo é maior que o rio, e o rio é curadoria, não índice. Ver PROJECT.md
§6 para a lista dos cases e §4 para o princípio.

Cada card tem sua própria esteira: ao se aproximar, o bando se descola nele
também. O bando é o tecido conjuntivo entre os projetos — é a mesma física do
beat de identidade, em escala menor, e é o que impede o rio de virar uma galeria.

Cada card carrega uma placa de cota gravada: cliente, ano, estação.

**Quem entra no rio é um campo do frontmatter.** A curadoria vive num
**booleano** — `in_river` — decidido **olhando os cards montados na cena**, não
lendo a lista de projetos. Um case só sai do rio virando esse campo `false`.

**Nenhum case é apagado para sair do rio.** Ele continua em `content/cases/`,
continua na lista de acervo, continua com rota própria em `/work/[slug]`,
continua indexável e linkável. Sair do rio é uma decisão de composição —
quantos corpos de prova a câmara comporta antes de o escoamento virar galeria
—, não um julgamento sobre o trabalho. Apagar um case para encurtar o rio
confundiria as duas coisas e perderia a única cópia do material migrado.

**Filtros por disciplina, não por categoria.** Três eixos — **produto**,
**sistema**, **marca** — e cada case aparece em mais de um:

| | produto | sistema | marca |
|---|:--:|:--:|:--:|
| Perfecting | ● | | ● |
| WeCann Atena | ● | ● | |
| Unifique Energia | ● | ● | ● |

Nenhum filtro devolve menos de dois cases, e nenhum esvazia o rio.

> ⏳ **PENDENTE — prompt de migração, antes do rio.** Esta matriz cobre três
> cases; o repositório terá sete (PROJECT.md §6). Os três eixos continuam
> valendo — são disciplinas, não categorias, e não crescem com o acervo. O que
> falta é a marcação dos quatro cases migrados, e ela sai junto com a curadoria
> de quem aparece no rio, olhando os cards na cena. Não preencher agora é
> deliberado: classificar por disciplina um case que ainda não foi visto
> montado é escolher o filtro antes de conhecer o escoamento.
>
> Os filtros operam sobre **quem está no rio** (`in_river: true`), não sobre o
> acervo inteiro — senão promover um card que não está montado na câmara não
> teria o que promover.
>
> A regra que sobrevive à ampliação: nenhum filtro devolve menos de dois
> cases, e nenhum esvazia o rio.

**E o filtro nunca remove.** Ele **promove**: as peças que casam vêm para o eixo
da câmara, as outras recuam para a periferia e continuam montadas, ainda
visíveis de raspão. O rio nunca encolhe — ele muda de rota, e o bando muda junto.
A reorganização é legível como mudança de escoamento, não como cards sumindo.
Sem recarregar a página.

**Transição para o case.** O card se aproxima da câmera e vira a capa; o bando
continua escoando atrás dele, e é a esteira que te leva para `/work/[slug]`. Sem
tela branca. Dentro do case: DOF desligada, névoa parada, texto plano e imóvel.

### 0.85 – 1.00 — Superfície

A câmera chega à tomada de ar. Venezianas, a última cota gravada na soleira, e
luz de fora entrando em lâminas — `--peach` atravessando a névoa, que finalmente
lê quente no topo. O bando sai pela abertura e se dispersa.

Contato em DOM: e-mail, perfis, seletor de idioma. Sem formulário, sem frase de
convite. O último frame é a câmara vazia, com luz, e um número gravado.

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
faz. Nada de `readPixels` no caminho de render, nunca. O mesmo proxy dirige o
véu de legibilidade, então luz e contraste enxergam o mesmo mundo.
- **Uma fonte distante a montante**, quase zero no começo, subindo para o máximo
  só entre 0.85 e 1.00. É a luz para a qual você está andando. A cor viaja
  `--teal` → `--cyan` → `--peach` ao longo da descida.
- A luz nasce dentro da cena. Nenhum `box-shadow` participa da iluminação.
- Bloom sim, mas apertado e com threshold alto: só corpos emissivos e a fresta
  da tomada de ar. Bloom não é o efeito, é o transbordo dele.

### Legibilidade sobre luz variável

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

**Mecanismo escolhido: véu ancorado à coluna de texto, feito de névoa.** Não é
um scrim preto por cima do canvas. É um termo aditivo de densidade no shader de
névoa, ancorado à caixa da coluna de texto projetada na cena, com queda suave e
o mesmo grão do resto. Névoa é `mix` em direção à cor da névoa em luz linear:

```
L_saída = (1 − f) · L_cena + f · L_névoa
```

Como `L_névoa` é uma constante conhecida (~0.003), dá para **resolver `f` para o
alvo**, por frame, em vez de escolher um valor bonito e torcer. No pior caso
(`L_cena` = 0.62) o alvo exige `f ≈ 0.78`. O véu fica baixo quase o tempo todo e
só sobe quando precisa — lê-se como um banco de névoa passando, não como uma
caixa escura acendendo.

- `f` é resolvido por frame e clampado em [0.15, 0.85].
- É dirigido pela **simulação proxy na CPU** descrita em "Rig de luz", não por
  leitura do FBO nem do frame renderizado. O proxy roda adiantado, então o véu
  sobe *antes* do cacho chegar. Ler o frame renderizado atrasaria um quadro, e
  um quadro ilegível já é uma falha. Na dúvida o proxy erra para cima: véu a
  mais é feio, véu a menos é inacessível.
- O véu vive na cena, atrás do texto. O DOM nunca ganha `background`, `scrim`
  nem `text-shadow` para compensar.

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

**Como isso é testado.** Não se olha um frame bonito. Varre-se o progresso
normalizado de 0 a 1 em pelo menos 600 passos, renderizando fora de tela; em
cada passo, para cada caixa de texto de leitura, amostra-se a **luminância
máxima** sob a caixa. O resultado do teste é o `argmin` de contraste sobre todos
os passos e todas as caixas, com o valor de progresso que o causou. Portão:
mínimo ≥ 4.5. A varredura roda nos dois idiomas (pt e en mudam as caixas) e em
três larguras de viewport. O grão não conta como fundo.

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

- Banda de influência em Z: `t = 0.02 · H` (H = altura de caixa alta), com queda
  suave até `±0.05 · H`.
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
enquadra **os cases do rio** — os de `in_river: true` —, os mesmos que o modo
normal mostra, pelo mesmo motivo: o modo calmo não cura de novo. Cada card
continua sendo um link.

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
