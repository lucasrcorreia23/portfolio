import { getTranslations } from "next-intl/server";
import { GateOverlay } from "./GateOverlay";

/**
 * O portão pertence à **descida**, não ao layout: PROJECT.md §4 o coloca como
 * o beat "pré" da home. Quem chega direto num case por link não passa por
 * preloader nenhum — a rota `/work/[slug]` é texto plano e não tem cena para
 * carregar.
 *
 * Este componente é o de servidor: ele resolve os rótulos e desce as strings
 * como props, porque nenhum componente de cliente deste projeto importa o
 * next-intl (AGENTS.md, "Orçamento de JS"). `COTA` vem do léxico da HUD, que
 * é vocabulário compartilhado da cena inteira — repeti-lo no dicionário do
 * portão criaria duas cotas que podem divergir.
 */

/**
 * Trava a descida no parse, antes do primeiro paint.
 *
 * A alternativa seria travar na hidratação, e aí existe uma janela — curta no
 * desktop, longa num celular ruim — em que a página rola por trás de um
 * portão opaco. Pior: o navegador restaura a posição de scroll de um reload,
 * e o site abriria no meio da descida com o portão por cima.
 *
 * Sem JavaScript nada disso roda, e aí o `<noscript>` abaixo tira o portão do
 * caminho: todo o conteúdo textual já está no DOM (PROJECT.md §5), então o
 * site sem JS é o site sem cena, não um site trancado.
 */
const LOCK_SCRIPT = `try{document.documentElement.setAttribute("data-gate","closed");if("scrollRestoration" in history){history.scrollRestoration="manual"}window.scrollTo(0,0)}catch(e){}`;

const NOSCRIPT_STYLE = `<style>[data-gate-overlay]{display:none}</style>`;

export async function Gate() {
  const t = await getTranslations();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: LOCK_SCRIPT }} />
      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT_STYLE }} />
      <GateOverlay
        label={t("gate.label")}
        enter={t("gate.enter")}
        unit={t("gate.unit")}
        levelLabel={t("hud.lexicon.level")}
        loadingStatus={t("gate.loading")}
        readyStatus={t("gate.ready")}
      />
    </>
  );
}
