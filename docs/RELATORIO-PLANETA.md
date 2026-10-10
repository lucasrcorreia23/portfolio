# Relatório — refatoração "planeta" (2026-10-10)

**Feito.** `fundacao` e `template-legado` enviadas ao remoto; trabalho na branch `planeta`, em seis commits. Saíram a câmara, o rio, o bando, o monograma, lanternas, raios, o amanhecer, os instrumentos de medição, troika e drei (26 mil linhas a menos). Entraram o terreno, a relva e as flores instanciadas com vento, os esporos, a indústria em silhueta, a trilha da câmera com seis paradas, os painéis dos cases, o loading com contador real, a navbar, a vitrine e os placeholders em código. Typecheck, lint e build passam.

**Os três números.** JS da home 183,3 kB (teto 200; case 186,7; vitrine 178,5). Chunk da cena 248,0 kB (teto 350). Tempo de quadro mediano 16,7 ms, igual com 4,5× os pixels (3052×1908), então há folga atrás do vsync. No nível médio: 29 draw calls e 346 mil triângulos (tetos 100 e 400 mil). Medido num Chrome sem janela nesta máquina, a 60 Hz. LCP não foi medido.

**Decisões.**
1. Travessia reaproveitada só na câmera: o painel encaixa na capa em DOM e a troca é o corte curto; a entrega de textura do card antigo não foi portada.
2. A capa na rota do case é o mesmo placeholder do painel. As capas reais continuam em `public/covers/`, sem uso.
3. Seis paradas em qualquer aparelho; o corte por aparelho saiu.
4. "WeCann Care" é um nome de exibição em `lib/cases.ts`; o MDX e o slug não mudaram.
5. Portonave tem ano, papel, stack, resumo e disciplina provisórios, só para a rota existir; na vitrine ele aparece sem esses campos.
6. Os nove tokens de cor mantêm o nome e mudam de valor; `rose` e `peach` viraram neutros, porque o `accent` dos MDX ainda os cita.
7. O loading fecha sozinho, então a revelação do Impacto corre no tempo (3,2 s), não no scroll.
8. Indústria com luzes indicadoras pequenas e neutras, abaixo do limiar do bloom (leitura da linha que chegou cortada).
9. Música sintetizada: um bordão grave somado ao ruído. Nada do site de referência foi copiado.
10. Manifesto reduzido a dois parágrafos (o terceiro falava de medição). Na vitrine, os oito itens sem dados entram só com o nome e, sem `type`, o filtro não aparece.
11. `scripts/capture.mjs` substitui os scripts de medição antigos: só navega e captura. Os dois estudos do Codrops devolveram 403 e não foram lidos.

**Depois.** Texto e tradução dos cases; capas e imagens reais; dados dos oito itens da vitrine e do Portonave; cabeça das flores (hoje lê como gema facetada); relva em primeiro plano; trecho escuro da Introdução; LCP em 4G; teste num telefone real; paradas no toque (a viscosidade é só da roda); comentários antigos que ainda citam os documentos legados; pausar o som com a aba oculta; enviar `planeta` ao remoto.
