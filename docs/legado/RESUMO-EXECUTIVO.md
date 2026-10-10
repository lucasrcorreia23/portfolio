# Resumo executivo — lucasrc.com.br

Retrato de 2026-10-10, derivado de `PROJECT.md`, `DIRECTION.md`, `AGENTS.md` e
`MEASUREMENTS.md`, mais o estado do git nesta data. **Não é fonte de verdade**:
onde divergir dos quatro, eles ganham.

## O que é

O site pessoal de Lucas Rodrigues Correia, product designer e design engineer.
O objetivo é presença e autoridade, não vaga nem venda: o site é a peça
principal do portfólio. Ele substitui o site antigo no mesmo domínio, sem
redirects.

A ideia é "natureza imersa em tecnologia": uma câmara escura de concreto com
névoa, um rio no piso e um bando de 16.384 corpos que escoa por ela. A página é
uma descida única dirigida pelo scroll, em um portão de entrada e cinco beats:
Emergência, Identidade (o bando se descola no monograma LRC), Quem sou,
Trabalho (o rio com os sete cases) e Superfície (contato). Cada case tem rota
própria, e o card vira a capa do case sem remontar a cena.

Stack: Next.js 16, React 19.2, TypeScript 6, Tailwind v4, three + React Three
Fiber com compositor de pós-produção próprio, GSAP + Lenis, next-intl (pt/en),
MDX, deploy na Vercel.

## Onde está

- **Construído de ponta a ponta.** Portão, os cinco beats, a travessia para o
  case, HUD, acervo em `/work`, modo calmo (`prefers-reduced-motion`), posters
  para quem não tem WebGL, som sintetizado, tema amanhecer.
- **Rodadas numeradas até a 22, em quatro dias de commits** (07, 08, 25 e 30
  de setembro): 96 commits na branch `fundacao` sobre a `main`, cerca de 30 mil
  linhas de TypeScript. As
  rodadas 19 a 21 foram desfeitas a seu pedido. A rodada 22 (água, paredes,
  organismo, luz) fechou os quatro passos.
- **Typecheck e lint passam** (rodados hoje, sem erro). Não há suíte de testes;
  a verificação é por medição no pixel, registrada no `MEASUREMENTS.md`.
- **Nada disso está no ar nem no remoto.** `origin/main` ainda é o site antigo
  (último commit de 2025-11-11). A branch `fundacao` não existe no GitHub.
- **A tag `template-legado` também só existe nesta máquina.** Ela fica um
  commit acima de `origin/main`, então o site antigo em si está no GitHub; o
  que só existe aqui são as modificações não commitadas de 2026-09-07 que a tag
  guardou.
- O `README.md` está desatualizado: ainda diz que a cena 3D "entra numa etapa
  seguinte".

## Medido contra o alvo

Sempre o número mais recente registrado.

| O que | Medido | Alvo | Medido em |
|---|---|---|---|
| JS da rota inicial (home) | 188.6 kB | ≤ 200 kB | rodada 22 |
| JS da rota de case | 187.6 kB | ≤ 200 kB | rodada 22 |
| Chunk da cena | 302.8 kB | ≤ 350 kB | rodada 22 |
| Contraste do texto, pior quadro (noite) | 5.67:1 | ≥ 4.5:1 | rodada 22 |
| Contraste do texto, pior trecho (amanhecer) | 5.92:1 | ≥ 4.5:1 | rodada 18 |
| Rosa + coral na tela | 0.04% | < 15% | rodada 22 |
| LCP em 4G simulado, pior rota | 1.70 s | < 2.5 s | rodada 11 |
| Costura card → capa do case | 0.0024 px | sem salto visível | antes da rodada 14; não refeita depois da deriva dos cards |
| Resposta ao ponteiro | 28.2 ms (mediana) | < 100 ms | antes da rodada 12 |

