/**
 * A vitrine: tudo o que aparece em `/vitrine`, num arquivo só.
 *
 * Campo vazio não aparece na tela. `slug` liga o item à rota de um case; sem
 * ele o item não tem link. O filtro por `type` só é desenhado quando houver
 * mais de um tipo cadastrado.
 */
export type VitrineItem = {
  name: string;
  year?: number;
  discipline?: string;
  type?: string;
  slug?: string;
};

export const VITRINE: readonly VitrineItem[] = [
  { name: "Decision Suite", year: 2024, discipline: "Produto · Sistema", slug: "decision-suite" },
  { name: "Prime8", year: 2023, discipline: "Produto · Sistema · Marca", slug: "prime8" },
  { name: "Perfecting", year: 2026, discipline: "Produto · Marca", slug: "perfecting" },
  { name: "Unifique Energia", year: 2025, discipline: "Produto · Sistema · Marca", slug: "unifique-energia" },
  { name: "WeCann Care", year: 2025, discipline: "Produto · Sistema", slug: "wecann-atena" },
  { name: "Portonave", slug: "portonave" },
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
