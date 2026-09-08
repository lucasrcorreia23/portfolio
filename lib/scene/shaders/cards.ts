import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "./lights";

/**
 * Os cards do rio — DIRECTION.md §5: "Os cards usam o mesmo substrato fosco,
 * com a capa do case como textura unlit, levemente recuada atrás da placa de
 * cota."
 *
 * Três materiais numa peça só, e a divisão é por UV:
 *
 * - **O substrato** é a moldura e o fundo. É o mesmo concreto das paredes —
 *   base `--abyss`, fosco, sem emissivo próprio, aceso só pelo rig prático que
 *   segue os aglomerados do bando. Um card sem bando por perto é escuro, como
 *   tudo nesta câmara.
 * - **A capa** é unlit: ela é a imagem, não uma superfície iluminada. Nesta
 *   rodada é procedural — ver `coverField` — porque o prompt pede capas de
 *   teste, e uma capa de teste que finja ser um case é pior que nenhuma.
 * - **A placa de cota** é gravação, e usa a mesma física de raspão da
 *   `Structure`: incidência quase rasante, brilho na quina e não na face. Nesta
 *   rodada ela não carrega número — cliente, ano e estação são conteúdo, e a
 *   rodada é de geometria. É o mesmo adiamento que a `Structure` já fez com os
 *   números gravados nas paredes.
 *
 * ## Instanciado, com uma máscara — e por que ela não é a mesma coisa que
 * estacionar
 *
 * Os sete cards são uma malha só, com `InstancedBufferGeometry`: o corpo é
 * idêntico, o que muda é centro, ângulo e semente.
 *
 * A medição tira cards de duas maneiras, e elas respondem a perguntas
 * diferentes. `uCardMask` tira **do quadro** e deixa a força no escoamento: é o
 * que a pegada precisa, porque ali o bando tem que seguir a mesma trajetória nas
 * duas condições para que a diferença de pixel seja a peça e não a esteira dela.
 * Estacionar o card — a sonda escrevendo `uCards[i]` cinco mil unidades fora do
 * duto — tira **do escoamento** também, e é o que a medição de esteira precisa,
 * porque ali o controle é justamente "sem esta força".
 *
 * Uma linha de vertex shader existe só para medir, e ela custa uma divisão e um
 * `mod` em vinte e oito vértices. O que ela compra está no docblock de
 * `probe-cards.ts`.
 *
 * ## Opacos, escrevendo profundidade
 *
 * Pelo mesmo motivo que os corpos do bando: é o que faz um card ocluir e ser
 * ocluído de verdade, e é o que faz o bando passar na frente de um e atrás de
 * outro. Card transparente sairia da lista opaca e seria ordenado por objeto,
 * e a corrente inteira ficaria na frente ou atrás do bando.
 */
