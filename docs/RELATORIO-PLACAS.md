# Relatório — placas com corpo, planeta e peso (2026-10-10)

**Feito.** As placas dos cases deixaram de ser um plano: moldura de chapa de 8 cm com chanfro e fila de parafusos, verso de chapa ondulada, vidro por cima da imagem (que fica 3 cm recuada, com brilho próprio constante), pórtico em perfil I com sapata de concreto. Uma porta de enrolar cobre cada placa, sobe quando a câmera chega e desce quando ela sai. No céu, o crescente rosa e a lua deram lugar a um planeta de faixas, visível na Introdução e no CTA. O link do case continua sobre o retângulo da imagem; nada mudou na navegação. Typecheck, lint, build e `measure` passam. Capturas em `.screens/planeta/placas/`: `antes-*` e `depois-*` nos mesmos pontos (leitura, close, céu da Introdução e do CTA), mais `depois-detalhe` (o canto da moldura a 3×) e `depois-saida` (a porta descendo quando a câmera sai).

**Os números.**

| | antes | depois | teto |
|---|---:|---:|---:|
| Draw calls, nível médio | 40 | 46 | 100 |
| Triângulos, nível médio | 386.241 | 393.273 | 400.000 |
| Tempo de quadro mediano | 16,7 ms | 16,7 ms | — |
| JS da home / do case | — | 184,0 / 187,5 kB | 200 |
| Chunk da cena | — | 168,5 kB | 350 |

Draw calls e triângulos lidos em `?at=0.455&stats=1` a 760 px de largura. A linha de base já não era a do relatório anterior (29 calls e 346 mil triângulos): o trabalho feito entre os dois a levou a 40 e 386 mil. O tempo de quadro é a mediana do governador, em dev, num Chrome sem janela a 1440×900: fica preso ao vsync antes e depois. Em seis rodadas pareadas com e sem as placas, as doze ficaram no nível alto a 16,7 ms; com a máquina carregada (load 6) e 4,5× os pixels, as duas versões caem igualmente para o nível baixo. Não medi em build de produção nem em telefone. O JS de antes não foi medido nesta rodada.

**Peso dos assets** (o que o site carrega, tudo depois do loading):

| arquivo | fonte | final |
|---|---:|---:|
| `models/industria/porta.glb` | 2.341 kB | 193 kB |
| `metal_plate_02` (cor, normal, arm 1k; altura 512) | 2.108 kB | 459 kB |
| `concrete_wall_006` (512) | 3.308 kB | 171 kB |
| `corrugated_iron_02` (512) | 2.211 kB | 33 kB |
| `green_metal_rust` (512) | 797 kB | 16 kB |
| loader de glTF + decodificador meshopt (chunk à parte, gzip) | — | 20 kB |

**Decisões.**
1. O material é o `MeshStandardMaterial` pedido, mas a cena não tem luz do three, mapa de ambiente nem `scene.fog`: `lib/scene/pbr.ts` liga nele a névoa e a luz da flora por `onBeforeCompile`. Cada mancha de flora entra como fonte larga, para o chanfro brilhar de raspão.
2. A moldura usa `metal_plate_02`, não `metal_plate`: o losango do primeiro some à distância de leitura. A cor da fonte é ferrugem quente e lia como madeira; no script ela vira aço frio. A tinta verde e o concreto perderam metade da cor.
3. O pórtico ganhou perfil I e chapa de base, além do material: montante quadrado com textura continuava lendo como poste.
4. A imagem não saiu do lugar; a moldura cresce em volta e para a frente dela. É o que mantém o link e o encaixe na capa iguais.
5. A câmera cruza o canto inferior esquerdo de cada placa ao sair da parada, como já fazia. Tudo é face única, então a travessia lê como antes. Não mexi na trilha.
6. A porta ficou boa no teste e foi para as seis paradas. O modelo é uma malha só, sem animação: é separada por ilhas na carga e a cortina sobe no shader. Ela é mais escura e menos metálica que o modelo, que acendia como se emitisse. Meshopt quase não muda os 46 kB de geometria dela; o ganho veio do WebP e de tirar a cópia grafitada.
7. O pórtico de estaleiro ficou de fora: simplificado com erro aceitável ainda tem 11,7 mil triângulos, e a folga do nível médio é de 6,7 mil.
8. O planeta começou sóbrio, como no prompt, e mudou por pedido durante a rodada: voltou a luz rosa, a sombra perdeu a linha e o lado escuro recebe o azul das serras. "Ruído de as" chegou cortado; li como "faixas".
9. O planeta muda de lugar com a proporção da tela: à direita numa tela larga, na borda direita e menor numa estreita, onde o lugar original fica fora do quadro. Ele some antes da primeira parada, para nunca ficar atrás de uma placa aberta.
10. O vidro só soma luz, então nunca cobre a imagem: de frente o que se vê é a borda acesa; o reflexo cresce de esguelha. Ele deixou de ler o halo da flora ao longo do raio, que custava um laço por pixel na placa inteira.
11. Texturas soltas foram para WebP com `sharp`; o `gltf-transform` só opera em glTF. Moldura em 1k, o resto em 512.
12. No nível baixo: sem vidro, sem paralaxe, porta aberta e parada. Não há como forçar o nível pelo console; a porta aberta e parada aparece na captura de uma rodada em que o governador rebaixou a cena (`depois-quadro-4x`), e o vidro e a paralaxe foram conferidos só no código.
13. O commit inicial da rodada levou o trabalho pendente das sessões anteriores, menos as fontes pesadas (GLB e JPG do Poly Haven), que continuam fora do git.
14. Os cinco posters do modo sem WebGL foram regerados. `og.jpg` não: é um quadro antigo do Impacto, sem receita registrada, e as placas não aparecem nele.

**Depois.** No nível médio a linha de base já estava em 386 mil triângulos (o relatório anterior dizia 346 mil), e restam 6,7 mil. Na Introdução o planeta rosa é a coisa mais clara do quadro depois das flores e vaza no bloom por cima da tubulação; vale um olhar seu. Medir quadro em build de produção e num telefone. Foco por teclado no link com a porta fechada não foi testado por automação (o clique foi).
