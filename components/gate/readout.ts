/**
 * A leitura do portão — DIRECTION.md §4, "pré — Portão".
 *
 * "O contador não é porcentagem de carregamento: é uma leitura de velocidade
 * subindo, `00.0` → `14.6 M/S`, com a cota da câmara ao lado."
 *
 * O que ele conta continua sendo o carregamento real (ver
 * `lib/preload/manifest.ts`); o que ele **mostra** é a câmara chegando à
 * velocidade de ensaio. Duas leituras da mesma verdade, e a segunda é a que
 * pertence a este site: não existe barra, não existe porcentagem, existe um
 * túnel sendo levado ao regime.
 *
 * ### Três casas, e o desconforto é o ponto
 *
 * `14.6` é a leitura arredondada; a instrumentação tem uma casa a mais do que
 * o olho consegue acompanhar. A terceira casa é ilegível durante a subida —
 * ela borra —, e é justamente isso que faz o número parecer medido em vez de
 * animado. Um `87%` é uma promessa; `07.284 M/S` é um instrumento.
 *
 * O valor terminal é 14.617 e não 14.600 pelo mesmo motivo. Número redondo em
 * leitura de instrumento é a marca de que alguém digitou o número.
 *
 * ### Separador decimal
 *
 * Ponto nos dois idiomas. DIRECTION.md §2 já escolhe isso ao chamar o léxico
 * de "numérico por escolha: atravessa pt/en quase sem tradução", e escreve
 * `COTA +12.40` no próprio glossário. Um `Intl.NumberFormat` aqui trocaria a
 * leitura de instrumento por uma de planilha, e custaria uma formatação por
 * quadro.
 */

/** Velocidade de regime da câmara. DIRECTION.md §4: `00.0` → `14.6 M/S`. */
export const TERMINAL_VELOCITY = 14.617;

/**
 * A cota da soleira, onde se está antes de entrar. Negativa porque a descida
 * termina na superfície: o visitante começa fundo. O −38 vem do léxico do
 * DIRECTION.md §2 (`Z −38`).
 */
export const GATE_LEVEL = -38.402;

/** Casas decimais da instrumentação. Uma a mais do que se consegue ler. */
export const DECIMALS = 3;

/** U+2212, sinal de menos — não o hífen. É o que o léxico usa. */
const MINUS = "−";

/**
 * O convite, quando a câmara chega ao regime: um caractere só.
 *
 * A seta para baixo é a única coisa que o site pede que você faça — o
 * PROJECT.md §4 é uma descida vertical contínua, e o gesto é esse. Ela não
 * precisa da palavra "entrar" ao lado; a palavra existe como nome acessível
 * do botão, para quem lê por leitor de tela.
 */
export const ENTER_GLYPH = "↓";

/**
 * Largura fixa da leitura, em caracteres — `14.617` e `07.284` ocupam o mesmo
 * espaço. Com `tabular-nums` na mono isso mantém a linha parada enquanto o
 * número sobe; sem isso o bloco inteiro tremeria a cada décimo.
 */
export const VELOCITY_WIDTH = 2 + 1 + DECIMALS;

/** Progresso normalizado (0 a 1) → a leitura de velocidade. */
export function formatVelocity(progress: number): string {
  const value = progress * TERMINAL_VELOCITY;
  return value.toFixed(DECIMALS).padStart(VELOCITY_WIDTH, "0");
}

/** A cota não sobe: ela é onde a câmara está, e a câmara não saiu do lugar. */
export function formatLevel(): string {
  return `${MINUS}${Math.abs(GATE_LEVEL).toFixed(DECIMALS)}`;
}
