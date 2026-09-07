import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `.mdx` precisa ser importável; os cases não viram rota por si só
  // (eles moram em content/, não em app/), mas a extensão tem que estar aqui
  // para o loader do MDX ser registrado.
  pageExtensions: ["ts", "tsx", "mdx"],
};

// Sem remarkPlugins: o frontmatter dos cases é `export const frontmatter`,
// ESM nativo do MDX. Ver lib/cases.ts e AGENTS.md ("Frontmatter sem YAML").
const withMDX = createMDX({});

// O arquivo de request do next-intl mora em lib/i18n/ e não na raiz,
// para a estrutura de pastas do projeto continuar sendo a do PROJECT.md.
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(withMDX(nextConfig));
