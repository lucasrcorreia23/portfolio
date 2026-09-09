"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  Color,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import { localeOf, localizePath } from "@/lib/i18n/config";
import { damp } from "@/lib/motion";
import { enterCase } from "@/lib/work/case-transition";
import {
  getRiverFilter,
  subscribeToRiverFilter,
  type RiverFilter,
} from "@/lib/work/filter-store";
import { getScrollProgress } from "@/lib/scroll/scroll-store";
import { createCardAtlas } from "@/lib/scene/card-atlas";
import {
  PLATE_LAYER_HEIGHT,
  PLATE_LAYER_WIDTH,
} from "@/lib/scene/card-layout";
import { installCardPick, type CardPick } from "@/lib/scene/card-pick";
import {
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
  MAX_CARDS,
  resolveRiver,
  type RiverLayout,
} from "@/lib/scene/cards";
import type { RiverCard } from "@/lib/scene/river-content";
import { flowTarget } from "@/lib/scene/river-flow";
import { CARD_FRAG, CARD_VERT } from "@/lib/scene/shaders/cards";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";

/**
 * O rio — os corpos de prova do beat de Trabalho, montados ao longo da câmara.
 *
 * **São planos na cena, não elementos de DOM com transform.** É a mesma regra
 * que o PROJECT.md §5 aplica ao corpo de prova, e pelo mesmo motivo: um card em
 * DOM quebra no instante em que um corpo do bando passa entre ele e a câmera —
 * que é justamente o momento que importa, porque é ele que prova que o card
 * está *dentro* da câmara. Opacos, escrevendo profundidade, com a mesma névoa e
 * a mesma pós-produção de todo o resto.
 *
 * **Uma malha instanciada, e não sete meshes.** O corpo é idêntico; o que muda
 * por card é centro, ângulo de montagem, tom, acento e semente — cinco
 * atributos de instância contra sete entradas na lista de render e sete
 * conjuntos de uniforms por quadro.
 *
 * `frustumCulled = false` pela mesma razão do bando: a esfera envolvente que a
 * CPU calcularia seria a do plano único na origem, e a corrente inteira sumiria
 * assim que a câmera saísse de perto do zero. A esfera enorme é a declaração de
 * que quem sabe onde as peças estão é o vertex shader.
 *
 * ## Onde a corrente é escrita, e por que ela deixou de ser escrita uma vez só
 *
 * Este componente continua sendo o **único** que escreve `shared.cards`, mas
 * agora ele escreve **por quadro enquanto o filtro está reorganizando o rio** —
 * e volta a não escrever quando a reorganização assenta. As duas coisas
 * importam:
 *
 * - Escrever durante a reorganização é o que faz o bando mudar de rota junto
 *   com as peças. O passo de velocidade dos boids lê `uCards`, então mover um
 *   card **é** mover a esteira dele. Sem isso o filtro seria um card
 *   deslizando com o escoamento parado no lugar antigo, que é exatamente o
 *   "cards trocando de lugar" que o DIRECTION.md §4 veta.
 * - Parar de escrever quando assenta é o que preserva a medição. A sonda tira
 *   um card do escoamento **escrevendo `uCards[i]` direto** (`park`, em
 *   `probe-cards.ts`); um laço que reescrevesse a corrente em todo quadro
 *   desfaria o estacionamento no quadro seguinte e a medida de esteira mediria
 *   sete cards achando que mede um. Com o filtro em repouso — que é o estado
 *   de toda medição — este componente não toca em `shared.cards`.
 *
 * A corrente de **repouso** continua sendo geometria da câmara, e continua
 * saindo de `lib/scene/cards.ts`. O filtro é um desvio lateral em cima dela,
 * nunca uma segunda corrente.
 */

/**
 * Os tons do substrato, quando a capa ainda não chegou. Ver `coverField` em
 * `shaders/cards.ts`: eles alimentam o campo procedural, que é o estado de
 * espera — nunca um cinza.
 */
const TEST_TONE_KEYS = ["teal", "cyan"] as const;

/**
 * Taxa de amortecimento do desvio do filtro, em unidades de `damp` por segundo.
 *
 * **2.5, e o número é de leitura, não de gosto.** O DIRECTION.md §5 fixa o
 * vocabulário de movimento do bando: "reorganização estala em ~120 ms; o
 * planeio entre estalos dura de 1,5 a 3 s". Uma mudança de rota do rio é
 * planeio, não estalo — a 2.5 a peça percorre 63% do caminho em 0.4 s e 95% em
 * 1.2 s, dentro daquela faixa. A 8 (o número do estalo) a corrente saltaria, e
 * um salto lê como corte de layout; a 1 ela demoraria três segundos e a pessoa
 * clicaria de novo achando que o botão não funcionou.
 */
