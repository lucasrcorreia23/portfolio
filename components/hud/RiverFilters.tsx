"use client";

import { useSyncExternalStore } from "react";
import { beatAt } from "@/components/beats/beats";
import { DISCIPLINES, type Discipline } from "@/lib/disciplines";
import {
  getRiverFilter,
  noRiverFilter,
  subscribeToRiverFilter,
  toggleRiverFilter,
} from "@/lib/work/filter-store";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";

type RiverFiltersProps = {
  label: string;
  /** Os três eixos, traduzidos no servidor. */
  disciplines: Record<Discipline, string>;
};

/**
 * Os filtros do trabalho — PROJECT.md §4, DIRECTION.md §4.
 *
 * **Três eixos, seleção única, e o aceso apaga no segundo clique.** O filtro
 * nunca remove um case: ele **promove** — as peças que casam vêm para o eixo da
 * câmara e as outras recuam para a periferia, ainda montadas. Duas promoções
 * simultâneas seriam duas rotas para o mesmo escoamento, então o controle é de
 * um eixo por vez e `null` é um estado legítimo.
 *
 * **Ele aparece a partir do rio e não some depois.** Filtro visível na
 * Emergência seria um controle sem objeto — não há nada montado na câmara para
 * promover antes de 0.45. Da Superfície ele continua visível porque de lá ainda
 * se volta, e porque a entrada de acervo ao lado usa a mesma seleção.
 *
 * **A seleção já faz efeito hoje**, antes de o rio existir: ela vai como `?d=`
 * na entrada de acervo, e `/work` filtra a lista. Ver
 * `lib/work/filter-store.ts` — um controle que só publicasse estado seria um
 * botão morto na tela.
 */
export function RiverFilters({ label, disciplines }: RiverFiltersProps) {
  const { value: progress } = useScrollProgress({ steps: 100 });
  const filter = useSyncExternalStore(
    subscribeToRiverFilter,
    getRiverFilter,
    noRiverFilter,
  );

  const beat = beatAt(progress);
  if (beat.id !== "work" && beat.id !== "surface") return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="type-mono text-hud-sm text-mist">{label}</p>
      <ul className="flex flex-col gap-1">
        {DISCIPLINES.map((discipline) => (
          <li key={discipline}>
            <button
              type="button"
              aria-pressed={filter === discipline ? "true" : "false"}
              onClick={() => toggleRiverFilter(discipline)}
              className="type-mono text-hud text-mist aria-[pressed=true]:text-cyan"
            >
              {disciplines[discipline]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
