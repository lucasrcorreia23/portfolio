"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { clearSoundField, publishSoundField } from "@/lib/audio/field-store";
import { clamp01, damp, easeStrong } from "@/lib/motion";
import { getEntry } from "@/lib/preload/entered";
import { createCaseDrive } from "@/lib/scene/case-drive";
import { CASE_FOG } from "@/lib/scene/case-pose";
import { plantsSettled } from "@/lib/scene/plants";
import { getPointer, installPointer } from "@/lib/scene/pointer";
import {
  apertureAt,
  applyReveal,
  applyWallApproach,
  astroAt,
  cameraPose,
  createCameraPose,
  fogAt,
  REVEAL_FOG,
  REVEAL_GLOW,
  REVEAL_MS,
} from "@/lib/scene/rail";
import { sceneSettings } from "@/lib/scene/settings";
import { createSharedUniforms } from "@/lib/scene/uniforms";
import { readVeilBoxes, writeVeilBoxes } from "@/lib/scene/veil";
import {
  floraPatches,
  forkWeight,
  heightAt,
  stopWeight,
  wallPan,
} from "@/lib/scene/world";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";
import { ComposedClock } from "./ComposedClock";
import { Composer } from "./Composer";
import { Flora } from "./Flora";
import { Land } from "./Land";
import { Panels } from "./Panels";
import { Plates } from "./Plates";
import { QualityGovernor } from "./QualityGovernor";
import type { ScenePanel } from "./Scene";
import { SceneClock } from "./SceneClock";
import { Wall } from "./Wall";

type SceneWorldProps = {
  panels: readonly ScenePanel[];
  /** `true` no modo calmo: a câmera corta entre composições, nada amortece. */
  instant: boolean;
  /** O `<canvas>`, para o corte de 120 ms do modo calmo. */
  canvasRef: { current: HTMLCanvasElement | null };
};

/** Quanto o primeiro quadro espera pelas plantas, no máximo. */
const PLANTS_WAIT_MS = 4000;

const RIGHT = new Vector3();
const VIEW = new Vector3();
const UP = new Vector3(0, 1, 0);

/**
 * O laço mestre: o único lugar que lê o progresso do scroll e o transforma em
 * câmera, névoa e luz. Prioridade −10, antes de tudo o mais.
 */