const FLOW_DAMP = 2.5;

/** Amortecimento da travessia do campo procedural para a fotografia. */
const COVER_DAMP = 3.2;

/**
 * Amortecimento da resposta de ponteiro.
 *
 * Alto de propósito: o PROJECT.md §3.3 pede resposta abaixo de 100 ms, e a
 * rampa faz parte da resposta. A 18 a quina chega a 63% em 55 ms e a 95% em
 * 166 ms — ou seja o **começo** do movimento cai bem dentro do orçamento, que é
 * o que a pessoa sente como "respondeu". Um degrau instantâneo seria mais
 * rápido no papel e contradiria o "nada é linear" do mesmo parágrafo.
 */
const HOVER_DAMP = 18;

type CardsProps = {
  shared: SharedUniforms;
  /**
   * O conteúdo do rio, em ordem de curadoria (`river_rank`). O índice do array
   * é o índice do card na corrente: 0 é o primeiro que a câmera encontra.
   */
  river: readonly RiverCard[];
};

function writeChain(shared: SharedUniforms, layout: RiverLayout): void {
  for (let i = 0; i < shared.cards.value.length; i += 1) {
    const card = layout.cards[i];
    const slot = shared.cards.value[i];
    if (slot === undefined) continue;
    if (card === undefined) {
      slot.set(0, 0, 0, 0);
      continue;
    }
    slot.set(card.x, card.y, card.z, card.yaw);
  }
  shared.cardCount.value = layout.count;
}

