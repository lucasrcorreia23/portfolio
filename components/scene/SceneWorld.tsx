"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { clearSoundField, publishSoundField } from "@/lib/audio/field-store";
import { beatOf } from "@/components/beats/beats";
import { clamp01, damp, easeStrong } from "@/lib/motion";
import { getEntry } from "@/lib/preload/entered";
import { createCaseDrive } from "@/lib/scene/case-drive";
import { DOOR_STOPS } from "@/lib/scene/door";
import { CASE_FOG } from "@/lib/scene/case-pose";
import { industrySettled } from "@/lib/scene/industry";
import { plantsSettled } from "@/lib/scene/plants";
import { getQuality } from "@/lib/scene/quality";
import { getPointer, hasPointer, installPointer } from "@/lib/scene/pointer";
import {
  apertureAt,
  applyReveal,
  applyWallApproach,
  applyWallFocus,
  astroAt,
  BARE_FOG,
  cameraPose,
  createCameraPose,
  fogAt,
  moonPlace,
  planetPlace,
  REVEAL_FOG,
  REVEAL_GLOW,
  REVEAL_MS,
} from "@/lib/scene/rail";
import { sceneSettings } from "@/lib/scene/settings";
import { createSharedUniforms } from "@/lib/scene/uniforms";
import { readVeilBoxes, writeVeilBoxes } from "@/lib/scene/veil";
import { wallFocus } from "@/lib/scene/wall-focus";
import {
  BLOOM_SLOT,
  bloomPatch,
  doorOpen,
  floraPatches,
  forkWeight,
  heightAt,
  stopWeight,
  wallPan,
  ZONE_EDGES,
} from "@/lib/scene/world";
import { useScrollProgress } from "@/lib/scroll/use-scroll-progress";
import { ComposedClock } from "./ComposedClock";
import { Composer } from "./Composer";
import { Door } from "./Door";
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
/** Até onde o ponteiro gira o olhar, em radianos: para os lados e na vertical. */
const LOOK_YAW = (25 * Math.PI) / 180;
const LOOK_PITCH = 0.2;

/**
 * O foco da vitrine: quanto o ponteiro fica parado numa tela até a câmera ir
 * até ela, quanto fica fora dela até voltar, e quanto de scroll a solta.
 */
const FOCUS_DWELL_S = 0.35;
const FOCUS_AWAY_S = 0.3;
const FOCUS_PAN = 0.015;

/** O passo de câmera, em metros num quadro, que já é um salto e não um movimento. */
const EYE_JUMP = 6;
/** O teto da velocidade publicada: uma rolada forte não vira furacão. */
const EYE_SPEED_MAX = 14;

/** Quanto a mancha escondida leva para brotar inteira, em segundos. */
const BLOOM_S = 5;
/** Daqui para o fim da trilha a câmera está na zona do CTA. */
const CTA_ZONE_Z = ZONE_EDGES[2] ?? 0;

