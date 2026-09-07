import type enMessages from "../en";
import about from "./about.json";
import emergence from "./emergence.json";
import gate from "./gate.json";
import hud from "./hud.json";
import identity from "./identity.json";
import meta from "./meta.json";
import surface from "./surface.json";
import work from "./work.json";

/**
 * A anotação com o tipo do dicionário inglês é o teste: uma chave que exista
 * em `en` e falte aqui não compila.
 */
const messages: typeof enMessages = {
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