export function Cards({ shared, river }: CardsProps) {
  const { camera } = useThree();
  const router = useRouter();
  const pathname = usePathname();
  const layout = useMemo(() => resolveRiver(), []);

  /**
   * O conteúdo cortado pela capacidade do aparelho.
   *
   * `resolveRiver()` já resolveu **quantos** cards a câmara comporta (7 no
   * desktop, 4 no mobile — DIRECTION.md §4), e a curadoria já decidiu **quais**:
   * são os primeiros postos do ranking. Quem fica de fora do corte continua com
   * rota `/work/[slug]` e na lista de acervo da HUD; nenhum case é apagado por
   * aparelho (PROJECT.md §4).
   */
  const shown = useMemo(
    () => river.slice(0, layout.count),
    [river, layout.count],
  );

  /**
   * O pick nasce num efeito, e **não** num `useMemo`.
   *
   * `useMemo(() => installCardPick(), [])` parece equivalente e não é: o
   * StrictMode invoca a fábrica **duas vezes** no mesmo render, então nascem
   * duas instalações — cada uma com o próprio par de ouvintes no `window` — e
   * o React usa uma. A outra não é limpa por nada: a limpeza mora no efeito, e
   * o efeito pertence à que ficou. Em desenvolvimento isso vaza ouvintes, e o
   * sintoma que ele produziu ao depurar foi pior que o vazamento — o gancho de
   * medição publicado no `window` era o da instalação órfã, então ele reportava
   * `calls: 0` para sempre enquanto o laço de quadro resolvia normalmente.
   *
   * Num efeito, criação e limpeza são emparelhadas pelo React: monta A,
   * desmonta A, monta B. Uma instalação viva por vez, sempre.
   */
  const pickRef = useRef<CardPick | null>(null);

  /**
   * O href de cada peça, resolvido uma vez.
   *
   * O idioma sai da URL e não de uma prop: sob `localePrefix: "as-needed"` a
   * barra de endereço **é** a verdade sobre o idioma, e o caminho até aqui são
   * quatro saltos de componente para uma string de duas letras. Ver `localeOf`.
   */
  const hrefs = useMemo(() => {
    const locale = localeOf(pathname);
    return shown.map((card) => localizePath(`/work/${card.slug}`, locale));
  }, [shown, pathname]);

  /**
   * O clique numa peça — e ele é o **mesmo** clique da lista de estações.
   *
   * Os dois chamam `enterCase` com o mesmo slug, o mesmo posto e o mesmo
   * progresso, e só então navegam. É isso que faz a travessia ser idêntica pelas
   * duas portas, e a volta cair no mesmo lugar: `returnProgress` é gravado num
   * ponto só do código.
   *
   * Publicar **antes** de navegar não é detalhe de ordem. O voo começa no
   * quadro seguinte ao clique, e a rota só confirma quando o payload chega —
   * esperar por ela deixaria a tela parada por um tempo que depende da rede,
   * contra o teto de 100 ms do PROJECT.md §3.3.
   */
  const activate = useRef<(index: number) => void>(() => {});
  useEffect(() => {
    activate.current = (index: number) => {
      const card = shown[index];
      const href = hrefs[index];
      if (card === undefined || href === undefined) return;
      enterCase(card.slug, index, getScrollProgress());
      // **Com a rolagem para o topo, que é o padrão.** A primeira versão passou
      // `{ scroll: false }` para não mexer na posição do rio, e o resultado
      // medido foi o case abrindo com `scrollY` de 9.679 px: a capa nascia
      // nove mil pixels acima da viewport, e a câmera voava para um retângulo
      // que ninguém podia ver. A posição do rio não precisa de proteção aqui —
      // ela vive na entrada de histórico da home, que o navegador restaura
      // sozinha no `back()`. Ver `CaseReturn`.
      router.push(href);
    };
  }, [shown, hrefs, router]);

  useEffect(() => {
    // O callback é lido de um ref para o pick não precisar renascer a cada
    // mudança de rota ou de conteúdo — remontá-lo trocaria os ouvintes do
    // `window` no meio de um gesto.
    const pick = installCardPick({
      onActivate: (index) => activate.current(index),
    });
    pickRef.current = pick;
    return () => {
      pick.dispose();
      pickRef.current = null;
    };
  }, []);

  const atlas = useMemo(() => createCardAtlas(shown), [shown]);

  const { geometry, material, uniforms } = useMemo(() => {
    // O plano em coordenadas locais da peça: ±meia-largura, ±meia-altura, z=0.
    // Ele é o mesmo retângulo que o SDF analítico do shader dos boids descreve,
    // e é por isso que as duas medidas saem de `lib/scene/cards.ts`.
    const plane = new InstancedBufferGeometry();
    plane.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([
          -CARD_HALF_WIDTH, -CARD_HALF_HEIGHT, 0,
          CARD_HALF_WIDTH, -CARD_HALF_HEIGHT, 0,
          CARD_HALF_WIDTH, CARD_HALF_HEIGHT, 0,
          -CARD_HALF_WIDTH, CARD_HALF_HEIGHT, 0,
        ]),
        3,
      ),
    );
    plane.setAttribute(
      "uv",
      new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
    );
    plane.setIndex([0, 1, 2, 0, 2, 3]);

    const count = layout.count;
    const cards = new Float32Array(count * 4);
    const tones = new Float32Array(count * 3);
    const accents = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const indices = new Float32Array(count);
    const tone = new Color();

    for (let i = 0; i < count; i += 1) {
      const card = layout.cards[i];
      if (card === undefined) continue;
      cards[i * 4] = card.x;
      cards[i * 4 + 1] = card.y;
      cards[i * 4 + 2] = card.z;
      cards[i * 4 + 3] = card.yaw;

      // O tom do campo de espera alterna entre os dois frios da paleta, com a
      // semente decidindo a mistura. **Nada de `--rose` nem `--coral` aqui**:
      // o DIRECTION.md §2 os reserva para eventos do bando, e sete retângulos
      // quentes espalhados pelo corredor gastariam o teto de 15% de tela do
      // PROJECT.md §3.1 sem nenhum deles ser um evento.
      const key = TEST_TONE_KEYS[i % TEST_TONE_KEYS.length] ?? "teal";
      tone.copy(shared[key].value);
      tone.lerp(shared.deep.value, 0.18 + 0.34 * card.seed);
      tones[i * 3] = tone.r;
      tones[i * 3 + 1] = tone.g;
      tones[i * 3 + 2] = tone.b;

      // O acento do case. Ele tinge **a quina e a gravação**, e nada mais: a
      // capa é a fotografia e a placa é substrato recessado. Um card pintado
      // no token seria um retângulo de cor, que é cenário (PROJECT.md §2).
      const accent = shown[i]?.accent;
      const accentColor =
        accent === undefined ? shared.cyan.value : shared[accent].value;
      accents[i * 3] = accentColor.r;
      accents[i * 3 + 1] = accentColor.g;
      accents[i * 3 + 2] = accentColor.b;

      seeds[i] = card.seed;
      indices[i] = i;
    }

    plane.setAttribute("aCard", new InstancedBufferAttribute(cards, 4));
    plane.setAttribute("aTone", new InstancedBufferAttribute(tones, 3));
    plane.setAttribute("aAccent", new InstancedBufferAttribute(accents, 3));
    plane.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    plane.setAttribute("aIndex", new InstancedBufferAttribute(indices, 1));
    plane.instanceCount = count;
    plane.boundingSphere = new Sphere(new Vector3(), 1e4);

    // A corrente é publicada aqui, e não num efeito, porque o primeiro quadro
    // pode acontecer **antes** dos efeitos: o `ComposedClock` chama `advance()`
    // de dentro do efeito dele, e efeitos de irmãos rodam em ordem de árvore.
    // Um passo de simulação com `uCardCount = 0` seria um quadro em que o rio
    // não desvia nada — invisível, e exatamente o tipo de divergência de um
    // quadro que este projeto já pagou caro. A escrita é idempotente e o objeto
    // é o mesmo que o `Flock` já segura.
    writeChain(shared, layout);

    const local = {
      uCoverArray: { value: atlas.cover },
      uPlateArray: { value: atlas.plate },
      uPlateTexel: {
        value: new Vector2(1 / PLATE_LAYER_WIDTH, 1 / PLATE_LAYER_HEIGHT),
      },
      uCoverBlend: { value: Array.from({ length: MAX_CARDS }, () => 0) },
      uHoverCard: { value: -1 },
      uHoverAmount: { value: 0 },
    };

    const cardMaterial = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uSubstrate: shared.abyss,
        uCyan: shared.cyan,
        uMist: shared.mist,
        // Pico da capa em HDR linear. Abaixo do limiar de bloom do compositor
        // (1.05) de propósito: o DIRECTION.md §5 reserva o transbordo para os
        // corpos emissivos e a fresta da tomada de ar, e uma capa que floresce
        // seria a segunda fonte de luz da câmara. Vale para a fotografia do
        // case tanto quanto valia para o campo procedural — o pico de um pixel
        // branco de captura de tela, convertido para linear, é 1.0, e este ganho
        // é o que o mantém longe do limiar.
        uCoverGain: { value: 0.38 },
        uCardMask: shared.cardMask,
        // A travessia para o case. Compartilhados porque quem os escreve é o
        // laço mestre (`lib/scene/case-drive.ts`) e quem os lê é este material —
        // a mesma disciplina da corrente e da névoa.
        uDockCard: shared.dockCard,
        uDockBlend: shared.dockBlend,
        uDockHandoff: shared.dockHandoff,
        uDockCover: shared.dockCover,
        uDockCoverCrop: shared.dockCoverCrop,
        uCaseRecess: shared.caseRecess,
        ...local,
      },
      vertexShader: CARD_VERT,
      fragmentShader: CARD_FRAG,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
    cardMaterial.glslVersion = GLSL3;

    return { geometry: plane, material: cardMaterial, uniforms: local };
  }, [layout, shared, atlas, shown]);

  /* --- o estado animado do filtro ---------------------------------------- */

  const filter = useRef<RiverFilter>(getRiverFilter());
  /** `x`, `y`, `yaw` vivos por card — o que está na tela neste quadro. */
  const live = useRef<Float32Array>(new Float32Array(MAX_CARDS * 3));
  /** `true` quando a reorganização acabou e nada mais precisa ser escrito. */
  const settled = useRef(true);
  /** Último card sob o ponteiro, para o atributo e o prefetch não repetirem. */
  const lastHover = useRef(-1);

  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-card-hover");
    };
  }, []);

  useEffect(() => {
    const base = live.current;
    for (let i = 0; i < layout.count; i += 1) {
      const card = layout.cards[i];
      if (card === undefined) continue;
      base[i * 3] = card.x;
      base[i * 3 + 1] = card.y;
      base[i * 3 + 2] = card.yaw;
    }
  }, [layout]);

  useEffect(() => {
    return subscribeToRiverFilter((next) => {
      filter.current = next;
      settled.current = false;
    });
  }, []);

  useEffect(() => {
    return () => {
      shared.cardCount.value = 0;
    };
  }, [shared]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      atlas.dispose();
    };
  }, [geometry, material, atlas]);

  /**
   * Prioridade −7: depois do laço mestre (−10), que resolve o progresso e
   * escreve `cardAmount`, e **antes** do passo do bando (−5), que lê `uCards`.
   * A ordem não é preferência: um card que se movesse depois da simulação
   * desviaria o escoamento do quadro anterior, e a esteira ficaria um quadro
   * atrás da peça em toda reorganização.
   */
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const count = layout.count;
    const selected = filter.current;

    // --- a travessia para a fotografia -----------------------------------
    atlas.consumePending();
    const blend = uniforms.uCoverBlend.value;
    for (let i = 0; i < count; i += 1) {
      const target = atlas.loaded[i] ?? 0;
      const current = blend[i] ?? 0;
      if (current !== target) {
        blend[i] = Math.abs(target - current) < 0.002
          ? target
          : damp(current, target, COVER_DAMP, dt);
      }
    }

    // --- a rota do rio ----------------------------------------------------
    if (!settled.current) {
      const values = live.current;
      const attribute = geometry.getAttribute("aCard");
      const buffer = attribute.array as Float32Array;
      let worst = 0;

      for (let i = 0; i < count; i += 1) {
        const card = layout.cards[i];
        if (card === undefined) continue;
        const target = flowTarget(card, shown[i], selected);

        const x = damp(values[i * 3] ?? 0, target.x, FLOW_DAMP, dt);
        const y = damp(values[i * 3 + 1] ?? 0, target.y, FLOW_DAMP, dt);
        const yaw = damp(values[i * 3 + 2] ?? 0, target.yaw, FLOW_DAMP, dt);
        values[i * 3] = x;
        values[i * 3 + 1] = y;
        values[i * 3 + 2] = yaw;

        worst = Math.max(
          worst,
          Math.abs(x - target.x),
          Math.abs(y - target.y),
          Math.abs(yaw - target.yaw),
        );

        buffer[i * 4] = x;
        buffer[i * 4 + 1] = y;
        buffer[i * 4 + 3] = yaw;

        const slot = shared.cards.value[i];
        if (slot !== undefined) slot.set(x, y, card.z, yaw);
      }

      attribute.needsUpdate = true;

      // Assentou: encaixa nos alvos exatos e **para de escrever**. O snap final
      // existe para o repouso sem filtro ser bit a bit a corrente de
      // `resolveRiver()` — é o que mantém a sonda medindo a geometria que o
      // MEASUREMENTS.md registra.
      if (worst < 1e-4) {
        for (let i = 0; i < count; i += 1) {
          const card = layout.cards[i];
          if (card === undefined) continue;
          const target = flowTarget(card, shown[i], selected);
          values[i * 3] = target.x;
          values[i * 3 + 1] = target.y;
          values[i * 3 + 2] = target.yaw;
          buffer[i * 4] = target.x;
          buffer[i * 4 + 1] = target.y;
          buffer[i * 4 + 3] = target.yaw;
          const slot = shared.cards.value[i];
          if (slot !== undefined) slot.set(target.x, target.y, card.z, target.yaw);
        }
        attribute.needsUpdate = true;
        settled.current = true;
      }
    }

    // --- a resposta de ponteiro -------------------------------------------
    // Só dentro do beat: os cards estão montados na câmara desde sempre e se
    // veem de longe atrás da névoa, mas um ponteiro que acendesse uma peça a
    // cinquenta unidades durante a Emergência seria uma afordância fantasma —
    // não há nada para fazer com ela ali. `cardAmount` é a mesma rampa que
    // liga as esteiras (`cardAmount` em `curve.ts`), então o rio responde
    // quando o rio existe.
    const pick = pickRef.current;
    if (pick !== null) {
      const active = shared.cardAmount.value > 0.001;
      const hovered = pick.resolve(camera, shared.cards.value, count, active);
      uniforms.uHoverCard.value = hovered;
      uniforms.uHoverAmount.value = damp(
        uniforms.uHoverAmount.value,
        hovered >= 0 ? 1 : 0,
        HOVER_DAMP,
        dt,
      );
      pick.markApplied();

      // A peça sob o ponteiro é clicável, então o ponteiro tem que dizer isso —
      // e o `pointer-events-none` da camada da cena impede que o CSS descubra
      // sozinho. Um atributo na raiz, do mesmo feitio de `data-gate` e
      // `data-scene-mode`.
      if (hovered !== lastHover.current) {
        lastHover.current = hovered;
        const root = document.documentElement;
        if (hovered >= 0) root.setAttribute("data-card-hover", "true");
        else root.removeAttribute("data-card-hover");

        // E o payload da rota começa a chegar no `hover`, não no clique. Sem
        // isto o voo já teria começado quando a rota confirmasse, e a entrega da
        // capa esperaria a rede; com ele o commit costuma chegar antes de a
        // câmera atracar.
        const href = hovered >= 0 ? hrefs[hovered] : undefined;
        if (href !== undefined) router.prefetch(href);
      }
    }
  }, -7);

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
