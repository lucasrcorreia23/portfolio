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
- Coral e rosa são **eventos**, não fundo. Ocupam menos de 15 dos 100 por cento de qualquer tela.
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
| 0.45 a 0.85 | Trabalho | O rio. Cards de projeto flutuam em perspectiva real e a câmera atravessa por dentro deles. Filtros na HUD lateral reorganizam o rio sem recarregar a página. |
| 0.85 a 1.00 | Superfície | A luz chega ao topo. Contato, sem formulário, sem "vamos construir algo incrível juntos". Só o e-mail, os perfis e o seletor de idioma. |

**HUD lateral fixa.** Coluna estreita e permanente em uma das laterais, em mono pequena. Contém contato, filtros do trabalho, indicador de progresso do scroll, controle de áudio e o toggle de idioma. Substitui o rodapé. O site não tem rodapé.

**Rotas.** A home é a descida completa. Cada case tem rota própria em `/work/[slug]` e `/pt/work/[slug]`. A transição da home para o case é contínua: o card se aproxima da câmera e vira a capa do case, sem tela branca no meio.

---

## 5. Stack e restrições

```
Next.js 16, App Router, TypeScript estrito
React Three Fiber 9 + drei 10 + @react-three/postprocessing 3
three
troika-three-text  (tipografia display dentro da cena, para oclusão real)
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
    comprimido.** `three`, R3F, drei, postprocessing, troika e os shaders
    vivem aí dentro, e o chunk só começa a carregar depois do primeiro
    quadro útil.
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

Três cases, em `content/cases/`:

1. **Perfecting.** Produto B2B SaaS de roleplay e treino de vendas com IA. Case de produto ponta a ponta, com fluxo, sistema de marca e analytics.
2. **WeCann Atena.** Plataforma de prontuário eletrônico, feita pela Atomsix. Case de domínio complexo e design de sistema.
3. **Unifique Energia.** Plataforma de contratação de energia por assinatura, onde um
   simulador de economia vira a porta de entrada e o fluxo comercial é automatizado — a
   contratação tratada como produto, não como formulário. Trabalho feito no Estúdio Nákama;
   material de origem (imagens e texto) em
   https://www.estudionakama.com.br/projetos/unifique-energia

Cada case tem no frontmatter: `title`, `client`, `year`, `role`, `stack`, `summary_pt`, `summary_en`, `accent` (um token da paleta), `cover`, `media[]`.

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
