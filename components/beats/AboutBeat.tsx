import { BeatReveal } from "./BeatReveal";
import type { Beat } from "./beats";

type AboutBeatProps = {
  beat: Beat;
  /** Os três parágrafos do manifesto, na ordem de leitura. */
  manifesto: readonly string[];
};

/**
 * O DOM de Quem sou — DIRECTION.md §4: "Manifesto em coluna estreita alinhada a
 * uma margem, nunca centralizada, grotesca regular, medida de 60 a 70
 * caracteres."
 *
 * **Margem esquerda, e não a direita da Identidade.** A coluna de posicionamento
 * da Identidade foi para a direita porque a régua da HUD ocupa a esquerda e um
 * bloco de mono curto cabe em qualquer margem. Aqui é diferente: é texto de
 * leitura, e texto de leitura se alinha pela borda por onde o olho volta. A
 * coluna encosta na margem da HUD e o poleiro do bando fica à direita dela —
 * a composição do beat é essa divisão, texto de um lado, organismo do outro,
 * com a parede graduada correndo entre os dois até o ponto de fuga.
 *
 * **A entrada é uma lâmina de medida descendo pela coluna**, e não um
 * `fade-up` de 20 px (PROJECT.md §3.3 veta pelo nome). O bloco inteiro é
 * recortado na altura da lâmina, que é um fio de um pixel com uma marca de
 * intervalo na ponta: o texto fica **gravado atrás dela** conforme ela desce.
 * Nada translada e nada esmaece — cada pixel visível já está em `--mist` cheio,
 * que é o que mantém o piso de 4.5:1 válido também durante a entrada, e não só
 * no repouso.
 *
 * As três coisas da composição são a mesma variável: a lâmina, o recorte e a
 * posição da câmera saem todas do progresso normalizado.
 */
export function AboutBeat({ beat, manifesto }: AboutBeatProps) {
  const span = beat.to - beat.from;

  return (
    <BeatReveal
      from={beat.from + span * 0.08}
      to={beat.from + span * 0.62}
      className="beat-reveal pointer-events-none sticky top-0 flex h-svh flex-col items-start justify-center"
    >
      {/* `data-veil` marca a caixa que o véu de legibilidade ancora na cena. Ela
          é a coluna inteira, e não só a parte já revelada: um véu que crescesse
          junto com o recorte seria um banco de névoa mudando de tamanho a cada
          quadro, e o DIRECTION.md §5 quer o contrário — uma névoa baixa e
          estável, que sobe só quando um cacho chega. */}
      <div
        data-veil
        className="beat-about measure pointer-events-auto relative"
      >
        <div className="beat-about-page flex flex-col gap-6">
          {manifesto.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="text-body-lg text-mist">
              {paragraph}
            </p>
          ))}
        </div>
        <span aria-hidden="true" className="beat-about-blade" />
      </div>
    </BeatReveal>
  );
}
