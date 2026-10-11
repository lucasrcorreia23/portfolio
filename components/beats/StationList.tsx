"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getScrollProgress } from "@/lib/scroll/scroll-store";
import { clearCardFocus, setCardFocus } from "@/lib/work/card-focus";
import { enterCase } from "@/lib/work/case-transition";

export type Station = {
  slug: string;
  href: string;
  title: string;
  client: string;
  year: number;
  /** O case pede senha: a placa mostra o campo em vez do link. */
  locked: boolean;
};

export type LockLabels = {
  label: string;
  wrong: string;
};

type StationListProps = {
  stations: readonly Station[];
  enterLabel: string;
  lock: LockLabels;
};

/**
 * Um link de verdade por case, na ordem das paradas: é o caminho de teclado,
 * de leitor de tela e de indexação, e funciona sem JavaScript.
 *
 * Com a cena viva, cada link é posicionado sobre o painel dele (quem escreve o
 * `transform` é o `Panels`), então **o link é a área de clique do painel**.
 * Sem cena, o link focado aparece em DOM (`.card-link` em `globals.css`).
 *
 * O case com senha tem um formulário no lugar do link, na mesma posição: o
 * campo fica na própria placa, sempre — a senha não é lembrada.
 */
export function StationList({ stations, enterLabel, lock }: StationListProps) {
  return (
    <ol className="card-links">
      {stations.map((station, index) => (
        <li key={station.slug}>
          <StationEntry station={station} index={index} enterLabel={enterLabel} lock={lock} />
        </li>
      ))}
    </ol>
  );
}

type EntryProps = {
  station: Station;
  index: number;
  enterLabel: string;
  lock: LockLabels;
};

function StationEntry({ station, index, enterLabel, lock }: EntryProps) {
  if (station.locked) {
    return <StationLock station={station} index={index} lock={lock} />;
  }
  return (
    <Link
      href={station.href}
      className="card-link type-mono text-hud-sm text-mist"
      data-card-link={index}
      aria-label={`${enterLabel}: ${station.title} — ${station.client}, ${station.year}`}
      onFocus={(event) => setCardFocus(index, event.currentTarget)}
      onBlur={(event) => clearCardFocus(event.currentTarget)}
      onPointerEnter={(event) => setCardFocus(index, event.currentTarget)}
      onPointerLeave={(event) => clearCardFocus(event.currentTarget)}
      onClick={() => {
        enterCase(station.slug, index, getScrollProgress());
      }}
    >
      {String(index + 1).padStart(2, "0")} · {station.title}
    </Link>
  );
}

/**
 * O campo de senha de um case trancado. Quem confere é o servidor
 * (`app/api/case-key`): com a senha certa ele entrega o cookie que o proxy
 * pede, e só então a travessia começa. Não há botão: um campo só, e o Enter
 * envia. Sem JavaScript o formulário posta direto e o servidor redireciona.
 */
function StationLock({ station, index, lock }: Omit<EntryProps, "enterLabel">) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "wrong">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "busy") return;
    const key = new FormData(event.currentTarget).get("key");
    setState("busy");
    const response = await fetch("/api/case-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: station.slug, key }),
    }).catch(() => null);
    if (response?.status !== 204) {
      setState("wrong");
      return;
    }
    enterCase(station.slug, index, getScrollProgress());
    router.push(station.href);
  };

  return (
    <form
      method="post"
      action="/api/case-key"
      className="card-link card-lock type-mono text-hud-sm text-mist"
      data-card-link={index}
      onSubmit={(event) => void submit(event)}
      onFocus={(event) => setCardFocus(index, event.target as HTMLElement)}
      onBlur={(event) => clearCardFocus(event.target as HTMLElement)}
      onPointerEnter={(event) => setCardFocus(index, event.currentTarget)}
      onPointerLeave={(event) => clearCardFocus(event.currentTarget)}
    >
      <input type="hidden" name="slug" value={station.slug} />
      <input type="hidden" name="href" value={station.href} />
      <div className="card-lock-body">
        <label>
          <span className="sr-only">
            {String(index + 1).padStart(2, "0")} · {station.title} · {lock.label}
          </span>
          <input
            name="key"
            type="password"
            required
            autoComplete="off"
            placeholder={lock.label}
            aria-invalid={state === "wrong"}
            onChange={() => {
              if (state === "wrong") setState("idle");
            }}
          />
        </label>
        <p className="sr-only" role="status">
          {state === "wrong" ? lock.wrong : ""}
        </p>
      </div>
    </form>
  );
}
