import { MAX_CARDS } from "../cards";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "./fog";

/**
 * Os corpos do bando — DIRECTION.md §5, "Corpos".
 *
 * Corpo lenticular de poucos triângulos, sem asa animada, sem silhueta
 * ornitológica. A orientação segue a velocidade e o brilho segue a aceleração.
 *
 * **Opacos, com escrita de profundidade.** É o ponto que decide o beat inteiro.
 * O caminho intuitivo para um corpo emissivo é `AdditiveBlending`, e ele é uma
 * armadilha: o three só honra uma equação de blend quando `transparent` é
 * `true`, e material transparente sai da lista opaca e passa a ser ordenado por
 * objeto, com `depthWrite: false` na prática. Um `InstancedBufferGeometry`
 * inteiro tem um centroide só — ou seja, ou o bando todo fica na frente das
 * letras, ou o bando todo fica atrás. **Nenhum corpo poderia estar dos dois
 * lados**, que é exatamente o critério de aceite deste prompt, e nenhum ajuste
 * de `renderOrder` conserta: a divisão opaco/transparente acontece antes de
 * qualquer ordenação.
 *
 * O brilho vem de outro lugar: a cor sai em HDR linear (2 a 4×) num alvo de
 * meio-float, e o bloom pega o que passa de 1.0. É o que o DIRECTION.md §5
 * quer dizer com "bloom apertado e com threshold alto" — bloom é o transbordo,
 * não o efeito.
 */
export const BODY_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uBodyScale;
uniform float uForming;

in vec2 aRef;

out vec3  vWorld;
out float vViewDepth;
out float vEnergy;
out float vDensity;
out float vAlong;

void main() {
  vec4 P = texture(uPos, aRef);
  vec4 V = texture(uVel, aRef);

  vec3 center = P.xyz;
  vDensity = P.w;
  vEnergy  = V.w;

  // Base ortonormal a partir **só** da velocidade — nunca da câmera.
  //
  // A versão anterior orientava a lasca de frente para a câmera, como um
  // billboard, e isso é uma armadilha exata para esta cena: o bando vem *na
  // direção* da câmera, então forward e a direção da vista ficam paralelos, o
  // cross entre os dois degenera, e o plano da lasca passa a conter a
  // direção do olhar. Área projetada zero. Quatro mil corpos desenhados e nem
  // um fragmento rasterizado — a mesma armadilha dos 90° que o DIRECTION.md §5
  // descreve para o corpo de prova, aqui nos corpos.
  //
  // Um corpo lenticular não tem esse problema porque é volume, não plano. A
  // referência para o eixo lateral é o mundo, e só cai para outro eixo quando o
  // voo é exatamente vertical.
  vec3 forward = normalize(V.xyz + vec3(0.0, 1e-4, 1e-4));
  vec3 reference = abs(forward.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(reference, forward));
  vec3 up    = cross(forward, right);

  // Corpos mais rápidos esticam um pouco — é o mesmo que o olho lê como
  // velocidade num rastro curto, sem virar borrão de movimento.
  // Sorteio estável: o mesmo corpo é escolhido em todo quadro, então a
  // população cresce sem ninguém piscar. Três por cento no escuro absoluto,
  // todos com o bando formado.
  float lot = fract(sin(dot(aRef, vec2(12.9898, 78.233))) * 43758.5453);
  // A rampa é cúbica, não linear: na Emergência "uns poucos corpos isolados"
  // são poucos de verdade — a 0.05 de progresso entram ~7% da população, não
  // um terço dela.
  float admit = step(lot, 0.02 + 0.98 * pow(uForming, 2.5));

  // Corpos quase encostados na lente viram lascas do tamanho da tela. Encolhem
  // nos últimos três metros: o bando passa pela câmera, não por cima dela.
  float lensGuard = smoothstep(0.0, 3.0, distance(cameraPosition, center));

  float stretch = 1.0 + vEnergy * 0.6;
  vec3 local = right * position.x + up * position.y + forward * position.z * stretch;
  vec3 world = center + local * uBodyScale * admit * lensGuard;

  vAlong = position.z;
  vWorld = world;

  vec4 view = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const BODY_FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}

uniform vec3  uTeal;
uniform vec3  uCyan;
uniform vec3  uRose;
uniform vec3  uCoral;
uniform float uSpecimenZ;
uniform float uGain;
uniform vec4  uCards[${MAX_CARDS}];
uniform float uCardCount;
uniform float uCardAmount;

/**
 * Quão perto o corpo está da **aresta de ataque** de uma peça montada: a laje a
 * montante do corpo de prova, ou a caixa a montante de um card.
 *
 * É o que o rosa passou a exigir junto com a densidade. Com a densidade
 * sozinha, todo aglomerado denso virava rosa — o poleiro de Quem sou e o bando
 * cruzando o rio pintavam o quadro de rosa de borda a borda (medido: 0.815 na
 * folha do rio). O DIRECTION.md §2 diz "rose só onde o bando comprime", e o
 * bando comprime **contra alguma coisa**.
 */
