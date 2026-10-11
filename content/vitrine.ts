/**
 * A vitrine: os itens da parede de telas da cena, num arquivo só. Não há
 * página: a parede mostra as telas, e o nome dos itens vai em DOM só para
 * leitor de tela. `year`, `discipline`, `type` e `slug` não são desenhados hoje.
 * Dos seis cases da trilha, Perfecting, Agentes de IA e netLex entram também
 * aqui; os outros ficam só com a placa deles.
 *
 * A parede tem 27 telas, preenchidas coluna a coluna, três por coluna
 * (`lib/scene/world.ts`). Os itens com `screens` somam 21; as 6 que sobram
 * são placeholders, divididas entre os 5 itens sem telas. A ordem abaixo
 * intercala os dois para os placeholders não se juntarem num canto da parede.
 *
 * Uma tela `.mp4` é um loop mudo, 16:10, e precisa de um `.webp` com o mesmo
 * nome ao lado: é o quadro que a parede mostra antes de o vídeo tocar.
 */
export type VitrineItem = {
  name: string;
  year?: number;
  discipline?: string;
  type?: string;
  slug?: string;
  /**
   * As telas do item na parede da vitrine: caminhos de imagem ou vídeo em
   * `public/`, 16 por 10. Sem isto o item entra com placeholders, e as telas
   * que sobram na parede são divididas entre os itens sem telas próprias.
   */
  screens?: readonly string[];
};

const V = "/assets/img/vitrine";

export const VITRINE: readonly VitrineItem[] = [
  {
    name: "Atlas Gov",
    screens: [
      `${V}/atlas-gov/glass-desktop.mp4`,
      `${V}/atlas-gov/home-dashboard.webp`,
      `${V}/atlas-gov/meeting-ai-summary.webp`,
    ],
  },
  {
    name: "Cruise Trade News",
    year: 2026,
    screens: [`${V}/cruise-trade-news/classic-scroll.mp4`],
  },
  {
    name: "Agentes de IA",
    year: 2026,
    discipline: "Produto · Sistema",
    slug: "wecann-atena",
    screens: [
      `${V}/wecann-care/conversa.mp4`,
      `${V}/wecann-care/landing-hero.webp`,
      `${V}/wecann-care/discutir-caso.webp`,
    ],
  },
  {
    // Contratos (IPM) e o checklist de pré-operação: os dois levam a marca TiL.
    name: "TiL Group",
    year: 2026,
    screens: [`${V}/til-group/editor-fluxo.mp4`, `${V}/til-group/checklist-mobile.webp`],
  },
  { name: "Nestlé", year: 2024, discipline: "Produto · Marca" },
  {
    name: "netLex",
    slug: "netlex",
    screens: [`${V}/netlex/contrato-detalhe.webp`, `${V}/netlex/dashboard-juridico.webp`],
  },
  {
    name: "iFood",
    screens: [`${V}/ifood/webapp-e-rede.mp4`, `${V}/ifood/webapp-pratos.webp`],
  },
  { name: "Periscope" },
  {
    // O case dela saiu da trilha; fica uma tela aqui.
    name: "Unifique Energia",
    year: 2025,
    screens: [`${V}/unifique-energia/painel.webp`],
  },
  { name: "Real Response Media" },
  {
    // Conceito da home do Cubo Workspace, do Cubo Itaú.
    name: "Itaú",
    screens: [`${V}/itau/conceito-home-scroll.mp4`, `${V}/itau/conceito-home-comunidade.webp`],
  },
  { name: "Multlog" },
  {
    // Natal Mágico, o totem de foto com IA.
    name: "Continente Shopping",
    year: 2026,
    screens: [`${V}/continente-shopping/triptico-fluxo.webp`, `${V}/continente-shopping/home-neve.mp4`],
  },
  { name: "Solan Group" },
  {
    name: "Perfecting",
    year: 2026,
    discipline: "Produto · Marca",
    slug: "perfecting",
    screens: [
      `${V}/perfecting/analytics.mp4`,
      `${V}/perfecting/ligacao.webp`,
      `${V}/perfecting/resultado.webp`,
    ],
  },
];