**Desempenho de GPU é o número mais fraco da tabela, por isso ficou fora
dela.** Os 4.87 ms por quadro no M5 e 4.62 ms no iPhone são do começo do
projeto. Desde então entraram o reflexo da água, os raios de luz, as lanternas
e o cursor, e nenhum deles foi separado do teto de vsync da bancada (tela de
75 Hz, quadro mediano de 13.3 ms com e sem a água). No telefone, nada das
rodadas recentes foi medido.

## O que falta para a "definition of done"

O `PROJECT.md` §7 lista o que torna um beat pronto. Cinco itens não fecham:

1. **Nota do crítico.** O corte é 9 em duas rodadas seguidas. A única nota
   registrada é a do portão, que parou em 8.5 depois de sete rodadas. O crítico
   não rodou desde que o bando voltou a passar pela peça (pendente desde a
   rodada 13).
2. **Inglês.** `summary_en` dos quatro cases migrados é cópia do português, e o
   corpo dos cases só existe em português. São 1.314 palavras de corpo nos
   quatro migrados, mais o corpo de Perfecting e os sete resumos. A rota `en`
   não deveria ser visitada de propósito até lá.
3. **60 fps com o que entrou depois.** Ver o parágrafo de GPU acima.
4. **A silhueta da peça a 3:1 no pixel.** A última medição deu 0.74:1, na
   rodada 13, ainda com a palavra CORREIA; no monograma LRC ela nunca foi
   medida. Pede mudar o desenho do bando na Identidade e é uma rodada própria.
5. **A lista de marcas de IA.** O critério cita `PROMPTS.md`, seção Subtração,
   e esse arquivo não está no repositório.

Além disso, as medidas do descolamento e da oclusão não foram refeitas desde
que a palavra CORREIA virou o monograma LRC: os instrumentos ainda supõem uma
letra da palavra antiga.

## Conteúdo

| Case | Texto | Mídia |
|---|---|---|
| Decision Suite, ZOOMtecnologia, Prime8, Nestlé | migrado do site antigo, só em português | real |
| Perfecting | escrito pelo Lucas; duas linhas truncadas e o reteste da FIESC por preencher | capa gerada |
| Unifique Energia, WeCann Atena | só o frontmatter | capa gerada |

**A ordem dos cases no rio é provisória.** O `river_rank` e as disciplinas
foram escritos pelo agente, lendo a lista de projetos, e nunca foram decididos
pelo Lucas olhando os cards montados. O rio usa essa ordem porque precisa de uma.

## O que depende do Lucas

1. **Olhar a folha da luz** (`.screens/22-luz.png`). É a única entrega da
   rodada 22 que ele ainda não viu.
2. **Material real de Perfecting, WeCann e Unifique.** Uma captura de tela de
   produto já serve. As três capas geradas são os pontos mais fracos do rio, e
   duas estão no topo do ranking.
3. **A curadoria**: ordem do rio e disciplinas de cada case.
4. **A Superfície está sépia**, não teal com luz peach. É escolha ou pendência?
5. **A "Regra de governança"**, pedida duas vezes e nunca colada no repositório.
6. **Enviar ao remoto**: a branch `fundacao` e a tag `template-legado`. Hoje
   não há cópia de nenhuma das duas no GitHub.

## As três piores coisas

1. **Uma lanterna passa rente à lente na Emergência** (progresso 0.00 a 0.03):
   um disco amarelo desfocado no meio do primeiro quadro do site, que lê como
   luz de palco. A causa não foi investigada.
2. **O amanhecer está pálido**, perto do "branco de laboratório" que o
   `DIRECTION.md` veta, e o monograma perde força nele. Ele liga sozinho pela
   preferência de sistema do visitante, e a troca de tema é um corte sem
   transição.
3. **O rio e a parede aparecem pouco onde a rodada 22 mais investiu.** Na
   Emergência e na Identidade a água só entra na borda de baixo do quadro, e a
   textura nova das paredes quase nunca está enquadrada.

Limpeza pequena e sem risco: `troika-three-text` e `@react-three/drei` estão no
`package.json` sem uso desde a rodada 17.

A lista completa de pendências, com a rodada de origem de cada uma, está em
`AGENTS.md`, "Pendências — a lista única".
