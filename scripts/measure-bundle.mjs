#!/usr/bin/env node
// @ts-check
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A medição do orçamento de JavaScript — PROJECT.md §5, e AGENTS.md,
 * "Orçamento de JS" e "Como medir, e como eu errei".
 *
 * Duas caixas, cada uma com seu teto:
 *
 *   rota inicial   200 kB gz   tudo no caminho crítico até o primeiro quadro
 *   chunk da cena  350 kB gz   three, R3F, compositor, shaders
 *
 * ## Por que este arquivo existe
 *
 * O AGENTS.md descreve o procedimento e prescreve três precauções, e a mais
 * importante delas é sobre um erro que já produziu números falsos aqui: medir
 * contra um **servidor antigo ainda no ar** enquanto o `.next` já foi
 * reconstruído. O HTML servido cita chunks com hash velho, o laço de medição
 * pula em silêncio os arquivos que não existem mais, e o total encolhe a cada
 * rebuild.
 *
 * A saída daqui é mais forte do que matar o servidor pela porta: **não há
 * servidor**. O HTML lido é o prerender que **esta** build escreveu em
 * `.next/server/app/*.html`, e os chunks citados nele são resolvidos no disco
 * da mesma build. Um chunk citado e ausente não vale zero — ele **derruba a
 * medição com erro**, que é a terceira precaução do AGENTS.md escrita como
 * código em vez de como lembrete.
 *
 * A outra metade da medição não está no HTML e nunca esteve: os dois chunks
 * dinâmicos (a cena e o driver de scroll) só são pedidos por `import()`, então
 * eles são achados **por conteúdo** — a cena pelos símbolos do three e do
 * troika, o driver pelos do lenis e do ScrollTrigger. É a mesma regra do
 * AGENTS.md: os dois são separados por conteúdo, não por momento, porque o
 * preloader do portão pede a cena antes do clique e dividir por "o que chegou
 * depois de entrar" mede zero.
 *
 * Uso: `npm run build && npm run measure`
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT = join(ROOT, ".next");
const STATIC = join(NEXT, "static");

/** Os tetos do PROJECT.md §5, em kB comprimidos. */
const BUDGET_ROUTE = 200;
const BUDGET_SCENE = 350;

/** As rotas medidas, e o que cada uma representa. */
const ROUTES = [
  { file: "en.html", label: "/ (en) — a descida, com portão e HUD" },
  { file: "pt.html", label: "/pt — idem, em português" },
  {
    file: "en/work/decision-suite.html",
    // Ela **tem** cena desde a travessia contínua: o `SceneGate` subiu para o
    // layout do grupo `(scene)`, que cobre a home e o case, para o canvas não
    // remontar entre os dois. O que continua fora do caminho crítico é o chunk
    // dela, que é `import()` memoizado — e é justamente isso que esta linha
    // confere. O acervo (`/work`) continua sem cena, e por isso fica no grupo
    // `(archive)`.
    label: "/work/[slug] — case, sem portão, com a cena em chunk dinâmico",
  },
];

// `/work` não entra nesta lista, e não é esquecimento: ele lê `searchParams`,
// então é renderizado sob demanda e não existe HTML pré-renderizado no disco
// para ler. Medi-lo exigiria levantar um servidor — que é exatamente o que este
// script existe para não fazer (ver o cabeçalho). O que ele carrega é um
// subconjunto do que o case carrega, menos a cena, então o case é o teto dos
// dois.

/**
 * Assinaturas de conteúdo dos dois chunks dinâmicos.
 *
 * Símbolos, não nomes de arquivo: o hash do chunk muda a cada build, e um
 * padrão de nome seria a mesma fragilidade que a medição contra servidor
 * antigo. `WebGLRenderer` e `troika` só existem no chunk da cena; `ScrollTrigger`
 * e `lenis` só no do driver.
 */
