// Tira uma captura de tela de uma URL com um Chrome próprio, por CDP.
//
//   node scripts/capture.mjs <url> <saida.png> [--size=1440x900] [--wait=6000]
//        [--scale=1] [--reduced] [--eval="expressão"] [--scroll=0.5]
//
// `--eval` roda depois da espera e, se devolver uma data URL, é ela que é
// gravada (é assim que os posters saem de `window.__calm.capture`).
// `--scroll` rola a página para uma fração da altura antes de capturar.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME =
  process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;

const [url, out, ...flags] = process.argv.slice(2);
if (!url || !out) {
  console.error("uso: node scripts/capture.mjs <url> <saida.png> [opções]");
  process.exit(1);
}
const option = (name, fallback) => {
  const hit = flags.find((flag) => flag.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};
const [width, height] = option("size", "1440x900").split("x").map(Number);
const wait = Number(option("wait", "6000"));
const scale = Number(option("scale", "1"));
const expression = option("eval", null);
const scroll = option("scroll", null);
const reduced = flags.includes("--reduced");

const profile = mkdtempSync(path.join(tmpdir(), "capture-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--hide-scrollbars",
    "--mute-audio",
    "--enable-gpu",
    "--use-angle=metal",
    "--ignore-gpu-blocklist",
    `--window-size=${width},${height}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function target() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = pages.find((entry) => entry.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // O Chrome ainda está subindo.
    }
    await sleep(200);
  }
  throw new Error("o Chrome não abriu a porta de depuração.");
}

let code = 0;
try {
  const socket = new WebSocket(await target());
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const logs = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    } else if (message.method === "Runtime.consoleAPICalled") {
      const text = message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
      if (message.params.type === "error" || message.params.type === "warning" || text.startsWith("[")) {
        logs.push(`${message.params.type}: ${text}`);
      }
    } else if (message.method === "Runtime.exceptionThrown") {
      logs.push(`exceção: ${message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text}`);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      id += 1;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: scale,
    mobile: false,
  });
  if (reduced) {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
  }
  await send("Page.navigate", { url });
  await sleep(wait);

  if (scroll !== null) {
    await send("Runtime.evaluate", {
      expression: `window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * ${Number(scroll)})`,
    });
    await sleep(2500);
  }

  let data = null;
  if (expression !== null) {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = result.result?.result?.value;
    if (typeof value === "string" && value.startsWith("data:")) data = value.split(",")[1];
    else if (value !== undefined) console.log(typeof value === "string" ? value : JSON.stringify(value));
    if (result.result?.exceptionDetails) logs.push(`eval: ${result.result.exceptionDetails.exception?.description}`);
  }
  if (data === null) {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    data = shot.result.data;
  }
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  writeFileSync(out, Buffer.from(data, "base64"));
  for (const line of logs.slice(0, 20)) console.log(line);
  console.log(`→ ${out}`);
  socket.close();
} catch (error) {
  console.error(error);
  code = 1;
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
process.exit(code);
