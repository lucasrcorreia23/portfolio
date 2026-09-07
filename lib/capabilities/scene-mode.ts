/**
 * Sem `"use client"`: os nomes dos modos precisam ser legíveis também do
 * servidor, que é quem traduz os rótulos. O hook que decide o modo mora em
 * `use-scene-mode.ts`, esse sim só no cliente.
 */
export const SCENE_MODES = ["pending", "driven", "composed", "poster"] as const;
export type SceneMode = (typeof SCENE_MODES)[number];
