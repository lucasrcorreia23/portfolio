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
 * **O véu vive aqui, e não no DOM.** O DIRECTION.md §5 é explícito: o
 * mecanismo de legibilidade é um termo aditivo de densidade ancorado à caixa
 * do texto projetada na cena, não um scrim por cima do canvas. O DOM nunca
 * ganha `background`, `scrim` nem `text-shadow` para compensar — se ganhasse,
 * a guarda ficaria numa camada acima da névoa e o grão de pós não encostaria
 * nela, que foi exatamente o defeito que tirou as lâminas do portão do DOM.
 */
export const FOG_UNIFORMS_GLSL = /* glsl */ `
uniform vec3  uVoid;
uniform vec3  uAbyss;
uniform vec3  uDeep;
uniform float uFogDensity;
uniform float uTime;
uniform vec2  uResolution;
// xy = canto mínimo, zw = canto máximo, em UV de tela (0..1, origem embaixo).
uniform vec4  uVeilBox[2];
// A densidade resolvida por quadro para cada caixa, já clampada em [0.15,0.85].
uniform float uVeilF[2];
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

vec3 applyFog(vec3 color, float viewDepth, vec3 worldPos) {
  // Duas oitavas: a grossa dá bolsões, a fina dá o pó. O tempo entra só na
  // grossa, e devagar — atmosfera respira, não escoa.
  float n = sceneNoise(worldPos * 0.055 + vec3(0.0, 0.0, uTime * 0.025));
  n = n * 0.72 + sceneNoise(worldPos * 0.21) * 0.28;

  float density = uFogDensity * (0.55 + 0.9 * n);
  float amount = 1.0 - exp(-density * max(viewDepth, 0.0));
  float depth01 = clamp(viewDepth / 88.0, 0.0, 1.0);

  return mix(color, fogRamp(depth01), clamp(amount, 0.0, 1.0));
}

/** Distância até a caixa, em UV de tela. Zero dentro dela. */
float veilDistance(vec4 box, vec2 uv) {
  vec2 d = max(box.xy - uv, uv - box.zw);
  return length(max(d, vec2(0.0)));
}

float veilAmount(vec2 uv) {
  float total = 0.0;
  for (int i = 0; i < 2; i++) {
    float f = uVeilF[i];
    if (f <= 0.0) continue;
    // Queda suave, e larga: uma borda dura leria como caixa escura acendendo,
    // e o que ela precisa parecer é um banco de névoa passando.
    float fall = 1.0 - smoothstep(0.0, 0.16, veilDistance(uVeilBox[i], uv));
    total = max(total, f * fall);
  }
  return total;
}

/* O termo aditivo. Um mix em direção à cor da névoa, em luz linear — que é a
   conta que o DIRECTION.md §5 resolve para achar f. */
vec3 applyVeil(vec3 color, vec2 fragCoord) {
  return mix(color, uVoid, veilAmount(fragCoord / uResolution));
}
`;