const DYNAMIC = [
  {
    id: "chunk da cena",
    budget: BUDGET_SCENE,
    // Rodada 17: o troika saiu da cena (o corpo de prova é o monograma
    // extrudado). O segundo marcador passou a ser um nome do próprio GLSL da
    // cena, que só existe nesse chunk.
    markers: ["WebGLRenderer", "shadeConcrete"],
  },
  {
    id: "chunk do driver de scroll",
    budget: null,
    markers: ["ScrollTrigger", "lenis"],
  },
];

const gz = (buffer) => gzipSync(buffer, { level: 9 }).length;
const kb = (bytes) => bytes / 1024;
const fmt = (bytes) => `${kb(bytes).toFixed(1)} kB`;

/** Todo arquivo `.js` sob `.next/static`, com caminho absoluto. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.name.endsWith(".js")) out.push(path);
  }
  return out;
}

/**
 * Resolve o `src` de uma tag para um caminho no disco desta build.
 *
 * Só `/_next/...` interessa: um `src` externo não é orçamento desta build, e um
 * inline não tem `src`.
 */
function onDisk(src) {
  if (!src.startsWith("/_next/")) return null;
  const path = join(NEXT, src.slice("/_next/".length).split("?")[0]);
  try {
    if (statSync(path).isFile()) return path;
  } catch {
    /* cai no null */
  }
  return null;
}

let failed = false;

console.log("");
console.log("  Orçamento de JS — PROJECT.md §5");
console.log("  " + "─".repeat(66));

/* --- caixa 1: a rota inicial --------------------------------------------- */

for (const route of ROUTES) {
  const htmlPath = join(NEXT, "server", "app", route.file);
  let html;
  try {
    html = readFileSync(htmlPath, "utf8");
  } catch {
    console.error(
      `\n  ✗ ${route.file} não existe. Rode \`npm run build\` antes de medir.`,
    );
    failed = true;
    continue;
  }

  // Só as tags com `src`. Script inline é bytes de HTML, não de chunk, e o
  // AGENTS.md conta as tags `<script src>` — é essa a conta a reproduzir.
  const sources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
    (match) => match[1],
  );

  let total = 0;
  const missing = [];
  const seen = new Set();

  for (const src of sources) {
    if (seen.has(src)) continue;
    seen.add(src);
    const path = onDisk(src);
    if (path === null) {
      if (src.startsWith("/_next/")) missing.push(src);
      continue;
    }
    total += gz(readFileSync(path));
  }

  // A terceira precaução do AGENTS.md, como código: um chunk citado no HTML e
  // ausente no disco **não vale zero**, vale "a medição está errada".
  if (missing.length > 0) {
    console.error(`\n  ✗ ${route.label}`);
    console.error(
      `    ${missing.length} chunk(s) citados no HTML e ausentes no disco:`,
    );
    for (const src of missing) console.error(`      ${src}`);
    console.error(
      "    A medição está errada. Rebuild e meça de novo — não acredite no total.",
    );
    failed = true;
    continue;
  }

  const ok = kb(total) <= BUDGET_ROUTE;
  if (!ok) failed = true;
  console.log(
    `  ${ok ? "✓" : "✗"} ${fmt(total).padStart(9)} / ${BUDGET_ROUTE} kB  ` +
      `${seen.size} scripts  ${route.label}`,
  );
  // O HTML ao lado, e não somado: o histórico do AGENTS.md foi todo levantado
  // contando **só as tags `<script src>`**, e trocar a régua no meio invalidaria
  // a comparação com as linhas já registradas. Mas o payload RSC viaja aqui
  // dentro — é onde a curadoria do rio desce —, então ele fica visível em vez
  // de ficar fora da conta sem ninguém saber.
  console.log(
    `    ${fmt(gz(Buffer.from(html))).padStart(9)}          html + payload RSC`,
  );
}

/* --- caixa 2: os chunks dinâmicos ---------------------------------------- */