export function SceneWorld({ panels, instant, canvasRef }: SceneWorldProps) {
  const { camera, gl, scene } = useThree();
  const { ref: scrollRef } = useScrollProgress();
  const settings = sceneSettings();

  const shared = useMemo(() => createSharedUniforms(), []);
  const pose = useMemo(() => createCameraPose(), []);
  const caseDrive = useMemo(() => createCaseDrive(), []);
  const patches = useMemo(() => floraPatches(), []);

  const composedRef = useRef(0);
  const fixedRef = useRef(settings.at ?? 0);
  const progressRef =
    settings.at !== null ? fixedRef : instant ? composedRef : scrollRef;
  const still = instant || settings.at !== null;

  const eased = useRef(0);
  const apertureRef = useRef(0);
  const focusRef = useRef(20);
  const focusRangeRef = useRef(34);
  const sway = useRef({ x: 0, y: 0 });
  /** Os programas compilaram: até lá o compositor não desenha. */
  const readyRef = useRef(false);

  // Os shaders compilam durante o loading, sem travar a thread onde o driver
  // permite (`KHR_parallel_shader_compile`). O primeiro quadro vem depois.
  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (cancelled) return;
      readyRef.current = true;
      // No modo calmo não há laço: a composição que esperava os shaders
      // precisa ser desenhada agora. O relógio calmo redesenha no resize.
      if (instant) window.dispatchEvent(new Event("resize"));
    };
    // As plantas chegam por arquivo: espera por elas (com um teto, para uma
    // rede ruim não segurar o site) e só então compila tudo de uma vez.
    const ceiling = new Promise<void>((resolve) => {
      window.setTimeout(resolve, PLANTS_WAIT_MS);
    });
    void Promise.race([plantsSettled, ceiling])
      .then(() => gl.compileAsync(scene, camera))
      .then(done, done);
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, instant]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    shared.time.value = state.clock.elapsedTime;

    const target = clamp01(progressRef.current);
    eased.current = still ? target : damp(eased.current, target, 6, dt);
    const progress = eased.current;

    // --- a revelação do Impacto: corre no tempo, uma vez -------------------
    const entry = getEntry();
    const reveal =
      still || entry.phase === "idle"
        ? 1
        : entry.phase === "pending"
          ? 0
          : easeStrong(clamp01((performance.now() - entry.at) / REVEAL_MS));

    // --- câmera -------------------------------------------------------------
    cameraPose(progress, pose);
    applyReveal(pose, reveal);

    // Na vitrine a trilha desvia: a câmera chega perto da parede de telas.
    const fork = forkWeight(progress);
    applyWallApproach(
      pose,
      fork,
      wallPan(progress),
      state.size.width / Math.max(state.size.height, 1),
    );
    shared.fork.value = fork;

    // A travessia para o case é misturada aqui dentro, por cima da trilha.
    const inCase = caseDrive.update(
      dt,
      still,
      shared,
      pose,
      state.size.width,
      state.size.height,
    );
    shared.caseRecess.value = inCase;

    // A resposta ao ponteiro: o olhar cede um pouco para o lado dele. Some no
    // modo calmo e dentro de um case, onde nada se mexe.
    if (!still) {
      const pointer = getPointer();
      const amount = 1 - inCase;
      sway.current.x = damp(sway.current.x, pointer.x * amount, 2.2, dt);
      sway.current.y = damp(sway.current.y, pointer.y * amount, 2.2, dt);
      VIEW.subVectors(pose.target, pose.position).normalize();
      RIGHT.crossVectors(VIEW, UP).normalize();
      pose.target.addScaledVector(RIGHT, sway.current.x * 1.4);
      pose.target.y -= sway.current.y * 0.8;
      pose.position.addScaledVector(RIGHT, sway.current.x * 0.25);
    }

    // A câmera nunca entra no chão, nem na travessia.
    const floor = heightAt(pose.position.x, pose.position.z) + 1.1;
    if (pose.position.y < floor) pose.position.y = floor;

    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    focusRef.current = pose.position.distanceTo(pose.target);

    // Texto de leitura nunca tem desfoque: dentro do case a abertura fecha.
    const aperture = apertureAt(progress) * (1 - inCase);
    apertureRef.current = still
      ? aperture
      : damp(apertureRef.current, aperture, 4, dt);

    // --- atmosfera ----------------------------------------------------------
    const fogBase = fogAt(progress);
    const fogOpen = fogBase + (CASE_FOG - fogBase) * inCase;
    const fog = REVEAL_FOG + (fogOpen - REVEAL_FOG) * reveal;
    shared.fogDensity.value = still
      ? fog
      : damp(shared.fogDensity.value, fog, 3, dt);
    shared.glow.value =
      (REVEAL_GLOW + (1 - REVEAL_GLOW) * reveal) * (1 - 0.45 * inCase);
    const astro = astroAt(progress) * reveal * (1 - inCase);
    shared.astro.value = still
      ? astro
      : damp(shared.astro.value, astro, 3, dt);

    // --- a luz: a flora, mais forte na parada em que a câmera está ---------
    const stop = stopWeight(progress);
    const emitters = shared.emitters.value;
    for (let i = 0; i < emitters.length; i += 1) {
      const patch = patches[i];
      const emitter = emitters[i];
      if (emitter === undefined) continue;
      if (patch === undefined) {
        emitter.w = 0;
        continue;
      }
      const here = patch.stop >= 0 && patch.stop === stop.index ? stop.weight : 0;
      const wanted = patch.light * (patch.stop >= 0 ? 0.6 + 0.75 * here : 1);
      emitter.set(
        patch.x,
        heightAt(patch.x, patch.z) + 1.2,
        patch.z,
        still ? wanted : damp(emitter.w, wanted, 3, dt),
      );
    }

    for (let i = 0; i < patches.length; i += 1) {
      shared.emitterWarm.value[i] = patches[i]?.warm ?? 0;
    }

    // --- a eletricidade -----------------------------------------------------
    // Rajadas curtas, de tempos em tempos: as descargas saltam entre as torres
    // e o ar inteiro acende um instante. No modo calmo e na leitura, nada.
    {
      const t = shared.time.value;
      const slot = Math.floor(t * 0.6);
      const roll = Math.sin(slot * 91.7) * 43758.5453;
      const active = !still && roll - Math.floor(roll) > 0.45 && reveal > 0.9;
      shared.storm.value = active ? 1 - inCase : 0;
      const pulse = Math.sin(Math.floor(t * 22) * 12.9898) * 43758.5453;
      const spark = active && pulse - Math.floor(pulse) > 0.55 ? 1 - inCase : 0;
      shared.flash.value = damp(shared.flash.value, spark, spark > 0 ? 40 : 9, dt);
    }

    // --- véu de legibilidade ------------------------------------------------
    writeVeilBoxes(readVeilBoxes(), shared.veilBox.value, shared.veilF.value);

    // --- o campo sonoro -----------------------------------------------------
    // Quanto o ar abriu (a névoa) e quão perto do trabalho a câmera está.
    publishSoundField(
      1 - clamp01((shared.fogDensity.value - 0.02) / (REVEAL_FOG - 0.02)),
      stop.weight,
    );
  }, -10);

  useEffect(() => installPointer(), []);
  useEffect(() => clearSoundField, []);

  return (
    <>
      {instant ? (
        <ComposedClock composedRef={composedRef} canvasRef={canvasRef} />
      ) : (
        <SceneClock />
      )}
      <QualityGovernor still={still} />
      <Land shared={shared} />
      <Flora shared={shared} />
      <Panels shared={shared} panels={panels} />
      <Plates shared={shared} instant={instant} />
      <Wall shared={shared} />
      <Composer
        shared={shared}
        readyRef={readyRef}
        apertureRef={apertureRef}
        focusRef={focusRef}
        focusRangeRef={focusRangeRef}
      />
    </>
  );
}
