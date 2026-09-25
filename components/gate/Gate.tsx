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
 * A trava da descida **não está mais aqui**, e o script de restauração também
 * não. Os dois saíram por motivos diferentes.
 *
 * A trava escrevia `data-gate="closed"` no `<html>` durante o parse, e o React
 * acusava divergência de hidratação em toda visita. Ela virou uma regra de CSS
 * ancorada no `data-gate-phase` do próprio overlay (`styles/globals.css`), que
 * vem no HTML do servidor.
 *
 * O script de `scrollRestoration` (rodada 12) saiu porque um `<script>` dentro
 * de um componente só roda no HTML do servidor: quando o portão monta por
 * navegação de cliente — voltar de um case, o link do acervo, a troca de
 * idioma — o React **cria** o elemento, não o executa, e o Next 16 acusa
 * "Encountered a script tag while rendering React component". Ele mora agora
 * no layout raiz como `next/script` `beforeInteractive` (`RESTORE_SCRIPT`, em
 * `app/[locale]/layout.tsx`), e confere o caminho da home ele mesmo.
 *
 * Sem JavaScript nada disso roda, e aí o `<noscript>` abaixo tira o portão do
 * caminho: todo o conteúdo textual já está no DOM (PROJECT.md §5), então o
 * site sem JS é o site sem cena, não um site trancado.
 */
const NOSCRIPT_STYLE = `<style>[data-gate-overlay]{display:none}</style>`;

export async function Gate() {
  const t = await getTranslations();

  return (
    <>
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
