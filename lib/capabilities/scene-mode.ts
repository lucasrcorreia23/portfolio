/**
 * Os quatro modos em que o site pode rodar, num módulo sem `"use client"`.
 *
 * A lista é a fonte do union `SceneMode`; o hook que **decide** o modo mora em
 * `use-scene-mode.ts`, esse sim só no cliente. Separar os dois é o que permite
 * ao servidor (metadados, testes, qualquer coisa que precise nomear um modo)
 * falar dos modos sem arrastar os hooks de capacidade para dentro dele.
 */
export const SCENE_MODES = ["pending", "driven", "composed", "poster"] as const;
export type SceneMode = (typeof SCENE_MODES)[number];