float nearLeadingEdge(vec3 p) {
  float dz = p.z - uSpecimenZ;
  float specimen = smoothstep(-5.0, -1.5, dz) * (1.0 - smoothstep(0.2, 0.8, dz))
    * (1.0 - smoothstep(8.0, 9.5, abs(p.x))) * (1.0 - smoothstep(1.6, 2.6, abs(p.y)));
  float cards = 0.0;
  for (int i = 0; i < ${MAX_CARDS}; i++) {
    if (float(i) >= uCardCount || uCardAmount <= 0.0) break;
    vec3 c = uCards[i].xyz;
    float cz = p.z - c.z;
    float near = smoothstep(-3.2, -0.8, cz) * (1.0 - smoothstep(0.1, 0.6, cz))
      * (1.0 - smoothstep(2.2, 3.2, abs(p.x - c.x))) * (1.0 - smoothstep(1.4, 2.2, abs(p.y - c.y)));
    cards = max(cards, near * uCardAmount);
  }
  return max(specimen, cards);
}

in vec3  vWorld;
in float vViewDepth;
in float vEnergy;
in float vDensity;
in float vAlong;

out vec4 fragColor;

${FOG_GLSL}

void main() {
  // A rampa do DIRECTION.md §5, nesta ordem: teal em cruzeiro, cyan em
  // aceleração, rose em compressão de densidade, coral só na turbulência da
  // esteira.
  //
  // ## Os limiares saem da distribuição medida, e antes não saíam
  //
  // vDensity é a contagem de vizinhos dentro de 3 unidades **dividida por 24
  // amostras**, e o bando é rarefeito: um corpo tem em média meia dúzia de
  // vizinhos entre 16 mil, então o canal vive perto de zero. Medido na cena, em
  // 16.384 corpos: mediana 0.033, p90 0.073, p99 0.111, **máximo 0.170**.
  //
  // Os limiares antigos pediam smoothstep(0.45, 1.0) para o rose e
  // smoothstep(0.30, 0.90) para o coral — ou seja, começavam **acima do
  // máximo que o canal consegue produzir**. Duas das quatro cores da rampa do
  // §5 eram inalcançáveis por construção, e a guarda de coral marcava 0.00% não
  // porque a cena estava dentro do teto, mas porque a cor não existia. Uma
  // guarda que só sabe dizer "pouco demais" e "de menos" com o mesmo número não
  // é guarda.
  // vEnergy, medido em 140 mil amostras depois do decaimento assimétrico:
  // mediana 0.139, p75 0.180, p90 0.243, p99 0.728, máximo 1.000. A rampa do
  // cyan começa em 0.18 — um quarto da população entra nela — e satura em 0.85,
  // que só o topo de ~1% alcança. Cauda longa de calor leve, poucos corpos
  // francamente cyan: é o "cyan em aceleração" do §5 e não um bando cyan.
  vec3 color = uTeal;
  color = mix(color, uCyan, smoothstep(0.18, 0.85, vEnergy));
  color = mix(color, uRose, smoothstep(0.07, 0.13, vDensity) * 0.75 * nearLeadingEdge(vWorld));

  // Coral: **a jusante e quente**, e só isso.
  //
  // A versão anterior também exigia densidade alta, e isso era uma contradição
  // interna: a esteira é justamente onde a densidade **cai** — é o buraco que as
  // letras deixam. Pedir compressão dentro do buraco é pedir as duas coisas ao
  // mesmo tempo. O DIRECTION.md §5 separa os dois casos de propósito: "rose em
  // compressão de densidade, coral só na turbulência da esteira".
  //
  // A janela da esteira sobe em uma largura de letra e morre em sete. Antes
  // subia em nove unidades — quatro larguras —, e a essa altura qualquer corpo
  // já tinha esfriado, mesmo com o decaimento lento.
  //
  // vEnergy **dentro desta janela**, medido: mediana 0.194, p75 0.281, p90
  // 0.429, p99 0.722, máximo 0.971. O limiar de 0.30 pega 21.9% dos corpos da
  // esteira e a saturação em 0.75 é alcançada por 0.74% deles. Os dois números
  // caem dentro da faixa com folga dos dois lados — que é o que o PROJECT.md §7
  // passou a exigir de todo limiar depois deste arquivo.
  float downstream = vWorld.z - uSpecimenZ;
  float wake = smoothstep(0.0, 2.2, downstream) * (1.0 - smoothstep(2.2, 16.0, downstream));
  float turbulence = wake * smoothstep(0.30, 0.75, vEnergy);
  color = mix(color, uCoral, turbulence * 0.85);

  // A ponta do corpo é mais quente que a cauda: dá direção sem desenhar nada.
  float tip = smoothstep(-1.0, 1.0, vAlong);
  // **O brilho segue também a densidade**, e é daí que sai a onda. Um corpo
  // isolado é uma lasca apagada; uma lâmina densa é uma faixa clara — e uma
  // faixa clara correndo pelo bando é a "sombra atravessando trigo" do
  // DIRECTION.md §2, legível de longe, onde nenhum corpo individual é. A faixa
  // sai da distribuição medida de vDensity (mediana 0.033, p90 0.073): a
  // mediana fica em ~0.6, o p90 em ~1.6.
  float crowd = 0.5 + 1.25 * smoothstep(0.02, 0.10, vDensity);
  float energy = uGain * (0.35 + 0.65 * tip) * (0.55 + 0.85 * vEnergy) * crowd;

  vec3 lit = color * energy;
  lit = applyFog(lit, vViewDepth, vWorld);

  fragColor = vec4(lit, 1.0);
}
`;
