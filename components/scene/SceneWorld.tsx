"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { clearSoundField, publishSoundField } from "@/lib/audio/field-store";
import { clamp01, damp, easeStrong } from "@/lib/motion";
import { getEntry } from "@/lib/preload/entered";
import { createCaseDrive } from "@/lib/scene/case-drive";
import { CASE_FOG } from "@/lib/scene/case-pose";
import { getPointer, installPointer } from "@/lib/scene/pointer";
import {
  apertureAt,
  applyReveal,
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
import { floraPatches, heightAt, stopWeight } from "@/lib/scene/world";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";
import { ComposedClock } from "./ComposedClock";
import { Composer } from "./Composer";
import { Flora } from "./Flora";
import { Land } from "./Land";
import { Panels } from "./Panels";
import type { ScenePanel } from "./Scene";
import { SceneClock } from "./SceneClock";

type SceneWorldProps = {
  panels: readonly ScenePanel[];
  /** `true` no modo calmo: a câmera corta entre composições, nada amortece. */
  instant: boolean;
  /** O `<canvas>`, para o corte de 120 ms do modo calmo. */
  canvasRef: { current: HTMLCanvasElement | null };
};

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
    gl.compileAsync(scene, camera).then(done, done);
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
      <Land shared={shared} />
      <Flora shared={shared} />
      <Panels shared={shared} panels={panels} />
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
