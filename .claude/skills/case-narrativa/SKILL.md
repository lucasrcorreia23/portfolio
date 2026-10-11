---
name: case-narrativa
description: Escreve ou reescreve um case do portfólio (content/cases/*.mdx) na narrativa da casa — tese, problema, perguntas, decisões, o que mudou, retrospecto —, a mesma de Perfecting, Prime8 e Decision Suite. Use quando o Lucas pedir para criar, migrar, melhorar ou padronizar um case.
---

# Narrativa de case

Esta é a forma dos cases de `content/cases/`. As referências são o ResumeGeni (product designer portfolio) e o case EE/BT do Apparicio. Os modelos prontos no repositório são `perfecting.mdx`, `prime8.mdx` e `decision-suite.mdx`: leia um deles antes de escrever.

## Antes de escrever

1. **Leia o MDX atual inteiro**, incluindo o `frontmatter`, e o `PUBLISHED` de `lib/cases.ts`.
2. **Olhe cada imagem da pasta** `public/assets/img/<slug>/`. Para ver mais rápido, gere miniaturas no scratchpad com `sips -Z 700`. O nome do arquivo engana: as "foto*" do Prime8 eram telas e design system. Anote o que cada imagem mostra de decisão. Esse material vira texto, como o "preço trancado até o cadastro" do Prime8 ou o "pedido de novo painel" do Decision Suite.
3. **Busque o estado atual do produto fora do repositório**: site do produto, notícias, Instagram, LinkedIn, sites de parceiros (por exemplo huawei.com).
   - Use o que encontrar como **informação no texto, sem link**. Não ponha o site do produto como link no case.
   - Só afirme o que estiver confirmado na fonte. Uma descrição automática de imagem do Instagram não confirma nada.
   - **Se a fonte pública contradisser o Lucas, pergunte a ele antes de escrever.** Ele é a fonte final. A Prime8 aparecia ativa nas notícias, mas tinha sido desativada sem anúncio.
4. **Use o nome de cliente que o Lucas der**, mesmo que o site ou as imagens digam outro. Foi "Fivelabs", e não "Newral", no Decision Suite.

## Esqueleto do corpo

Os níveis de título do MDX descem um nível na página (`lib/work/mdx-case.tsx`):
- `#` é a tese, e também o número grande em "Em números";
- `##` é a afirmação longa;
- `###` é o subtítulo ou a decisão;
- `####` é o rótulo mono em caixa alta.

```
<período>

<Papel> @ <Cliente>

# <Tese em uma frase: o problema de negócio e a virada.>

### <Subtítulo: a ideia que explica o resto.>

**Meu papel**\
<papel e o que isso cobriu>

**Período**\
<anos>

**Time**\
<quem estava junto>

<Um parágrafo de contexto: o que é a empresa, o que existia quando entrei.>

![…](/assets/img/<slug>/<hero>)

---

#### Se você ler só uma parte

## <O problema.>

## <O que eu fiz, a virada.>

## <O que ficou.>

---

#### O problema

<Uma frase curta que reenquadra.>

- <3 a 6 dores concretas. Se houver falas de entrevista, elas são as dores, entre aspas.>

<Uma frase: a tentação óbvia e o que precisava vir antes.>

---

#### Por onde comecei

#### 01.
### <Pergunta?>
(3 a 5 perguntas)

---

#### O que eu fiz em <área>

### <Decisão, no passado e em primeira pessoa.>

<Um parágrafo: o que fiz, por quê e do que abri mão.>

![…](…)

(Uma a três seções "O que eu fiz em …": pesquisa, marca, produto, dados, engenharia.)

---

#### Em números        ← só com números confirmados
# 12
<legenda curta>

  ou

#### O que mudou       ← qualitativo, quando não há números
### <Resultado em uma frase.>
<Status hoje: no ar, desativado, prêmios, certificações. Só fatos confirmados.>

---

#### Em retrospecto

### <Dois ou três parágrafos curtos em primeira pessoa: o que eu faria diferente.>
```

## Foco do case

O Lucas não é designer de marca. O foco de todo case é **produto, design, craft, engenharia, stack, dados, resultados, negócio, processo e frameworks**.
- **Marca só aparece no Prime8 e na Perfecting.** Na Perfecting, ela entra como algo intrínseco ao produto, que ainda está em construção, e não como algo que o Lucas construiu. Em qualquer outro case, não apresente trabalho de marca como dele: nada de "construí a marca", naming, brandbook, posicionamento de marca, papelaria ou feed. Também não use imagens de brandbook.
- Se o produto tem um visual próprio, ele entra como parte do produto (é intrínseco a ele), ou como regra de interface: hierarquia, cor com significado, um primário por tela.
- Discovery entra como processo de produto: entrevistas, jornada, sitemap, fluxos, priorização.

## Regras de texto

- **Nunca invente número, prêmio, time ou resultado.** Onde falta um fato, deixe `{/* ⚠️ <o que falta>. Confirmar com o Lucas. */}`. O comentário não aparece na página. Se um campo de metadados não tem valor, tire o campo e deixe o comentário, nunca um rótulo vazio.
- **Não exagere o papel.** "Trabalhei com agentes de IA" não é "montei e testei agentes". Fique no que o material original e as imagens mostram.
- **Frases simples.** Nada de aforismo de duas camadas, como "o manual é só metade do trabalho; a outra metade é o componente que obriga a regra a valer em cada tela". Prefira "um manual sozinho não basta; a marca só se mantém quando está dentro dos componentes".
- Tamanho entre **800 e 1.500 palavras** no corpo.
- Retrospecto escrito por você é rascunho: marque com `⚠️` para o Lucas revisar.
- O corpo é só em pt. O `/en` mostra o mesmo corpo, e só os alts e o resumo trocam de idioma.

## Regras de imagem e frontmatter

- **De 6 a 9 imagens**, escolhidas porque mostram uma decisão: artefato de pesquisa, mapa de fluxo, sistema, a tela que materializa uma decisão. Tire do corpo telas genéricas (login, por exemplo), repetidas e miniaturas do site antigo. Não apague arquivos de `public/`.
- `media[]` lista só o que o corpo usa. Cada `alt_pt`/`alt_en` descreve o que se vê na imagem, nunca um "Tela final" genérico repetido.
- Tire do corpo os blocos `### Cliente / Posições / Serviços / Ano`, porque o cabeçalho da página já mostra. Tire `river_rank`.
- `summary_pt` e `summary_en` são a tese em uma ou duas frases. Eles vão para o meta e para o OG.
- `year` é um número. Período com dois anos vai no corpo ("2024 a 2025").
- **Vídeo:** um loop curto e mudo entra como `![alt](/assets/img/<slug>/x.mp4)`. A entrada no `media[]` precisa de `poster`, um frame em WebP com a mesma proporção, de onde saem as dimensões. No máximo 2 por case, cada um com até 2 MB, e só captura real (slideshow de Figma não conta). Encode: `ffmpeg -an -t 10 -vf fps=30 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart`.
- **Telas verticais** (totem, mobile) não entram inteiras no corpo, porque ocupam várias alturas de tela. Componha 2 ou 3 lado a lado numa placa 16:10, como `portonave/totem-sequencia.webp`.
- **A marca na interface decide o destino, não a pasta.** As telas do checklist e do Passe de Serviço estavam na pasta da Portonave, mas levam a marca TiL, então foram para a galeria.
- Nas dúvidas de qualidade de imagem, consulte o advisor com as miniaturas na mão.

## Verificação

1. `npm run typecheck`.
2. Com o dev rodando na porta 3000: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/work/<slug>` deve dar 200.
3. Na versão em inglês, conferir que os alts saíram em inglês: `curl -sL http://localhost:3000/en/work/<slug> | grep alt=`.
4. `node scripts/capture.mjs http://localhost:3000/work/<slug> <scratchpad>/x.png --scroll=0.1`, e olhar a captura.
5. Não commitar, a menos que o Lucas peça.

Na resposta, liste os `⚠️` que ficaram para o Lucas preencher.
