"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { clamp01, damp } from "@/lib/motion";
import {
  apertureAt,
  cameraPose,
  createCameraPose,
  flockTubeHalfWidth,
  specimenAttackAngle,
} from "@/lib/scene/curve";
import type { FlockRead } from "@/lib/scene/probe";
import { createProxySim } from "@/lib/scene/proxy-sim";
import { createSharedUniforms } from "@/lib/scene/uniforms";
import { sceneSettings } from "@/lib/scene/settings";
import { readVeilBoxes, solveVeil, type VeilBox } from "@/lib/scene/veil";
import { SPECIMEN_Z } from "@/lib/scene/world";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";
import { BenchClock } from "./BenchClock";
import { Chamber } from "./Chamber";
import { ComposedClock } from "./ComposedClock";
import { Composer } from "./Composer";
import { Flock } from "./Flock";
import { ProbeClock } from "./ProbeClock";
import { SceneClock } from "./SceneClock";
import { Specimen } from "./Specimen";
import { Structure } from "./Structure";

/** A cada quantos quadros as caixas do véu são relidas do DOM. */
const VEIL_REFRESH_FRAMES = 4;

/** Ponto a montante da peça onde se mede a densidade que acende o rim. */
const AHEAD_OF_SPECIMEN = new Vector3(0, 0, SPECIMEN_Z - 6);

type SceneWorldProps = {
  /** A string do corpo de prova, resolvida no servidor. */
  specimen: string;
  /**
   * `true` no modo calmo: a câmera **corta** entre composições fixas em vez de
   * percorrer a curva, então nada é amortecido — amortecer entre dois cortes
   * seria movimento de câmera, que é justamente o que este modo tira.
   */
  instant: boolean;
  /** O `<canvas>`, para o corte de 120 ms do modo calmo. */
  canvasRef: { current: HTMLCanvasElement | null };
};

/**
 * O laço mestre: um lugar onde a variável única se abre em tudo o mais.
 *
 * O PROJECT.md §3.3 diz que o progresso normalizado dirige a câmera, os
 * uniforms e as revelações de texto. Isso é literal aqui — este `useFrame` é o
 * único lugar do projeto que lê o progresso e o transforma em outra coisa.
 * Espalhar essa leitura por cinco componentes daria cinco interpretações do
 * mesmo número, e elas divergiriam no primeiro ajuste de ritmo.
 *
 * Prioridade −10: antes da simulação do bando (−5) e muito antes do compositor
 * (1). Quando o bando lê `uProgress`, ele já é o deste quadro.
 *
 * **Nada é aplicado direto.** O que a curva recebe não é o progresso, é o
 * progresso amortecido (`damp` por quadro, taxa independente de fps). A câmera
 * nunca dá um passo do tamanho de um salto de scroll.
 */
