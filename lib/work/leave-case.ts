import { localeOf, localizePath } from "@/lib/i18n/config";
import { getCaseState } from "./case-transition";

/** O pedaço do `useRouter()` que a volta usa. */
type Router = {
  back: () => void;
  push: (href: string, options?: { scroll?: boolean }) => void;
};

/**
 * O caminho do case que já pediu a volta. Um segundo pedido no mesmo case é
 * descartado: dois `Esc` rápidos, ou o botão mais um clique fora, dariam dois
 * `router.back()` — e o segundo tiraria a pessoa do site.
 */
let pending: string | null = null;

/**
 * A volta ao rio — **uma** função para as três saídas do case: o controle
 * `← RIO` (`CaseReturn`), o clique fora da coluna e o `Esc` (`CaseExit`).
 *
 * Ela só escolhe a entrada de histórico. Com `fromRiver` existe uma entrada da
 * home atrás desta, e `router.back()` a consome; sem ela (link direto, acervo,
 * reload dentro do case) só resta um `push`. Quem devolve a posição da descida
 * é o `ScrollProvider`, na mudança de `pathname` — o mesmo caminho pelo qual o
 * botão voltar do navegador passa. Ver `CaseReturn`.
 */
export function leaveCase(router: Router, pathname: string): void {
  if (pending === pathname) return;
  pending = pathname;
  if (getCaseState().fromRiver) {
    router.back();
    return;
  }
  router.push(localizePath("/", localeOf(pathname)), { scroll: false });
}

/** Um case novo montou: a trava do pedido anterior não vale para ele. */
export function resetLeave(): void {
  pending = null;
}
