/**
 * A vitrine: os itens da parede de telas da cena, num arquivo só. Não há
 * página: a parede mostra as telas, e o nome dos itens vai em DOM só para
 * leitor de tela. `year`, `discipline`, `type` e `slug` não são desenhados hoje.
 * Dos seis cases da trilha, Perfecting, Agentes de IA e netLex entram também
 * aqui; os outros ficam só com a placa deles.
 *
 * A parede tem 27 telas, 9 colunas de 3 (`lib/scene/world.ts`), preenchidas
 * coluna a coluna: cada item tem três telas e fica com uma coluna inteira.
 *
 * As telas saem de `scripts/derive-vitrine.mjs`, no formato delas, sem corte:
 * o quadro põe a margem em volta; uma montagem junta duas telas num quadro.
 * Toda tela tem ao lado um `.sm.webp` de mesmo nome, a versão pequena que a
 * parede carrega de saída. Uma tela `.mp4` é um
 * loop mudo; uma `.webp` é a versão grande, carregada quando a câmera chega.
 */
export type VitrineScreen = {
  /** O arquivo em `public/`, `.mp4` ou `.webp`. */
  src: string;
  /** Largura sobre altura, como `derive-vitrine` imprime. */
  aspect: number;
};

export type VitrineItem = {
  name: string;
  year?: number;
  discipline?: string;
  type?: string;
  slug?: string;
  /** As três telas do item, de cima para baixo na coluna dele. */
  screens: readonly [VitrineScreen, VitrineScreen, VitrineScreen];
};

const V = "/assets/img/vitrine";
const WIDE = 16 / 9;

export const VITRINE: readonly VitrineItem[] = [
  {
    // O checklist de pré-operação (três celulares num quadro: a home, a
    // jornada acelerada e o liberado; a triagem no desktop) e o painel de
    // contratos.
    name: "TiL Group",
    year: 2026,
    screens: [
      { src: `${V}/til-group/checklist-mobile.mp4`, aspect: 1.504 },
      { src: `${V}/til-group/triagem-ia.mp4`, aspect: WIDE },
      { src: `${V}/til-group/contratos-painel.webp`, aspect: 1.778 },
    ],
  },
  {
    name: "netLex",
    slug: "netlex",
    screens: [
      { src: `${V}/netlex/contrato-detalhe.webp`, aspect: 1.773 },
      { src: `${V}/netlex/dashboard-juridico.webp`, aspect: 1.667 },
      { src: `${V}/netlex/home-rh.mp4`, aspect: WIDE },
    ],
  },
  {
    name: "Perfecting",
    year: 2026,
    discipline: "Produto · Marca",
    slug: "perfecting",
    screens: [
      { src: `${V}/perfecting/analytics.mp4`, aspect: 1.361 },
      { src: `${V}/perfecting/antes-e-durante.webp`, aspect: 1.6 },
      { src: `${V}/perfecting/resultado.webp`, aspect: 1.362 },
    ],
  },
  {
    name: "iFood",
    screens: [
      { src: `${V}/ifood/webapp-e-rede.mp4`, aspect: WIDE },
      { src: `${V}/ifood/totens-portal-mobile.mp4`, aspect: WIDE },
      { src: `${V}/ifood/webapp-pratos.webp`, aspect: 1.777 },
    ],
  },
  {
    // O Cubo Workspace, do Cubo Itaú: o conceito da home e a auditoria de UX.
    name: "Itaú",
    screens: [
      { src: `${V}/itau/conceito-home-scroll.mp4`, aspect: WIDE },
      { src: `${V}/itau/auditoria-ux.mp4`, aspect: WIDE },
      { src: `${V}/itau/conceito-home.webp`, aspect: 1.429 },
    ],
  },
  {
    name: "Atlas Gov",
    screens: [
      { src: `${V}/atlas-gov/glass-desktop.mp4`, aspect: WIDE },
      { src: `${V}/atlas-gov/glass-mobile.mp4`, aspect: WIDE },
      { src: `${V}/atlas-gov/home-dashboard.webp`, aspect: 1.406 },
    ],
  },
  {
    name: "Agentes de IA",
    year: 2026,
    discipline: "Produto · Sistema",
    slug: "wecann-atena",
    screens: [
      { src: `${V}/wecann-care/conversa.mp4`, aspect: WIDE },
      { src: `${V}/wecann-care/agenda-e-pacientes.webp`, aspect: 1.6 },
      { src: `${V}/wecann-care/acompanhamento-e-casuistica.webp`, aspect: 1.6 },
    ],
  },
  {
    // Natal Mágico, o totem de foto com IA, em pé.
    name: "Continente Shopping",
    year: 2026,
    screens: [
      { src: `${V}/natal-magico/home-neve.mp4`, aspect: 0.563 },
      { src: `${V}/natal-magico/formulario.mp4`, aspect: 0.563 },
      { src: `${V}/natal-magico/contagem-flash.mp4`, aspect: 0.563 },
    ],
  },
  {
    name: "Solan Group",
    screens: [
      { src: `${V}/solan-group/relatorios-personalizado.webp`, aspect: 1.636 },
      { src: `${V}/solan-group/relatorios-problemas.webp`, aspect: 0.901 },
      { src: `${V}/solan-group/mobile-home.webp`, aspect: 0.475 },
    ],
  },
];
