/**
 * O campo de distância do corpo de prova — DIRECTION.md §5, "Uma fonte de
 * verdade só, e os dois finos".
 *
 * Quatro passadas de tela cheia, rodadas **uma vez** por assado (carregamento
 * da fonte, troca de idioma, troca de corpo por breakpoint), nunca por quadro:
 *
 *   máscara → semente → jump flood (11×) → enclausuramento → empacotamento
 *
 * A máscara não tem shader próprio: ela é o **mesh vivo com o material vivo**
 * renderizado numa câmera ortográfica no referencial local da peça. O troika
 * injeta `gl_FragColor.a *= edgeAlpha; if (edgeAlpha == 0.0) discard;` no fim
 * do fragmento, então o canal alfa do alvo já é a cobertura do glifo, com
 * antisserrilhado. É isso que cumpre "nunca a partir de uma rasterização
 * paralela da mesma string": não há segunda rasterização, há a mesma.
 *
 * Todas as passadas daqui são GLSL 3.00 — só a máscara é 1.00, e ela não mora
 * neste arquivo.
 */

/**
 * Semente do jump flood, com posição **sub-texel** da fronteira.
 *
 * O envelope de raspagem do DIRECTION.md §5 é `d = 0.015·H`, o que na
 * resolução amarrada à caixa alta são ~1.7 texels. Semear no centro do texel
 * daria ±0.5 texel de erro, ou seja quase 30% do envelope — os corpos
 * raspariam a letra a uma distância que o assado inventou.
 *
 * Então cada texel de fronteira guarda onde a cobertura cruza 0.5, não onde
 * ele está: com `a` a cobertura e `∇a` o gradiente dela (que aponta para
 * dentro da tinta), a fronteira fica a `(0.5 − a)/|∇a|` texels do centro na
 * direção de `∇a`. Quatro amostras, e o erro cai para ~0.1 texel.
 */
export const FIELD_SEED_FRAG = /* glsl */ `
uniform sampler2D uMask;
uniform vec2 uTexel;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float a  = texture(uMask, vUv).a;
  float aL = texture(uMask, vUv - vec2(uTexel.x, 0.0)).a;
  float aR = texture(uMask, vUv + vec2(uTexel.x, 0.0)).a;
  float aD = texture(uMask, vUv - vec2(0.0, uTexel.y)).a;
  float aU = texture(uMask, vUv + vec2(0.0, uTexel.y)).a;

  float here = step(0.5, a);
  float neighbours = step(0.5, aL) + step(0.5, aR) + step(0.5, aD) + step(0.5, aU);

  // Dentro da tinta com algum vizinho fora, ou fora com algum vizinho dentro.
  bool boundary = here > 0.5 ? neighbours < 3.5 : neighbours > 0.5;
  if (!boundary) {
    fragColor = vec4(0.0);
    return;
  }

  vec2  grad = vec2(aR - aL, aU - aD) * 0.5;
  float glen = length(grad);
  vec2  seed = vUv;
  if (glen > 1e-5) {
    // Clampado em ±1.5 texel: numa quina o gradiente central subestima a
    // inclinação e a extrapolação sairia do próprio texel.
    seed += (grad / glen) * clamp((0.5 - a) / glen, -1.5, 1.5) * uTexel;
  }

  fragColor = vec4(seed, 1.0, 0.0);
}
`;

/**
 * Um passo do jump flood: nove amostras num raio que cai pela metade a cada
 * passada. Guarda a **posição da semente**, não a distância — a distância sai
 * dela no empacotamento, e o gradiente também, exato, sem diferença finita.
 *
 * A distância é medida em unidades de mundo (`uRect` converte de uv), e não em
 * texels, porque os texels são quadrados por construção mas o retângulo não é
 * — comparar em uv elegeria a semente errada nas diagonais.
 */
export const FIELD_JFA_FRAG = /* glsl */ `
uniform sampler2D uJfa;
uniform vec2  uTexel;
uniform vec2  uRect;
uniform float uStep;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4  best  = texture(uJfa, vUv);
  float bestD = best.z > 0.5 ? length((vUv - best.xy) * uRect) : 1e9;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 at = vUv + vec2(float(i), float(j)) * uStep * uTexel;
      if (at.x < 0.0 || at.x > 1.0 || at.y < 0.0 || at.y > 1.0) continue;

      vec4 candidate = texture(uJfa, at);
      if (candidate.z < 0.5) continue;

      float d = length((vUv - candidate.xy) * uRect);
      if (d < bestD) {
        bestD = d;
        best = candidate;
      }
    }
  }

  fragColor = best;
}
`;

