// @ts-check

/**
 * A sombra e o contorno das telas sobrepostas, nas placas
 * (`derive-placas.mjs`) e nas montagens da vitrine (`derive-vitrine.mjs`).
 * Duas sombras finas em vez de um halo: uma de contato, que assenta a borda
 * na tela de baixo, e uma de ambiente, curta e clara. O contorno de 1 px faz
 * a borda se ler no fundo escuro sem precisar de sombra forte.
 */

/** A folga em volta da tela no SVG da sombra, em px. */
const PAD = 48;
const CONTACT = { blur: 2, y: 1, opacity: 0.22 };
const AMBIENT = { blur: 24, y: 10, opacity: 0.18 };
const EDGE = { width: 1, opacity: 0.08 };

/** @param {number} width @param {number} height @param {number} radius */
export function roundedMask(width, height, radius) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  );
}

/**
 * A sombra de uma tela, para pôr `pad` px acima e à esquerda dela.
 * @param {number} width @param {number} height @param {number} radius
 */
export function shadowOf(width, height, radius) {
  /** @param {typeof CONTACT} spec @param {string} id */
  const layer = ({ blur, y, opacity }, id) =>
    `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>
    <rect x="${PAD}" y="${PAD + y}" width="${width}" height="${height}" rx="${radius}"
      fill="#000" opacity="${opacity}" filter="url(#${id})"/>`;
  const svg = `<svg width="${width + PAD * 2}" height="${height + PAD * 2}">
    ${layer(AMBIENT, "a")}
    ${layer(CONTACT, "c")}</svg>`;
  return { input: Buffer.from(svg), pad: PAD };
}

/**
 * O contorno claro de uma tela, para pôr em cima dela, no mesmo lugar.
 * @param {number} width @param {number} height @param {number} radius
 */
export function edgeOf(width, height, radius) {
  const inset = EDGE.width / 2;
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="${inset}" y="${inset}" width="${width - EDGE.width}" height="${height - EDGE.width}"
      rx="${Math.max(radius - inset, 0)}" fill="none" stroke="#fff" stroke-opacity="${EDGE.opacity}" stroke-width="${EDGE.width}"/></svg>`,
  );
}
