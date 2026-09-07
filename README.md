# lucasrc.com.br

Portfólio de Lucas Rodrigues Correia — product designer e design engineer.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Lenis · GSAP ·
next-intl (pt/en) · MDX. A cena 3D (three / React Three Fiber /
troika-three-text) entra numa etapa seguinte.

## Rodando

```bash
nvm use          # Node 24, ver .nvmrc
npm install
npm run dev      # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | dev server com Turbopack |
| `npm run build` | build de produção |
| `npm run start` | roda o build |
| `npm run lint` | eslint |
| `npm run typecheck` | `tsc --noEmit` |

## Onde estão as coisas

```
app/[locale]/     rotas — / em inglês, /pt em português
components/       scene/ · hud/ · beats/ · type/
content/cases/    os cases, em .mdx
content/messages/ dicionários, um arquivo por beat
lib/              scroll, capacidades, i18n, tokens
styles/           globals.css + tokens.css
```

## Documentação

| Arquivo | O que é |
|---|---|
| `PROJECT.md` | a verdade do projeto — o que o site é, a metáfora, o sistema visual, as restrições |
| `DIRECTION.md` | a rota estética — como essa verdade se parece, beat a beat |
| `AGENTS.md` | o mapa do código, as travas de versão e as armadilhas |

Onde `PROJECT.md` e `DIRECTION.md` divergirem, o `PROJECT.md` ganha.

O estado anterior do repositório — um template HTML comprado, descartado e não
migrado — está na tag `template-legado`.

## Deploy

Vercel, na branch `main`.
