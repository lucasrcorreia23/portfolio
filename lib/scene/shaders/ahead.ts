import { SPECIMEN_HALF_WIDTH } from "../world";

/**
 * Quantos corpos estão **diante da face** do corpo de prova, em colunas ao
 * longo da largura dela — contado na GPU, lido na GPU.
 *
 * O rim da peça era aceso pela energia de quatro aglomerados do proxy da CPU
 * (`densityAt`), e isso falhava duas vezes: energia não é densidade (o proxy
 * a calcula como massa × velocidade), e quatro aglomerados não dizem **qual
 * letra** tem o bando na frente. Medido na folha do descolamento: a palavra
 * inteira mais escura que a névoa atrás dela, nos doze quadros.
 *
 * Aqui cada coluna é um texel, e cada texel percorre o bando inteiro contando
 * quem está na laje entre a peça e a câmera, dentro da altura das letras. São
 * 16 mil leituras por texel e ~32 texels: meio milhão de leituras de textura
 * por quadro, que a GPU faz sem perceber — e **nada volta para a CPU**
 * (DIRECTION.md §5): o material da peça amostra este alvo direto.
 *
 * O peso cai com a distância à face: um corpo encostado na letra acende mais
 * que um a quatro unidades dela.
 */
export const AHEAD_COLUMNS = 32;
/** A faixa em x que as colunas cobrem, com folga para as pontas das letras. */
export const AHEAD_HALF_WIDTH = SPECIMEN_HALF_WIDTH + 0.8;

/**
 * **Em dois estágios, e isto é custo medido, não gosto.** A primeira versão
 * tinha 32 fragmentos, cada um lendo o bando inteiro em série: a GPU não tinha
 * paralelismo para esconder a latência de 16 mil leituras, e o quadro foi de
 * 1.9 para 8.6 ms no M5. Agora o primeiro estágio tem uma linha por fragmento
 * (32 colunas × uma linha da textura do bando cada), e o segundo soma as
 * linhas: mesma conta, quatro mil fragmentos em vez de trinta e dois.
 */
export const AHEAD_ROWS_FRAG = /* glsl */ `
uniform sampler2D uPos;
uniform vec2  uTexSize;
uniform float uSpecimenZ;
uniform float uHalfWidth;
uniform float uHalfHeight;
uniform float uDepth;

out vec4 fragColor;

void main() {
  float columns = ${AHEAD_COLUMNS.toFixed(1)};
  float x0 = -uHalfWidth + (gl_FragCoord.x - 0.5) / columns * 2.0 * uHalfWidth;
  float x1 = x0 + 2.0 * uHalfWidth / columns;
  int row = int(gl_FragCoord.y);
  int size = int(uTexSize.x);
  float sum = 0.0;
  for (int i = 0; i < 128; i++) {
    if (i >= size) break;
    vec3 p = texelFetch(uPos, ivec2(i, row), 0).xyz;
    float dz = p.z - uSpecimenZ;
    if (dz < 0.05 || dz > uDepth) continue;
    if (p.x < x0 || p.x >= x1) continue;
    if (abs(p.y) > uHalfHeight) continue;
    sum += 1.0 - dz / uDepth;
  }
  fragColor = vec4(sum, 0.0, 0.0, 1.0);
}
`;

export const AHEAD_SUM_FRAG = /* glsl */ `
uniform sampler2D uRows;
uniform float uRowCount;

out vec4 fragColor;

void main() {
  int column = int(gl_FragCoord.x);
  int rows = int(uRowCount);
  float sum = 0.0;
  for (int j = 0; j < 128; j++) {
    if (j >= rows) break;
    sum += texelFetch(uRows, ivec2(column, j), 0).r;
  }
  fragColor = vec4(sum, 0.0, 0.0, 1.0);
}
`;
