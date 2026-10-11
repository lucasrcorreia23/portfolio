"use client";

import { usePathname, useRouter } from "next/navigation";
import { leaveCase } from "@/lib/work/leave-case";

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
 *
 * **A escolha mora em `leaveCase`** (`lib/work/leave-case.ts`), porque o case
 * tem outras duas saídas — o clique fora da coluna e o `Esc`, em `CaseExit` —
 * e as três precisam cair no mesmo lugar do mesmo jeito.
 */
export function CaseReturn({ label, title, className = "" }: CaseReturnProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`group inline-flex items-center gap-2 ${className}`}
      onClick={() => {
        leaveCase(router, pathname);
      }}
    >
      {/* O traço da régua no lugar da flecha: cresce para o lado da volta. */}
      <span
        aria-hidden="true"
        className="ease-strong h-px w-4 origin-right bg-current transition-transform duration-(--dur-snap) group-hover:scale-x-150"
      />
      {label}
    </button>
  );
}
