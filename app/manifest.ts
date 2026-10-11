import type { MetadataRoute } from "next";
import { VOID_COLOR } from "@/lib/site-meta";
import en from "@/content/messages/en/meta.json";

/**
 * O manifesto: é dele que o Windows e o Android tiram o ícone e o nome ao
 * fixar ou instalar o site. Os PNGs saem de `scripts/derive-icons.mjs`.
 * Um só, no idioma padrão.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: en.title,
    short_name: en.title,
    description: en.description,
    lang: "en",
    start_url: "/",
    display: "standalone",
    background_color: VOID_COLOR,
    theme_color: VOID_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
