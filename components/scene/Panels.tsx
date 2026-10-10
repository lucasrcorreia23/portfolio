"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { damp } from "@/lib/motion";
import { PANEL_HEIGHT, PANEL_WIDTH } from "@/lib/scene/case-pose";
import { createPanelTexture } from "@/lib/scene/panel-texture";
import { PANEL_FRAG, PANEL_VERT } from "@/lib/scene/shaders/panel";
import { stopProgress } from "@/lib/scene/stops";
import { fogUniforms, type SharedUniforms } from "@/lib/scene/uniforms";
import { panelPlacement } from "@/lib/scene/world";
import { requestScrollTo } from "@/lib/scroll/scroll-store";
import { getCardFocus, subscribeToCardFocus } from "@/lib/work/card-focus";
import type { ScenePanel } from "./Scene";

type PanelsProps = {
  shared: SharedUniforms;
  panels: readonly ScenePanel[];
};

const CORNER = new Vector3();
const RIGHT = new Vector3();
const NORMAL = new Vector3();
const TO_CAMERA = new Vector3();

/** O painel só é clicável de perto e de frente. */
const LIVE_DISTANCE = 26;
const LIVE_MIN_WIDTH = 120;

/**
 * Os painéis dos cases, um por parada. Cada um é uma placa com o placeholder
 * do case, sustentada pelo pórtico da `industry`.
 *
 * O clique não é raycast: o link de verdade do case (`StationList`) é
 * posicionado por quadro sobre o retângulo do painel na tela. É o mesmo
 * elemento que o teclado e o leitor de tela usam.
 */
export function Panels({ shared, panels }: PanelsProps) {
  const size = useThree((state) => state.size);
  const links = useRef<(HTMLElement | null)[]>([]);
  const hover = useRef<number[]>([]);

  const built = useMemo(() => {
    const geometry = new PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT);
    const fog = fogUniforms(shared);
    const items = panels.map((panel, index) => {
      const placement = panelPlacement(index);
      const { texture, dot } = createPanelTexture(panel.title, index);
      const material = new ShaderMaterial({
        uniforms: {
          ...fog,
          uMap: { value: texture },
          uDot: { value: new Vector3(...dot) },
          uMist: shared.mist,
          uHover: { value: 0 },
        },
        vertexShader: PANEL_VERT,
        fragmentShader: PANEL_FRAG,
      });
      return { placement, texture, material };
    });
    return { geometry, items };
  }, [shared, panels]);

  useEffect(() => {
    const held = built;
    held.items.forEach((item, index) => {
      shared.panels.value[index]?.set(
        item.placement.x,
        item.placement.y,
        item.placement.z,
        item.placement.yaw,
      );
    });
    shared.panelCount.value = held.items.length;
    return () => {
      shared.panelCount.value = 0;
      held.geometry.dispose();
      for (const item of held.items) {
        item.texture.dispose();
        item.material.dispose();
      }
    };
  }, [built, shared]);

  useEffect(() => {
    const read = () => {
      links.current = Array.from(
        document.querySelectorAll<HTMLElement>("[data-card-link]"),
      );
    };
    read();
    // O foco por teclado leva a câmera até a parada daquele painel.
    const unsubscribe = subscribeToCardFocus((focus) => {
      read();
      if (focus.element?.matches(":focus-visible") === true) {
        requestScrollTo(stopProgress(focus.index));
      }
    });
    return () => {
      unsubscribe();
      for (const link of links.current) {
        if (link === null) continue;
        link.removeAttribute("data-live");
        link.style.transform = "";
      }
    };
  }, [built]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const camera = state.camera;
    const focused = getCardFocus().index;
    const reading = shared.caseRecess.value > 0.02;
    // A lista de links remonta quando se volta de um case: os nós antigos
    // saem do documento e é preciso lê-los de novo.
    if (links.current.length === 0 || links.current[0]?.isConnected === false) {
      links.current = Array.from(
        document.querySelectorAll<HTMLElement>("[data-card-link]"),
      );
    }
    let nearest = Infinity;
    shared.panelRect.value.set(0, 0, 0, 0);

    built.items.forEach((item, index) => {
      const { placement, material } = item;
      const uniform = material.uniforms["uHover"];
      const wanted = focused === index && !reading ? 1 : 0;
      hover.current[index] = damp(hover.current[index] ?? 0, wanted, 10, dt);
      if (uniform !== undefined) uniform.value = hover.current[index];

      // O retângulo do painel na tela, pelos quatro cantos.
      NORMAL.set(Math.sin(placement.yaw), 0, Math.cos(placement.yaw));
      RIGHT.set(Math.cos(placement.yaw), 0, -Math.sin(placement.yaw));
      TO_CAMERA.set(
        camera.position.x - placement.x,
        camera.position.y - placement.y,
        camera.position.z - placement.z,
      );
      const distance = TO_CAMERA.length();
      const facing = TO_CAMERA.dot(NORMAL) / Math.max(distance, 1e-3);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let behind = false;
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          CORNER.set(placement.x, placement.y + (sy * PANEL_HEIGHT) / 2, placement.z)
            .addScaledVector(RIGHT, (sx * PANEL_WIDTH) / 2)
            .project(camera);
          if (CORNER.z > 1) behind = true;
          const x = (CORNER.x * 0.5 + 0.5) * size.width;
          const y = (1 - (CORNER.y * 0.5 + 0.5)) * size.height;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      const width = maxX - minX;
      // O painel mais perto e de frente é o que os esporos evitam.
      if (!behind && facing > 0.2 && distance < nearest && distance < 60) {
        nearest = distance;
        shared.panelRect.value.set(
          minX / size.width,
          1 - maxY / size.height,
          maxX / size.width,
          1 - minY / size.height,
        );
      }

      const link = links.current[index];
      if (link === null || link === undefined) return;
      const live =
        !reading &&
        !behind &&
        facing > 0.5 &&
        distance < LIVE_DISTANCE &&
        width > LIVE_MIN_WIDTH;

      if (live) {
        link.dataset["live"] = "true";
        link.style.transform = `translate(${minX.toFixed(1)}px, ${minY.toFixed(1)}px)`;
        link.style.width = `${width.toFixed(1)}px`;
        link.style.height = `${(maxY - minY).toFixed(1)}px`;
      } else if (link.dataset["live"] === "true") {
        link.removeAttribute("data-live");
      }
    });
  }, -7);

  return (
    <>
      {built.items.map((item, index) => (
        <mesh
          key={panels[index]?.slug ?? index}
          geometry={built.geometry}
          material={item.material}
          position={[item.placement.x, item.placement.y, item.placement.z]}
          rotation={[0, item.placement.yaw, 0]}
        />
      ))}
    </>
  );
}
