"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { localeOf, localizePath } from "@/lib/i18n/config";
import {
  getCaseState,
  getIdleCaseState,
  subscribeToCase,
} from "@/lib/work/case-transition";

type CaseReturnProps = {
  /** `work.case.back` — o rótulo curto, do léxico da HUD. */
  label: string;
  /** `work.case.backTitle` — o nome acessível, que diz o que acontece. */
  title: string;
  className?: string;
};

/**
 * A volta ao rio.
 *
 * **Este componente só escolhe a entrada de histórico; quem devolve a posição é
 * o `ScrollProvider`.** Com `fromRiver` existe uma entrada da home atrás desta,
 * e `router.back()` a consome em vez de empilhar uma terceira — o que mantém o
 * histórico com o tamanho que a pessoa espera. Sem ela (link direto, acervo,
 * reload dentro do case) só resta um `push`.
 *
 * A posição, nos dois casos, é reposta na mudança de `pathname`, a partir do
 * progresso gravado na saída. Foi assim que a medição pediu: confiando na
 * restauração do navegador a volta caía no topo, porque a remedida do Lenis
 * reassenta a janela no quadro seguinte. E fazendo pelo `pathname` o **botão
 * voltar do navegador** ganha o mesmo comportamento de graça, que este botão
 * sozinho nunca poderia dar. Ver `lib/scroll/ScrollProvider.tsx`.
 *
 * Quem faz a câmera voltar também é a mudança de `pathname` — ver `SceneGate`.
 * Este componente não fala com a cena.
 */
export function CaseReturn({ label, title, className = "" }: CaseReturnProps) {
  const router = useRouter();
  const pathname = usePathname();
  const state = useSyncExternalStore(
    subscribeToCase,
    getCaseState,
    getIdleCaseState,
  );

  const home = localizePath("/", localeOf(pathname));

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={className}
      onClick={() => {
        if (state.fromRiver) {
          router.back();
          return;
        }
        router.push(home, { scroll: false });
      }}
    >
      <span aria-hidden="true">← </span>
      {label}
    </button>
  );
}
