/**
 * O fio entre a cena e o som — fora do React, e sem importar nada.
 *
 * Pelo mesmo motivo do `readout-store`: quem publica é a cena, que está no
 * chunk dinâmico, e quem lê é o leito sonoro (`sound-bed.ts`), que carrega
 * depois do clique no portão. Um import de three aqui levaria a cena para a
 * rota inicial.
 *
 * Duas leituras contínuas e um canal de eventos:
 *
 * - `openness`, 0 a 1: quanto a câmara está aberta em volta da câmera — a seção
 *   do duto naquele ponto e a névoa. A garganta fecha, o rio abre.
 * - `pressure`, 0 a 1: quanta massa do bando está perto da câmera, pesada pela
 *   energia — a mesma conta do rig de luz, vinda do proxy da CPU.
 * - os **cues**: atravessar um card, abrir um case, um título acendendo. O baque do portão não passa
 *   por aqui: ele nasce no próprio gesto.
 */

export type SoundField = { openness: number; pressure: number; live: boolean };

const field: SoundField = { openness: 0, pressure: 0, live: false };

export function publishSoundField(openness: number, pressure: number): void {
  field.openness = Number.isFinite(openness) ? openness : 0;
  field.pressure = Number.isFinite(pressure) ? pressure : 0;
  field.live = true;
}

export function clearSoundField(): void {
  field.live = false;
}

export function getSoundField(): Readonly<SoundField> {
  return field;
}

export type SoundCue = { kind: "card" | "case" | "text" | "readout"; pan: number };

const cueListeners = new Set<(cue: SoundCue) => void>();

/** `pan` de −1 (bombordo) a +1 (estibordo). */
export function emitCue(kind: SoundCue["kind"], pan = 0): void {
  for (const listener of cueListeners) listener({ kind, pan });
}

export function subscribeToCues(listener: (cue: SoundCue) => void): () => void {
  cueListeners.add(listener);
  return () => {
    cueListeners.delete(listener);
  };
}
