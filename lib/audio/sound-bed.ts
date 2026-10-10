import { getScrollProgress, subscribeToScroll } from "@/lib/scroll/scroll-store";
import { getSoundField, subscribeToCues, type SoundCue } from "./field-store";

/**
 * O leito sonoro — a câmara soando, não uma trilha por cima dela.
 *
 * ## Nenhum arquivo, e nenhum laço
 *
 * O ruído é **gerado ao vivo** num AudioWorklet, amostra por amostra. Um buffer
 * em laço se repete, e a emenda de um ruído repetido é audível na terceira volta
 * — é a coisa mais genérica que este site poderia fazer. Aqui não há emenda
 * porque não há nada repetindo. O worklet é um texto de trinta linhas levado ao
 * `addModule` por uma URL de blob: sem arquivo público, sem rede.
 *
 * ## O que dirige o quê
 *
 * O ruído é marrom com uma parcela de branco (grave de duto, com ar por cima)
 * em dois canais descorrelacionados, e passa por dois filtros:
 *
 * - um **passa-baixa** cuja frequência sobe com a abertura da câmara e desce
 *   com a pressão do bando: a garganta fecha o som, o rio abre, o bando
 *   comprimindo perto da câmera o abafa;
 * - um **passa-faixa largo** sobreposto, cujo centro acompanha o progresso — o
 *   duto soa mais baixo lá no fundo e mais alto perto da tomada de ar.
 *
 * O ganho sobe com o bando se formando e com a pressão, e é **baixo** o tempo
 * todo: é a sala, não um instrumento. Sem oscilador, sem nota, sem batida.
 *
 * ## As duas interações
 *
 * Atravessar um card é um sopro curto de ruído filtrado, com o pan do lado em
 * que o card estava; abrir um case é um inchaço grave de meio segundo. Os dois
 * nascem de ruído novo a cada vez, e nenhum passa de 0.04 de ganho.
 */

const WORKLET = `
class BrownNoise extends AudioWorkletProcessor {
  constructor() {
    super();
    this.l = 0; this.r = 0; this.drift = 0; this.target = 1; this.n = 0;
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    const left = out[0], right = out[1] || out[0];
    for (let i = 0; i < left.length; i++) {
      // Marrom: a integral do branco, com vazamento para não derivar.
      this.l = (this.l + 0.02 * (Math.random() * 2 - 1)) * 0.998;
      this.r = (this.r + 0.02 * (Math.random() * 2 - 1)) * 0.998;
      // Uma amplitude que anda à toa, sem período: o ar respira, não pulsa.
      if (++this.n >= 4096) { this.n = 0; this.target = 0.7 + Math.random() * 0.6; }
      this.drift += (this.target - this.drift) * 0.00004;
      // Marrom puro mora abaixo de 100 Hz: medido, o centroide ficava entre 53
      // e 88 Hz, e o filtro que abre e fecha com a câmara não tinha o que
      // abrir — era ronco, e alto-falante de notebook nem o reproduz. Uma
      // parcela de branco dá ar ao duto; quem decide quanto dele passa é o
      // passa-baixa.
      left[i] = (this.l * 2.4 + (Math.random() * 2 - 1) * 0.16) * this.drift;
      right[i] = (this.r * 2.4 + (Math.random() * 2 - 1) * 0.16) * this.drift;
    }
    return true;
  }
}
registerProcessor("brown-noise", BrownNoise);
`;

export type SoundBed = { dispose: () => void };

export async function startSoundBed(
  context: AudioContext,
  destination: AudioNode,
): Promise<SoundBed> {
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
  try {
    await context.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const source = new AudioWorkletNode(context, "brown-noise", {
    numberOfInputs: 0,
    outputChannelCount: [2],
  });
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.Q.value = 0.5;
  lowpass.frequency.value = 220;
  const band = context.createBiquadFilter();
  band.type = "peaking";
  band.Q.value = 0.6;
  band.gain.value = 4;
  band.frequency.value = 140;
  const gain = context.createGain();
  gain.gain.value = 0;

  source.connect(lowpass).connect(band).connect(gain).connect(destination);

  // O bordão: duas senoides graves numa quinta, uma delas desafinada um nada
  // para o batimento lento. Entra com a abertura do ar e cresce nas paradas.
  const drone = context.createGain();
  drone.gain.value = 0;
  const voices = [55, 82.6, 110.3].map((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const level = context.createGain();
    level.gain.value = [1, 0.55, 0.22][index] ?? 0.2;
    oscillator.connect(level).connect(drone);
    oscillator.start();
    return { oscillator, level };
  });
  drone.connect(destination);

  // A cada quadro de rolagem e a cada 100 ms — a pressão do bando muda sem
  // ninguém rolar. `setTargetAtTime` amortece tudo: nada no som dá degrau.
  const update = () => {
    const now = context.currentTime;
    const progress = getScrollProgress();
    const field = getSoundField();
    const openness = field.live ? field.openness : 0.3;
    const pressure = field.live ? field.pressure : 0;
    const cutoff = (160 + 1500 * openness * openness) * (1 - 0.55 * pressure);
    lowpass.frequency.setTargetAtTime(Math.max(90, cutoff), now, 0.35);
    band.frequency.setTargetAtTime(90 + 260 * progress, now, 0.8);
    const level = 0.01 + 0.03 * openness + 0.02 * pressure;
    gain.gain.setTargetAtTime(level, now, 0.5);
    drone.gain.setTargetAtTime(0.012 * openness + 0.014 * pressure, now, 1.4);
  };
  const stopScroll = subscribeToScroll(update);
  const timer = window.setInterval(update, 100);
  update();

  const onCue = (cue: SoundCue) => {
    try {
      playCue(context, destination, cue);
    } catch {
      // Um sopro que não toca não impede ninguém de atravessar.
    }
  };
  const stopCues = subscribeToCues(onCue);

  return {
    dispose: () => {
      stopScroll();
      stopCues();
      window.clearInterval(timer);
      const now = context.currentTime;
      gain.gain.setTargetAtTime(0, now, 0.2);
      drone.gain.setTargetAtTime(0, now, 0.2);
      window.setTimeout(() => {
        source.disconnect();
        lowpass.disconnect();
        band.disconnect();
        gain.disconnect();
        for (const voice of voices) {
          voice.oscillator.stop();
          voice.oscillator.disconnect();
          voice.level.disconnect();
        }
        drone.disconnect();
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