/**
 * Enclausuramento: a fração de direções que esbarram em tinta.
 *
 * É o que separa **contra-forma** de **aresta de ataque**, e sem ele os dois
 * seriam a mesma coisa para o escoamento — "perto da silhueta, do lado de
 * fora". Mas a aresta é onde o bando precisa chegar *ordenado*, e a
 * contra-forma é onde ele precisa perder a ordem. Um gatilho que não os
 * distinga acende turbulência na borda de cima das letras, que é exatamente o
 * quadro que o DIRECTION.md §1 descreve como laminar.
 *
 * Não é conectividade de verdade — isso seria rotulagem de componentes, que a
 * GPU faz mal. É uma ordenação, e ela basta porque o consumo passa por um
 * `smoothstep` alto no empacotamento: contra-forma ~1.0, vão entre letras
 * ~0.55, borda externa ~0.35, longe ~0.15.
 *
 * Alcance longo de propósito. Com raio curto, o vão entre duas letras e a
 * borda de cima medem a mesma coisa (meio-plano bloqueado); é a partir de ~2·H
 * que a diferença aparece.
 */
export const FIELD_ENCLOSURE_FRAG = /* glsl */ `
uniform sampler2D uMask;
uniform vec2  uRect;
uniform float uReach;

in vec2 vUv;
out vec4 fragColor;

const int RAYS = 16;
const int STEPS = 40;

void main() {
  if (texture(uMask, vUv).a >= 0.5) {
    fragColor = vec4(0.0);
    return;
  }

  float blocked = 0.0;

  for (int r = 0; r < RAYS; r++) {
    float angle = (float(r) + 0.5) * 6.2831853 / float(RAYS);
    vec2 direction = vec2(cos(angle), sin(angle));

    for (int s = 1; s <= STEPS; s++) {
      vec2 at = vUv + direction * (uReach * float(s) / float(STEPS)) / uRect;
      if (at.x < 0.0 || at.x > 1.0 || at.y < 0.0 || at.y > 1.0) break;
      if (texture(uMask, at).a >= 0.5) {
        blocked += 1.0;
        break;
      }
    }
  }

  fragColor = vec4(blocked / float(RAYS), 0.0, 0.0, 1.0);
}
`;

/**
 * Empacotamento no texel que o escoamento lê.
 *
 *   .xy  direção unitária para **fora** da tinta, no plano local
 *   .z   distância com sinal, em unidades de caixa alta (negativa dentro)
 *   .w   enclausuramento já modelado, 0 a 1
 *
 * A distância sai em unidades de `H` e não de mundo porque todos os números do
 * DIRECTION.md §5 são frações de `H` (`0.015·H` de raspagem, `0.02·H` de
 * sólido, `0.05·H` de queda). Guardar em `H` faz o shader do bando comparar
 * contra as constantes do documento sem conversão no meio.
 */
export const FIELD_PACK_FRAG = /* glsl */ `
uniform sampler2D uMask;
uniform sampler2D uJfa;
uniform sampler2D uEnclosure;
uniform vec2  uTexel;
uniform vec2  uRect;
uniform float uCapHeight;
uniform vec2  uEncShape;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float a = texture(uMask, vUv).a;
  // Não chamar de "sign": o nome é uma função embutida do GLSL, e sombreá-la
  // compila mas confunde a próxima leitura.
  float insideSign = mix(1.0, -1.0, step(0.5, a));

  vec4  seed  = texture(uJfa, vUv);
  vec2  delta = (vUv - seed.xy) * uRect;
  float dist  = length(delta);

  // Longe da fronteira o vetor até a semente é a direção; **em cima** dela ele
  // degenera, e aí o gradiente da cobertura é o único que ainda sabe para que
  // lado é fora.
  vec2 outward;
  if (seed.z > 0.5 && dist > 1e-4) {
    outward = normalize(delta) * insideSign;
  } else {
    float aL = texture(uMask, vUv - vec2(uTexel.x, 0.0)).a;
    float aR = texture(uMask, vUv + vec2(uTexel.x, 0.0)).a;
    float aD = texture(uMask, vUv - vec2(0.0, uTexel.y)).a;
    float aU = texture(uMask, vUv + vec2(0.0, uTexel.y)).a;
    vec2 grad = vec2(aR - aL, aU - aD);
    outward = length(grad) > 1e-5 ? -normalize(grad) : vec2(0.0, 1.0);
  }

  // Sem semente alcançada (não acontece depois de 11 passadas, mas o campo não
  // pode devolver zero disfarçado de "está na letra"): joga a distância para
  // fora de qualquer envelope.
  float signedDistance = seed.z > 0.5 ? dist * insideSign : 4.0 * uCapHeight;

  float raw = texture(uEnclosure, vUv).r;
  float enclosure = smoothstep(uEncShape.x, uEncShape.y, raw);

  fragColor = vec4(outward, signedDistance / uCapHeight, enclosure);
}
`;
