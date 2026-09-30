/**
 * O chunk de névoa — importado por **todos** os materiais da cena.
 *
 * Nenhum material aqui é padrão do three (os corpos são unlit com rampa
 * emissiva, a estrutura é linha com realce de quina, o corpo de prova é fosco
 * com fresnel), então a névoa não pode vir do `scene.fog` do three: ela é este
 * texto, colado nos três fragment shaders. Um chunk, três consumidores,
 * nenhuma chance de a atmosfera divergir entre eles.
 *
 * **Névoa, não fumaça.** Densidade exponencial modulada por ruído 3D — o
 * DIRECTION.md §6 proíbe meio advectado, pluma de curl e visualização de
 * escoamento. O ruído aqui move devagar e não tem campo de velocidade.
 *
 * **Três paradas, nunca duas.** `--void` → `--abyss` → `--deep`, com o ruído
 * quebrando a rampa. O PROJECT.md §3.1 veta gradiente linear de duas paradas
 * em qualquer lugar do site.
 *
 * **O véu não mora mais aqui.** Ele morou: era um termo aditivo de densidade
 * neste chunk, com um `f` por caixa resolvido por quadro a partir do proxy.
 * Medido, ele não entregava — e o conserto o mudou de lugar, para depois do
 * bloom, dentro do composite (`shaders/post.ts`). O motivo está lá; o que
 * importa aqui é que nenhum material chama `applyVeil` mais, e que ele
 * continua **dentro do canvas**: o DOM nunca ganha `background`, `scrim` nem
 * `text-shadow` para compensar.
 */

import { APERTURE_Y, LOUVER_Z } from "../chamber-plan";

export const FOG_UNIFORMS_GLSL = /* glsl */ `
uniform vec3  uVoid;
uniform vec3  uAbyss;
uniform vec3  uDeep;
uniform float uFogDensity;
uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uPeach;
uniform float uOutside;
// O amanhecer (rodada 18): 0 à noite, 1 de manhã. Ver lib/theme.ts.
uniform float uDawn;
`;

