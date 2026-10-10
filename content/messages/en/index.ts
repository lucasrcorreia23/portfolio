import cases from "./cases.json";
import cta from "./cta.json";
import impact from "./impact.json";
import intro from "./intro.json";
import loading from "./loading.json";
import meta from "./meta.json";
import nav from "./nav.json";
import vitrine from "./vitrine.json";

/**
 * O dicionário inglês é o shape canônico: `lib/i18n/augment.d.ts` deriva o
 * tipo `Messages` daqui, e o português é anotado com ele.
 */
const messages = {
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
