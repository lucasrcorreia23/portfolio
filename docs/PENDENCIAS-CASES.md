# Pendências dos cases e da galeria

Gerado em 11/10/2026, depois de levar para o site o material de `~/Desktop/Atomsix/cases/`. Cada item precisa de uma resposta do Lucas. No código, as lacunas dos cases estão marcadas com `⚠️` em comentários MDX, que não aparecem na página.

## O que entrou

| Projeto | Onde entrou |
|---|---|
| WeCann Care | Case `wecann-atena` reescrito sem trabalho de marca: 7 imagens e 2 vídeos. Também 3 telas na galeria |
| Portonave: Portaria de Visitantes | Case `portonave` reescrito: 8 imagens e nenhum vídeo |
| TiL Group: Contratos, checklist de pré-operação e Passe de Serviço | Galeria, 4 telas |
| Atlas Gov | Galeria, 3 telas finais do Figma |
| Cruise Trade News | Galeria, 3 telas, como item novo |
| iFood | Galeria, 2 telas |
| netLex | **Case `netlex` na trilha, no lugar da Unifique Energia**: 8 imagens, com foco na gestão e no detalhe do documento e no onboarding. Saiu da galeria |
| Unifique Energia | Saiu da trilha. Ficou 1 tela na galeria (o painel de economia, do material do site da Nákama) |
| Cubo Workspace | Galeria, 2 telas, no item "Itaú" |
| Natal Mágico | Galeria, 2 telas, como item novo "Continente Shopping" |

Os arquivos estão em `public/assets/img/wecann-atena/`, `public/assets/img/portonave/` e `public/assets/img/vitrine/<item>/`.

## Decisões que tomei e precisam de confirmação

1. **O Passe de Serviço foi para a galeria, não para o case Portonave.** As telas dele levam a marca TiL, como o checklist. Por isso o case da Portonave ficou só com a Portaria de Visitantes, e o material do Passe saiu do texto: o formulário F.ST.007 com 32 campos, as 5 teses e a cadeia de assinaturas. **Se o Passe for Portonave, ele entra no case.**
2. **"Itaú" na galeria é a auditoria do Cubo Workspace (Cubo Itaú).** O README diz que é a correspondência provável. Confirmar.
3. **Cruise Trade News virou um item novo.** Não liguei ao item "Real Response Media", porque nada no material liga os dois. Se a RRM for a dona da CTN, os dois viram um item só.
4. **Natal Mágico entrou como "Continente Shopping"**, o cliente, seguindo o padrão dos outros itens.
5. **O ano da WeCann mudou de 2025 para 2026**, no case e na galeria. As datas do Figma e do código são de junho a agosto de 2026.
6. **O ano da Portonave ficou 2025.** A única data visível é dezembro de 2025, na interface do portal.
7. **O título da Portonave é "Portaria de visitantes".**

## Faltam em todos os projetos da Atomsix

Nenhum README informa o papel do Lucas, o time, o status (no ar, piloto ou conceito) nem resultados medidos. Nos dois cases da trilha:
- **Papel:** está "Product Designer — Atomsix", com `⚠️`. Confirmar o que foi dele e o que foi do time, principalmente na marca da WeCann.
- **Time:** o bloco não existe; só há o comentário.
- **Status e resultados:** "O que mudou" é qualitativo. Qualquer número entra numa seção "Em números".
- **Retrospecto:** os dois foram rascunhados por mim e precisam de revisão.

## `⚠️` no case WeCann (`content/cases/wecann-atena.mdx`)

- Divisão do trabalho entre o Lucas e o time. A marca saiu do case: só o Prime8 fala de marca.
- Bloco Time.
- O motivo da escolha pela direção SaaS em vez da editorial. O material só registra a escolha.
- Se o produto está no ar e com quantos médicos. O site wecann.care só traz a frase "Uma inteligência que trabalha a seu favor".
- O retrospecto.

## `⚠️` no case netLex (`content/cases/netlex.mdx`)

