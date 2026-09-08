"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { localizePath, type Locale } from "@/lib/i18n/config";
import {
  getRiverFilter,
  noRiverFilter,
  subscribeToRiverFilter,
} from "@/lib/work/filter-store";

type ArchiveLinkProps = {
  label: string;
  locale: Locale;
};

/**
 * A entrada de acervo da HUD — PROJECT.md §4.
 *
 * É a única forma de chegar num case fora do rio, então não é opcional e não
 * pode depender de JavaScript: continua sendo um `<a>` de verdade, renderizado
 * no servidor, que funciona no modo calmo, sem WebGL e com o JS ainda baixando.
 * O que a hidratação acrescenta é só o `?d=` — sem ela o link vai para o acervo
 * inteiro, que é o destino certo por padrão.
 *
 * **Por que o filtro viaja na URL.** O rio ainda não existe, e um controle de
 * filtro que só publicasse estado seria um botão morto. A mesma seleção que vai
 * promover cards na câmara filtra a lista do acervo hoje — mesmo eixo, mesmo
 * vocabulário, efeito visível. Ver `lib/work/filter-store.ts`.
 */
export function ArchiveLink({ label, locale }: ArchiveLinkProps) {
  const filter = useSyncExternalStore(
    subscribeToRiverFilter,
    getRiverFilter,
    noRiverFilter,
  );

  const href = localizePath("/work", locale);

  return (
    <Link
      href={filter === null ? href : `${href}?d=${filter}`}
      className="type-mono text-hud text-mist w-fit hover:text-cyan"
    >
      {label}
    </Link>
  );
}
