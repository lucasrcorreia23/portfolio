# lucasrc.com.br

Portfólio de Lucas Rodrigues Correia, product designer e design engineer.
Direção "planeta": natureza de outro planeta atravessada por indústria, à
noite. A indústria é neutra; a flora é a única luz da cena.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · three + React
Three Fiber (WebGL2, compositor de pós próprio) · GSAP + Lenis · next-intl
(pt/en) · MDX.

## Rodando

```bash
nvm use          # Node 24, ver .nvmrc
npm install
npm run dev      # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` · `npm run typecheck` | eslint · `tsc --noEmit` |
| `npm run measure` | orçamento de JS, lido da build (rode depois do `build`) |
| `node scripts/capture.mjs <url> <saida.png>` | captura de tela com um Chrome próprio |

Em desenvolvimento a cena aceita `?at=0.42` (fixa o progresso e pula o loading)
e `?stats=1` (publica draw calls e triângulos em `window.__sceneStats`).

## O site

Uma descida única por scroll, em cinco momentos: **loading**, **impacto**,
**introdução**, **cases** (uma parada por case) e **CTA**. `/vitrine` é a lista
de trabalhos; `/work/[slug]` é a rota de cada case.

## Onde estão as coisas

```
app/[locale]/(scene)/    a home e /work/[slug]: dividem a cena, que não remonta
app/[locale]/(archive)/  /vitrine, sem cena
components/gate/         o loading
components/beats/        os momentos da descida, em DOM
components/hud/          a navegação lateral
components/scene/        a cena: laço mestre, terreno, flora, painéis, compositor
components/work/         o DOM do case, o placeholder e a grade da vitrine
lib/scene/world.ts       a planta: terreno, trilha, paradas, manchas de flora
lib/scene/rail.ts        a câmera ao longo do progresso
lib/scene/quality.ts     os três níveis de qualidade
lib/cases.ts             os cases publicados, em ordem fixa
content/cases/           os cases, em .mdx
content/vitrine.ts       os itens da vitrine
content/messages/        os dicionários, por momento e por idioma
docs/legado/             a direção anterior do projeto, só para consulta
```

As regras de trabalho estão em `AGENTS.md`; o relatório da refatoração, em
`docs/RELATORIO-PLANETA.md`.