console.log("  " + "─".repeat(66));

const files = walk(STATIC);

for (const target of DYNAMIC) {
  const matched = [];
  for (const path of files) {
    const source = readFileSync(path, "utf8");
    if (target.markers.every((marker) => source.includes(marker))) {
      matched.push(path);
    }
  }

  if (matched.length === 0) {
    console.error(
      `\n  ✗ ${target.id}: nenhum chunk contém ${target.markers.join(" + ")}.`,
    );
    console.error(
      "    Ou o import dinâmico virou estático, ou os marcadores mudaram de nome.",
    );
    failed = true;
    continue;
  }

  const total = matched.reduce((sum, path) => sum + gz(readFileSync(path)), 0);
  const ok = target.budget === null || kb(total) <= target.budget;
  if (!ok) failed = true;
  const against = target.budget === null ? "fora da rota inicial" : `/ ${target.budget} kB`;
  console.log(
    `  ${ok ? "✓" : "✗"} ${fmt(total).padStart(9)} ${against.padEnd(20)}  ` +
      `${matched.length} arquivo(s)  ${target.id}`,
  );
}

/* --- a guarda que o AGENTS.md pede: a cena não pode estar na rota -------- */

console.log("  " + "─".repeat(66));

const homeHtml = readFileSync(join(NEXT, "server", "app", "en.html"), "utf8");
const homeSources = [...homeHtml.matchAll(/<script[^>]+src="([^"]+)"/g)]
  .map((match) => onDisk(match[1]))
  .filter((path) => path !== null);

const leaked = homeSources.filter((path) => {
  const source = readFileSync(path, "utf8");
  return source.includes("WebGLRenderer") && source.includes("shadeConcrete");
});

if (leaked.length > 0) {
  console.error(
    "\n  ✗ a cena vazou para a rota inicial: um `import` estático escapou.",
  );
  console.error(
    "    Isso não custa 350 kB de chunk de cena, custa 350 kB de rota inicial",
  );
  console.error("    estourada. Ver AGENTS.md, \"Orçamento de JS\".");
  for (const path of leaked) console.error(`      ${path.replace(ROOT + "/", "")}`);
  failed = true;
} else {
  console.log("  ✓ nenhum chunk da rota inicial contém three/troika");
}

/**
 * E a sonda não pode existir em produção.
 *
 * O `SceneWorld` guarda o import atrás de `process.env.NODE_ENV !==
 * "production"`, que o Next substitui por literal — o ramo vira morto e o
 * módulo cai. Isso é uma afirmação sobre a build, então é conferido na build.
 */
const probeMarkers = [
  "installCaseTrace",
  "__caseTrace",
  "installProbe",
  "installCorridor",
  "veilFootprint",
  // O gancho de latência de ponteiro. Ele **não** mora atrás de `?probe=1` —
  // a medição precisa do laço de quadro real, e o `ProbeClock` não roda laço —,
  // então ele é o único caminho de instrumentação que depende só do
  // `process.env.NODE_ENV` para desaparecer. Justamente por isso é o que mais
  // precisa ser conferido aqui.
  "__cardPick",
  "hoverLatency",
  "pickDiagnostic",
  // A captura das composições do modo calmo (`ComposedClock`): posters, Open
  // Graph e a folha `11-calmo.png` saem dela, e ela só existe em dev.
  "__calm",
];
const probeLeak = files.filter((path) => {
  const source = readFileSync(path, "utf8");
  return probeMarkers.some((marker) => source.includes(marker));
});

if (probeLeak.length > 0) {
  console.error("\n  ✗ a instrumentação vazou para a build de produção:");
  for (const path of probeLeak) console.error(`      ${path.replace(ROOT + "/", "")}`);
  failed = true;
} else {
  console.log("  ✓ nenhum chunk menciona a instrumentação (__probe, __cardPick)");
}

console.log("");
process.exit(failed ? 1 : 0);
