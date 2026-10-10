// O orçamento de JS, lido do prerender desta build: `npm run build && npm run measure`.
//
// Não levanta servidor. O HTML é o que a build escreveu em `.next/server/app`,
// os chunks citados nele são lidos do disco da mesma build, e um chunk citado
// e ausente derruba a medição em vez de valer zero.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const STATIC = path.join(ROOT, ".next", "static");

const ROUTE_BUDGET = 200;
const SCENE_BUDGET = 350;

const ROUTES = [
  { name: "home (/)", file: "en.html" },
  { name: "home (/pt)", file: "pt.html" },
  { name: "case (/work/decision-suite)", file: "en/work/decision-suite.html" },
  { name: "vitrine (/vitrine)", file: "en/vitrine.html" },
];

// O chunk da cena é achado por conteúdo: o renderer do three e um nome de
// função do GLSL da névoa, que a minificação não toca.
const SCENE_MARKERS = ["WebGLRenderer", "floraLight"];
// Ganchos que só podem existir em desenvolvimento.
const DEV_HOOKS = ["__calm", "__lenis", "__audio", "__sceneStats"];

const kb = (bytes) => bytes / 1024;
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
let failed = false;
const fail = (message) => {
  failed = true;
  console.log(`  ✗ ${message}`);
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".js")) out.push(full);
  }
  return out;
}

function scriptsOf(file) {
  const html = readFileSync(path.join(APP, file), "utf8");
  const sources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  return [...new Set(sources)].map((src) =>
    path.join(ROOT, ".next", decodeURIComponent(src.split("?")[0]).replace(/^\/_next\//, "")),
  );
}

if (!existsSync(APP)) {
  console.error("Sem build: rode `npm run build` antes.");
  process.exit(1);
}

console.log("\nRota inicial (gzip, soma dos <script src>):");
const homeScripts = [];
for (const route of ROUTES) {
  if (!existsSync(path.join(APP, route.file))) {
    fail(`${route.name}: ${route.file} não foi pré-renderizado.`);
    continue;
  }
  const files = scriptsOf(route.file);
  const missing = files.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    fail(`${route.name}: ${missing.length} chunk(s) citado(s) e ausente(s) no disco.`);
    continue;
  }
  if (route.file === "en.html") homeScripts.push(...files);
  const total = kb(files.reduce((sum, file) => sum + gz(file), 0));
  const ok = total <= ROUTE_BUDGET;
  if (!ok) failed = true;
  console.log(`  ${ok ? "✓" : "✗"} ${route.name}: ${total.toFixed(1)} kB de ${ROUTE_BUDGET}`);
}

console.log("\nChunk da cena:");
const chunks = walk(STATIC);
const scene = chunks.filter((file) => {
  const source = readFileSync(file, "utf8");
  return SCENE_MARKERS.every((marker) => source.includes(marker));
});
if (scene.length === 0) {
  fail(`nenhum chunk contém ${SCENE_MARKERS.join(" + ")}.`);
} else {
  const total = kb(scene.reduce((sum, file) => sum + gz(file), 0));
  const ok = total <= SCENE_BUDGET;
  if (!ok) failed = true;
  console.log(`  ${ok ? "✓" : "✗"} ${total.toFixed(1)} kB de ${SCENE_BUDGET} (${scene.length} arquivo(s))`);
  const leaked = homeScripts.filter((file) => scene.includes(file));
  if (leaked.length > 0) fail("a cena vazou para a rota inicial.");
  else console.log("  ✓ a cena não está na rota inicial");
}

const hooked = chunks.filter((file) => {
  const source = readFileSync(file, "utf8");
  return DEV_HOOKS.some((hook) => source.includes(hook));
});
if (hooked.length > 0) fail(`gancho de desenvolvimento em produção: ${hooked.map((f) => path.basename(f)).join(", ")}`);
else console.log("  ✓ nenhum gancho de desenvolvimento em produção");

console.log("");
process.exit(failed ? 1 : 0);
