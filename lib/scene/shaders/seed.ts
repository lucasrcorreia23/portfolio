/**
 * O estado inicial do bando, calculado na GPU.
 *
 * Uma matriz na CPU seria 4096 × 8 floats subindo pelo barramento para dizer o
 * que uma linha de shader deriva de `gl_FragCoord`. E como o mesmo material
 * semeia as duas texturas — `uMode` escolhe qual —, posição e velocidade nascem
 * do mesmo hash e portanto concordam: o corpo que nasceu longe do eixo já nasce
 * com a deriva que o levaria para lá.
 *
 * Os corpos nascem espalhados pelo duto inteiro, não num plano só. Sem isso o
 * primeiro quadro teria toda a massa numa fatia e o bando levaria segundos
 * para parecer um bando — segundos que o portão pagaria.
 */
export const SEED_FRAG = /* glsl */ `
uniform vec2  uTexSize;
/** Meia-largura e meia-altura do tubo, no instante da semeadura. */
uniform vec2  uTube;
uniform float uCameraZ;
/** 0 = posição, 1 = velocidade. */
uniform float uMode;

out vec4 fragColor;

float seedHash(float n) {
  return fract(sin(n * 127.1 + 311.7) * 43758.5453);
}

void main() {
  float index = floor(gl_FragCoord.y) * uTexSize.x + floor(gl_FragCoord.x);

  float angle = seedHash(index) * 6.2831853;
  float radius = sqrt(seedHash(index + 91.0));

  if (uMode < 0.5) {
    vec3 pos = vec3(
      cos(angle) * radius * uTube.x,
      sin(angle) * radius * uTube.y,
      uCameraZ + 2.0 - seedHash(index + 17.0) * 66.0
    );
    // w = densidade local, que a simulação recalcula no primeiro passo.
    fragColor = vec4(pos, 0.0);
  } else {
    vec3 vel = vec3(
      (seedHash(index + 33.0) - 0.5) * 0.4,
      (seedHash(index + 57.0) - 0.5) * 0.4,
      0.5 + seedHash(index + 71.0) * 0.8
    );
    // w = energia. Zero: ninguém foi acelerado ainda, e o beat da Emergência
    // pede corpos "suspensos, quase sem deriva".
    fragColor = vec4(vel, 0.0);
  }
}
`;
