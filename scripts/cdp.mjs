#!/usr/bin/env node
// @ts-check
import { request } from "node:http";

/**
 * Um cliente de CDP de uma chamada só — para rodar a sonda (`?probe=1`) sem
 * extensão de navegador e sem dependência nova.
 *
 * ## Por que ele existe
 *
 * A sonda mora **na página** (`lib/scene/probe.ts`, `window.__probe`), e por um
 * motivo registrado no AGENTS.md: não há navegador sem cabeça neste
 * repositório, e as medições de pixel precisam do quadro composto de verdade.
 * O caminho normal para chamá-la é uma extensão de navegador; quando ela não
 * está conectada, o Chrome instalado ainda expõe o mesmo controle pelo
 * protocolo de DevTools.
 *
 * Node 22+ traz `WebSocket` global, então o cliente inteiro são builtins — a
 * mesma regra do `scripts/collector.mjs`.
 *
 * ## Duas armadilhas que este arquivo já resolve
 *
 * **`visibilityState` precisa ser `visible`.** O AGENTS.md registra que o R3F
 * não cria o canvas com a aba oculta: o `react-use-measure` depende de
 * `ResizeObserver`, que não entrega callback ali, e sem tamanho não há raiz.
 * Por isso o alvo é escolhido entre as páginas **visíveis** e a janela é criada
 * em primeiro plano — e `--disable-backgrounding-occluded-windows` impede o
 * Chrome de marcar a janela como oculta quando outra passa na frente, que é o
 * estado normal de uma sessão dirigida por ferramenta.
 *
 * **A avaliação precisa esperar promessa.** `__probe.contrast()` é síncrona,
 * mas `__probe.sheet()` e `viewport()` não são; `awaitPromise` cobre as duas.
 *
 * ## ⚠️ `shot` não é uma medição, e pode estar velho
 *
 * `Page.captureScreenshot` pede o quadro ao **compositor do Chrome**, e o
 * compositor não produz quadro novo para uma janela que não está em primeiro
 * plano — que é o estado normal de uma sessão dirigida por ferramenta. Medido
 * aqui: a leitura viva do DOM dizia `EST. 0620 / Work / Z −47` e o screenshot
 * do mesmo instante mostrava a Emergência em `EST. 0000`, idêntico ao anterior.
 * O site estava certo; a imagem era de minutos antes.
 *
 * Então: `shot` serve para **olhar** enquanto a janela está visível, e nunca
 * como fonte de um número. Quem mede pixel é a sonda, que lê o buffer do WebGL
 * de dentro da página com `readPixels` na mesma tarefa do `advance()` — esse
 * caminho não passa pelo compositor e não tem esse problema. A contact sheet
 * (`__probe.sheet()`) é montada por ali e postada no coletor, e é por isso que
 * ela é confiável mesmo com a janela coberta.
 *
 * Uso:
 *   node scripts/cdp.mjs eval  "<expressão>"   [--nav= --wait= --bounds=
 *                                               --emulate= --reduced= --click=
 *                                               --sleep= --shot=]
 *   node scripts/cdp.mjs sweep '{"points":[[x,y],...],"gapMs":70}'
 *   node scripts/cdp.mjs key Tab|Enter [--times= --gap=]
 *   node scripts/cdp.mjs targets
 */

const PORT = Number.parseInt(process.env.CDP_PORT ?? "9222", 10);

/**
 * `--emulate=` e `--bounds=` são aplicados **na mesma conexão** do comando.
 *
 * Não é conveniência: uma `Emulation.setDeviceMetricsOverride` feita numa
 * conexão e desfeita em outra **não desfaz**. Medido aqui — depois de um
 * `emulate off` num processo, o processo seguinte ainda lia 1024×860, e uma
 * varredura que devia rodar no buffer canônico rodou no do mobile sem nada na
 * saída denunciando. É a mesma classe de erro que o AGENTS.md registra em
 * "Débito de resolução": a medição sai num buffer que ninguém pediu, e o número
 * parece bom.
 *
 * Quem chama também é obrigado a conferir o buffer **dentro** da expressão
 * medida, que é a única forma de o relatório não mentir sobre onde ele rodou.
 */
