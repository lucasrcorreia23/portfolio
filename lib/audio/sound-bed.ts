import { getSoundField, subscribeToCues, type SoundCue } from "./field-store";

/**
 * A trilha do site: um arquivo (`public/audio/trilha.mp3`, cedido pelo autor),
 * tocado em laço enquanto o som estiver ligado.
 *
 * O laço é por **crossfade**: um mp3 tem silêncio de codificação nas pontas, e
 * `loop = true` deixaria um soluço a cada volta. Cada volta começa antes de a
 * anterior acabar, e as duas se cruzam.
 *
 * O volume segue a cena, pelas duas leituras do `field-store`: sobe com a
 * abertura do ar (a saída da névoa, no Impacto) e um pouco mais nas paradas.
 * Um passa-baixa abre junto.
 *
 * O arquivo é baixado e decodificado no loading (`loadTrack`), então a
 * primeira volta começa no gesto de entrada, com uma rampa curta, e não
 * quando a rede deixar.
 *
 * As duas interações continuam sintetizadas: chegar a uma parada e abrir um
 * case.
 */

const TRACK_URL = "/audio/trilha.mp3";
/** Quanto duas voltas da trilha se sobrepõem, em segundos. */
const CROSSFADE_S = 3;
/** A entrada da primeira volta: curta, só para não começar num degrau. */
const ENTRY_S = 0.5;
/**
 * De onde a primeira volta parte, em segundos. O arquivo abre com meio
 * segundo de silêncio e leva três para subir: tocado do zero, o gesto de
 * entrada era seguido de dois segundos sem som. As voltas seguintes partem do
 * zero, por baixo do fim da anterior.
 */
const ENTRY_OFFSET_S = 2.4;
/** O volume da trilha com o ar todo aberto. */
const TRACK_LEVEL = 0.32;

export type SoundBed = { dispose: () => void };

let track: Promise<AudioBuffer | null> | null = null;

/**
 * A trilha decodificada, uma vez só. Sem ela (rede, formato) devolve `null`
 * e esquece a tentativa, para a próxima poder tentar de novo.
 */
