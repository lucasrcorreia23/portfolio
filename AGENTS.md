<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# lucasrc.com.br — direção "planeta"

Natureza de outro planeta atravessada por indústria, à noite. A indústria é neutra; a natureza emite luz.
`docs/legado/` guarda a direção antiga: não siga, não atualize, não use como critério de pronto.

**Stack.** Next.js 16 (App Router), React 19.2 (`~19.2`, por causa do R3F 9), TypeScript 6, Tailwind v4,
three 0.185 + React Three Fiber 9 (compositor de pós próprio, WebGL2), GSAP + Lenis, next-intl (pt/en), MDX.

**Comandos.** `npm run dev` · `build` · `start` · `lint` · `typecheck` · `measure` (orçamento de JS, depois do build).

**Orçamentos.** JS da home e do case ≤ 200 kB gz; chunk da cena ≤ 350 kB gz; ≤ 100 draw calls e 400 mil triângulos no nível médio.

## Regras de trabalho

1. O prompt do Lucas é a única fonte de direção.
2. Execute de uma vez, na ordem pedida, sem perguntar.
3. Cada etapa é feita uma vez e termina com um commit. Não volte a etapa commitada.
4. Na dúvida entre duas opções, escolha uma, anote em uma linha e siga.
5. Sem crítico, nota ou medição no pixel. Não crie instrumentos, rodadas ou tarefas próprias.
6. Número de desempenho fora do orçamento: uma tentativa de correção; se continuar fora, registre e siga.
7. Prefira remover a adicionar. Código antigo é apagado, não escondido atrás de flag.
8. Quando a última etapa terminar, o trabalho acabou. Não comece melhorias.

Git: trabalhe só na branch `planeta`. Nunca commit, merge ou push em `main`. Nunca promova a produção.

## Modo de iteração

Depois do relatório, cada mensagem do Lucas é um ajuste isolado: faça só o que ela pede, em um commit,
responda em até cinco linhas e pare. Não abra tarefas, não atualize documentos, não retome a lista "depois".
