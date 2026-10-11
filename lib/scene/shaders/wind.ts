/**
 * O vento: um ar só para a relva, as plantas e os esporos.
 *
 * `windAt` é o que dobra uma haste; `windVelocity` é o mesmo ar como
 * velocidade, para o que voa nele. As duas leem as mesmas ondas e a mesma
 * rajada, então a rajada que deita a relva é a que carrega os esporos por cima
 * dela. Precisa do `sceneNoise` de `NOISE_GLSL` declarado antes.
 */
export const WIND_GLSL = /* glsl */ `
/**
 * Duas ondas que atravessam o campo e uma rajada lenta por cima.
 * Devolve o deslocamento em XZ da ponta de uma haste de um metro.
 */
vec2 windAt(vec3 worldPos, float time) {
  float a = sin(worldPos.x * 0.11 + worldPos.z * 0.07 + time * 0.9);
  float b = sin(worldPos.x * 0.31 - worldPos.z * 0.23 + time * 1.7);
  float gust = sceneNoise(vec3(worldPos.xz * 0.035, time * 0.12));
  return vec2(0.75, 0.4) * (a * 0.14 + b * 0.05) * (0.4 + 1.3 * gust);
}

/** A velocidade do ar num ponto, em metros por segundo. */
vec3 windVelocity(vec3 p, float time) {
  float a = sin(p.x * 0.11 + p.z * 0.07 + time * 0.9);
  float b = sin(p.x * 0.31 - p.z * 0.23 + time * 1.7);
  float gust = sceneNoise(vec3(p.xz * 0.035, time * 0.12));
  // A corrente: no sentido em que a relva deita, mais forte na rajada.
  vec2 stream = vec2(0.882, 0.471) * (0.16 + 0.7 * gust) * (1.0 + 0.6 * (a * 0.74 + b * 0.26));

  // Os redemoinhos: cada termo é o rotacional de uma onda (K × A · cos), que
  // não junta nem espalha o que carrega. É o que impede os esporos de se
  // amontoarem em faixas.
  vec3 swirl = cross(vec3(0.31, 0.12, -0.22), vec3(0.10, 0.50, 0.30)) * cos(dot(vec3(0.31, 0.12, -0.22), p) + time * 0.21);
  swirl += cross(vec3(-0.17, 0.26, 0.29), vec3(0.42, 0.08, -0.36)) * cos(dot(vec3(-0.17, 0.26, 0.29), p) - time * 0.17 + 1.9);
  swirl += cross(vec3(0.52, -0.21, 0.44), vec3(-0.18, 0.30, 0.22)) * cos(dot(vec3(0.52, -0.21, 0.44), p) + time * 0.33 + 4.1);
  swirl += cross(vec3(-0.71, 0.35, -0.58), vec3(0.14, 0.12, -0.16)) * cos(dot(vec3(-0.71, 0.35, -0.58), p) - time * 0.47 + 0.7);
  // Menos na vertical: o ar corre deitado sobre o campo.
  swirl.y *= 0.45;

  return vec3(stream.x, 0.0, stream.y) + swirl * (0.45 + 0.9 * gust);
}
`;