const flags = process.argv.filter((arg) => arg.startsWith("--"));
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const [command = "eval", payload = ""] = positional;
const flag = (name) => {
  const found = flags.find((arg) => arg.startsWith(`--${name}=`));
  return found === undefined ? null : found.slice(name.length + 3);
};

function json(path) {
  return new Promise((done, fail) => {
    const req = request(
      { host: "127.0.0.1", port: PORT, path, method: "GET" },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          try {
            done(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            fail(error);
          }
        });
      },
    );
    req.on("error", fail);
    req.end();
  });
}

/** O alvo de página, preferindo o que está no host servido pelo `next dev`. */
async function pickTarget() {
  const targets = await json("/json/list");
  const pages = targets.filter(
    (target) => target.type === "page" && typeof target.webSocketDebuggerUrl === "string",
  );
  if (pages.length === 0) throw new Error("nenhuma página aberta no Chrome");
  return (
    pages.find((page) => page.url.includes("localhost:3000")) ?? pages[0]
  );
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const waiting = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    const pending = waiting.get(message.id);
    if (pending === undefined) return;
    waiting.delete(message.id);
    if (message.error !== undefined) pending.fail(new Error(message.error.message));
    else pending.done(message.result);
  });

  const ready = new Promise((done, fail) => {
    socket.addEventListener("open", () => done(undefined), { once: true });
    socket.addEventListener("error", () => fail(new Error("CDP não abriu")), {
      once: true,
    });
  });

  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      id += 1;
      waiting.set(id, { done, fail });
      socket.send(JSON.stringify({ id, method, params }));
    });

  return { ready, send, close: () => socket.close() };
}

const target = await pickTarget();

if (command === "targets") {
  const targets = await json("/json/list");
  for (const item of targets) {
    if (item.type !== "page") continue;
    console.log(`${item.id}  ${item.url}`);
  }
  process.exit(0);
}

const cdp = connect(target.webSocketDebuggerUrl);
await cdp.ready;

/**
 * A página acredita ter o foco de sistema, enquanto esta conexão viver.
 *
 * Sem isto, com a janela atrás de outro aplicativo (o estado normal de uma
 * sessão dirigida por ferramenta), `Tab` move `activeElement` mas os eventos
 * `focus`/`blur` e `:focus-visible` não disparam — e um teste de teclado mede
 * uma página que não recebeu teclado nenhum. Ligado sempre: nenhuma medição
 * deste repositório quer o comportamento de janela desfocada.
 */
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });

/* --- os pré-ajustes, na mesma conexão do comando ------------------------- */

const wantEmulate = flag("emulate");
if (wantEmulate !== null) {
  if (wantEmulate === "off") {
    await cdp.send("Emulation.clearDeviceMetricsOverride");
  } else {
    const [w, h] = wantEmulate.split(",").map((n) => Number.parseInt(n, 10));
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: 0,
      mobile: false,
    });
  }
}

// `--reduced=1` liga `prefers-reduced-motion: reduce`, que é o modo calmo do
// PROJECT.md §5. Precisa ser aplicado antes da navegação, e na mesma conexão.
const wantReduced = flag("reduced");
if (wantReduced !== null) {
  await cdp.send("Emulation.setEmulatedMedia", {
    features:
      wantReduced === "0"
        ? []
        : [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

const wantBounds = flag("bounds");
if (wantBounds !== null) {
  const [w, h] = wantBounds.split(",").map((n) => Number.parseInt(n, 10));
  const { windowId } = await cdp.send("Browser.getWindowForTarget", {
    targetId: target.id,
  });
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: { left: 0, top: 0, width: w, height: h, windowState: "normal" },
  });
}

const wantNav = flag("nav");
if (wantNav !== null) {
  await cdp.send("Page.enable");
  await cdp.send("Page.navigate", { url: wantNav });
  await new Promise((done) => setTimeout(done, Number(flag("wait") ?? 4500)));
}

/**
 * `--click=x,y` e `--sleep=ms`, também na mesma conexão.
 *
 * O portão do site só abre num gesto (o `resume()` do áudio exige um), e
 * `Emulation.setEmulatedMedia` — ao contrário do override de métricas — **não**
 * sobrevive à desconexão do cliente. Então uma verificação do modo calmo tem
 * que emular, navegar, clicar e ler tudo sem soltar a conexão: fazendo em
 * processos separados, a primeira leitura dizia `composed` e a seguinte
 * `driven`, e a diferença era o CDP, não o site.
 */
const wantClick = flag("click");
if (wantClick !== null) {
  const [x, y] = wantClick.split(",").map((n) => Number.parseInt(n, 10));
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      buttons: type === "mousePressed" ? 1 : 0,
      clickCount: type === "mouseMoved" ? 0 : 1,
      pointerType: "mouse",
    });
  }
}

