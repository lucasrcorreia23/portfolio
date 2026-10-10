import type enMessages from "../en";
import cases from "./cases.json";
import cta from "./cta.json";
import impact from "./impact.json";
import intro from "./intro.json";
import loading from "./loading.json";
import meta from "./meta.json";
import nav from "./nav.json";
import vitrine from "./vitrine.json";

/**
 * A anotação com o tipo do dicionário inglês é o teste: uma chave que exista
 * em `en` e falte aqui não compila.
 */
const messages: typeof enMessages = {
  meta,
  loading,
  impact,
  intro,
  cases,
  cta,
  vitrine,
  nav,
};

export default messages;
