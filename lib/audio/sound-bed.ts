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
 * Um passa-baixa abre junto, então no loading a trilha chega abafada.
 *
 * As duas interações continuam sintetizadas: chegar a uma parada e abrir um
 * case.
 */

const TRACK_URL = "/audio/trilha.mp3";
/** Quanto duas voltas da trilha se sobrepõem, em segundos. */
const CROSSFADE_S = 3;
/** O volume da trilha com o ar todo aberto. */
const TRACK_LEVEL = 0.32;

export type SoundBed = { dispose: () => void };

export async function startSoundBed(
  context: AudioContext,
  destination: AudioNode,
): Promise<SoundBed> {
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.Q.value = 0.5;
  lowpass.frequency.value = 600;

  const gain = context.createGain();
  gain.gain.value = 0;
  lowpass.connect(gain).connect(destination);

  let disposed = false;
  let timer = 0;
  const playing = new Set<AudioBufferSourceNode>();

  // Uma volta da trilha, com a entrada e a saída em rampa, e a próxima
  // agendada para começar dentro da saída desta.
  const play = (buffer: AudioBuffer, at: number) => {
    if (disposed) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const fade = context.createGain();
    const end = at + buffer.duration;
    fade.gain.setValueAtTime(0, at);
    fade.gain.linearRampToValueAtTime(1, at + CROSSFADE_S);
    fade.gain.setValueAtTime(1, end - CROSSFADE_S);
    fade.gain.linearRampToValueAtTime(0, end);
    source.connect(fade).connect(lowpass);
    source.start(at);
    playing.add(source);
    source.onended = () => {
      playing.delete(source);
      source.disconnect();
      fade.disconnect();
    };
    const next = end - CROSSFADE_S;
    timer = window.setTimeout(
      () => play(buffer, next),
      Math.max(0, (next - context.currentTime - 1) * 1000),
    );
  };

  // Sem a trilha (rede, formato) o site fica em silêncio: os cues continuam.
  void fetch(TRACK_URL)
    .then((response) => response.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => play(buffer, context.currentTime + 0.05))
    .catch(() => {});

  const update = () => {
    const now = context.currentTime;
    const field = getSoundField();
    const openness = field.live ? field.openness : 0.5;
    const pressure = field.live ? field.pressure : 0;
    lowpass.frequency.setTargetAtTime(500 + 15000 * openness * openness, now, 0.6);
    gain.gain.setTargetAtTime(
      TRACK_LEVEL * (0.3 + 0.6 * openness + 0.1 * pressure),
      now,
      0.8,
    );
  };
  const poll = window.setInterval(update, 100);
  update();

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

  if (cue.kind === "text" || cue.kind === "readout") {
    // Um título acendendo: um chiado só, que sobe e se apaga devagar. A
    // numeração dos cases usa o mesmo som, mais baixo.
    const level = cue.kind === "text" ? 0.035 : 0.015;
    source.buffer = freshNoise(context, 1.4);
    filter.type = "bandpass";
    filter.Q.value = 5;
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.9);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
    source.connect(filter).connect(gain).connect(pan).connect(destination);
    source.start(now);
    source.stop(now + 1.4);
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