const wantSleep = flag("sleep");
if (wantSleep !== null) {
  await new Promise((done) => setTimeout(done, Number(wantSleep)));
}

if (command === "emulate") {
  // `payload` é "largura,altura" em CSS px, ou "off".
  //
  // Existe porque `Browser.setWindowBounds` é clampado pela largura mínima de
  // janela do sistema — pedir 500 px devolve 1450 em silêncio, e a varredura
  // "mobile" mede o desktop achando que mede o telefone (aconteceu). A
  // emulação não tem esse piso.
  //
  // `deviceScaleFactor: 0` mantém o DPR nativo, que é o que o teto de 1.5 do
  // PROJECT.md §5 corta — emular DPR 1 mediria outro buffer.
  if (payload === "off") {
    await cdp.send("Emulation.clearDeviceMetricsOverride");
  } else {
    const [width, height] = payload.split(",").map((n) => Number.parseInt(n, 10));
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 0,
      mobile: false,
    });
  }
  const after = await cdp.send("Runtime.evaluate", {
    expression: "[innerWidth, innerHeight, devicePixelRatio]",
    returnByValue: true,
  });
  console.log(JSON.stringify({ emulate: payload, inner: after.result.value }));
  cdp.close();
  process.exit(0);
}

if (command === "bounds") {
  // `payload` é "largura,altura" em DIP. Existe porque a medição precisa de um
  // buffer conhecido: a janela de uma sessão dirigida por ferramenta abre no
  // tamanho que o sistema quiser, e o AGENTS.md registra o custo disso — três
  // rodadas de banco saíram a metade da resolução canônica sem ninguém notar.
  const [width, height] = payload.split(",").map((n) => Number.parseInt(n, 10));
  const { windowId } = await cdp.send("Browser.getWindowForTarget", {
    targetId: target.id,
  });
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: { left: 0, top: 0, width, height, windowState: "normal" },
  });
  const after = await cdp.send("Runtime.evaluate", {
    expression: "[innerWidth, innerHeight, devicePixelRatio]",
    returnByValue: true,
  });
  console.log(JSON.stringify({ asked: [width, height], inner: after.result.value }));
  cdp.close();
  process.exit(0);
}

if (command === "click") {
  const [x, y] = payload.split(",").map((n) => Number.parseInt(n, 10));
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      buttons: type === "mousePressed" ? 1 : 0,
      clickCount: type === "mouseMoved" ? 0 : 1,
      pointerType: "mouse",
    });
  }
  console.log(JSON.stringify({ clicked: [x, y] }));
  cdp.close();
  process.exit(0);
}

/**
 * Teclas de verdade — `key Tab`, `key Enter`, `key Tab --times=3`.
 *
 * Um `element.focus()` avaliado na página **não** é o mesmo que `Tab`: sem a
 * janela com foco de sistema o Chrome move `activeElement` e adia o evento
 * `focus`, e nenhum ouvinte de foco dispara. Medido aqui — o link dizia ser o
 * elemento ativo e o store de foco continuava em −1. O evento de teclado por
 * CDP passa pelo mesmo caminho que a pessoa, então é ele que prova teclado.
 */
