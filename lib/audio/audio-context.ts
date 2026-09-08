/**
 * O áudio do site, destravado no clique de entrada — PROJECT.md §4.
 *
 * Navegador nenhum deixa um `AudioContext` tocar antes de um gesto do
 * usuário, e é por isso que o portão existe também como afordância de áudio:
 * o mesmo clique que abre a veneziana é o gesto que destrava o som.
 *
 * ### Construir e destravar são duas coisas, e só uma delas precisa do gesto
 *
 * O gesto é exigido pelo `resume()`, **não** pelo construtor. E os dois custam
 * ordens de grandeza diferentes: medido no build de produção, `new
 * AudioContext()` leva 95 a 116 ms — é a partida do serviço de áudio do
 * sistema —, contra 0.0–0.1 ms do `resume()`. Com o construtor dentro do
 * handler, o clique inteiro custava ~110 ms e estourava o teto de 100 ms de
 * latência de ponteiro do PROJECT.md §3.3.
 *
 * Então o contexto é criado **no preload** (`lib/preload/manifest.ts`), onde
 * essa espera é exatamente o que o portão existe para cobrir, e nasce
 * suspenso — sem gesto, todo navegador o cria assim, e nada toca. No handler
 * sobra `resume()` e o baque.
 *
 * `unlockAudio()` continua tendo que ser chamado de dentro do handler, de
 * forma síncrona: um `await` antes dele perde o gesto em alguns navegadores.
 * Ele ainda sabe construir o contexto se o preload não tiver rodado — é o
 * caminho degradado, não o normal.
 *
 * Não há arquivo de áudio no projeto. O baque é sintetizado: um oscilador
 * grave caindo de tom e um estouro de ruído filtrado, que é o que DIRECTION.md
 * §4 chama de "um baque grave de pressão". Sintetizar custa ~1 kB de código
 * contra dezenas de kB de mp3, e o resultado é o mesmo som toda vez.
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;

/** Pico do baque. Baixo de propósito: é uma pressão, não um susto. */
const THUD_GAIN = 0.18;
const AIR_GAIN = 0.1;

/**
 * Constrói o contexto, sem destravar. Devolve `null` se o navegador não tiver
 * Web Audio ou se a criação falhar — o portão abre do mesmo jeito, em
 * silêncio. Áudio é a única coisa aqui que pode faltar sem quebrar nada.
 */
function ensureContext(): AudioContext | null {
  if (context !== null) return context;

  try {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 1;
    master.connect(context.destination);
    return context;
  } catch {
    context = null;
    master = null;
    return null;
  }
}

/**
 * Tarefa de preload: paga a partida do serviço de áudio enquanto o contador
 * sobe, para o clique não pagá-la.
 *
 * O construtor é síncrono e bloqueia a thread pelos ~110 ms que custa, então
 * ele espera dois quadros antes de rodar: sem isso, a trava cairia em cima do
 * primeiro quadro do portão, que é justamente o que precisa aparecer rápido.
 * Depois de pintado, um engasgo no campo dormente é barato — na hora do
 * clique não seria.
 *
 * ### O adiamento é uma otimização, e não pode ser a condição de saída
 *
 * Esta função já dependeu **só** dos dois `requestAnimationFrame` para
 * resolver, e isso travava o portão inteiro em dois casos reais:
 *
 * - **Aba em segundo plano.** `requestAnimationFrame` não dispara num
 *   documento oculto. Quem abre o site numa aba de fundo — o que é como
 *   metade dos links são abertos — ficava esperando o teto do manifesto.
 * - **Thread principal travada.** Em desenvolvimento, uma compilação do
 *   Turbopack segura a thread por dezenas de segundos e os quadros somem
 *   junto. Foi assim que o defeito apareceu.
 *
 * Então o temporizador não é um "por via das dúvidas": ele é o caminho de
 * saída garantido, e o rAF é o atalho para o caso bom. Um dispara em aba
 * oculta, o outro não; quem chegar primeiro resolve.
 */
export function prepareAudio(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    let settled = false;
    let timer = 0;

    const run = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      ensureContext();
      resolve();
    };

    // O caminho bom: depois de dois quadros pintados.
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });

    // O caminho garantido. 400 ms é folgado para dois quadros a 60 Hz e curto
    // o bastante para não aparecer no contador; numa aba oculta o navegador
    // estrangula isto para ~1 s, o que continua sendo um número e não um
    // "nunca".
    timer = window.setTimeout(run, 400);
  });
}

/**
 * Destrava o áudio. Precisa ser chamado de dentro do handler do gesto, e é
 * barato: o caro já foi pago no preload.
 */
export function unlockAudio(): AudioContext | null {
  const ready = ensureContext();
  if (ready !== null) void ready.resume();
  return ready;
}

/** Para o controle de áudio da HUD, quando ele existir. */
export function getAudioContext(): AudioContext | null {
  return context;
}

export function setAudioMuted(muted: boolean): void {
  if (master === null || context === null) return;
  master.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.02);
}

/**
 * O baque: a veneziana abrindo.
 *
 * Duas camadas. A primeira é o baque de pressão — uma senoide caindo de
 * 54 para 26 Hz, que é grave o bastante para se sentir mais do que se ouvir
 * num alto-falante de laptop. A segunda é o ar: ruído branco por um passa-
 * baixa que abre e fecha, o som da lâmina de ar entrando pela fresta.
 *
 * Nenhuma envoltória é linear — `exponentialRampToValueAtTime` é a versão em
 * áudio da mesma regra do PROJECT.md §3.3.
 */
export function playPressureThud(target: AudioContext | null): void {
  if (target === null || master === null) return;

  try {
    const now = target.currentTime;

    const body = target.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(54, now);
    body.frequency.exponentialRampToValueAtTime(26, now + 0.9);

    const bodyGain = target.createGain();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(THUD_GAIN, now + 0.012);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

    body.connect(bodyGain).connect(master);
    body.start(now);
    body.stop(now + 1.4);

    // O ar. Dois segundos de ruído gerado na hora — mais barato que carregar
    // um arquivo e sempre disponível.
    const frames = Math.floor(target.sampleRate * 0.6);
    const noise = target.createBuffer(1, frames, target.sampleRate);
    const channel = noise.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }

    const air = target.createBufferSource();
    air.buffer = noise;

    const band = target.createBiquadFilter();
    band.type = "lowpass";
    band.frequency.setValueAtTime(900, now);
    band.frequency.exponentialRampToValueAtTime(140, now + 0.5);
    band.Q.value = 0.7;

    const airGain = target.createGain();
    airGain.gain.setValueAtTime(0.0001, now);
    airGain.gain.exponentialRampToValueAtTime(AIR_GAIN, now + 0.03);
    airGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    air.connect(band).connect(airGain).connect(master);
    air.start(now);
    air.stop(now + 0.6);
  } catch {
    // Um baque que não toca não impede ninguém de entrar.
  }
}