- Período: o material não traz data. Deixei 2025.
- Divisão do trabalho e bloco Time.
- Se o redesign foi implementado, e qualquer número de uso ou de adoção.
- O retrospecto.

## `⚠️` no case Portonave (`content/cases/portonave.mdx`)

- Período do projeto.
- Divisão do trabalho e bloco Time.
- Se o totem e o portal foram implantados, e qualquer número de uso: tempo de check-in, visitas agendadas, NPS.
- O retrospecto.

## Direitos, confidencialidade e dados

| Projeto | Ponto | O que fiz |
|---|---|---|
| Atlas Gov | Os slides de pesquisa dizem "Documento confidencial — feito com exclusividade para Atlas Gov". | Só entraram telas finais. **Confirmar se o cliente libera até essas.** |
| Atlas Gov | `discovery/03` traz o nome de uma entrevistada; `glass-02` e `glass-03` são imagens de terceiros. | Ficaram de fora. |
| iFood | Desafio TechBites com a marca iFood em toda a UI; o Figma se chama "(internal)". | Entraram 2 telas. **Confirmar se pode publicar.** |
| Natal Mágico | `resultados/` são rostos reais de testadores (um deles com o logo da Nike); `stills/10-resultados-ia` está quebrado. | Ficaram de fora. Entraram só as telas do totem. **Confirmar se a ação foi ao ar.** |
| Natal Mágico | A câmera das capturas foi simulada com uma foto gerada. O terceiro painel de `triptico-fluxo` mostra um testador estilizado como personagem. | O tríptico ficou na galeria por ser a tela mais forte, e a contagem foi trocada pela tela de processamento, sem rostos. **Confirmar se pode publicar o tríptico.** |
| Portonave | `figma/07` mostra pessoas reais identificáveis; `figma/08` parece gerada por IA; `figma/09` mostra o totem num escritório, não no terminal. | As três ficaram de fora. O README chama de "fotos reais do terminal". **Confirmar.** |
| Portonave | O portal mostra nomes de visitantes e e-mails `@example.com`. | Parecem fictícios. Confirmar. |
| WeCann | O nome Athena tem "restrições de PI a avaliar". | **Confirmar antes de publicar.** |
| WeCann | A seção de naming do Figma interno tem nomes de outro cliente (Ask-AI). | Ficou de fora. |
| Cruise Trade News | As fotos das matérias são do Unsplash. | Entraram nas telas da galeria. Confirmar. |
| TiL Group | A lista de Pessoas tem nomes, e-mails e telefones. | Ficou de fora. As telas usadas não têm dados pessoais. |
| netLex | A tabela de Contatos mostra empresas reais com CNPJ. | Ficou de fora. |
| Cubo Workspace | Um slide de achado mostra empresas reais da plataforma. | Ficou de fora. |

## O que ficou de fora, e por quê

- **Vídeos:**
  - Entraram só dois loops na WeCann: a abertura (9 s) e a conversa com a Athena (11 s). Os dois têm menos de 1 MB.
  - A Portonave ficou sem vídeo. A única captura real era do Passe de Serviço, e os slideshows do Figma não são gravação de protótipo.
  - Os motions dos outros projetos não entraram, porque a galeria só aceita imagem.
- **Telas verticais** (totem e mobile): não cabem na parede 16:10. No case da Portonave, três telas do totem viraram uma composição lado a lado (`totem-sequencia.webp`).
- **Discovery do Atlas Gov:** confidencial.
- **Slides pesados do Cubo Workspace** (`18` e `20`, de 8 a 11 MB) e telas longas da WeCann (landing page, Paciente 360).

## Pendências técnicas

- **Os vídeos tocam sozinhos, mudos e em loop, e ignoram `prefers-reduced-motion`.** Respeitar isso exige um componente de cliente pequeno.
- **A capa dos cases continua sendo o placeholder desenhado em código.** O campo `cover` agora aponta para imagens reais na WeCann e na Portonave, mas a página não usa esse campo.
- `npm run covers:derive` quebra em Perfecting e Unifique, que apontam para `/generated/`, uma pasta que não existe.
