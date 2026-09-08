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
 * A trava da descida **não está mais aqui**, e a mudança tem uma razão só.
 *
 * Este script escrevia `data-gate="closed"` no `<html>` durante o parse, antes
 * da hidratação — e portanto num atributo que a marcação do servidor não tinha.
 * O React comparava os dois e acusava divergência de hidratação em toda visita.
 *
 * A trava continua valendo desde o primeiro paint, e agora sem script nenhum:
 * ela é uma regra de CSS ancorada no `data-gate-phase` do próprio overlay
 * (`styles/globals.css`), que **vem no HTML do servidor**. Servidor e cliente
 * concordam porque estão olhando o mesmo elemento, e a trava sai sozinha quando
 * a fase muda no clique.
 *
 * O que sobra de imperativo tem que ser imperativo: `scrollRestoration` e o
 * `scrollTo` não são atributos renderizados, não entram na comparação de
 * hidratação, e precisam rodar antes do primeiro paint — senão o navegador
 * restaura a posição de um reload e o site abre no meio da descida com o portão
 * por cima.
 *
 * Sem JavaScript nada disso roda, e aí o `<noscript>` abaixo tira o portão do
 * caminho: todo o conteúdo textual já está no DOM (PROJECT.md §5), então o
 * site sem JS é o site sem cena, não um site trancado.
 */
const LOCK_SCRIPT = `try{if("scrollRestoration" in history){history.scrollRestoration="manual"}window.scrollTo(0,0)}catch(e){}`;

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
