"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { setConsoleFunction } from "three";
import { CAMERA_FOV } from "@/lib/scene/rail";
import { SceneWorld } from "./SceneWorld";

/**
 * O R3F 9 ainda instancia `THREE.Clock`, que o three 0.185 marca como
 * obsoleto: o aviso é dele, não deste projeto, e sai a cada montagem. Filtrado
 * aqui para o console ficar limpo; qualquer outro aviso do three passa.
 */
const R3F_CLOCK_NOTICE =
  "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";
setConsoleFunction((type: string, message: string, ...params: unknown[]) => {
  if (type === "warn" && message === R3F_CLOCK_NOTICE) return;
  if (type === "error") console.error(message, ...params);
  else if (type === "warn") console.warn(message, ...params);
  else console.log(message, ...params);
});

export type ScenePanel = {
  slug: string;
  title: string;
  index: number;
};

export type SceneProps = {
  /** Os cases, na ordem das paradas da trilha. */
  panels: readonly ScenePanel[];
  /** `true` no modo calmo: composições fixas, sem movimento de câmera. */
  composed: boolean;
};

/**
 * A raiz da cena. `frameloop="never"`: quem avança os quadros é o relógio do
 * scroll (`SceneClock`), não o R3F. O DPR é o do nível de qualidade.
 */
export default function Scene({ panels, composed }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <Canvas
      ref={canvasRef}
      frameloop="never"
      dpr={1}
      flat
      linear
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 400, position: [0, 2, 10] }}
    >
      <SceneWorld panels={panels} instant={composed} canvasRef={canvasRef} />
    </Canvas>
  );
}
