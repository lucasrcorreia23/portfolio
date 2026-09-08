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
  vec3 color = uTeal;
  color = mix(color, uCyan, smoothstep(0.18, 0.85, vEnergy));
  color = mix(color, uRose, smoothstep(0.45, 1.0, vDensity) * 0.75);

  // Coral exige as três coisas ao mesmo tempo — estar a jusante da peça, estar
  // comprimido e estar sendo acelerado. É o produto que mantém a população em
  // coral abaixo dos ~10% que o DIRECTION.md §2 fixa, e por consequência
  // abaixo dos 15% de tela do PROJECT.md §3.1. Não é um teto arbitrado: é uma
  // condição que quase nunca se satisfaz.
  float wake = smoothstep(0.0, 9.0, vWorld.z - uSpecimenZ);
  float turbulence = wake * smoothstep(0.35, 0.95, vEnergy) * smoothstep(0.3, 0.9, vDensity);
  color = mix(color, uCoral, turbulence * 0.85);

  // A ponta do corpo é mais quente que a cauda: dá direção sem desenhar nada.
  float tip = smoothstep(-1.0, 1.0, vAlong);
  float energy = uGain * (0.35 + 0.65 * tip) * (0.55 + 0.85 * vEnergy);

  vec3 lit = color * energy;
  lit = applyFog(lit, vViewDepth, vWorld);
  lit = applyVeil(lit, gl_FragCoord.xy);

  fragColor = vec4(lit, 1.0);
}
`;