export function SceneWorld({
  specimen,
  instant,
  canvasRef,
}: SceneWorldProps) {
  const { camera } = useThree();
  const { ref: scrollRef } = useScrollProgress();

  const shared = useMemo(() => createSharedUniforms(), []);
  const proxy = useMemo(() => createProxySim(), []);
  const pose = useMemo(() => createCameraPose(), []);

  const composedRef = useRef(0);
  const benchRef = useRef(0);
  const probeRef = useRef(0);
  const settleRef = useRef<((steps: number) => void) | null>(null);
  const flockReadRef = useRef<FlockRead | null>(null);
  // No modo dirigido a fonte é o scroll; no calmo é a composição do beat; sob
  // `?bench=1` é a rampa determinista do banco de prova; sob `?probe=1` é o
  // valor que a sonda fixa. O resto da cena não precisa saber a diferença —
  // ela lê um número só.
  const settings = sceneSettings();
  const bench = settings.bench;
  // O ramo é escrito com o `process.env.NODE_ENV` na frente para o Next
  // constante-dobrar a condição inteira na build de produção e o import da
  // sonda cair junto. Ver o docblock de `probe` em `lib/scene/settings.ts`.
  const probe = process.env.NODE_ENV !== "production" && settings.probe;
  const progressRef = probe
    ? probeRef
    : bench
      ? benchRef
      : instant
        ? composedRef
        : scrollRef;

  const eased = useRef(0);
  const attackRef = useRef(specimenAttackAngle(0));
  const apertureRef = useRef(1);
  const focusRef = useRef(20);
  const cameraZRef = useRef(0);
  const tubeRef = useRef(flockTubeHalfWidth(0));
  const veilBoxes = useRef<VeilBox[]>([]);
  const frame = useRef(0);
  /** Último progresso em que o proxy foi aquecido em lote. Só sob a sonda. */
  const warmed = useRef(Number.NaN);

  useEffect(() => {
    const refresh = () => {
      veilBoxes.current = readVeilBoxes();
    };
    refresh();
    window.addEventListener("resize", refresh);
    return () => {
      window.removeEventListener("resize", refresh);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    shared.time.value = state.clock.elapsedTime;

    // --- a variável ---------------------------------------------------------
    // No modo calmo o amortecimento é pulado inteiro, e é a mesma decisão do
    // corte: interpolar entre duas composições fixas seria reintroduzir o
    // movimento de câmera que o modo existe para tirar. E como só há um
    // `advance()` por beat, um valor amortecido nunca chegaria ao destino.
    // A sonda entra pelo mesmo caminho do modo calmo: o progresso é aplicado
    // sem amortecer. Uma varredura que precisasse esperar o `damp` convergir
    // mediria o transiente, não o quadro de 0.18.
    const target = clamp01(progressRef.current);
    eased.current = instant || probe ? target : damp(eased.current, target, 6, dt);
    const progress = eased.current;

    // --- câmera -------------------------------------------------------------
    cameraPose(progress, pose);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    focusRef.current = pose.position.distanceTo(pose.target);
    cameraZRef.current = pose.position.z;

    // --- corpo de prova -----------------------------------------------------
    // O ângulo de ataque é amortecido por cima do progresso já amortecido: é a
    // haste girando, e uma haste tem inércia.
    const attack = specimenAttackAngle(progress);
    attackRef.current =
      instant || probe ? attack : damp(attackRef.current, attack, 5, dt);

    // --- o tubo do bando ----------------------------------------------------
    // Ele abre em X entre 0.05 e 0.16 para o escoamento cobrir o corpo de prova
    // inteiro no quadro do descolamento; a meia-altura não muda. Sem
    // amortecimento por cima: a curva já é suave e o progresso que a alimenta já
    // chegou amortecido — amortecer de novo só atrasaria a abertura para depois
    // de 0.18, que é justamente onde ela precisa estar pronta.
    tubeRef.current = flockTubeHalfWidth(progress);

    // --- abertura da DOF ----------------------------------------------------
    // Sob a sonda a abertura também é aplicada sem amortecer, e isso não é
    // conveniência: ela começa em 1 (borrão total) e o alvo em 0.18 é 0, então
    // amortecendo a 8 os primeiros trinta quadros medidos sairiam desfocados —
    // a varredura mediria o transiente da navalha, não o quadro.
    const aperture = apertureAt(progress);
    apertureRef.current =
      instant || probe ? aperture : damp(apertureRef.current, aperture, 8, dt);

    // --- o proxy, e os três consumidores dele -------------------------------
    // No modo calmo ele roda em lote: os aglomerados precisam chegar à pose
    // deste beat num `advance()` só, e 90 passos de 64 partículas custam menos
    // que um quadro de render. Sob a sonda o lote roda **uma vez por progresso
    // novo** e depois volta ao passo normal, para a luz continuar seguindo a
    // massa ao longo da varredura em vez de ficar recomeçando.
    if (instant || (probe && warmed.current !== progress)) {
      for (let i = 0; i < 90; i += 1) proxy.update(1 / 30, progress, pose.position.z);
      warmed.current = progress;
    } else {
      proxy.update(dt, progress, pose.position.z);
    }

    const clusters = shared.clusters.value;
    for (let i = 0; i < clusters.length; i += 1) {
      const cluster = proxy.clusters[i];
      const uniform = clusters[i];
      if (cluster === undefined || uniform === undefined) continue;
      uniform.set(
        cluster.position.x,
        cluster.position.y,
        cluster.position.z,
        cluster.energy,
      );
    }

    const ahead = proxy.densityAt(AHEAD_OF_SPECIMEN);
    shared.flockAhead.value =
      instant || probe ? ahead : damp(shared.flockAhead.value, ahead, 4, dt);

    // --- atmosfera ----------------------------------------------------------
    // Espessa na Emergência — "não dá pra saber se a câmara tem três metros ou
    // trezentos" — abrindo conforme a escala se estabelece. Se em algum quadro
    // desse trecho der para ler a câmara inteira, este número está baixo demais.
    shared.forming.value = clamp01(progress / 0.16);

    const fog = 0.098 - 0.042 * clamp01(progress / 0.22);
    const source = 0.05 + 0.1 * clamp01(progress / 0.28);
    shared.fogDensity.value =
      instant || probe ? fog : damp(shared.fogDensity.value, fog, 3, dt);
    shared.sourceStrength.value =
      instant || probe
        ? source
        : damp(shared.sourceStrength.value, source, 3, dt);

    // --- véu de legibilidade ------------------------------------------------
    // As caixas são relidas a cada quatro quadros, não a cada um: o
    // `BeatReveal` escreve custom properties por quadro, então um
    // `getBoundingClientRect` aqui força recálculo de estilo. Quatro quadros
    // são 67 ms de atraso numa queda que já é larga e suave — invisível — e o
    // proxy que alimenta o `f` roda adiantado de qualquer jeito.
    frame.current += 1;
    if (frame.current % VEIL_REFRESH_FRAMES === 0) {
      veilBoxes.current = readVeilBoxes();
    }
    solveVeil(
      veilBoxes.current,
      proxy.clusters,
      camera,
      shared.veilBox.value,
      shared.veilF.value,
    );
  }, -10);

  return (
    <>
      {probe ? (
        <ProbeClock
          progressRef={probeRef}
          settleRef={settleRef}
          flockRef={flockReadRef}
          attackRef={attackRef}
        />
      ) : bench ? (
        <BenchClock progressRef={benchRef} />
      ) : instant ? (
        <ComposedClock
          composedRef={composedRef}
          settleRef={settleRef}
          canvasRef={canvasRef}
        />
      ) : (
        <SceneClock />
      )}
      <Chamber shared={shared} />
      <Structure shared={shared} />
      <Flock
        shared={shared}
        progressRef={progressRef}
        attackRef={attackRef}
        cameraZRef={cameraZRef}
        tubeRef={tubeRef}
        settleRef={settleRef}
        readRef={flockReadRef}
      />
      <Suspense fallback={null}>
        <Specimen shared={shared} text={specimen} attackRef={attackRef} />
      </Suspense>
      <Composer shared={shared} apertureRef={apertureRef} focusRef={focusRef} />
    </>
  );
}
