/**
 * O rastro: o que a passagem da câmera e do ponteiro deixa no campo.
 *
 * Uma textura pequena que acompanha o ladrilho de relva guarda, em cada ponto
 * do chão, quanto a vegetação está deitada (RG, em XZ) e quanto está agitada
 * (B). A cada quadro ela relaxa de volta ao repouso e recebe dois carimbos, o
 * da câmera e o do ponteiro. Relva, plantas e esporos leem o mesmo campo.
 */

/** O lado do campo no mundo, em metros: o do ladrilho de relva. */
export const WAKE_SPAN = 72;
/** O lado da textura. Um texel ≈ 56 cm. */
export const WAKE_SIZE = 128;

/**
 * A leitura do rastro. `uWakeOrigin.xy` é o centro do campo em XZ e `.z` liga
 * ou desliga a leitura: com zero o campo não existe e nada muda de lugar.
 */
export const WAKE_GLSL = /* glsl */ `
uniform sampler2D uWake;
uniform vec3 uWakeOrigin;

vec3 wakeAt(vec2 xz) {
  vec2 uv = (xz - uWakeOrigin.xy) / ${WAKE_SPAN.toFixed(1)} + 0.5;
  vec2 inside = smoothstep(vec2(0.0), vec2(0.04), uv) * (1.0 - smoothstep(vec2(0.96), vec2(1.0), uv));
  return textureLod(uWake, uv, 0.0).rgb * inside.x * inside.y * uWakeOrigin.z;
}
`;

export const WAKE_FRAG = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uOrigin;
uniform vec2 uPrevOrigin;
uniform float uDelta;
// A câmera: xy = onde ela está em XZ, z = quanto ela toca o campo, 0 a 1.
uniform vec3 uEye;
uniform vec2 uEyeVelocity;
// O ponteiro: xy = o ponto do chão sob ele, z = se existe, 0 ou 1.
uniform vec3 uTouch;
uniform vec2 uTouchVelocity;

in vec2 vUv;
out vec4 fragColor;

// Quanto a vegetação deita, no máximo: a ponta anda isto por metro de altura.
const float BEND_MAX = 0.55;

vec2 stamp(vec2 world, vec2 at, vec2 velocity, float radius) {
  vec2 d = world - at;
  float fall = exp(-dot(d, d) / (radius * radius));
  float speed = length(velocity);
  if (speed < 1e-3) return vec2(0.0);
  // Deita no sentido do movimento e abre para os lados, como quem passa.
  vec2 along = velocity / speed;
  vec2 aside = d / max(length(d), 1e-3);
  return (along * 0.65 + aside * 0.5) * fall * min(speed, 9.0);
}

void main() {
  vec2 world = uOrigin + (vUv - 0.5) * ${WAKE_SPAN.toFixed(1)};

  // O campo anda com a câmera em passos de texel inteiro: reprojetar é copiar
  // o texel vizinho, sem borrar o que já estava escrito.
  vec2 prevUv = (world - uPrevOrigin) / ${WAKE_SPAN.toFixed(1)} + 0.5;
  vec3 field = vec3(0.0);
  if (prevUv.x > 0.0 && prevUv.x < 1.0 && prevUv.y > 0.0 && prevUv.y < 1.0) {
    field = texture(uPrev, prevUv).rgb;
  }

  // A haste volta em cerca de um segundo; a agitação demora mais a assentar.
  field.rg *= exp(-uDelta / 0.9);
  field.b *= exp(-uDelta / 2.5);

  vec2 push = stamp(world, uEye.xy, uEyeVelocity, 2.6) * uEye.z;
  push += stamp(world, uTouch.xy, uTouchVelocity, 1.7) * uTouch.z;
  field.rg += push * uDelta * 0.5;
  float bend = length(field.rg);
  if (bend > BEND_MAX) field.rg *= BEND_MAX / bend;
  field.b = min(1.0, field.b + length(push) * uDelta * 0.5);

  fragColor = vec4(field, 1.0);
}
`;
