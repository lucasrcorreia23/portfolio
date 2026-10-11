/**
 * Os cases que pedem senha: o slug e o SHA-256 da senha. Só o servidor
 * importa este arquivo (o proxy, a rota da chave, o sitemap e a página do
 * case); o cliente recebe apenas "tem senha ou não".
 *
 * O resumo é o que o cookie guarda e o que o proxy confere. Para trocar a
 * senha: `node -e 'console.log(require("crypto").createHash("sha256").update("<senha>").digest("hex"))'`.
 */
const CASE_KEYS: Readonly<Record<string, string>> = {
  perfecting: "a1ea9c46b00220c0819b0862e7e0b04930f45923a1f82b6a6e3dfac65128aef4",
};

/** O resumo da senha do case, ou `undefined` se ele é aberto. */
export function caseKey(slug: string): string | undefined {
  return Object.hasOwn(CASE_KEYS, slug) ? CASE_KEYS[slug] : undefined;
}

export function isLocked(slug: string): boolean {
  return caseKey(slug) !== undefined;
}
