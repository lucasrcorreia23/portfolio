import about from "./about.json";
import emergence from "./emergence.json";
import gate from "./gate.json";
import hud from "./hud.json";
import identity from "./identity.json";
import meta from "./meta.json";
import surface from "./surface.json";
import work from "./work.json";

/**
 * O dicionário é separado por beat: um arquivo por momento da descida
 * (DIRECTION.md §4), mais `hud` — que está na tela o tempo todo — e `meta`,
 * que é o que o `<head>` consome.
 *
 * Este arquivo é o shape canônico: `lib/i18n/augment.d.ts` deriva o tipo
 * `Messages` daqui, então uma chave que exista em `en` e falte em `pt`
 * (ou vice-versa) vira erro de tipo, não string faltando em produção.
 */
const messages = {
  meta,
  gate,
  emergence,
  identity,
  about,
  work,
  surface,
  hud,
};

export default messages;
