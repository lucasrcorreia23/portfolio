import { BeatReveal } from "./BeatReveal";
import { StationList, type RiverStation } from "./StationList";
import type { Beat } from "./beats";

type WorkBeatProps = {
  beat: Beat;
  /** A curadoria, em ordem de `river_rank`. A mesma que a cena monta. */
  river: readonly RiverStation[];
  stationLabel: string;
  enterLabel: string;
};

/**
 * O DOM do beat de Trabalho — a lista de estações do rio.
 *
 * **Margem esquerda, como Quem sou, e pelo mesmo motivo.** É uma lista de
 * leitura, e leitura se alinha pela borda por onde o olho volta. Os cards ficam
 * do outro lado e ao fundo, atravessando o quadro em perspectiva; a coluna
 * encosta na margem da HUD e não disputa o eixo da câmara com eles.
 *
 * **A entrada é a varredura de recorte que os outros beats já usam.** O
 * PROJECT.md §3.3 veta `fade-up` de 20 px pelo nome, e o piso de contraste vale
 * durante a entrada — uma rampa de opacidade mostraria a lista inteira em
 * contraste reduzido. Aqui cada linha é varrida da esquerda, escalonada pelo
 * índice, como a corrente de cotas que ela descreve.
 *
 * A janela é mais curta que a do beat de propósito: as sete linhas terminam de
 * entrar no primeiro terço da travessia, e o resto do beat é a passagem pelos
 * cards, com o destaque correndo pela lista.
 */
export function WorkBeat({
  beat,
  river,
  stationLabel,
  enterLabel,
}: WorkBeatProps) {
  const span = beat.to - beat.from;

  return (
    <BeatReveal
      from={beat.from + span * 0.04}
      to={beat.from + span * 0.34}
      className="beat-reveal pointer-events-none sticky top-0 flex h-svh flex-col items-start justify-center"
    >
      <StationList
        stations={river}
        stationLabel={stationLabel}
        enterLabel={enterLabel}
        from={beat.from}
        to={beat.to}
      />
    </BeatReveal>
  );
}