const KEYS = {
  Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
};

if (command === "key") {
  const spec = KEYS[payload];
  if (spec === undefined) throw new Error(`tecla desconhecida: ${payload}`);
  const times = Number.parseInt(flag("times") ?? "1", 10);
  for (let i = 0; i < times; i += 1) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", ...spec });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...spec });
    await new Promise((done) => setTimeout(done, Number.parseInt(flag("gap") ?? "60", 10)));
  }
  console.log(JSON.stringify({ key: payload, times }));
  cdp.close();
  process.exit(0);
}

/**
 * Uma varredura de ponteiro, com a latência lida do próprio site.
 *
 * `payload` é um JSON: `{"points": [[x, y], ...], "gapMs": 60}`. Cada ponto é
 * um `mouseMoved` de verdade, espaçado no tempo para cair em quadros
 * diferentes — mandar vinte moves na mesma volta do laço de eventos mediria um
 * quadro só, e a coordenada pendente é sobrescrita antes de qualquer um deles
 * ser consumido.
 */
if (command === "sweep") {
  const { points, gapMs = 60 } = JSON.parse(payload);
  const hits = [];
  for (const [x, y] of points) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "none",
      pointerType: "mouse",
    });
    await new Promise((done) => setTimeout(done, gapMs));
    const read = await cdp.send("Runtime.evaluate", {
      expression: "window.__cardPick ? window.__cardPick.hovered() : null",
      returnByValue: true,
    });
    hits.push({ at: [x, y], card: read.result.value });
  }
  const latency = await cdp.send("Runtime.evaluate", {
    expression: "window.__cardPick ? window.__cardPick.latency() : null",
    returnByValue: true,
  });
  console.log(JSON.stringify({ hits, latency: latency.result.value }, null, 2));
  cdp.close();
  process.exit(0);
}

if (command === "mouse") {
  // `payload` é "x,y" em pixels de CSS. Um evento de verdade, pela pipeline de
  // input do navegador — não um `new PointerEvent` construído na página: a
  // medição é de latência de ponteiro, e um evento sintético pularia justamente
  // o trecho que o navegador cobra.
  const [x, y] = payload.split(",").map((n) => Number.parseInt(n, 10));
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y,
    button: "none",
    pointerType: "mouse",
  });
  console.log(JSON.stringify({ moved: [x, y] }));
  cdp.close();
  process.exit(0);
}

if (command === "shot") {
  // O canvas não tem `preserveDrawingBuffer`, então um screenshot do
  // compositor do Chrome é a única forma de ver o quadro de fora da página.
  // `fromSurface` é o que faz o WebGL entrar na captura.
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(payload, Buffer.from(shot.data, "base64"));
  console.log(JSON.stringify({ saved: payload }));
  cdp.close();
  process.exit(0);
}

if (command === "nav") {
  await cdp.send("Page.enable");
  await cdp.send("Page.navigate", { url: payload });
  // O `loadEventFired` chega antes do primeiro quadro da cena; quem espera a
  // cena é quem chama, olhando `window.__probe`.
  await new Promise((done) => setTimeout(done, 1500));
  console.log(JSON.stringify({ navigated: payload }));
  cdp.close();
  process.exit(0);
}

/** `--shot=caminho` salva o quadro **antes** de soltar a conexão. */
const wantShot = flag("shot");
if (wantShot !== null) {
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(wantShot, Buffer.from(shot.data, "base64"));
}

const result = await cdp.send("Runtime.evaluate", {
  expression: payload,
  awaitPromise: true,
  returnByValue: true,
  // A sonda é chamada como um humano a chamaria do console, e algumas rotinas
  // dela (destravar o scroll, abrir o portão) só rodam num gesto.
  userGesture: true,
  timeout: 600000,
});

if (result.exceptionDetails !== undefined) {
  console.error(
    JSON.stringify(
      {
        error:
          result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      },
      null,
      2,
    ),
  );
  cdp.close();
  process.exit(1);
}

console.log(JSON.stringify(result.result.value ?? null, null, 2));
cdp.close();
process.exit(0);
