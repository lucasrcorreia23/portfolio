# MEASUREMENTS.md

Caderno de laboratório do projeto. Lido junto com `PROJECT.md`, `DIRECTION.md`
e `AGENTS.md`, mas não em toda sessão — só quando a pergunta é "o que já foi
medido, com que método, e por quê o número é esse".

> **A regra dos dois arquivos.** O `AGENTS.md` responde "o que vai me morder se
> eu mexer aqui": mapa de pastas, stack e travas de versão, comandos,
> arquitetura, orçamento de pacote, armadilhas conhecidas. Este arquivo
> responde "o que medimos e por quê": as tabelas de aceite de cada beat, o
> histórico de método (o que foi tentado e descartado, e a medição que
> descartou), a comparação de alvos, as armadilhas de **medição** (não de
> arquitetura) e as do banco de prova.
>
> **Escreva aqui, não lá — e o inverso.** Uma tabela de números medidos, um
> método de verificação, uma comparação de alvos ou uma armadilha de medição
> entram aqui. Um mapa de arquivos, uma regra de arquitetura, uma trava de
> versão ou algo que quebra ao editar um arquivo entram no `AGENTS.md`. Se a
> rodada seguinte não souber em qual escrever, é sinal de que o conteúdo é os
> dois — separe a explicação (`AGENTS.md`) do número (aqui), com um link de um
> lado para o outro.
>
> **O `AGENTS.md` aponta para cá por seção**, com uma linha de resumo e o
> número que importa; os detalhes — método, controles, tabela inteira — moram
> só aqui, para nenhuma rodada pagar duas vezes pela mesma medição.

---

## Índice