export const CARD_VERT = /* glsl */ `
in vec4 aCard;
in vec3 aTone;
in float aSeed;
in float aIndex;

/**
 * Máscara de bits das instâncias escondidas: o bit i ligado tira o card i do
 * quadro. Zero é a corrente inteira, que é o que a cena roda sempre.
 *
 * Ela esconde **só do quadro** — o card continua desviando o escoamento, porque
 * o shader dos boids lê uCards e não esta máscara. Isso é o ponto: a medição de
 * pegada precisa que o bando siga exatamente a mesma trajetória nas duas
 * condições, senão a diferença de pixel passa a incluir a esteira em vez de só
 * a peça. Quem tira um card do escoamento é a sonda, escrevendo uCards direto
 * (ver park, em probe-cards.ts), e isso é outra pergunta.
 */
uniform float uCardMask;

out vec3  vWorld;
out vec3  vNormal;
out vec2  vUv;
out vec3  vTone;
out float vSeed;
out float vViewDepth;

void main() {
  float c = cos(aCard.w);
  float s = sin(aCard.w);

  // Rotação em torno de Y: a mesma convenção do corpo de prova, e a mesma que o
  // shader dos boids inverte para entrar no referencial do card.
  vec3 local = vec3(
    c * position.x + s * position.z,
    position.y,
    -s * position.x + c * position.z
  );

  // A instância escondida colapsa no próprio centro: nenhum fragmento, nenhuma
  // mudança de profundidade, e o resto da corrente intacto.
  float bit = mod(floor(uCardMask / exp2(aIndex)), 2.0);
  vec3 world = aCard.xyz + local * (1.0 - step(0.5, bit));

  vWorld  = world;
  vNormal = vec3(s, 0.0, c);
  vUv     = uv;
  vTone   = aTone;
  vSeed   = aSeed;

  vec4 view = viewMatrix * vec4(world, 1.0);
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

/**
 * A capa de teste.
 *
 * **Procedural, e deliberadamente fria.** Duas regras a governam, e as duas são
 * dos documentos, não de gosto:
 *
 * 1. **Ela não pode passar do limiar de bloom.** O DIRECTION.md §5 reserva o
 *    bloom para "corpos emissivos e a fresta da tomada de ar" — o limiar do
 *    compositor é 1.05 em HDR linear, e a capa é escrita com pico em ~0.38.
 *    Uma capa que floresce seria a segunda fonte de luz da câmara.
 * 2. **Ela não gasta o orçamento de calor.** `--rose` e `--coral` são eventos do
 *    bando (§2: rose onde ele comprime, coral só na turbulência da esteira), e
 *    sete retângulos quentes espalhados pelo corredor comeriam o teto de 15% de
 *    tela do PROJECT.md §3.1 sem nenhum deles ser um evento. A rampa fica no
 *    lado frio: `--void` → `--deep` → o tom do card, que é uma mistura de
 *    `--teal` e `--cyan`.
 *
 * O campo é a mesma `sceneNoise` da névoa, em duas oitavas, com a semente do
 * card deslocando a rede — então cada capa é diferente e nenhuma é um gradiente
 * de duas paradas (PROJECT.md §3.1 veta pelo nome). O termo vertical dá um
 * horizonte, que é o que faz o retângulo ler como imagem e não como textura.
 *
 * **Ela é a entrada que o véu de legibilidade ainda não tinha.** O DIRECTION.md
 * §5 registra que o alvo do véu (5.5) foi escolhido "sem o beat de Trabalho
 * existir — nenhum card, nenhuma capa de imagem atrás de texto". O pico de 0.38
 * entrega, à distância de leitura e com a névoa deste beat, uma luminância
 * composta de ~0.19 sob a HUD: quase o dobro do teto de 0.104 que o véu
 * defende. É trabalho de verdade para ele, e é o que faz a varredura de
 * contraste do rio significar alguma coisa.
 */
const COVER_GLSL = /* glsl */ `
vec3 coverField(vec2 uv, vec3 world, vec3 tone, float seed) {
  vec3 grid = world + vec3(seed * 41.0, seed * 17.0, seed * 63.0);
  float n = sceneNoise(grid * 0.55);
  n = n * 0.62 + sceneNoise(grid * 2.1) * 0.38;

  // Um horizonte, e o ruído quebrando a rampa. Três paradas, nunca duas.
  float band = smoothstep(0.05, 0.95, uv.y);
  float t = clamp(band * 0.62 + n * 0.58 - 0.12, 0.0, 1.0);

  vec3 field = mix(uVoid, uDeep, smoothstep(0.0, 0.44, t));
  field = mix(field, tone, smoothstep(0.44, 1.0, t));
  return field * 1.35;
}
`;

/**
 * O recorte, em fração do card.
 *
 * **A moldura é estreita e a placa é rasa, e as duas foram apertadas depois de
 * olhar o quadro.** A primeira versão tinha moldura de 5%, uma faixa de placa de
 * 21% e uma fileira de marcas de intervalo atravessando a largura inteira — e o
 * resultado, montado na câmara, lia como **televisor**: quadro claro em volta,
 * tela escura no meio, uma tira de perfuração embaixo. Televisor é cenário de
 * ficção científica, que é exatamente a estética que o PROJECT.md §2 descartou.
 *
 * O que um corpo de prova tem é chanfro, não moldura: uma quina que pega luz de
 * raspão e some. Daí a moldura de 2.5%, a placa de 11% com **uma** cota
 * gravada, e o substrato mais escuro que a capa em vez de mais claro.
 */
const BEZEL = 0.025;
const PLATE_TOP = 0.11;

export const CARD_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

uniform vec3  uSubstrate;
uniform vec3  uCyan;
uniform vec3  uMist;
uniform float uCoverGain;

in vec3  vWorld;
in vec3  vNormal;
in vec2  vUv;
in vec3  vTone;
in float vSeed;
in float vViewDepth;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}
${COVER_GLSL}

void main() {
  // O substrato: concreto, e o mesmo grão das paredes. Sem ele o card é um
  // retângulo de cor chapada, que é o que a §2 chama de cenário.
  float near  = exp(-vViewDepth * 0.05);
  float grain = sceneNoise(vWorld * 0.62) * near * 0.45 + sceneNoise(vWorld * 0.18) * 0.55;

  // Incidência baixa: o card é uma **face** virada para o corredor, não uma
  // quina gravada. Ele acende quando um cacho passa na frente dele.
  float lit = practicalLight(vWorld, vNormal, 0.22);
  vec3 color = uSubstrate * (0.10 + 0.24 * grain) + uCyan * lit * 0.18;

  // --- o chanfro da borda --------------------------------------------------
  // A quina da peça, e não uma moldura: incidência quase rasante, do mesmo
  // jeito que as gravações da parede. Ela aparece quando um cacho passa de
  // lado e some quando ele vai embora.
  float glazing = practicalLight(vWorld, vNormal, 0.95);
  vec2  toEdge = min(vUv, 1.0 - vUv);
  float chamfer = 1.0 - smoothstep(0.0, ${BEZEL.toFixed(3)}, min(toEdge.x, toEdge.y));
  // **Vinte e dois centésimos, e a primeira tentativa foi noventa.** A 0.9 o
  // chanfro virava um contorno claro contínuo em volta de cada card — moldura de
  // quadro, não quina de peça —, e a profundidade de campo o transformava em
  // fantasma: seis cópias deslocadas, que é o que um kernel de seis amostras faz
  // com uma linha fina e clara. A quina precisa aparecer quando um cacho passa
  // de lado, não desenhar o card.
  color += mix(uMist, uCyan, clamp(glazing, 0.0, 1.0)) * chamfer * glazing * 0.22;

  // --- a capa, recuada -----------------------------------------------------
  vec2 coverMin = vec2(${BEZEL.toFixed(3)}, ${PLATE_TOP.toFixed(3)});
  vec2 coverMax = vec2(1.0 - ${BEZEL.toFixed(3)}, 1.0 - ${BEZEL.toFixed(3)});
  vec2 inCover = step(coverMin, vUv) * step(vUv, coverMax);
  float cover = inCover.x * inCover.y;

  vec2 coverUv = (vUv - coverMin) / (coverMax - coverMin);
  vec3 field = coverField(coverUv, vWorld, vTone, vSeed) * uCoverGain;

  // "Levemente recuada": a sombra do rebaixo, na borda de cima e na da
  // esquerda. É o que faz a capa ler como encaixada no substrato em vez de
  // impressa nele.
  float recess = smoothstep(0.0, 0.035, coverUv.x)
               * (1.0 - smoothstep(0.965, 1.0, coverUv.y));
  field *= mix(0.28, 1.0, clamp(recess, 0.0, 1.0));

  color = mix(color, field, cover);

  // --- a placa de cota -----------------------------------------------------
  // Gravação, não rótulo: uma cota só, com o brilho na quina. Sem número —
  // cliente, ano e estação são conteúdo, e esta rodada é de geometria. É o
  // mesmo adiamento que a Structure fez com os números das paredes.
  float rule = (1.0 - smoothstep(0.0, 0.010, abs(vUv.y - 0.058)))
             * step(${BEZEL.toFixed(3)}, vUv.x)
             * step(vUv.x, 0.34);
  float tick = (1.0 - smoothstep(0.0, 0.008, abs(vUv.x - 0.34)))
             * step(0.030, vUv.y) * step(vUv.y, 0.086);
  float engraved = max(rule, tick);
  color += mix(uMist, uCyan, clamp(glazing, 0.0, 1.0)) * engraved * (0.015 + glazing * 0.7);

  color = applyFog(color, vViewDepth, vWorld);

  fragColor = vec4(color, 1.0);
}
`;