const RIGHT = new Vector3();
const MOVED = new Vector3();
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
  const hidden = useMemo(() => bloomPatch(), []);

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
  const drop = useRef(0);
  const focus = useRef({
    on: false,
    armed: false,
    dwellCell: -1,
    dwell: 0,
    away: 0,
    pan: 0,
    lastPan: 0,
    x: 0,
    y: 0,
  });
  /** Falso até o primeiro quadro: antes dele não há posição anterior. */
  const moved = useRef(false);
  /** A HUD no quadro anterior, e se o segredo do CTA já foi achado. */
  const wasBare = useRef<boolean | null>(null);
  const bloomed = useRef(false);
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
    // As plantas e a silhueta da indústria chegam por arquivo: espera por
    // elas (com um teto, para uma rede ruim não segurar o site) e só então
    // compila tudo de uma vez.
    const ceiling = new Promise<void>((resolve) => {
      window.setTimeout(resolve, PLANTS_WAIT_MS);
    });
    void Promise.race([Promise.all([plantsSettled, industrySettled]), ceiling])
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
    // O ponteiro no meio da tela olha a linha do meio; no topo, a primeira; da
    // altura de três quartos para baixo, a última inteira.
    drop.current = still ? 0 : damp(drop.current, clamp01(0.5 + getPointer().y * 0.8), 2.2, dt);
    applyWallApproach(
      pose,
      fork,
      wallPan(progress),
      drop.current,
      state.size.width / Math.max(state.size.height, 1),
    );
    shared.fork.value = fork;

    // O foco: o ponteiro parado numa tela leva a câmera até ela. Só conta o
    // ponteiro que se mexeu depois do último scroll — rolar com ele parado
    // em cima das telas não abre nada.
    const pan = wallPan(progress);
    const aim = getPointer();
    const f = focus.current;
    if (aim.x !== f.x || aim.y !== f.y) f.armed = true;
    if (Math.abs(pan - f.lastPan) > 1e-4) f.armed = false;
    f.x = aim.x;
    f.y = aim.y;
    f.lastPan = pan;
    const hover = wallFocus.hover;
    const open = !still && fork >= 0.5 && hasPointer() && shared.caseRecess.value < 0.02;
    if (f.on) {
      // Enquanto a câmera ainda chega, a tela passa por baixo do ponteiro.
      f.away = hover === wallFocus.cell || wallFocus.weight < 0.9 ? 0 : f.away + dt;
      if (!open || f.away > FOCUS_AWAY_S || Math.abs(pan - f.pan) > FOCUS_PAN) {
        f.on = false;
        f.dwell = 0;
        f.dwellCell = -1;
      }
    } else if (open && f.armed && hover >= 0 && wallFocus.weight < 0.05) {
      f.dwell = hover === f.dwellCell ? f.dwell + dt : 0;
      f.dwellCell = hover;
      if (f.dwell >= FOCUS_DWELL_S) {
        f.on = true;
        f.away = 0;
        f.pan = pan;
        wallFocus.cell = hover;
      }
    } else {
      f.dwell = 0;
      f.dwellCell = -1;
    }
    wallFocus.weight = still ? 0 : damp(wallFocus.weight, f.on ? 1 : 0, 3, dt);
    if (!f.on && wallFocus.weight < 1e-3) {
      wallFocus.weight = 0;
      wallFocus.cell = -1;
    }
    applyWallFocus(
      pose,
      wallFocus.cell,
      wallFocus.weight,
      state.size.width / Math.max(state.size.height, 1),
    );

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

    // Olhar em volta: o ponteiro gira o olhar para o lado dele, até 25 graus
    // na borda da tela. Perto do centro quase nada se move (a resposta é
    // quadrática), para a leitura ficar parada. Some no modo calmo e dentro
    // de um case, onde nada se mexe.
    if (!still) {
      const pointer = getPointer();
      // Na parede o olhar não gira: as telas ficam de frente.
      const amount = (1 - inCase) * (1 - fork);
      sway.current.x = damp(sway.current.x, pointer.x * Math.abs(pointer.x) * amount, 2.2, dt);
      sway.current.y = damp(sway.current.y, pointer.y * Math.abs(pointer.y) * amount, 2.2, dt);
      VIEW.subVectors(pose.target, pose.position);
      const reach = VIEW.length();
      RIGHT.crossVectors(VIEW.normalize(), UP).normalize();
      pose.position.addScaledVector(RIGHT, sway.current.x * 0.25);
      VIEW.applyAxisAngle(UP, -sway.current.x * LOOK_YAW);
      pose.target.copy(pose.position).addScaledVector(VIEW, reach);
      pose.target.y -= Math.tan(sway.current.y * LOOK_PITCH) * reach;
    }

    // A câmera nunca entra no chão, nem na travessia.
    const floor = heightAt(pose.position.x, pose.position.z) + 1.1;
    if (pose.position.y < floor) pose.position.y = floor;

    // O ar que a câmera arrasta: a velocidade dela, do quadro anterior para
    // este. Um salto (troca de rota, corte de case) não é movimento.
    MOVED.subVectors(pose.position, camera.position);
    if (still || !moved.current || MOVED.length() > EYE_JUMP) MOVED.set(0, 0, 0);
    else MOVED.divideScalar(Math.max(dt, 1e-3)).clampLength(0, EYE_SPEED_MAX);
    shared.eyeVelocity.value.copy(MOVED);
    moved.current = true;

    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    focusRef.current = pose.position.distanceTo(pose.target);

    // Texto de leitura nunca tem desfoque: dentro do case a abertura fecha.
    // Com a HUD desligada também: é para olhar em volta, e o foco na placa
    // borraria todo o resto.
    const bare = document.documentElement.getAttribute("data-hud-view") === "off";
    // O segredo: ligar ou desligar a HUD no CTA faz o campo vazio florescer e
    // traz um segundo planeta. Fica até a página recarregar.
    if (wasBare.current !== null && bare !== wasBare.current && progress >= beatOf("cta").from) {
      bloomed.current = true;
    }
    wasBare.current = bare;
    shared.bloom.value = !bloomed.current
      ? 0
      : still
        ? 1
        : Math.min(1, shared.bloom.value + dt / BLOOM_S);
    const aperture = bare ? 0 : apertureAt(progress) * (1 - inCase) * (1 - wallFocus.weight);
    apertureRef.current = still
      ? aperture
      : damp(apertureRef.current, aperture, 4, dt);

    // --- atmosfera ----------------------------------------------------------
    const fogBase = fogAt(progress);
    // A névoa fechada do case existe para o texto; sem texto, vale a da descida.
    const fogOpen = bare
      ? fogBase * BARE_FOG
      : fogBase + (CASE_FOG - fogBase) * inCase;
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

    // O planeta: aparece com o fim da trilha, e onde ele fica depende da
    // proporção da tela.
    shared.planet.value.set(
      still ? astro : damp(shared.planet.value.x, astro, 3, dt),
      planetPlace(state.size.width / Math.max(state.size.height, 1), shared.astroDir.value),
    );
    moonPlace(state.size.width / Math.max(state.size.height, 1), shared.moonDir.value);

    // --- a luz: a flora, mais forte na parada em que a câmera está ---------
    const stop = stopWeight(progress);
    const emitters = shared.emitters.value;
    // Na zona do CTA a luz da mancha do começo, longe demais para ser vista,
    // vai para a mancha escondida, e acende com ela.
    const borrow = pose.position.z < CTA_ZONE_Z;
    for (let i = 0; i < emitters.length; i += 1) {
      const patch = borrow && i === BLOOM_SLOT ? hidden : patches[i];
      const emitter = emitters[i];
      if (emitter === undefined) continue;
      if (patch === undefined) {
        emitter.w = 0;
        continue;
      }
      const here = patch.stop >= 0 && patch.stop === stop.index ? stop.weight : 0;
      const lit = patch === hidden ? shared.bloom.value : 1;
      const wanted = patch.light * lit * (patch.stop >= 0 ? 0.6 + 0.75 * here : 1);
      emitter.set(
        patch.x,
        heightAt(patch.x, patch.z) + 1.2,
        patch.z,
        still ? wanted : damp(emitter.w, wanted, 3, dt),
      );
    }

    for (let i = 0; i < patches.length; i += 1) {
      const patch = borrow && i === BLOOM_SLOT ? hidden : patches[i];
      shared.emitterWarm.value[i] = patch?.warm ?? 0;
    }

    // --- as portas de enrolar ----------------------------------------------
    // Abrem na chegada da câmera e com a leitura de um case. No nível baixo
    // de qualidade ficam abertas, paradas.
    for (const index of DOOR_STOPS) {
      shared.doors.value[index] = getQuality().door
        ? Math.max(doorOpen(progress, index), inCase)
        : 1;
    }

    // --- a eletricidade -----------------------------------------------------
    // Rajadas curtas, de tempos em tempos: as descargas saltam entre as torres
    // e o ar inteiro acende um instante. No modo calmo e na leitura, nada.
    {
      const t = shared.time.value;
      const slot = Math.floor(t * 0.6);
      const roll = Math.sin(slot * 91.7) * 43758.5453;
      const active =
        !still && roll - Math.floor(roll) > 0.8 && t * 0.6 - slot < 0.5 && reveal > 0.9;
      shared.storm.value = active ? 1 - inCase : 0;
      const pulse = Math.sin(Math.floor(t * 22) * 12.9898) * 43758.5453;
      const spark = active && pulse - Math.floor(pulse) > 0.8 ? 1 - inCase : 0;
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
      <Flora shared={shared} still={still} />
      <Panels shared={shared} panels={panels} />
      <Plates shared={shared} instant={instant} />
      <Door shared={shared} instant={instant} />
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
