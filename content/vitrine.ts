/**
 * A vitrine: os itens da parede de telas da cena, num arquivo só. Não há
 * página: a parede mostra as telas, e o nome dos itens vai em DOM só para
 * leitor de tela. `year`, `discipline`, `type` e `slug` não são desenhados hoje.
 * Os seis cases da trilha não entram: cada um já tem a placa dele.
 */
export type VitrineItem = {
  name: string;
  year?: number;
  discipline?: string;
  type?: string;
  slug?: string;
  /**
   * As telas do item na parede da vitrine: caminhos de imagem em `public/`,
   * 16 por 10. Sem isto o item entra com placeholders, e as telas que sobram
   * na parede são divididas entre os itens sem telas próprias.
   */
  screens?: readonly string[];
};

export const VITRINE: readonly VitrineItem[] = [
  { name: "Nestlé", year: 2024, discipline: "Produto · Marca" },
  { name: "Atlas Gov" },
  { name: "Periscope" },
  { name: "Itaú" },
  { name: "iFood" },
  { name: "TiL Group" },
  { name: "netLex" },
  { name: "Real Response Media" },
  { name: "Multlog" },
];
