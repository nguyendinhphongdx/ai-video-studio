// Scene timing. A scene lasts as long as its narration (plus padding) but never less than its tool's minimum,
// so narration is never cut. Used by the worker (real audio lengths) and the storyboard (estimates).
import type { Scene } from './domain';
import type { ToolDefinition } from './tool';

/** Narration starts this long after the scene does, so the picture lands first. */
export const NARRATION_DELAY_SEC = 0.2;
const TAIL_PAD_SEC = 0.7;

export interface TimedScene {
  sceneId: string;
  start: number;
  duration: number;
}

export interface Timeline {
  scenes: TimedScene[];
  total: number;
}

export function sceneDuration(minSeconds: number, narrationSec: number): number {
  return Math.max(minSeconds, narrationSec + NARRATION_DELAY_SEC + TAIL_PAD_SEC);
}

/** Vietnamese read at the default -8% rate is about 2.6 words per second. */
export function estimateSpeechSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words / 2.6;
}

export function buildTimeline(
  scenes: Scene[],
  toolOf: (id: string) => Pick<ToolDefinition, 'minSeconds'> | undefined,
  narrationSec: (scene: Scene) => number,
): Timeline {
  let t = 0;
  const timed = scenes.map((s) => {
    const duration = sceneDuration(toolOf(s.tool)?.minSeconds ?? 3, narrationSec(s));
    const item = { sceneId: s.id, start: t, duration };
    t += duration;
    return item;
  });
  return { scenes: timed, total: t };
}
