import { getTranslations } from "next-intl/server";
import { Loading } from "./Loading";

/** Sem JavaScript não há o que carregar: o site aparece inteiro, sem cena. */
const NOSCRIPT_STYLE = `<style>[data-gate-overlay]{display:none}</style>`;

/**
 * O loading mora na home, e só nela: quem chega direto num case por link não
 * tem descida para revelar.
 */
export async function Gate() {
  const t = await getTranslations("loading");
  return (
    <>
      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT_STYLE }} />
      {/* A máscara da flor: sem ela o loading abre vazio. */}
      <link rel="preload" as="image" href="/loading/flor.webp" fetchPriority="high" />
      <Loading
        label={t("label")}
        status={t("status")}
        done={t("done")}
        enter={t("enter")}
      />
    </>
  );
}
