import type { CSSProperties } from "react";
import { DisplayLine } from "@/components/type/DisplayLine";
import { BeatReveal } from "./BeatReveal";
import type { Beat } from "./beats";

type IdentityBeatProps = {
  beat: Beat;
  /** A string do corpo de prova. A mesma que o troika desenha na cena. */
  specimen: string;
  /** As três linhas do posicionamento, em ordem de leitura. */
  position: readonly string[];
};

/**
 * O DOM da Identidade — DIRECTION.md §4: "Ao lado, coluna mono com o
 * posicionamento em três linhas curtas."
 *
 * **O `h1` continua existindo e não é o que se vê.** O título display é o corpo
 * de prova dentro da cena, geometria de verdade em `troika-three-text`, porque
 * é a única implementação em que o bando oclui e é ocluído pelas letras
 * (PROJECT.md §5). Mas "tudo que precisa ser lido, indexado e selecionado é DOM
 * real", e um `h1` é as três coisas — então ele fica, e some da vista quando há
 * cena para desenhá-lo. Quem decide é `html[data-scene-mode]` em
 * `styles/globals.css`: sem WebGL o `h1` volta a ser o título visível, o que
 * também é o degradado do PROJECT.md §5.
 *
 * **Três linhas, uma por ponta.** São as mesmas três disciplinas que filtram o
 * rio depois (`work.disciplines`), então a arquitetura do site é dita uma vez e
 * reaproveitada. Registro de cota, não de frase: nada aqui está em primeira
 * pessoa, porque tudo o mais na tela é rótulo, coordenada e medida.
 *
 * **Margem direita.** A régua da HUD ocupa a lateral esquerda o tempo todo; a
 * coluna vai para a outra margem, e para o terço inferior, fora da faixa onde o
 * corpo de prova atravessa o quadro. Nunca centralizada.
 */
export function IdentityBeat({ beat, specimen, position }: IdentityBeatProps) {
  const span = beat.to - beat.from;

  return (
    <>
      <DisplayLine as="h1" step="display-1" className="beat-specimen mt-6">
        {specimen}
      </DisplayLine>

      <BeatReveal
        from={beat.from + span * 0.15}
        to={beat.from + span * 0.7}
        className="beat-reveal pointer-events-none sticky top-0 flex h-svh flex-col items-end justify-end pb-10"
      >
        {/* `w-fit` pela mesma razão da Emergência: a caixa que o véu ancora
            precisa ser a do texto. Ver `EmergenceBeat.tsx`. */}
        <ul
          data-veil
          className="type-mono text-hud-sm text-mist pointer-events-auto flex w-fit flex-col items-end gap-2 text-right"
        >
          {position.map((line, index) => (
            <li
              key={line}
              className="beat-identity-line"
              style={{ "--line": index } as CSSProperties}
            >
              {line}
            </li>
          ))}
        </ul>
      </BeatReveal>
    </>
  );
}