export const FOG_GLSL = /* glsl */ `
float sceneHash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float sceneNoise(vec3 q) {
  // A rede é girada para fora dos eixos do mundo.
  //
  // Ruído de valor interpola numa rede de inteiros, e essa rede **aparece**
  // quando a superfície é um plano alinhado com ela — que é o caso de todas as
  // paredes deste duto. O resultado era um moiré retangular no fundo da câmara:
  // uma grade desenhada, que o PROJECT.md §2 veta pelo nome. Com a rede girada,
  // nenhuma parede fica paralela a ela e o padrão volta a ser pó.
  vec3 p = vec3(
    dot(q, vec3( 0.80, 0.36, -0.48)),
    dot(q, vec3(-0.42, 0.90,  0.12)),
    dot(q, vec3( 0.43, 0.24,  0.87))
  );
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = sceneHash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = sceneHash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = sceneHash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = sceneHash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = sceneHash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = sceneHash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = sceneHash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = sceneHash13(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

/**
 * A rampa perto da lente: --void a --abyss, e ela **satura cedo**, em ~14
 * unidades.
 *
 * Até a rodada 11 a rampa ia a --deep pela profundidade, até 88 unidades, e a
 * cor da névoa de uma superfície dependia só de quão longe ela estava. Olhando
 * pelo eixo do duto, as linhas de mesma profundidade nas paredes **são** as
 * seções da câmara: o fundo virava retângulos concêntricos, com o plano do céu
 * atrás da abertura, a ~110 unidades, como um retângulo chapado de --deep por
 * cima da palavra da Emergência (diagnosticado na rodada 12 escondendo uma
 * malha de cada vez). A terceira parada agora não é profundidade: é a luz da
 * fonte espalhada pela névoa, na direção dela — ver sourceHalo.
 */
vec3 fogRamp(float depth01) {
  return mix(uVoid, uAbyss, smoothstep(0.0, 0.16, depth01));
}

/**
 * A fonte a montante vista **através da névoa**: um brilho em volta da
 * direção dela, com ruído e sem borda — é a "luz distante" da Emergência, e é
 * o que a cor da névoa tem de --deep. Depende da direção do raio, não da
 * superfície que ele acerta: a parede do fundo, o céu atrás da abertura e a
 * garganta caem na mesma cor quando estão na mesma direção, e nenhuma aresta
 * de geometria vira aresta de cor.
 */
float sourceHalo(vec3 worldPos) {
  vec3 ray = normalize(worldPos - cameraPosition);
  vec3 toSource = normalize(vec3(0.0, ${APERTURE_Y.toFixed(3)}, ${LOUVER_Z.toFixed(3)}) - cameraPosition);
  float c = clamp(dot(ray, toSource), -1.0, 1.0);
  float angle = sqrt(max(2.0 * (1.0 - c), 0.0));
  float core = exp(-pow(angle / 0.12, 2.0));
  float wide = exp(-pow(angle / 0.42, 2.0));
  float n = sceneNoise(ray * 6.5 + vec3(0.0, 0.0, uTime * 0.03));
  n = n * 0.7 + sceneNoise(ray * 17.0) * 0.3;
  return (0.8 * core + 0.3 * wide) * (0.45 + 1.1 * n);
}

/**
 * Os bolsões ao longo do eixo — a névoa deixa de ser uma constante por quadro.
 *
 * Com a densidade vindo só do progresso, dois quadros distantes do mesmo beat
 * tinham a mesma densidade média, e isso era metade do motivo de tudo ler
 * chapado. Os bolsões são fixos na câmara (uma câmara real tem trechos em que o
 * ar para), e a câmera atravessa cada um: na garganta a névoa engrossa, na
 * clareira do corpo de prova ela afina, na boca do rio ela fecha de novo e
 * dentro do corredor alterna.
 *
 * Continua sendo névoa, não fumaça (DIRECTION.md §6): densidade escalar por
 * posição, sem campo de velocidade, sem advecção.
 */
float fogPocket(float z) {
  float p = 1.0;
  // A garganta engrossa **antes** de a câmera chegar nela, na Emergência — e
  // não entre a câmera e o título: em z −9 o bolsão ficava exatamente na linha
  // de visada da Identidade e escurecia a face das letras (medido na rodada 8:
  // a face caiu abaixo da névoa em volta).
  p += 0.55 * exp(-pow((z - 2.0) / 4.5, 2.0));
  p -= 0.28 * exp(-pow((z + 25.0) / 5.0, 2.0));
  p += 0.30 * exp(-pow((z + 47.0) / 3.5, 2.0));
  p -= 0.18 * exp(-pow((z + 60.0) / 5.0, 2.0));
  p += 0.20 * exp(-pow((z + 68.0) / 3.0, 2.0));
  p -= 0.30 * exp(-pow((z + 80.0) / 6.0, 2.0));
  return p;
}

/**
 * A cor da névoa num ponto: a rampa perto da lente, o halo da fonte pela
 * direção, e o calor da Superfície. Separada de applyFog na rodada 13 porque o
 * concreto a usa como **piso** (ver shadeConcrete, em shaders/chamber.ts).
 */
vec3 fogColorAt(float viewDepth, vec3 worldPos) {
  float depth01 = clamp(viewDepth / 88.0, 0.0, 1.0);

  vec3 fogColor = fogRamp(depth01);
  // A luz da fonte tinge a névoa **pela direção, não pela profundidade**. A
  // primeira versão pesava o halo por smoothstep(0.22, 0.75) da profundidade,
  // e isso recriou a aresta que ele existia para apagar: a parede do fundo, a
  // 88 unidades, pegava o halo cheio e as laterais, a 50–80, a metade — o
  // retângulo da seção voltava, mais fraco (apontado pelo Lucas em 0.12). Só o
  // que está muito perto da lente fica fora. Uma letra na frente do brilho
  // continua silhueta porque a névoa dela é menor que a do fundo, não porque a
  // cor da névoa muda.
  // De manhã a fonte é a claridade de fora: o halo clareia e esquenta, em vez
  // de puxar para --deep (rodada 18).
  vec3 haloColor = mix(uDeep, uVoid * 1.1 + uPeach * 0.05, uDawn);
  fogColor = mix(fogColor, haloColor, clamp(sourceHalo(worldPos) * smoothstep(0.02, 0.12, depth01), 0.0, 1.0));
  // **A Superfície: a névoa lê quente no topo** (DIRECTION.md §5). Não é uma
  // cor nova na rampa, é a luz de fora espalhada pela névoa perto da tomada de
  // ar: um volume de --peach em volta da abertura, amostrado no trecho do raio
  // que mais passa perto dela. Longe dela a névoa continua a mesma da descida.
  if (uOutside > 0.0) {
    vec3 mid = mix(cameraPosition, worldPos, 0.6);
    vec3 d = (mid - vec3(0.0, ${APERTURE_Y.toFixed(3)}, ${LOUVER_Z.toFixed(3)})) * vec3(0.16, 0.22, 0.13);
    float glow = exp(-dot(d, d));
    fogColor = mix(fogColor, uPeach * 0.07, clamp(uOutside * glow, 0.0, 1.0));
  }
  return fogColor;
}

vec3 applyFog(vec3 color, float viewDepth, vec3 worldPos) {
  // Duas oitavas: a grossa dá bolsões, a fina dá o pó. O tempo entra só na
  // grossa, e devagar — atmosfera respira, não escoa.
  float n = sceneNoise(worldPos * 0.055 + vec3(0.0, 0.0, uTime * 0.025));
  n = n * 0.72 + sceneNoise(worldPos * 0.21) * 0.28;

  // A densidade ao longo do raio, e não só no ponto: um bolsão entre a câmera e
  // a parede vela a parede, um bolsão atrás dela não. Três amostras no eixo z
  // do raio bastam para bolsões de quatro unidades de largura.
  float zc = cameraPosition.z;
  float pocket = (fogPocket(mix(zc, worldPos.z, 0.2)) + fogPocket(mix(zc, worldPos.z, 0.55))
    + fogPocket(worldPos.z)) / 3.0;

  // De manhã o ar é mais limpo (rodada 18): com a névoa da noite, sobre fundo
  // claro, tudo convergia para a mesma cor a vinte unidades.
  float density = uFogDensity * pocket * (0.55 + 0.9 * n) * mix(1.0, 0.55, uDawn);
  float amount = 1.0 - exp(-density * max(viewDepth, 0.0));
  // A rodada 12 saturava tudo além de 40–70 unidades para o céu atrás da
  // abertura não ler como retângulo. Isso apagava também todo corpo distante
  // do bando (medido na rodada 13: um quarto dos corpos no quadro do
  // descolamento). Saiu: céu e concreto têm a própria névoa como piso (ver
  // fogColorAt em shaders/chamber.ts), então não há o que saturar.
  vec3 fogColor = fogColorAt(viewDepth, worldPos);
  return mix(color, fogColor, clamp(amount, 0.0, 1.0));
}
`;
