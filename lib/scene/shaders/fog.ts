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
export const FOG_UNIFORMS_GLSL = /* glsl */ `
uniform vec3  uVoid;
uniform vec3  uAbyss;
uniform vec3  uDeep;
uniform float uFogDensity;
uniform float uTime;
uniform vec2  uResolution;
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

/** A rampa de três paradas. Depois de 0.85 da descida ela migra para --peach,
    mas esse beat ainda não existe e o termo não está aqui. */
vec3 fogRamp(float depth01) {
  vec3 c = mix(uVoid, uAbyss, smoothstep(0.0, 0.42, depth01));
  return mix(c, uDeep, smoothstep(0.42, 1.0, depth01));
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

  float density = uFogDensity * pocket * (0.55 + 0.9 * n);
  float amount = 1.0 - exp(-density * max(viewDepth, 0.0));
  float depth01 = clamp(viewDepth / 88.0, 0.0, 1.0);

  return mix(color, fogRamp(depth01), clamp(amount, 0.0, 1.0));
}
`;