export function loadTrack(context: AudioContext): Promise<AudioBuffer | null> {
  track ??= fetch(TRACK_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`${TRACK_URL}: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .catch(() => {
      track = null;
      return null;
    });
  return track;
}

export async function startSoundBed(
  context: AudioContext,
  destination: AudioNode,
): Promise<SoundBed> {
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.Q.value = 0.5;
  lowpass.frequency.value = 600;

  const gain = context.createGain();
  lowpass.connect(gain).connect(destination);

  let disposed = false;
  let timer = 0;
  const playing = new Set<AudioBufferSourceNode>();

  // O que a cena pede agora, para o filtro e para o volume.
  const levels = () => {
    const field = getSoundField();
    const openness = field.live ? field.openness : 0.5;
    const pressure = field.live ? field.pressure : 0;
    return {
      cutoff: 500 + 15000 * openness * openness,
      level: TRACK_LEVEL * (0.3 + 0.6 * openness + 0.1 * pressure),
    };
  };
  // Já nasce no ponto: partir de zero somaria uma segunda subida à entrada.
  const first = levels();
  lowpass.frequency.value = first.cutoff;
  gain.gain.value = first.level;

  // Uma volta da trilha, com a entrada e a saída em rampa, e a próxima
  // agendada para começar dentro da saída desta.
  const play = (buffer: AudioBuffer, at: number, rise: number, offset = 0) => {
    if (disposed) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const fade = context.createGain();
    const end = at + buffer.duration - offset;
    fade.gain.setValueAtTime(0, at);
    fade.gain.linearRampToValueAtTime(1, at + rise);
    fade.gain.setValueAtTime(1, end - CROSSFADE_S);
    fade.gain.linearRampToValueAtTime(0, end);
    source.connect(fade).connect(lowpass);
    source.start(at, offset);
    playing.add(source);
    source.onended = () => {
      playing.delete(source);
      source.disconnect();
      fade.disconnect();
    };
    const next = end - CROSSFADE_S;
    timer = window.setTimeout(
      () => play(buffer, next, CROSSFADE_S),
      Math.max(0, (next - context.currentTime - 1) * 1000),
    );
  };

  // A primeira volta espera o contexto tocar de fato: o `resume()` do gesto
  // resolve um instante depois, e agendar contra um relógio parado deixaria a
  // entrada para trás.
  const onState = () => {
    if (context.state !== "running") return;
    context.removeEventListener("statechange", onState);
    void loadTrack(context).then((buffer) => {
      // Sem a trilha o site fica em silêncio: os cues continuam.
      if (buffer !== null) {
        play(buffer, context.currentTime + 0.02, ENTRY_S, ENTRY_OFFSET_S);
      }
    });
  };
  context.addEventListener("statechange", onState);
  onState();

  const update = () => {
    const now = context.currentTime;
    const { cutoff, level } = levels();
    lowpass.frequency.setTargetAtTime(cutoff, now, 0.6);
    gain.gain.setTargetAtTime(level, now, 0.8);
  };
  const poll = window.setInterval(update, 100);

  const onCue = (cue: SoundCue) => {
    try {
      playCue(context, destination, cue);
    } catch {
      // Um cue que falha não derruba a trilha.
    }
  };
  const stopCues = subscribeToCues(onCue);

  return {
    dispose: () => {
      disposed = true;
      context.removeEventListener("statechange", onState);
      stopCues();
      window.clearInterval(poll);
      window.clearTimeout(timer);
      gain.gain.setTargetAtTime(0, context.currentTime, 0.2);
      window.setTimeout(() => {
        for (const source of playing) {
          try {
            source.stop();
          } catch {
            // Já tinha parado.
          }
        }
        lowpass.disconnect();
        gain.disconnect();
      }, 1200);
    },
  };
}

function freshNoise(context: AudioContext, seconds: number): AudioBuffer {
  const frames = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playCue(context: AudioContext, destination: AudioNode, cue: SoundCue): void {
  if (cue.kind === "text" || cue.kind === "readout") {
    playNeon(context, destination, cue);
    return;
  }

  const now = context.currentTime;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const pan = context.createStereoPanner();
  pan.pan.value = Math.max(-1, Math.min(1, cue.pan));

  if (cue.kind === "card") {
    // O sopro: uma faixa que sobe e cai enquanto a peça passa pela lente.
    source.buffer = freshNoise(context, 0.5);
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(380, now);
    filter.frequency.exponentialRampToValueAtTime(1300, now + 0.16);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.45);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    source.connect(filter).connect(gain).connect(pan).connect(destination);
    source.start(now);
    source.stop(now + 0.5);
    return;
  }

  // Abrir um case: um inchaço grave, mais pressão que som.
  source.buffer = freshNoise(context, 1.0);
  filter.type = "lowpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(70, now);
  filter.frequency.exponentialRampToValueAtTime(220, now + 0.35);
  filter.frequency.exponentialRampToValueAtTime(60, now + 0.95);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.04, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);
  source.connect(filter).connect(gain).connect(pan).connect(destination);
  source.start(now);
  source.stop(now + 1.0);
}

/**
 * Um título acendendo, como um letreiro de neon de verdade: a descarga estala
 * algumas vezes antes de pegar, o transformador zumbe no dobro da rede, e o gás
 * chia baixo por cima. Nada muda de tom. O zumbido cede a cada estalo, que é o
 * que faz os dois soarem como um objeto só. A numeração dos cases usa o mesmo
 * som, mais curto e mais baixo.
 */
function playNeon(context: AudioContext, destination: AudioNode, cue: SoundCue): void {
  const full = cue.kind === "text";
  const span = full ? 1 : 0.7;
  const now = context.currentTime;
  const hold = now + 1.2 * span;
  const end = now + 2.4 * span;

  const pan = context.createStereoPanner();
  pan.pan.value = Math.max(-1, Math.min(1, cue.pan));
  const out = context.createGain();
  out.gain.value = full ? 0.05 : 0.032;
  out.connect(pan).connect(destination);

  // Os estalos da descarga, em tempos irregulares, cada um mais fraco.
  const strikes = [0, 0.055, 0.12, 0.23].map((at) => now + at + Math.random() * 0.03);
  const caught = (strikes[strikes.length - 1] ?? now) + 0.02;
  const noise = freshNoise(context, 2.4 * span);

  const sharp = context.createBiquadFilter();
  sharp.type = "highpass";
  sharp.frequency.value = 3000;
  sharp.connect(out);
  strikes.forEach((at, index) => {
    const crackle = context.createBufferSource();
    crackle.buffer = noise;
    const level = context.createGain();
    level.gain.setValueAtTime(0.35 * 0.8 ** index, at);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 0.006 + Math.random() * 0.008);
    crackle.connect(level).connect(sharp);
    crackle.start(at, Math.random());
    crackle.stop(at + 0.02);
  });

  // O transformador: fraco enquanto a descarga falha, inteiro quando pega.
  const swell = context.createGain();
  swell.gain.setValueAtTime(0.0001, now);
  swell.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
  for (const at of strikes.slice(1)) {
    swell.gain.setValueAtTime(0.1, at);
    swell.gain.setValueAtTime(0.4, at + 0.015);
  }
  swell.gain.setValueAtTime(0.4, caught);
  swell.gain.linearRampToValueAtTime(1, caught + 0.15);
  swell.gain.setValueAtTime(1, hold);
  swell.gain.exponentialRampToValueAtTime(0.0001, end);
  swell.connect(out);

  const mains = context.createOscillator();
  mains.type = "sawtooth";
  mains.frequency.value = 119.5 + Math.random();
  const dull = context.createBiquadFilter();
  dull.type = "lowpass";
  dull.Q.value = 1;
  dull.frequency.setValueAtTime(450, now);
  dull.frequency.setValueAtTime(450, caught);
  dull.frequency.linearRampToValueAtTime(650, caught + 0.3);
  const hum = context.createGain();
  hum.gain.value = 0.6;
  mains.connect(dull).connect(hum).connect(swell);

  // O gás ionizado: um chiado quase inaudível, com o mesmo contorno.
  const gas = context.createBufferSource();
  gas.buffer = noise;
  const thin = context.createBiquadFilter();
  thin.type = "bandpass";
  thin.Q.value = 0.7;
  thin.frequency.value = 6000;
  const hiss = context.createGain();
  hiss.gain.value = 0.08;
  gas.connect(thin).connect(hiss).connect(swell);

  mains.start(now);
  mains.stop(end + 0.05);
  gas.start(now);
  gas.stop(end);
  mains.onended = () => {
    out.disconnect();
    pan.disconnect();
  };
}