- [A oclusão se prova alternando a peça, e ela tem duas metades](#a-oclusão-se-prova-alternando-a-peça-e-ela-tem-duas-metades)
- [O tripleto de faixas foi refeito depois do descolamento, e ele deixou de funcionar](#o-tripleto-de-faixas-foi-refeito-depois-do-descolamento-e-ele-deixou-de-funcionar)
- [O descolamento, medido](#o-descolamento-medido)
- [Quem sou, medido](#quem-sou-medido)
- [O véu de legibilidade, e por que o mecanismo mudou](#o-véu-de-legibilidade-e-por-que-o-mecanismo-mudou)
- [O rio, medido](#o-rio-medido)
- [A travessia para o case, medida](#a-travessia-para-o-case-medida)
- [A câmara, medida](#a-câmara-medida)
- [O bando e o frame, medidos](#o-bando-e-o-frame-medidos)
- [As capas e o fim do corredor, medidos](#as-capas-e-o-fim-do-corredor-medidos)
- [O escuro e o ângulo, medidos](#o-escuro-e-o-ângulo-medidos)
- [O som, medido](#o-som-medido)
- [A Superfície e a robustez, medidas](#a-superfície-e-a-robustez-medidas)
- [Desempenho da cena, medido](#desempenho-da-cena-medido)

---

## A oclusão se prova alternando a peça, e ela tem duas metades
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

## O tripleto de faixas foi refeito depois do descolamento, e ele deixou de funcionar
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


## O descolamento, medido
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

### As quatro medidas, com dois controles cada
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

### O recolamento se mede contra a mesma laje, não contra o fluxo livre a montante
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

### Duas das quatro cores da rampa eram inalcançáveis, e a guarda não sabia dizer isso
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

### Três armadilhas do método, e é aqui que elas ficam registradas
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

   > ⚠️ **A última frase desta nota dizia que a lâmina se desmancha na descida
   > real, "artefato de medir parado, não defeito do bando". Isso está errado, e
   > o corredor do rio provou.** Medido numa descida contínua de 0.02 a 0.80 a
   > 1 vh/s, sem assentamento nenhum, a população em bins de seis unidades de `z`
   > relativo à câmera:
   >
   > | progresso | onde está o bando |
   > |---|---|
   > | 0.50 | 11.2 mil de 16.4 mil num bin, colados na lente |
   > | 0.60 | 7.9 mil num bin a 50 unidades |
   > | 0.70 | 8.7 mil num bin a 27 unidades |
   > | 0.80 | 12.4 mil num bin a 9 unidades |
   >
   > A lâmina **não** se desmancha: ela translada. E não tinha por que se
   > desmanchar — todos os corpos têm a mesma velocidade relativa à câmera, e
   > translação uniforme preserva a forma da distribuição. O plano de renascimento
   > acompanhar a câmera não espalha nada; só move o plano.
   >
   > A consequência aparece no rio porque o beat é longo: o bando atravessa o
   > corredor duas vezes em 0.40 de progresso, e entre as passagens o corredor
   > fica com o bando **longe e comido pela névoa** — 0% de pixel acima do limiar
   > de corpo em 0.55 e 0.62, contra 6.5% em 0.75. Nos beats de cima a câmera mal
   > se move e a fase não aparece.
   >
   > **Não foi consertado nesta rodada, e a razão é blast radius.** O conserto é
   > espalhar o renascimento em `z` em vez de num plano, e ele muda a densidade
   > que chega ao corpo de prova — ou seja invalida os números de aceite dos dois
   > beats já fechados. É uma rodada de re-medição da descida inteira, não uma
   > linha no shader dos cards. O que esta nota entrega é o número e o
   > diagnóstico.

### As letras das pontas, e o tubo que abre
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


## Quem sou, medido
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


## O véu de legibilidade, e por que o mecanismo mudou
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

### A varredura, e a faixa medida atrás de cada caixa
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

### Duas armadilhas do método
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

### Comparação do alvo do véu
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


## O rio, medido
O beat de 0.45 a 0.85. Sete cards montados ao longo de 27 unidades da câmara, a
câmera atravessando por entre eles, o bando escoando no meio e se descolando em
cada um. Contact sheet da travessia inteira em `.screens/05a-corredor.png`.

**A geometria, e de onde cada número saiu** (`lib/scene/cards.ts`):

| | valor | por quê |
|---|---|---|
| corpo do card | 3.8 × 2.375 (16:10) | o maior que fecha a conta da esteira — ver abaixo |
| corredor | `z = −55` a `−82` | primeiro à distância de leitura em 0.45; último **lido** antes de 0.85 |
| espaçamento | **4.5**, exatamente o piso | `27 ÷ 6`; oito cards exigiriam 3.86, abaixo do piso |
| estações | cinco, em `(±3.4, +2)`, `(±6, −2)` e `(0, −2)` | ver "a corrente de estações" |
| ângulo de montagem | `−atan(x / 12)` | a peça vira para o eixo, como um corpo de prova numa haste |
| câmera | `z = −42` a `−86`, 5.24 u/vh | dentro da faixa de 4.2 a 5.6 dos beats já fechados |

**A corrente de estações é o que torna a esteira de um card mensurável.** Cada
card é montado na estação seguinte da lista, então dois cards só voltam a dividir
a mesma coluna de escoamento cinco slots adiante — 22.5 unidades, contra as 15.2
que a laje de quatro larguras alcança e as 3.56 da rampa de aproximação que o
card de trás projeta a montante. Sobram 2.8 unidades de água limpa. Com quatro
estações a margem viraria −1.7 e o número medido deixaria de ser "a esteira deste
card". Isso não é exigência do instrumento: é a exigência do beat. Se as esteiras
se fundem, o rio tem uma esteira, não sete.

### Os cards leem como camadas em profundidade, e a régua é o pixel entregue
`__probe.corridor()` tira uma peça do quadro, redesenha o **mesmo instante da
simulação** e mede a pegada dos pixels que mudaram. Dela saem a largura projetada
entregue, a fração ocluída e a maciez da borda. 14 pares por card, progresso
0.50, plano de foco a 13.1. Duas rodadas ficam registradas, e as duas importam:

**Resolução de produção (2160×1254, DPR 1.5) — a que vale.** A tabela anterior
desta seção media a 1456×817, metade do buffer canônico do M5; esta é a
remedição, no mesmo buffer que o resto do projeto usa:

| card | distância | fora de foco | largura entregue | calculada | ocluída | borda 20–80% |
|---|---|---|---|---|---|---|
| 0 | 8.2 | 4.9 | **682** | 682 | 0.00 | 13 px |
| 1 | 16.3 | 3.2 | **437** | 437 | 0.00 | 49 px |
| 2 | 17.0 | 4.0 | **356** | 356 | 0.29 | 13 px |
| 3 | 22.9 | 9.8 | **257** | 256 | 0.00 | 21 px |
| 4 | 26.3 | 13.2 | **239** | 217 | 0.24 | 39 px |
| 5 | 30.5 | 17.4 | **204** | 188 | 0.00 | 37 px |
| 6 | 36.4 | 23.4 | **175** | 156 | 0.10 | 33 px |

Razões entre vizinhos em profundidade: **1.56 · 1.23 · 1.39 · 1.08 · 1.17 ·
1.17**. Todas acima de 1, e a do par à distância de leitura — onde o
DIRECTION.md §4 derivou o piso de "30% menos largura", ou seja 1.30 — em **1.56**.
As conclusões da rodada anterior sobrevivem à resolução, ponto a ponto:

- **A largura entregue segue a perspectiva, com uma exceção que tem nome.**
  `largura × distância` fica entre 5592 e 7123 nos sete cards — ±10 a 15% em
  torno de 6219, com a distância variando 4.4×. É quase constante, o que já
  descarta uma parede — uma parede sem perspectiva daria a mesma largura para
  todos, não um produto estável. O único fora da faixa apertada é o card 1
  (7123, 15% acima da média): ele é o mais deslocado para a lateral de todas as
  estações (`x = −6`, ver `CARD_STATIONS`), e a invariante `largura ∝ 1/distância`
  vale para um plano de frente para a lente — um card mais de esguelha projeta
  mais largura que a distância sozinha prevê.
- **Os cards se ocluem.** Duas peças escondem 29% e 24% de si atrás das da
  frente. Uma parede é coplanar e não oclui nada.
- **A borda amolece com a distância ao foco**, de 13–21 px perto do plano de
  foco a 33–39 px no fundo. É o círculo de confusão entregue — ver abaixo por
  quê, e por que isso também explica o excesso de largura nos três cards mais
  distantes.

**Por que a largura entregue supera a calculada, e cresce com a distância — e
por que não é bloom nem piso de detecção.** Os cards 4, 5 e 6 (os mais fora de
foco) entregam 8.5% a 12.2% a mais do que a projeção calculada, e a rodada anterior
já mostrava o mesmo padrão crescendo com a distância (152×142, 138×122,
119×102). Duas causas concorriam — halo de bloom, ou um piso de detecção do
método de diferença de quadro — e a segunda rodada as descarta: **com
`?dof=off`, medido quatro vezes, a largura entregue bate com a calculada** em
seis dos sete cards, inclusive os três mais distantes — 681–682, 356, 252–256,
213–218, 188 e 155–157 contra 682, 356, 256, 217, 188 e 156, todos dentro de
5 px. O card 1 fica a até 13 px da calculada (424–435 contra 437) nas quatro rodadas,
tanto com DOF quanto sem — é o mesmo card cuja borda já saía instável na
tabela acima (49 px), o mais deslocado para a lateral da corrente, e não entra
na comparação porque o próprio instrumento é mais ruidoso ali, com ou sem
desfoque.

A causa é geométrica, não um artefato do instrumento: um retângulo borrado por
um kernel de raio `R` tem uma rampa de 100% a 0% ao longo de `2R` centrada na
borda real, e o corte de 25% do perfil (ver `footprint`, em
`lib/scene/probe-cards.ts`) cai em `borda + 0.5R` — para fora da peça. Card mais
longe do foco, maior o círculo de confusão, maior o excesso. É o preço de medir
a borda de uma peça desfocada com um limiar único, não um defeito do perfil.

**E o mesmo desfoque amplifica uma contaminação mais séria: a lâmina do bando.**
Repetindo a mesma chamada várias vezes, dois cards (os índices 4 e 5)
devolveram larguras **bimodais** — um agrupamento perto do valor limpo, outro
50 a 100% acima — porque a lâmina viajante do bando (ver "Três armadilhas do
método", abaixo) entra e sai da janela de busca entre uma amostra e outra, e o
desfoque espalha o brilho disocluído por área maior, tornando mais provável que
ele cruze o limiar de 25%. Isto é uma manifestação nova do problema já
registrado da lâmina, não um bug do método de pegada — ver "O que falta",
item 4, para o agendamento do conserto. Até lá, `corridor()` precisa de várias
chamadas e da mediana entre elas — a tabela acima usa uma rodada limpa,
verificada contra as outras por não ter caído no agrupamento contaminado.

**O controle é `?span=3`**, que colapsa a corrente em três unidades de Z. Na
rodada original (1456×817) a faixa de distâncias caiu de 4.44× para 1.85× e a
de larguras projetadas de 3.73× para 1.61×: o instrumento responde à
profundidade em vez de devolver sempre o mesmo número.

**Reconferido depois das capas reais e da placa com texto** (mediana de três
rodadas, `pairs: 10`, progresso 0.50, mesmo buffer de 2205×1254):

| card | distância | largura entregue | antes | calculada | ocluída |
|---|---|---|---|---|---|
| 0 | 8.2 | **682** | 682 | 682 | 0.00 |
| 1 | 16.3 | **435** | 437 | 437 | 0.00 |
| 2 | 17.0 | **348** | 356 | 356 | 0.10 |
| 3 | 22.9 | **255** | 257 | 256 | 0.40 |
| 4 | 26.3 | **222** | 239 | 217 | 0.32 |
| 5 | 30.5 | **199** | 204 | 188 | 0.03 |
| 6 | 36.4 | **173** | 175 | 156 | 0.00 |

Razões entre vizinhos: **1.57 · 1.25 · 1.36 · 1.15 · 1.12 · 1.15**, contra
1.56 · 1.23 · 1.39 · 1.08 · 1.17 · 1.17 antes — o par à distância de leitura em
1.57 contra o piso de 1.30. **Sem regressão**: trocar o campo procedural pela
fotografia e acrescentar a placa gravada não muda a separação em profundidade
que o critério de aceite mede. A oclusão continua presente em três peças, que é
o que uma parede não teria.

### Cada card tem esteira própria, e a estação decide quão rápido ela fecha
Mesmo método do descolamento: densidade na sombra da tinta a uma, duas e quatro
larguras de card a jusante, como **fração da própria laje**. O sinal é o modo
`solo` — a peça medida sozinha no escoamento, com as outras seis estacionadas
fora do duto — e o controle é o modo `off`, com a corrente inteira estacionada.
Os dois rodam no **mesmo carregamento**, e a razão sai da mesma laje.

Card 3, progresso 0.523, 2600 quadros por condição, duas rodadas:

| | 1 W | 2 W | 4 W |
|---|---|---|---|
| sinal (`solo`) | 7.7 · 13.1 | 48.2 · 51.1 | 87.2 · 84.1 |
| controle (`off`) | 79.9 · 85.8 | 84.6 · 86.9 | 99.0 · 88.6 |
| **razão** | **0.10 · 0.15** | **0.57 · 0.59** | **0.88 · 0.95** |

Monotônico nas duas rodadas, fechando em ~92% do escoamento não perturbado a
quatro larguras, sem passar dele. E a aresta de ataque, no perfil radial logo a
montante do plano: o envelope de raspagem fica **vazio** (0.76 do controle na
primeira faixa) e a pilha aparece a um quarto de altura de card da silhueta, a
**1.58×** o controle. Os corpos são expulsos da borda e se acumulam encostados
nela — que é o que "descolamento" quer dizer.

**A estação decide o resto, e a diferença é grande:**

| card | estação | 1 W | 2 W | 4 W |
|---|---|---|---|---|
| 3 | `(−3.4, +2.0)` | 0.13 | 0.58 | **0.92** |
| 4 | `(0, −2.0)` | 0.00 | 0.06 | **0.07** |

A estação 4 está encostada no chão do tubo do bando — a meia-altura da elipse em
`x = 0` é 3.31 e a borda de baixo do card fica em −3.19, **0.12 unidade da
parede**. A sombra dela só pode ser reabastecida por cima, e não é. Isso é o
comportamento certo lido pelo lado errado: um card colado na borda do escoamento
**deve** deixar um vazio atrás dele. O que ele não deve é ser a peça de onde se
afirma que cada card tem esteira. Quem mexer na altura do tubo ou na altura das
estações remede os dois.

### O que custou, em quadro
> ⚠️ **Toda a tabela abaixo saiu na resolução errada, e não vale como número
> final.** O buffer de 1.19–1.27 Mpx é metade do canônico do M5 (2160×1254,
> 2.71 Mpx) — a janela do navegador não estava no tamanho nativo quando esta
> rodada aconteceu. Numa cena limitada por preenchimento, "11 a 12% do quadro"
> medido a meia resolução não é o número real; a proporção pode mudar nos dois
> sentidos, porque tanto o custo do rio quanto o custo do resto da cena escalam
> com pixel. **A remedição está pronta para rodar** —
> `?bench=1&plan=debts&port=3131`, a mesma URL que resolve as outras duas
> dívidas de uma vez (ver "O que falta", item 3) — e falta só a janela em
> primeiro plano no momento de rodar. Os números abaixo ficam registrados
> riscados, não apagados, até a remedição substituir esta nota.

| | GPU/quadro | mediana | p95 |
|---|---|---|---|
| rio on | 1.78 · 1.92 · 1.98 ms | 1.67 · 1.69 · 1.68 | 2.50 · 2.54 · 3.33 |
| rio off | 1.58 · 1.74 · **3.15** ms | 1.66 · 1.67 · 3.33 | 1.73 · 2.50 · 5.00 |

Na única rodada com os dois lados no mesmo buffer e sem anomalia, o rio custa
**+0.18 ms**. As medianas são indistinguíveis (1.67 contra 1.66): o quadro típico
custa o mesmo, e a diferença mora na cauda.

**O 3.15 da terceira célula é o controle, não o efeito, e ele diz uma coisa
útil.** Tirar os cards muda onde o bando vai parar — sem as sete peças para
desviá-lo e sem elas ocluindo o que está atrás, a mesma varredura pode encontrar
a população inteira colada na lente. O A/B "com e sem os cards" nunca é limpo por
isso, e o número honesto é a comparação com o resto da descida:

| varredura | GPU/quadro | mesmo aparelho, mesmo buffer |
|---|---|---|
| 0.00 – 0.28 (Emergência + Identidade) | 1.93 ms | dof on, 16.384 corpos |
| 0.45 – 0.85 (o rio) | 1.78 – 1.98 ms | idem |

**O beat de Trabalho custa o mesmo que os dois beats acima dele.** Contra os 16.7
ms de um quadro a 60 Hz são **11 a 12%**; contra os 13.3 ms desta tela de 75 Hz,
14%.

> ⏳ **O iPhone não foi medido.** Esta sessão não teve o aparelho, e o banco mede
> tempo de parede — ele exige a janela em primeiro plano no próprio telefone. O
> procedimento está em "Desempenho da cena, medido"; a célula que falta é
> `?bench=1&plan=cards` no iOS, e o que se espera dela é a mesma proporção: o
> rio custa o que o resto da descida custa, e lá a descida fecha em 4.62 ms de
> 17.0.

### O calor, e o que o rio faz com o bando
Descendo de 0.12 a 0.83 a 1 vh/s e medindo pixels quentes no quadro entregue
(`__probe.warmth`, teto do PROJECT.md §3.1 = 15% da tela):

| progresso | 0.55 | 0.62 | 0.70 | 0.75 | 0.79 | 0.83 |
|---|---|---|---|---|---|---|
| pixels quentes | 0% | 0% | 0.03% | 1.07% | 3.45% | **6.31%** |

O pico é 6.31% na saída do rio, e a solta do poleiro logo antes do beat mede
10.86% — os dois abaixo do teto, e os dois abaixo do 11.5–13.5% que o poleiro já
media em 0.44.

**Remedido com as capas reais, no buffer canônico** (2205×1254, descendo de 0.12
a 0.82 a 1 vh/s, com o assentamento fora do corredor):

| progresso | 0.44 | 0.46 | 0.50 | 0.56 | 0.62 | 0.70 | 0.76 | 0.82 |
|---|---|---|---|---|---|---|---|---|
| pixels quentes | 9.05% | 9.73% | 0.10% | 0.02% | 2.03% | **9.79%** | 1.06% | 0.00% |
| acima do limiar de corpo | 14.8% | 12.6% | 3.3% | 3.1% | 4.9% | 21.2% | 4.2% | 2.6% |

Pico **9.79%** contra o teto de 15% ✅. As capas reais não movem esta conta — o
que acende é o bando, e os dois acentos quentes do acervo (`--rose` na WeCann,
`--coral` na Nestlé) tingem só a quina e a gravação, que juntas são menos de 1%
da área de um card.

O vale em 0.50–0.56 e o pico em 0.70 são a **lâmina viajante** já registrada em
"Três armadilhas do método": o bando atravessa o corredor em bloco, e entre as
passagens o rio fica com ele longe e comido pela névoa. A rodada anterior viu o
mesmo padrão com a fase deslocada (0% em 0.55 e 0.62, 6.31% em 0.83) — mesma
patologia, outro instante.

> ⚠️ **E o aspecto da janela é uma variável desta medida, não um detalhe.** A
> primeira tentativa desta rodada rodou por engano a 1024×860 (razão 1.19:1, uma
> janela alta) e devolveu **30.98%** em 0.46 — o dobro do teto. Não era
> regressão: num quadro alto e estreito a coluna do poleiro soltando ocupa uma
> fração muito maior da tela. Toda linha de `warmth` precisa do buffer ao lado,
> como toda linha de banco precisa. **`--coral` não acende no rio**: a janela de esteira da rampa
emissiva é ancorada ao corpo de prova (`shaders/body.ts`), que fica trinta
unidades a jusante. As esteiras dos cards aparecem em `--cyan`, por aceleração,
que é o que o DIRECTION.md §5 manda. Estender o coral às esteiras do rio é
decisão de cor, e cor se calibra com capa de verdade atrás — não com capa de
teste.

### A legibilidade, com capa de card atrás do texto
Esta é a condição que o DIRECTION.md §5 registrou como **não testável** quando
escolheu o alvo do véu: "a comparação rodou sem o beat de Trabalho existir —
nenhum card, nenhuma capa de imagem atrás de texto". Agora o caso existe de
verdade — sete cards com **capa real**, duas delas fotografias de produto quase
brancas passando por baixo da HUD durante a travessia inteira.

`__probe.contrast({from: 0.45, to: 0.85, rate: 0.6})`, 842 quadros por condição,
DPR 1.5, o rio no ar com as capas dos cases:

| condição | viewport | buffer | pior quadro | p5 | mediana | p95 |
|---|---|---|---|---|---|---|
| en | 1470×836 | 2205×1254 | **5.79** | 6.18 | 7.85 | 14.01 |
| pt | 1470×836 | 2205×1254 | **5.79** | 6.15 | 7.83 | 14.01 |
| en | 1450×816 | 2175×1224 | **5.82** | 6.54 | 9.23 | — |
| pt | 1024×860 | 1536×1290 | **5.64** | 5.94 | 7.39 | — |
| pt, mobile (HUD colapsada, 4 cards) | 500×844 | 750×1266 | **5.69** | 6.13 | 11.28 | — |

Piso do PROJECT.md §5: 4.5 ✅ — e as cinco condições ficam **acima do alvo de
5.5** que o véu mira, que é o que a rodada anterior não conseguia.

**O que o número diz é o véu funcionando como mecanismo exato, não com sorte.**
A coluna que importa é a luminância máxima entregue atrás de cada caixa pior:
ela pousa em **0.0955 a 0.0962** em todas elas, contra o `VEIL_CEILING` de
0.0868 mais os até 0.013 que o grão soma depois. O véu não está sobrando nem
faltando — está onde foi mandado, e os ~0.3 de folga sobre o alvo são a conta do
grão, não erro. A faixa que a entrada percorre é de duas ordens de grandeza
(L mínimo 0.005 nas mesmas caixas), e é ela que valida o teto, como o
PROJECT.md §7 exige.

As seis piores caixas, en, 1470×836:

| caixa | pior razão | em | L mín | L mediana | L máx |
|---|---|---|---|---|---|
| hud `PROGRESS` | **5.79** | 0.466 | 0.0053 | 0.0268 | 0.0962 |
| surface (rótulo) | 5.79 | 0.846 | 0.0053 | 0.0709 | 0.0961 |
| hud `en` · `pt` | 5.81 | 0.720 | 0.0053 | 0.0114 | 0.0956 |
| hud `AUDIO ON` | 5.82 | 0.718 | 0.0050 | 0.0127 | 0.0955 |
| hud `GH` | 5.94 | 0.811 | 0.0050 | 0.0093 | 0.0925 |

#### A hipótese do `MAX_VEIL_BOXES` estava errada, e agora está falseada
A rodada anterior media **5.16:1** (capas de teste, `MAX_VEIL_BOXES` = 4, DPR 1)
e este arquivo atribuía o número a disputa de slot: "o rio acrescenta à HUD os
três botões de filtro — são mais caixas disputando os mesmos quatro slots, e as
pequenas perdem para as grandes".

A sessão do split já havia mostrado que a HUD inteira é **uma** caixa
`data-veil`, e a contagem ao vivo no rio fecha o assunto. Contado em cinco
progressos do beat (0.46, 0.55, 0.65, 0.77, 0.84), com
`document.querySelectorAll('[data-veil]')` e a área visível de cada uma:

| progresso | caixas com área visível |
|---|---|
| 0.46 · 0.55 · 0.65 · 0.77 | **1** — o painel da HUD |
| 0.84 | **2** — a HUD e o rótulo da Superfície entrando |

Nunca mais de duas, contra um teto de quatro. **Não existia disputa de slot para
o teto resolver**, e o rótulo do beat de Trabalho — que aparece como pior caixa
em algumas rodadas — só está na tela na entrada do beat, porque a seção é alta e
o rótulo não é `sticky`.

**O que sobrou sem atribuição limpa é a melhora de 5.16 para 5.79**, e é honesto
dizer isso: entre as duas rodadas mudaram três coisas — as capas (procedurais →
fotografias reais), o `MAX_VEIL_BOXES` (4 → 8, agora sabidamente inerte) e o DPR
(1 → 1.5). A resolução foi controlada e **não é a variável**: 5.79 a 2205×1254
contra 5.82 a 2175×1224. O candidato restante é a mudança de material — a placa
de cota passou a ocupar 20% da altura do card com **substrato recessado escuro**
no lugar de capa, o que tira luz de cada peça. Um controle limpo exigiria
rodar com DPR 1 forçado e com o campo procedural de volta, e nenhuma das duas
coisas vale a rodada: o número atual passa o piso e o alvo, e a atribuição não
muda decisão nenhuma.

### A placa de cota, e a resposta de ponteiro
A placa carrega **cliente, título e ano** gravados, em dois níveis de detalhe
(ver `card-atlas.ts`: canal R o principal, canal G o detalhe). O nível de
detalhe entra por rampa de aproximação, entre 24 e 9 unidades de profundidade —
as distâncias medidas dos sete cards no meio da travessia vão de 8.2 a 36.4, então
o detalhe pertence a um card por vez, o que a câmera está passando.

**A latência de ponteiro é medida do evento até o quadro pintado**, que é o que
o PROJECT.md §7 exige e é o que o clique de entrada do portão custou uma rodada
por não medir. Ela **não pode** ser medida sob `?probe=1`: o `ProbeClock` não
roda laço nenhum, então ali não existem quadros espontâneos entre os quais o
ponteiro chegue — a medição sai no site como ele roda, com o portão aberto por
clique, o ticker do GSAP publicando quadros e o scroll de verdade. O gancho é
`window.__cardPick` (`lib/scene/card-pick.ts`), dev-only pelo mesmo motivo que o
`__lenis` que a varredura de contraste usa.

Progresso 0.55, 2205×1254, 28 movimentos de ponteiro reais espaçados ~70 ms,
**25 deles acertando card** (seis cards distintos — o número existe porque a
resposta existe, não porque nada aconteceu):

| | ms |
|---|---|
| mínimo | 17.4 |
| **mediana** | **28.2** |
| p95 | 28.9 |
| máximo | **29.0** |

Teto do PROJECT.md §3.3: **100 ms** ✅ — com folga de 3.4×.

O número é um **teto**, não uma estimativa: quem fecha o intervalo é um
`requestAnimationFrame` agendado no quadro que aplicou a resposta, e ele dispara
antes da pintura seguinte, ou seja **depois** de a pintura daquele quadro ter
acontecido. Os 29 ms de pior caso são ~1.7 quadros a 60 Hz, que é exatamente o
que o mecanismo prevê: o evento cai entre dois quadros, é consumido no seguinte,
e a pintura fecha o intervalo.

**Duas armadilhas do caminho, e as duas foram vividas nesta rodada:**

1. **O canvas não recebe evento de ponteiro.** O `SceneGate` monta a cena numa
   camada `pointer-events-none` atrás de tudo, de propósito — um canvas que
   capturasse ponteiro roubaria o clique de cada link. Então o `raycaster` do
   R3F não tem como ver os cards, e o ouvinte é de `window`. Como a cena cobre
   a viewport, coordenada de viewport **é** coordenada de canvas.
2. **`useMemo` no StrictMode cria duas instalações.** A fábrica é invocada duas
   vezes no mesmo render; nascem dois picks, cada um com o próprio par de
   ouvintes, e o React usa um. A limpeza mora no efeito e pertence ao que
   ficou, então o órfão vaza ouvintes — e, pior, o gancho publicado no `window`
   era o dele: `debug()` reportava `calls: 0` para sempre enquanto o laço de
   quadro resolvia normalmente. Custou vinte minutos de depuração de um
   fantasma. O pick nasce num **efeito**, que o React emparelha, e o estado de
   diagnóstico é de **módulo**, não de instância.

### O filtro reorganiza o escoamento, e isso é medido na tela
O DIRECTION.md §4: "o filtro nunca remove. Ele **promove**: as peças que casam
vêm para o eixo da câmara, as outras recuam para a periferia e continuam
montadas". Medido nas caixas projetadas dos sete cards, progresso 0.55, antes e
depois de acender `marca` (sem recarregar, sem trocar de rota):

| card | case | casa `marca` | centro x em repouso | com filtro | Δ |
|---|---|:--:|---|---|---|
| 0 | Perfecting | ● | 2077 | 1205 | **−872** → eixo |
| 1 | Unifique Energia | ● | −150 | 326 | **+476** → eixo |
| 2 | Decision Suite | | 1268 | 1659 | **+391** → parede |
| 3 | WeCann Atena | | 529 | 251 | **−278** → parede |
| 4 | Prime8 | ● | 752 | 831 | +79 |
| 5 | ZOOMtecnologia | ● | 898 | 824 | −74 |
| 6 | Nestlé | ● | 560 | 677 | +117 |

Os dois primeiros são os que mais se movem porque são os mais próximos — a
perspectiva comprime o resto. Todos os sete continuam montados e visíveis.

**E o bando muda de rota junto**, porque quem move o card move a esteira: o laço
dos cards escreve `shared.cards` **por quadro enquanto a reorganização acontece**,
e é esse mesmo array que o passo de velocidade dos boids amostra. Sem isso o
filtro seria uma peça deslizando com o escoamento parado no lugar antigo, que é
exatamente o "cards trocando de lugar" que o documento veta pelo nome.

**Só `x` se move, nunca `z`**, e isso não é economia: o espaçamento em Z é a
única medida da corrente com **piso medido** (4.5 unidades). Um filtro que
mexesse em Z reordenaria a fila e quebraria, no primeiro clique, todos os
números de aceite do beat — largura projetada, fração ocluída, esteira por card.

**E o laço volta a não escrever quando assenta.** Isso preserva a medição: a
sonda tira um card do escoamento escrevendo `uCards[i]` direto (`park`, em
`probe-cards.ts`), e um laço que reescrevesse a corrente todo quadro desfaria o
estacionamento no quadro seguinte — a medida de esteira mediria sete cards
achando que mede um. Com o filtro em repouso, que é o estado de toda medição,
`shared.cards` é bit a bit o que `resolveRiver()` resolveu.

## A travessia para o case, medida

O DIRECTION.md §4: "o card se aproxima da câmera e vira a capa; o bando continua
escoando atrás dele… **Sem tela branca**. Dentro do case: DOF desligada, névoa
parada, texto plano e imóvel."

São quatro afirmações e todas são sobre o quadro entregue, então nenhuma pode
ser conferida lendo o que o código calculou (PROJECT.md §7). O instrumento é
`window.__caseTrace` (`lib/scene/case-trace.ts`), dev-only, num `useFrame` de
prioridade **2** — depois do compositor, que é a única ordem em que o
framebuffer padrão já tem o quadro. Ele grava por quadro, do clique ao repouso.

**Ela não pode rodar sob `?probe=1`**, pelo mesmo motivo da latência de
ponteiro: o `ProbeClock` não roda laço, e uma travessia é feita de navegação,
`damp` e quadros espontâneos. A medição sai do site como ele roda.

### O canvas não remonta, e o controle prova que a pergunta é boa

| | resultado |
|---|---|
| mesmo nó `<canvas>` depois de home → case → home | **sim** |
| eventos `webglcontextlost` | **0** |
| **controle:** o mesmo, passando por `/work` (o acervo) | **não** — canvas novo |

O controle é o que torna a primeira linha uma medição em vez de uma afirmação.
`/work` mora no grupo `(archive)` e por projeto **derruba** a cena (DIRECTION.md
§4: "DOM puro, sem cena, sem 3D"); se o instrumento não acusasse a quebra ali,
ele não estaria olhando para nada. Ele acusa.

### O card vira a capa, e o desencontro é de dois milésimos de pixel

A peça é comparada com o `<img>` que a substitui: a caixa envolvente da **região
de capa** projetada pela câmera entregue, contra o `getBoundingClientRect()` do
elemento. Não a caixa do card — a capa vai de `v = 0.2` a `v = 0.975`, e a faixa
de baixo é a placa de cota.

| | desencontro, pior aresta |
|---|---|
| **controle:** durante o voo, antes de atracar (19 quadros) | **212.3 px** |
| **atracado**, nos 15 quadros em que a peça ainda desenha | **0.0024 px** |

O controle é a mesma expressão, no mesmo traço, com a câmera ainda a caminho: um
sinal de duzentos pixels e um repouso de dois milésimos separam "a conta está
certa" de "o instrumento sempre diz zero".

### Nunca existe um quadro sem nenhuma das duas imagens

A leitura de pixel enxerga só o canvas — o `<img>` é DOM e não está no buffer do
WebGL —, então "o quadro não apagou" não sai dela sozinha. O que sai é o
invariante que a sustenta:

| | quadros |
|---|---|
| com a peça já fora (`handed`) e a capa em DOM ainda transparente | **0** |
| com as duas desenhando ao mesmo tempo | **15** (252 ms) |

Enquanto o primeiro for zero, há sempre uma das duas na tela. Os 252 ms de
sobreposição são o corte de `--dur-cut` (120 ms) mais a margem de 260 ms com que
a cena espera antes de esconder a peça — duas imagens iguais, uma sobre a outra,
que é o único jeito de a troca não ter um vão.

**E o degrau de luminância do canvas no quadro da entrega é esperado**, não um
defeito: o `meanL` cai de 0.187 para 0.014 porque a peça saiu do quadro, e o que
a substitui está fora do buffer que a sonda lê. É por isso que a prova é o
invariante acima, e não a série de luminância.

### A volta cai onde saiu

| | valor |
|---|---|
| progresso na saída | 0.5500 |
| progresso depois da volta | 0.5500 |
| **Δ** | **0.00000** |
| câmera em Z, no repouso | −52.301 |

Medido nos **três** caminhos, com o mesmo resultado: o controle da HUD, o link
da lista de estações, e o **botão voltar do navegador**. Os três passam por uma
mudança de `pathname`, que é onde a reposição mora — e é por isso que o terceiro
funciona sem ninguém ter escrito código para ele.

> **A restauração do navegador não bastava, e ela falhou de um jeito que passa
> despercebido.** A primeira versão confiava na entrada de histórico da home, que
> guarda o `scrollY` do rio: `router.back()` deveria devolvê-lo. Medido, a volta
> caía em **progresso 0.000, câmera em `z = 8`** — o começo da descida. A causa é
> o Lenis: a troca de rota o obriga a remedir, e ele reassenta a janela na posição
> interna dele, que é a do documento curto que acabou de sair. O navegador
> restaura e o quadro seguinte desfaz.

### Latência e ritmo

| | ms |
|---|---|
| ponteiro sobre o card, mediana (n = 24) | **26.8** |
| ponteiro, pior caso | **35.3** |
| clique → câmera atracada | 1095 |
| clique → capa entregue ao DOM | 1362 |

Teto do PROJECT.md §3.3 para resposta de ponteiro: **100 ms** ✅.

O voo de ~1.1 s é ritmo, não latência: a resposta começa no quadro seguinte ao
clique. Ele encurtou de 1574 ms quando o encaixe passou a fechar em 0.995 em vez
de 0.9995 — o `damp` é assintótico, e a última casa decimal custava meio segundo
de conteúdo retido para um movimento que o olho já tinha visto terminar. A
precisão não mudou: `easeStrong(0.995)` vale 0.99997, e o desencontro continua
em 0.0024 px.

### A legibilidade dentro do case

Mesma varredura do véu: descida do artigo a **0.6 vh/s**, medindo cada quadro e
cada **linha** desenhada (`Range.getClientRects()` sobre os nós de texto).

| condição | pior razão | mediana por quadro | L máx |
|---|---|---|---|
| `en`, 1456×940, Decision Suite (o corpo mais longo) | **5.83** | 13.00 | 0.095 |
| `en`, 1024×900, Prime8 (a capa mais clara) | 7.41 | 13.71 | 0.064 |
| `en`, 390×844, Decision Suite (layout mobile) | 11.95 | 13.12 | 0.021 |

Piso do PROJECT.md §5: **4.5:1** ✅. O L máximo de 0.095 no pior caso pousa em
cima do `VEIL_CEILING` (0.0908) mais o grão — o véu está exatamente onde foi
mandado.

E a descida continua passando com a medida nova: **4.92:1** no pior quadro de uma
varredura de 0.00 a 1.00 a 0.6 vh/s, mediana 6.77 por quadro.

#### Três reprovações, e cada uma mudou o desenho em vez da calibragem

Nenhuma delas foi consertada apertando o véu, e é isso que elas têm em comum: o
véu existe para cobrir o que a cena **precisa** ter aceso, não para apagar o que
não precisava estar lá.

**1. 2.54:1 — a coluna de leitura não tinha véu nenhum.** O artigo entrou sem
`data-veil` porque a suposição era que a cena recuada seria escura o bastante
sozinha. Ela é escura quase o tempo todo — L mediano perto de zero — e "quase" é
exatamente o que o mecanismo existe para cobrir.

**2. 2.87:1 — marcar bloco a bloco gastou os oito slots.** A correção seguinte
pôs `data-veil` em cada parágrafo, título e lista. No desktop passou (5.26 a
5.48); no mobile **nove blocos disputavam os oito de `MAX_VEIL_BOXES`**, os
menores perdiam, e a placa de metadados ficava descoberta. O erro era de
granularidade: o DIRECTION.md §5 diz "véu ancorado à **coluna de texto**", e uma
página de leitura tem uma coluna, não trinta caixas.

O que faltava para uma caixa só funcionar era **aparar a caixa pela janela**
(`readVeilBoxes`). Uma coluna de cinco viewports, convertida inteira para UV de
tela, cobre o quadro — o scrim de sangria total que o mesmo parágrafo veta pelo
nome. Aparada, ela é a fatia visível da coluna: largura da medida, altura da
janela. Na descida a mudança é um no-op, porque lá todo bloco marcado já cabe
numa viewport — conferido, os números da descida não se moveram.

**3. 3.47:1 — a câmera de repouso estava dentro do tubo do bando.** Com a
reciclagem em `uCameraZ + 2`, os corpos vinham **atravessar a lente**: um corpo
emissivo a duas unidades é um borrão claro, e o mapa do quadro no instante da
falha mostra 0.01 em toda parte e **uma célula em 0.13**, bem em cima de uma
linha de metadados. Atravessar o bando não é observá-lo — é continuar dentro
dele, e o DIRECTION.md §4 pede atmosfera. A câmera saiu para `x = −10.2`, entre
o tubo (8.6) e a parede (12), e o pior contraste do mobile foi de 3.47 para
**10.95**.

Duas decisões de cor entraram junto, pela mesma leitura: dentro do case a
**capa das peças vizinhas** cai a um décimo do ganho e a **gravação da placa** a
12% do realce (`uCaseRecess`). A peça que virou a página vai ao contrário — para
ganho 1.0, porque ali ela **é** a imagem, e entregar a 0.38 e trocar por um
`<img>` sem ganho seria um degrau no quadro da troca.

#### Uma armadilha do instrumento, e ela reprovou a descida por engano

A primeira varredura da descida devolveu **2.27:1** numa caixa chamada
`Correia` — o `h1` do corpo de prova, que continua no DOM para ser lido e
indexado mas some da vista quando existe cena desenhando-o, numa caixa de 1×1 px
com `clip-path: inset(50%)`. Os retângulos do nó de texto dele continuam
existindo e continuam medindo o brilho da peça atrás. Elementos com caixa
menor que 2 px saíram da conta, e o número virou 4.92.

### A medida de leitura, contada no que foi desenhado

O PROJECT.md §3.2 pede 60 a 70 caracteres. A contagem é por **linha desenhada**:
o offset em que `Range.getClientRects()` ganha uma caixa nova é onde o navegador
quebrou a linha.

| `--measure` | mediana | p10 | p90 | máx |
|---|---|---|---|---|
| 66ch (antes) | **80** | 72 | 85 | 85 |
| **54ch (agora)** | **66** | 58 | 69 | 71 |

`ch` não é um caractere: é a largura do algarismo zero, e no Archivo o zero é
bem mais largo que a média de um texto de leitura em minúsculas. A conta do
ajuste é a própria medição, `66 × 65/80 ≈ 54`.

O token é um só, então isto corrige também o manifesto de Quem sou, que estava
largo pelo mesmo motivo. Ele agora entrega mediana 55 em nove linhas — abaixo da
faixa, e por uma razão tipográfica e não de medida: `text-wrap: pretty` reequilibra
as últimas linhas, e o efeito domina em parágrafos de três linhas. A superfície
de leitura longa — o corpo do case, 41 linhas — é a que a regra descreve, e ela
está dentro.

No mobile a medida entregue é 44 (mediana, 390 px). É físico: encolher o corpo
para caber 60 caracteres num aparelho desses trocaria uma regra de ritmo por
texto pequeno demais para ler.

### O que a travessia custou em pacote

| | antes | depois |
|---|---|---|
| `/` e `/pt` | 182.4 kB | **184.0 kB** |
| `/work/[slug]` | 175.6 kB | **183.0 kB** |
| chunk da cena | 307.3 kB | **310.5 kB** |

Tetos: 200 kB de rota inicial, 350 kB de chunk de cena — os três passam, e
sobram **39.5 kB** do chunk da cena para a Superfície.

A rota do case subiu 7.4 kB porque ela ganhou três coisas que não tinha: a
montagem da cena (o `SceneGate` e os hooks de capacidade), o store da travessia,
e o `next/image` do corpo. O gatilho de recuo previsto — trocar `next/image` por
`<img>` com dimensões de build se a rota passasse de ~195 kB — **não foi
acionado**.

## A câmara, medida

Rodada 7. A caixa (`boxGeometry` 24×14×108 com `BackSide`, mais ~60 segmentos
aditivos) virou uma câmara com seção variável, quadros estruturais com chanfro,
portais no rio, nichos nas estações, gravação recessada em campo de altura,
números gravados em Geist Mono, uma parede de fundo com a abertura da fonte e
bolsões de névoa ao longo do eixo. Método em `lib/scene/probe-chamber.ts`
(`__probe.presence`, `__probe.parallax`, `__probe.engraving`).

**Todo número desta seção foi medido nas duas versões com o mesmo
instrumento**: a caixa antiga rodou num worktree do commit `b1ccf38` (fim da
rodada 6.5), com a mesma sonda enxertada e o mesmo `PROBE_BLACK` nos shaders
antigos. Descida de 0.10 a 0.85 a 1 vh/s, 1440×813, DPR 1, `?grain=0`.

### Presença da estrutura — e por que a fração sozinha não serve

"Acima da névoa" é definido pelo que a névoa esconde: o quadro com o concreto
normal menos o quadro com o concreto preto antes da névoa é a contribuição da
estrutura que chega à lente. Os dois quadros são consecutivos e sem o bando.

| p | fração ≥1 nível (nova · antiga) | ≥3 níveis | **densidade de feições** | estrutura máx · bando máx |
|---|---|---|---|---|
| 0.100 | 0.90 · 0.89 | 0.60 · 0.59 | **0.030 · 0.002** | 0.018 · 0.27 |
| 0.168 | 0.91 · 0.89 | 0.74 · 0.69 | **0.203 · 0.020** | 0.075 · 0.49 |
| 0.236 | 0.94 · 0.93 | 0.73 · 0.72 | **0.215 · 0.054** | 0.085 · 0.72 |
| 0.305 | 0.31 · 0.32 | 0.18 · 0.22 | **0.034 · 0.010** | 0.021 · 0.81 |
| 0.373 | 0.78 · 0.80 | 0.52 · 0.58 | **0.090 · 0.054** | 0.052 · 0.79 |
| 0.441 | 0.81 · 0.85 | 0.51 · 0.71 | **0.084 · 0.057** | 0.061 · 0.81 |
| 0.509 | 0.47 · 0.55 | 0.11 · 0.21 | **0.015 · 0.005** | 0.007 · 0.51 |
| 0.577 | 0.77 · 0.74 | 0.44 · 0.51 | **0.034 · 0.005** | 0.010 · 0.55 |
| 0.645 | 0.75 · 0.62 | 0.63 · 0.50 | **0.045 · 0.009** | 0.019 · 0.51 |
| 0.714 | 0.64 · 0.36 | 0.54 · 0.24 | **0.066 · 0.018** | 0.031 · 0.54 |
| 0.782 | 0.90 · 0.16 | 0.81 · 0.15 | **0.024 · 0.012** | 0.021 · 0.39 |
| 0.850 | 0.70 · **0.00** | 0.55 · **0.00** | **0.020 · 0.000** | 0.022 · 0.46 |

- **A fração do quadro não discrimina câmara de caixa.** Uma parede lisa também
  atravessa a névoa, e a caixa antiga pontua igual ou mais na maior parte da
  descida. O critério do prompt ("hoje esse número é praticamente zero") estava
  errado sobre a caixa: medida, ela ficava em 16–93%, exceto em 0.85, onde era
  zero porque a tampa do fundo enchia o quadro inteiro.
- **O que discrimina é a feição**: um degrau de contribuição em dois pixels
  (`|∇S| > 0.0012` linear), que o grão do concreto — manchas de dezenas de
  pixels — não produz, e que um chanfro, uma vala ou a boca de um portal
  produzem. Ela sobe em **todos os doze pontos**, de 2× (0.305, 0.782) a 100×
  (0.850), e na Identidade vai de 0.02–0.05 para 0.20–0.22.
- **Nada na câmara emite**: a estrutura mais clara de cada quadro (0.007 a
  0.085) fica sempre abaixo do bando mais claro do mesmo quadro (0.27 a 0.81).
  Zero quadros furam a regra.
- **O ponto fraco é o rio**: 0.509–0.645 têm as menores densidades de feição da
  câmara nova depois de 0.10. A parede alargada está a 14 unidades, na névoa do
  corredor, e os portais — que é o que o rio tem de estrutura perto — enquadram
  a vista e saem do quadro a menos de ~15 unidades.

### Paralaxe

`__probe.parallax({progress, seconds: 0.5, rate: 1})`: três feições visíveis
(raio de visibilidade contra a malha da câmara) projetadas em dois quadros
separados por meio segundo de descida.

| p | feição · distância · velocidade |
|---|---|
| 0.20 | quadro −36 · 23.0 · **73.9 px/s** — EST. 033 · 23.0 · **241.7** — COTA −01.60 · 29.5 · **28.1** |
| 0.40 | quadro −52.5 · 17.6 · **31.3** — quadro −61.75 · 26.8 · **28.1** — quadro −66.25 · 36.9 · **160.0** |
| **0.60** | quadro −75.25 · 18.1 · **112.3** — quadro −79.75 · 22.9 · **85.7** — quadro −89 · 31.8 · **57.6** |

Em 0.60, dentro do Trabalho, a velocidade cai com a distância: é a paralaxe que
uma caixa lisa não tem. As velocidades das outras linhas não são monotônicas
porque dependem também de onde a feição está na tela (a periferia anda mais
rápido que o centro).

**Nichos não entram**: vistos do eixo, eles ficam atrás dos portais do rio na
maior parte da travessia — é o que um nicho entre dois pórticos faz. Estão na
geometria e na medida de feição, não nesta tabela.

### Legibilidade da gravação

`__probe.engraving()`. A máscara do número é a diferença entre a cena com e sem
as placas gravadas (oito pares alternados, bando escondido); o contraste é do
quadro entregue, glifo contra parede, dentro da caixa da placa.

**No quadro de passagem mais rente (p = 0.44, câmera a 3.9 da parede de
estibordo) a parede rente não está na tela**: a câmera olha para a frente e para
bombordo, e todo o lado de estibordo a menos de ~11 unidades fica fora do
enquadramento. O critério, lido ao pé da letra, não tem pixel para medir. O
número da parede foi gravado onde ela **entra no quadro** (EST. 050, caixa alta
de 0.8, em z −50):

| p | caixa alta | Weber | WCAG |
|---|---|---|---|
| 0.36 | 45.6 px | 0.19 | 1.08 |
| 0.39 | 61.6 px | 0.38 | 1.10 |
| 0.42 | 82.3 px | 1.00 | 1.17 |
| 0.44 (mais rente) | 98.2 px (aparado pela borda) | 0.53 | 1.39 |

A razão WCAG fica perto de 1 porque a parede inteira está a L ≈ 0.01: não é a
métrica para gravação em concreto no escuro. O Weber diz que a vala difere da
parede em 19% a 100%, e o recorte ampliado (`.screens/07-gravacao-0.36.png`) lê
`EST. 050` e `COTA +03.10` com vala escura e chanfro. Os números distantes
(8–16 px) somem no bando e na névoa, que é o "de relance" do DIRECTION.md §2.

### Contraste do texto, remedido

`__probe.contrast({from: 0.02, to: 0.85, rate: 0.6})`, 1747 quadros, 1440×813:

| condição | pior quadro | onde | p5 | mediana | p95 |
|---|---|---|---|---|---|
| en | **5.58** | 0.830, rótulo da Superfície | 5.88 | 7.64 | 13.47 |
| pt | **5.58** | 0.830, rótulo da Superfície | 5.87 | 7.59 | 13.37 |

Piso de 4.5 ✅, e acima do alvo de 5.5 do véu. É a primeira varredura que desce
desde 0.02 — as anteriores começavam em 0.26 ou 0.45 —, e ela achou **duas
falhas do instrumento**, não da página (ver abaixo).

### Custo

Banco de prova, build de produção, M5, **buffer 1440×813 a DPR 1** (não o
canônico de 2160×1254 — o débito de resolução do AGENTS.md continua), as duas
versões no mesmo buffer, uma aba por vez, duas repetições:

| faixa | caixa antiga | câmara nova | Δ |
|---|---|---|---|
| 0.00–0.28 | 1.55 ms (p95 1.70) | 1.91–1.93 ms (p95 2.51–2.56) | +0.37 ms |
| 0.45–0.85 | 1.59–1.62 ms (p95 1.71–1.72) | 1.88–1.97 ms (p95 2.51) | +0.32 ms |

Fração dos 16.7 ms: **11.5–11.8%**, de 9.3–9.7%. Pacote: chunk da cena
**315.9 kB** (+5.1), rota inicial 184.4 kB (+0.5, o sinal "a cena pintou" e a
janela do portão).

### Três armadilhas do método

1. **O grão de filme mede a si mesmo.** A presença compara dois quadros
   consecutivos, e o grão é redesenhado a cada quadro com semente nova: com ele,
   a densidade de feições dava ~95% na câmara nova **e** na caixa antiga, e o
   último ponto saía idêntico nas duas até a quarta casa. `?grain=0` tira o grão
   do composite (`lib/scene/settings.ts`).
2. **O `/json/new` do Chrome corta a URL no primeiro `&`.** Abrir
   `?bench=1&chain=0&plan=cards` por ali abre `?bench=1` — o plano inteiro,
   encadeado — e cada aba nova se somava às anteriores rodando ao mesmo tempo.
   Os primeiros números do banco desta rodada foram medidos com até dez abas
   concorrendo e foram descartados. A URL vai com `encodeURIComponent`, e a aba é
   fechada depois do relatório.
3. **A varredura de contraste media texto que não é pintado.** `Range.getClientRects`
   devolve os retângulos do texto sem aplicar opacidade nem `clip-path`: o link
   invisível do card entrava com 1.35:1 e o corpo de prova em DOM (caixa de um
   pixel, `clip-path: inset(50%)`) com 2.46:1. `readTextRects` agora pula o que
   não pinta (`isPainted`, em `probe-contrast.ts`).

## O bando e o frame, medidos

Rodada 8. Quatro mudanças, todas no bando ou na peça (a câmara não foi tocada):
o rim da peça aceso pela **contagem de corpos diante da face, por coluna, na
GPU** (`shaders/ahead.ts`); o brilho dos corpos seguindo também a **densidade**;
uma **onda de pressão** oblíqua viajando pelo duto; e o **renascimento espalhado
em z**, que desmancha a lâmina. Mais o rosa restrito à compressão diante de uma
peça, e o bolsão de névoa da garganta tirado da linha de visada da Identidade.
Controle: o worktree de `b1ccf38` com o mesmo roteiro de medição (ele só usa o
que a sonda antiga também expõe).

### A peça clareia com o bando

Luminância média da face (pixels da tinta sem corpo na frente) contra o anel de
névoa em volta das letras, 20 quadros por ponto:

| p | face | névoa em volta | razão | controle (b1ccf38) |
|---|---|---|---|---|
| 0.14 | 0.0182 | 0.0164 | **1.11** | 2.43 |
| 0.18 | 0.0265 | 0.0169 | **1.57** | 1.34 |
| 0.24 | 0.0313 | 0.0218 | **1.44** | 3.15 |

A face sobe com o bando (0.018 → 0.027 → 0.031) e em 0.18 fica 57% acima da
névoa. **O controle já era mais claro que o anel** — o "buraco" da folha antiga
era a face contra a névoa **distante** e contra o bando, não contra o anel
imediato. A primeira versão desta rodada piorou a face (0.78 / 1.15 / 0.99) por
dois motivos medidos: o bolsão de névoa da garganta, em z −9, ficava entre a
câmera e a peça; e a contagem por coluna, em 0.18, é de 0 a 10 corpos — o rim
estava calibrado para densidades cinco vezes maiores. As pontas (C e A) têm
contagem **zero** sempre: estão fora do tubo do bando.

### A onda existe

Dispersão da contagem de pixels de corpo entre 24 faixas verticais do quadro,
120 quadros em 0.24:

| | média | mín | máx | amplitude | desvio no tempo |
|---|---|---|---|---|---|
| **rodada 8** | 0.894 | 0.689 | 1.004 | **0.315** | **0.099** |
| controle | 0.501 | 0.480 | 0.512 | 0.032 | 0.006 |

Dez vezes a amplitude e dezesseis vezes o desvio: a série deixou de ser plana.

### A silhueta sem a malha — o critério falha no pixel, e passa no plano

Com a malha escondida (`__probe.specimenVisible(false)`), em 0.18, 60 quadros:

- **no pixel entregue**: 58.9 corpos por mil sobre a tinta contra 50.9 no anel —
  **0.86:1**, contra o alvo de 3:1. As letras **não** são inferíveis na tela.
- **no plano da peça** (laje de ±0.3 e ±0.6 em volta dela, na simulação): o anel
  tem **12×** a densidade da tinta; a ±1.2 cai para 3.9×. As contra-formas têm
  2–3× **mais** corpos que o anel: é onde a turbulência acumula.

A diferença é geométrica. O raio da câmera atravessa 14 unidades de esteira e o
escoamento inteiro atrás das letras; quase todo corpo visível sobre a tinta não
está no plano dela. Passar de 3:1 no pixel pediria uma esteira longa que não
fecha, e isso contradiz o critério de recolamento do 3B. Fica como decisão.

### O calor

Pixels quentes (`__probe.warmth`, teto 15%), descida de 0.05 a 0.85:

| | pior | onde |
|---|---|---|
| **rodada 8** | **8.83%** | 0.70 |
| controle | **37.93%** | 0.70 (e 29.4% em 0.475) |

O controle estourava o teto — é o "confete rosa de borda a borda" da auditoria.
Agora o rosa aparece na aresta de ataque da peça (0.2–0.7% em 0.20–0.25) e na
dos cards; o poleiro e o bando cruzando o rio deixam de ser rosa.

### O que o 3B e Quem sou viraram

`__probe.measure()` em 0.18, mesmo método de sempre:

| | antes | rodada 8 |
|---|---|---|
| compressão na aresta | 1.23 | **1.08** |
| turbulência nas contra-formas / fluxo livre | 11× | **6.8×** |
| recolamento a 1 / 2 / 4 larguras | 0.57 / 0.91 / 1.04 | **0.59 / 1.13 / 1.42** |

Os três continuam passando (maior, maior, monotônico), e os três ficaram mais
fracos pelo mesmo motivo: a onda também agita o fluxo livre de referência, e as
faixas densas dela atravessam as lajes a 2 e 4 larguras (daí passar de 1).

Poleiro, na **GPU** (fração do bando dentro de 1.5 raio do eixo, descendo 0.28
→ 0.45 a 0.6 vh/s): mediana **0.50**, p90 0.59, contra 0.44 / 0.54 do controle.
A leitura `DENS.` da HUD sai do proxy da CPU, que esta rodada não tocou.

### Contraste, custo e pacote

- Contraste, 0.02 → 0.85: **5.15:1** (en) e **5.11:1** (pt). Passa o piso;
  ficou abaixo do alvo de 5.5 do véu, que antes da rodada estava em 5.58.
- Pacote: chunk da cena **318.2 kB** (+2.3).
- GPU: **a máquina estava sob carga de outros processos** e o controle, que
  medira 1.55 ms uma hora antes, passou a medir 3.3–4.7. Intercalando as duas
  builds, três vezes cada: rodada 8 **5.70–5.83 ms**, controle **3.33–4.73** —
  razão ~1.4×. A primeira versão da contagem por coluna (32 fragmentos lendo o
  bando inteiro em série) media 8.6 ms; em dois estágios ela saiu da conta.
  O resto é o bando **no quadro**: sem a lâmina, a travessia não tem mais
  trechos com a população inteira fora da tela. **Remedir com a máquina quieta.**

## As capas e o fim do corredor, medidos

Rodada 9. A capa deixa de ter ganho próprio (0.38) e vira **placa fosca**:
albedo × (0.16 + 1.1 × luz dos aglomerados), com teto suave de valor em
`COVER_CEILING` = −ln(0.8)/1.15 ≈ 0.194 antes do tonemap, ou seja L ≤ 0.2
entregue. Na peça atracada o teto sai (a entrega ao `<img>` continua casando).
As paradas 0.77 e 0.85 da câmera mudaram para o rio não acabar antes do beat.

### Nenhuma capa é a coisa mais clara do quadro

`__probe.covers({from: 0.45, to: 0.85, samples: 21})`. Para cada quadro, a
luminância máxima **dentro das capas** no quadro sem o bando, contra o bando
mais claro do mesmo quadro. Cada pixel é atribuído ao card **mais próximo** cujo
retângulo o contém, e só conta se cair na capa dele.

| | pior capa | onde | bando no mesmo quadro | capa acima do bando |
|---|---|---|---|---|
| sem grão | **0.115** | 0.71 (ZOOMtecnologia) | 0.684 | nenhum quadro |
| com grão | **0.127** | 0.71 | 0.707 | nenhum quadro |

Teto de 0.2 ✅ em todo quadro, e a capa sempre abaixo do bando (que vai de 0.34
a 0.85 na travessia). Não há número "antes" com este instrumento: a medida foi
escrita nesta rodada; a evidência do antes é a folha `05b-rio.png`, com a placa
quase branca no terço de baixo em 0.708.

**Duas armadilhas desta medida.**

1. **O máximo pega o pico do grão.** O grão soma ruído depois do tonemap, e o
   máximo de milhares de pixels escolhe sempre o pico positivo: ~+0.04 neste
   nível de luz. Por isso a tabela traz as duas colunas.
2. **Um pixel dentro do quad de uma capa não é, necessariamente, dessa capa.** A
   primeira versão acusou 0.25 na capa do card 3 — e o pixel era o título
   gravado na **placa** do card 0, que na tela cai por cima da capa do card 3. O
   pixel é do card mais próximo que o contém, e só depois se pergunta se ele cai
   na capa.

### O fim do corredor

A mesma sonda devolve a distância até o próximo card à frente da câmera. Antes:
**0.83 e 0.85 sem card nenhum à frente** (o último, em z −82, era passado em
~0.81). Depois das paradas novas: nenhum quadro de 0.45 a 0.85 sem card à
frente; em 0.85 a câmera está em z −76.5 com o último card 5.5 unidades adiante,
virando o olhar para ele.

### A folha da curadoria

`__probe.lineup({labels, footer})` → `.screens/09-curadoria.png`. Cada card no
progresso em que está à distância de leitura (`stationProgress`), **na mesma
luz** (a sonda fixa um único aglomerado quatro unidades à frente de cada peça,
por `window.__probeClusters`, que só existe com `?probe=1` em desenvolvimento),
sem o bando, recortado do quadro entregue e escalado para a mesma altura.
Rotulado com posto, slug, cliente e gerada/migrada. **Não decide nada.** O corte
do mobile na ordem atual são Perfecting, Unifique Energia, Decision Suite e
WeCann Atena: **três dos quatro com capa gerada**.

### A separação em profundidade do corredor, e um instrumento que ficou ruidoso

`corridor()` em 0.50, três chamadas seguidas, 1440×813:

| | razões de largura entre vizinhos |
|---|---|
| rodada 9 | 4.24/0.62/1.37/1.14/0.80/1.20 · 1.57/1.22/0.62/0.88/1.16/1.20 · 3.12/0.63/0.96/1.10/1.16/1.20 |
| controle (`b1ccf38`) | 0.98/2.29/0.69/1.21/1.02/1.34 · 1.61/2.24/0.74/1.17/1.01/1.28 · 1.55/1.70/1.00/1.08/1.11/1.33 |

As duas versões devolvem razões abaixo de 1 e variam por chamada — a variação é
**determinística** (se repete idêntica entre carregamentos) e segue a fase do
bando: a pegada é uma diferença de médias com o bando andando, e o bando cobre as
peças de formas diferentes a cada chamada. A geometria dos cards não mudou nesta
sessão. Os números registrados antes (1.56 → 1.08) foram medidos a 2205×1254;
**este instrumento precisa ser refeito antes de voltar a ser critério**.

### Contraste, custo e pacote

- Contraste 0.02 → 0.85: **5.15:1** (en) e **5.11:1** (pt), iguais aos da rodada 8.
- Pacote: chunk da cena **318.5 kB** (+0.3).
- GPU no rio (0.45–0.85), intercalado com o controle sob a mesma carga: 5.17–5.93
  contra 3.97–4.38 ms — a mesma razão de ~1.3–1.4× da rodada 8. As capas foscas
  não mudaram a conta.

## O escuro e o ângulo, medidos

Rodada 9.5. Sem acrescentar elemento: o concreto perdeu o termo ambiente e a
luz dos aglomerados passou a ter alcance curto (`practicalLightNear`, ~7.5
unidades); de onze quadros estruturais ficaram cinco, em intervalos de 19, 16.5,
21.5 e 15; a câmera sai do eixo no frame (decisão do Lucas, 2026-09-25); o tubo
do bando abre mais no frame; e o portão ganhou os corpos isolados perto da lente.

### O escuro

`__probe.darkness({samples: 18})`, descida 0.00 → 0.85, `?grain=0`, 1440×813.
"Sem o bando" é **sem os corpos e sem a luz deles** — o bando é a única luz
prática (DIRECTION.md §5); esconder os corpos mantendo a luz dos aglomerados
mediria uma câmara iluminada por ninguém.

- **Luminância média do quadro sem o bando**: 0.0064–0.0094 em 16 dos 18
  pontos. `--abyss` mede L = 0.0075 e `--deep` 0.0232. Os dois picos não são
  estrutura: **0.025 em 0.30** é a face da peça atravessando a lente (a base
  dela é `--deep`, não emissivo, e ocupa o quadro) e **0.017 em 0.70** são os
  cards, que ainda têm base própria.
- **Feições da estrutura sem o bando** (bordas na contribuição do concreto):
  0 a 0.0013 do quadro até 0.80, e **0.0148 em 0.85**, que é a fonte a montante
  acendendo o requadro da abertura — a única luz que a direção permite além do
  bando. Antes (rodada 7) a mesma medida, com a luz, dava 0.02–0.22.

### A luz da estrutura acompanha o bando

Pontos amostrados nas superfícies **visíveis** da câmara (parede, piso, teto; o
raio de visibilidade contra a malha descarta os ocluídos), 1685 pares em 18
quadros: a luz prevista pela distância aos aglomerados (a mesma queda curta do
shader) contra a luz do bando medida no pixel do ponto — com os aglomerados
menos sem eles, só no concreto, para a fonte a montante não entrar.

**Pearson = 0.737.** A correlação por quadro, com uma proximidade agregada, dá
0.40 — e o motivo é de desenho da medida: um aglomerado rente a uma parede
**atrás da câmera** conta como proximidade e não acende nada no quadro. A
correlação ponto a ponto é a que responde "a parede acende onde o bando passa".

### A face da peça, letra por letra

Luminância da face (tinta sem corpo na frente) contra o anel de névoa em volta,
por letra, 20 quadros por ponto:

| p | face | névoa | razão | C | O | R | R | E | I | A |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.14 | 0.0180 | 0.0119 | 1.51 | 2.89 | 2.01 | 1.22 | 0.93 | 0.98 | 1.06 | 2.19 |
| **0.18** | 0.0234 | 0.0114 | **2.04** | **3.37** | 2.70 | 2.25 | 2.08 | 1.76 | 1.79 | **1.98** |
| 0.22 | 0.0260 | 0.0107 | 2.43 | 3.39 | 3.20 | 2.90 | 2.66 | 2.32 | 2.17 | 2.29 |

Monotônica, e em 0.18 **todas as letras** acima da névoa, o C e o A inclusive.

### A silhueta sem a malha, no pixel — **não passa**

Em 0.19, 60 quadros, malha escondida: **0.74:1** (tinta mais densa que o anel)
com a pose nova e nada mais. O que foi tentado, cada um medido:

| tentativa | razão anel/tinta |
|---|---|
| pose oblíqua sozinha | 0.74 |
| atrator da esteira 1.3 → 0.35, rampa a montante 1.5 → 3.0 H | 0.98 |
| + banco de névoa denso atrás da peça | 1.02 |
| + separação 11 → 30, alcance 0.32 → 0.6 H | 0.93 |
| navalha de foco (abertura 0.35, plano de 4.5 u) em vez de "tudo nítido" | **0.37** |

Nenhuma ficou; as cinco foram desfeitas. **O diagnóstico**, medido projetando
cada corpo na tela e separando pela distância ao plano das letras: do lado da
câmera a esteira funciona (1 corpo sobre a tinta para 8 no anel); **o que enche a
tinta são os corpos da zona de compressão logo atrás das letras** (0 a 3
unidades a montante), que a pose oblíqua mostra através delas. Numa corrente
contínua, todo raio que atravessa uma letra encontra essa zona. O banco de névoa
apagou o escoamento distante e não mudou nada porque o distante não era a
causa. O borrão piorou porque transforma o escoamento denso num véu luminoso que
passa do limiar de pixel de corpo.

**Chegar a 3:1 no pixel pede uma mudança de desenho, não de calibragem**: o
bando chegando como uma **massa finita** que atravessa as letras, e não como um
rio infinito. É decisão do Lucas.

### O que o 3B e o calor viraram

`__probe.measure()` em 0.18: compressão **1.01** (no limite do "maior"),
turbulência 6.3×, recolamento 0.51 → 1.07 → 1.35. O tubo mais largo no frame
espalha a referência de fluxo livre e é ele que tirou a folga da compressão.
Calor na descida: pico **8.67%** em 0.725.

### O desfoque, e por que a "máxima" virou 0.5

Com o portão mostrando a cena, a abertura 1.0 aparecia: o núcleo de seis
amostras em meia resolução espaçava as amostras em até 14 texels e transformava
corpos pequenos e claros em **pentes de riscas** — uma trama que lia como grade.
Duas correções: a abertura máxima passou a 0.5, e o núcleo passou a dez
amostras, com passo menor e deslocamento por pixel. Medido na folha do portão: as
riscas somem, ficam manchas macias. O custo não aparece no banco (abaixo).

### Contraste, custo e pacote

- Contraste 0.02 → 0.85: **5.17:1** (en), **4.69:1** (pt, em "O trabalho que me
  in…", 0.368). Passa o piso; o pt ficou perto dele.
- GPU, com a máquina mais quieta (load ~3.7, as abas do Chrome dedicado
  fechadas), intercalado com o controle `5de393a`, três rodadas: rodada 9.5
  **2.18–2.80 ms**, controle **2.11–3.03 ms**. Sem diferença mensurável; ~15%
  dos 16.7 ms. Buffer 1440×813, DPR 1 (o canônico continua em débito).
- Pacote: chunk da cena **319.9 kB**, rota inicial 184.4 kB.

## O som, medido

Rodada 10. Medido no navegador, com um `AnalyserNode` ligado ao master (gancho
só de desenvolvimento, `window.__audio`), depois do clique no portão e do
controle ligado, descendo e parando 2.5 s em cada ponto:

| p | nível total | faixa 300–2000 Hz |
|---|---|---|
| 0.02 (portão, Emergência) | −56.2 dB | −71.7 dB |
| 0.15 (garganta) | −47.1 | −70.8 |
| 0.20 (frame) | −45.9 | −63.7 |
| 0.36 (Quem sou) | −47.0 | −60.5 |
| 0.44 | −47.1 | −60.0 |
| 0.60 (rio) | −45.9 | −59.1 |
| 0.80 | −47.3 | −57.8 |

- A faixa que um alto-falante de notebook reproduz **abre 14 dB** da garganta
  para o rio: a câmara fechada soa fechada.
- **Sem período**: a autocorrelação do envelope, parado, fica em 0.26–0.50 em
  todo atraso de 0.2 a 3 s. O ruído é gerado ao vivo; não há emenda para ouvir.
- **Primeira versão reprovada por este mesmo número**: ruído marrom puro dava
  centroide de 49–89 Hz e quase nada acima de 300 Hz — ronco, que o filtro não
  tinha o que abrir. Entrou uma parcela de branco.
- **O que a medição não diz**: se soa como vento genérico. Isso só se decide
  ouvindo, e o controle começa desligado.

## A Superfície e a robustez, medidas

Rodada 11. Folhas: `.screens/11-superficie.png` (0.84 → 1.00, descendo desde
0.30), `.screens/11-ultimo-quadro.png` (1.00, parado 600 passos),
`.screens/11-calmo.png` (as cinco composições do modo calmo),
`.screens/11-real-*.png` (DOM e cena juntos, rolagem de verdade).

### A saída do bando, e as três medições que deram zero corpo no quadro

Contado com `__probe.readSim()` ao longo de uma descida a 0.8 vh/s:

| versão | o que a contagem mostrou |
|---|---|
| estacionar quem cruzasse a lente com a saída ligada | 14 mil de 16.4 mil estacionados em **0.88**, antes de a câmera encarar a abertura |
| virar o bando inteiro | a virada em volta da lente acendeu uma tempestade de lascas `--cyan` de borda a borda |
| sair a −0.4 × drive (2.4 u/s) | a câmera (≈3 u/s) ultrapassava o bando: 15.7 mil estacionados em 0.92 |
| **virada decisiva, só à frente da lente, a −0.9 × drive** | ~7 mil corpos entre a lente e as aletas em 0.90, saindo em ~3 s; zero em 1.00 |

**A folha só mostra o bando se o assentamento for longo.** Com 150 passos
depois de um salto de 0.00 para 0.83, o bando ainda estava atrás da parede do
fundo quando a saída começou, e a folha saía vazia — um artefato da sonda que
parecia um defeito da cena. As folhas desta rodada descem desde 0.30.

### Contraste, com o véu novo (compressão da luz, não sombra)

`__probe.contrast()` a 0.6 vh/s, 1440×900, pt:

| faixa | pior | onde | p50 |
|---|---|---|---|
| 0.00–0.10 | 13.25 | nome da Emergência | 13.86 |
| 0.10–0.28 | 5.67 | manifesto, na virada para Quem sou | 5.90 |
| 0.28–0.45 | 5.69 | manifesto | 5.93 |
| 0.45–0.85 | **5.34** | `Áudio ON`, HUD, em 0.813 | 5.83 |
| 0.85–1.00 | 5.64 | rótulo `IDIOMA` | 5.84 |

Todas acima do piso de 4.5. O rio continua abaixo do alvo de 5.5, como já
estava com o véu antigo (5.16). **Em inglês não foi medido**: a bancada negocia
`pt` em `/`.

**Modo sem WebGL**, medido no canvas 2D do poster com `getContext("webgl2")`
anulado, debaixo de cada caixa `[data-veil]` no quadro:

| beat | sem o véu 2D | com o véu 2D |
|---|---|---|
| Emergência | — | 10.73 |
| Identidade | 2.17 | 8.97 |
| Quem sou | 3.22 | 8.68 |
| Trabalho | 5.14 | 7.13 |
| Superfície | **0.88** | 12.69 |

### LCP, em 4G simulado

150 ms de RTT, 1.6 Mbps, CPU 4×, cache desligado, build de produção, três
cargas cada:

| rota | antes | depois | elemento |
|---|---|---|---|
| `/pt` | 0.63–0.65 s | 0.65–0.68 s | o texto do portão |
| `/work/perfecting` | 0.81 s | — | capa (gerada, 6 kB) |
| `/pt/work/nestle` | 3.6 s | **1.48–1.50 s** | capa |
| `/pt/work/prime8` | **10.8–11.0 s** | 1.10–1.12 s | capa |
| `/pt/work/zoomtecnologia` | — | 1.26–1.27 s | capa |
| `/pt/work/decision-suite` | — | 1.69–1.70 s | capa |

O "antes" é a capa original servida crua; o "depois" é a capa de entrega
(`public/covers/`, 31–57 kB). Teto: 2.5 s.

### GPU, como fração dos 16.7 ms

Plano `descent`, M5, **1440×900 a DPR 1 (1.3 Mpx — não o buffer nativo de 2.71
Mpx)**, cronômetro de extensão:

| faixa | média | mediana | p95 | do quadro |
|---|---|---|---|---|
| 0.00–0.28 | 2.23 ms | 2.50 | 2.54 | 13% |
| 0.28–0.45 | 2.24 ms | 2.50 | 2.56 | 13% |
| 0.45–0.85 | 2.26 ms | 2.50 | 2.54 | 14% |
| 0.85–1.00 | 2.17 ms | 2.49 | 2.54 | 13% |

A Superfície não custa mais que os outros trechos. **Na resolução nativa e no
telefone isto não foi medido** — é o mesmo débito de resolução do AGENTS.md, "O
que falta", item 3.

### Pacote

Rota inicial 186.6 kB (home) e 184.9 kB (case) de 200; chunk da cena 325.9 kB
de 350. Nenhuma instrumentação vazou, incluindo `__calm`.

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
meio de telefone na mão. **`?plan=cards`** faz o mesmo para o rio. `?plan=grid`
(o padrão) continua sendo o 2×2 de regressão. A **linha 0 de todo plano tem que
ser igual aos `DEFAULTS` de `settings.ts`**: o primeiro passo é entrado por um
`?bench=1` pelado, então ele renderiza o padrão — um plano que diga outra coisa
na linha 0 reporta uma configuração e mede outra, em silêncio.

**A faixa varrida é do plano, e não deste arquivo** (`benchSweep`, em
`lib/scene/bench.ts`). O padrão continua sendo 0.00 a 0.28; o plano do rio varre
**0.45 a 0.85**, porque o custo de uma configuração depende do beat: entre 0.00 e
0.28 os cards estão a cinquenta unidades da câmera, atrás de uma névoa que come
97% deles, e medir o rio ali mediria um `for` a mais no shader dos boids e nada
do preenchimento — a metade cara. A faixa é do plano e não da configuração porque
`params.plan` já viaja na URL desde o passo 0.

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
`settle()`, `step()`, `hold()`, `viewport()`, `readField()`, `readSim()`,
`planeMap()`, `measure()`, `occlusion()`, `corridor()`, `cardWake()`,
`hover()`, `contrast()`, `descend()`, `warmth()`, `veilFootprint()` e `sheet()` — a última
monta a contact sheet num canvas 2D e a POSTa em `/shot` no coletor, e com o
argumento `to` ela vira uma **descida** em vez de doze poses do mesmo ponto.

**Uma medição não cabe aqui, e é a de ponteiro.** `?probe=1` troca o relógio da
cena pelo `ProbeClock`, que **não roda laço**: a cena fica parada até alguém
chamar `__probe`. Latência de ponteiro medida ali seria o intervalo entre duas
chamadas de ferramenta, não o que a pessoa sente. Ela sai do site como ele roda,
pelo gancho `window.__cardPick` (`lib/scene/card-pick.ts`), dev-only pelo mesmo
motivo que o `__lenis` da varredura de contraste. `__probe.hover()` existe para
o outro lado da conta: onde cada card está na tela, e qual deles o material
recebeu como aceso.

**E sem extensão de navegador o caminho é o CDP.** `scripts/cdp.mjs` fala o
protocolo de DevTools com só builtins do Node (o `WebSocket` global do Node 22+):
`eval`, `nav`, `shot`, `mouse`, `click`, `sweep`, `bounds` e `emulate`. Duas
coisas que ele resolve e custaram tempo:

1. O Chrome precisa de `--disable-backgrounding-occluded-windows` (e
   `--disable-features=CalculateNativeWinOcclusion`) para não marcar a janela
   como oculta quando outra passa na frente — e aba oculta não cria canvas, ver
   as duas armadilhas de ambiente acima.
2. `--emulate` e `--bounds` são aplicados **na mesma conexão** do comando,
   porque uma emulação posta numa conexão e desfeita em outra **não desfaz**:
   depois de um `emulate off` num processo, o processo seguinte ainda lia
   1024×860, e uma varredura que devia rodar no buffer canônico rodou no do
   mobile sem nada na saída denunciando. É a mesma classe de erro do "débito de
   resolução" — daí a regra de toda expressão medida conferir o **próprio**
   buffer antes de medir, e abortar se ele não for o pedido.
3. **`Page.captureScreenshot` pode devolver um quadro velho, e devolveu.** O
   compositor do Chrome não produz quadro novo para uma janela que não está em
   primeiro plano. Medido: a leitura viva do DOM dizia `EST. 0620 / Work /
   Z −47` e o screenshot do mesmo instante mostrava a Emergência em `EST. 0000`,
   idêntico a um tirado minutos antes. Screenshot do CDP serve para **olhar**,
   nunca como fonte de número — quem mede pixel é a sonda, que lê o buffer do
   WebGL de dentro da página, na mesma tarefa do `advance()`, sem passar pelo
   compositor. É por isso que a contact sheet é confiável com a janela coberta e
   um `shot` não é.

As chaves de URL que a medição usa, todas em `lib/scene/settings.ts`:

| chave | o que faz |
|---|---|
| `?dof=off` | tira a profundidade de campo — regra de corte do DIRECTION.md §3 |
| `?detach=0` | compila fora o descolamento do corpo de prova |
| `?cards=0` | compila fora o rio: malhas **e** esteiras |
| `?flock=N` | a contagem do bando, dentro da faixa de 4k a 16k |
| `?river=N` | força a contagem de cards, para medir a corrente do mobile num desktop |
| `?span=N` | o comprimento do corredor em unidades — `?span=3` é o controle "parede" |
| `?grain=0` | tira o grão de filme do composite — para medidas que comparam quadros consecutivos (ver "A câmara, medida") |
| `?bench=1` | o banco de prova; `?probe=1` a sonda |

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

### O rio, no mesmo aparelho

> ⚠️ **Esta seção tinha uma afirmação errada, e é a mesma classe de erro que o
> PROJECT.md §7 existe para prevenir.** Ela dizia que a tabela de "O que custou,
> em quadro" era "de outra máquina-sessão (M5 a 2160×1254, DPR 1.5)" — não é.
> Conferido nos três relatórios crus desta sessão: `grid` rodou a 1456×817,
> `cards` a 1456×873 e depois 1456×817. **As duas linhas abaixo são o mesmo
> buffer errado da tabela acima**, não uma segunda máquina. A comparação entre
> elas (rio custa o mesmo que os beats de cima) continua válida — os dois lados
> erram pela mesma resolução —, mas nenhuma das duas é o número de produção.

As duas linhas abaixo saíram na mesma sessão, no mesmo M5, com o mesmo buffer
(1456×817–873, a resolução errada — ver acima), e por isso **só valem entre
si** — é a comparação que interessa, não o valor absoluto:

| varredura | GPU/quadro | mediana | p95 |
|---|---|---|---|
| 0.00 – 0.28 (Emergência + Identidade) | 1.93 ms | 1.67 | 2.51 |
| 0.45 – 0.85 (o rio) | 1.78 · 1.92 · 1.98 ms | 1.67–1.69 | 2.50–3.33 |

Buffer 1456×817–873 (1.19–1.27 Mpx), DPR 1, tela de 75 Hz, zero paradas. **O beat
de Trabalho custa o mesmo que os dois beats acima dele** — 11 a 12% dos 16.7 ms
de um quadro a 60 Hz. O A/B do rio ligado contra desligado, e por que ele nunca é
limpo, estão em "O rio, medido".


