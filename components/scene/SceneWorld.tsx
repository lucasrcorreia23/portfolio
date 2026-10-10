"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { clearSoundField, publishSoundField } from "@/lib/audio/field-store";
import { clamp01, damp } from "@/lib/motion";
import { createCaseDrive } from "@/lib/scene/case-drive";
import { CASE_FOG } from "@/lib/scene/case-pose";
import {
  apertureAt,
  cameraPose,
  createCameraPose,
  fogAt,
} from "@/lib/scene/rail";
import { sceneSettings } from "@/lib/scene/settings";
import { createSharedUniforms } from "@/lib/scene/uniforms";
import { readVeilBoxes, writeVeilBoxes } from "@/lib/scene/veil";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";
import { ComposedClock } from "./ComposedClock";
import { Composer } from "./Composer";
import type { ScenePanel } from "./Scene";
import { SceneClock } from "./SceneClock";

type SceneWorldProps = {
  panels: readonly ScenePanel[];
  /** `true` no modo calmo: a câmera corta entre composições, nada amortece. */
  instant: boolean;
  /** O `<canvas>`, para o corte de 120 ms do modo calmo. */
  canvasRef: { current: HTMLCanvasElement | null };
};

/**
 * O laço mestre: o único lugar que lê o progresso do scroll e o transforma em
 * câmera, névoa e uniforms. Prioridade −10, antes do compositor (1).
 */
export function SceneWorld({ instant, canvasRef }: SceneWorldProps) {
  const { camera } = useThree();
  const { ref: scrollRef } = useScrollProgress();
  const settings = sceneSettings();

  const shared = useMemo(() => createSharedUniforms(), []);
  const pose = useMemo(() => createCameraPose(), []);
  const caseDrive = useMemo(() => createCaseDrive(), []);

  const composedRef = useRef(0);
  const fixedRef = useRef(settings.at ?? 0);
  const progressRef =
    settings.at !== null ? fixedRef : instant ? composedRef : scrollRef;
  const still = instant || settings.at !== null;

  const eased = useRef(0);
  const apertureRef = useRef(0);
  const focusRef = useRef(20);
  const focusRangeRef = useRef(40);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    shared.time.value = state.clock.elapsedTime;

    const target = clamp01(progressRef.current);
    eased.current = still ? target : damp(eased.current, target, 6, dt);
    const progress = eased.current;

    cameraPose(progress, pose);
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

    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    focusRef.current = pose.position.distanceTo(pose.target);

    // Texto de leitura nunca tem desfoque: dentro do case a abertura fecha.
    const aperture = apertureAt(progress) * (1 - inCase);
    apertureRef.current = still
      ? aperture
      : damp(apertureRef.current, aperture, 8, dt);

    const fogBase = fogAt(progress);
    const fog = fogBase + (CASE_FOG - fogBase) * inCase;
    shared.fogDensity.value = still
      ? fog
      : damp(shared.fogDensity.value, fog, 3, dt);

    writeVeilBoxes(readVeilBoxes(), shared.veilBox.value, shared.veilF.value);

    publishSoundField(1 - clamp01(shared.fogDensity.value / 0.09), 0);
  }, -10);

  useEffect(() => clearSoundField, []);

  return (
    <>
      {instant ? (
        <ComposedClock composedRef={composedRef} canvasRef={canvasRef} />
      ) : (
        <SceneClock />
      )}
      <Composer
        shared={shared}
        apertureRef={apertureRef}
        focusRef={focusRef}
        focusRangeRef={focusRangeRef}
      />
    </>
  );
}
