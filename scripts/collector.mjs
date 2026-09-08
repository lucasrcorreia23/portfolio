#!/usr/bin/env node
// @ts-check
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * O coletor de medições.
 *
 * O banco de prova (`lib/scene/bench.ts`) sempre soube postar o relatório em
 * `http://<host>:3131/report`, mas **nunca houve nada escutando ali** — daí a
 * mensagem "COLETOR MUDO" no painel e a instrução de anotar os cinco números da
 * tela à mão. Transcrição manual já produziu número falso neste projeto mais de
 * uma vez; este arquivo existe para tirá-la do caminho.
 *
 * Duas rotas, e nenhuma dependência além dos builtins do Node:
 *
 *   POST /report          o JSON do banco  →  .screens/bench/<run>.json
 *   POST /shot?name=x.png bytes de PNG     →  .screens/x.png
 *
 * Escuta em 0.0.0.0 de propósito: a perna do celular é o motivo do banco
 * existir, e o aparelho precisa alcançar a máquina que serve a página. O
 * endereço para digitar no telefone é impresso na subida.
 *
 * `text/plain` é aceito e esperado: o `postReport` usa esse tipo justamente
 * para não disparar preflight de CORS numa rede doméstica.
 */

const PORT = Number.parseInt(process.env.PORT ?? "3131", 10);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENS = join(ROOT, ".screens");
const BENCH = join(SCREENS, "bench");

/** @type {Map<string, unknown[]>} */
const runs = new Map();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** @param {import("node:http").IncomingMessage} request */
function body(request) {
  return new Promise((done, fail) => {
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      // 64 MB: uma contact sheet de 12 quadros a 2160×1350 cabe com folga, e
      // qualquer coisa acima disso é engano, não medição.
      if (size > 64 * 1024 * 1024) {
        fail(new Error("corpo grande demais"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => done(Buffer.concat(chunks)));
    request.on("error", fail);
  });
}

function ms(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2).padStart(6)
    : "     —";
}

/** Uma linha por configuração, para a rodada ser lida sem abrir o JSON. */
function announce(report) {
  const config = report?.config ?? {};
  const label = [
    `dof ${config.dof ? "on " : "off"}`,
    `flock ${String(config.flock ?? "?").padStart(5)}`,
    `descolamento ${config.detach ? "on " : "off"}`,
  ].join(" · ");
  const frame = report?.displayMs;
  const share =
    typeof report?.gpuPerFrameMs === "number" && typeof frame === "number"
      ? `${((report.gpuPerFrameMs / frame) * 100).toFixed(0)}%`.padStart(4)
      : "   —";
  console.log(
    `  ${label}  |  GPU ${ms(report?.gpuPerFrameMs)}  med ${ms(
      report?.gpuPerFrameMedianMs,
    )}  p95 ${ms(report?.gpuPerFrameP95Ms)}  incl ${ms(
      report?.slopeMs,
    )}  | quadro ${ms(frame)} → ${share}` +
      (report?.sceneMode === "driven" ? "" : `  ⚠ modo ${report?.sceneMode}`),
  );
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "OPTIONS") {
    response.writeHead(204, CORS).end();
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(200, { ...CORS, "Content-Type": "text/plain" });
    response.end("coletor ok\n");
    return;
  }

  void body(request)
    .then((raw) => {
      if (url.pathname === "/report") {
        const report = JSON.parse(raw.toString("utf8"));
        const run = String(report?.run ?? "sem-run").replace(/[^\w.-]/g, "");
        const collected = runs.get(run) ?? [];
        collected.push(report);
        runs.set(run, collected);
        mkdirSync(BENCH, { recursive: true });
        const file = join(BENCH, `${run}.json`);
        writeFileSync(file, JSON.stringify(collected, null, 2));
        console.log(
          `\n[${run}] passo ${(report?.step ?? 0) + 1}/${report?.planSteps ?? "?"} — ${
            report?.device?.renderer || "gpu desconhecida"
          }`,
        );
        announce(report);
        console.log(`  → ${file}`);
        response.writeHead(200, CORS).end("ok");
        return;
      }

      if (url.pathname === "/shot") {
        const name = (url.searchParams.get("name") ?? "").replace(
          /[^\w.-]/g,
          "",
        );
        if (name === "" || !name.endsWith(".png")) {
          response.writeHead(400, CORS).end("nome inválido");
          return;
        }
        mkdirSync(SCREENS, { recursive: true });
        const file = join(SCREENS, name);
        writeFileSync(file, raw);
        console.log(`\n[shot] ${file} — ${(raw.length / 1024).toFixed(0)} kB`);
        response.writeHead(200, CORS).end("ok");
        return;
      }

      response.writeHead(404, CORS).end("rota desconhecida");
    })
    .catch((error) => {
      console.error("[coletor]", error?.message ?? error);
      response.writeHead(500, CORS).end("erro");
    });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`coletor escutando em 0.0.0.0:${PORT}`);
  console.log(`  relatórios → ${BENCH}`);
  console.log(`  imagens    → ${SCREENS}`);
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        console.log(`  no celular: http://${address.address}:3100/?bench=1&plan=detach&port=${PORT}  (${name})`);
      }
    }
  }
});
