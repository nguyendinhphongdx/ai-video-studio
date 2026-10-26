// Scene timing: as long as the narration (plus padding) but never less than the block's minimum.
// Used by the worker (real audio lengths) and the storyboard (estimates).
import type { Scene } from './domain/episode';

/** Narration starts this long after the scene (keep in sync with NARRATION_DELAY_FRAMES in remotion/compositions.tsx). */
export const NARRATION_DELAY_SEC = 0.2;
const TAIL_PAD_SEC = 0.7;

export function sceneDuration(minSeconds: number, narrationSec: number): number {
  return Math.max(minSeconds, narrationSec + NARRATION_DELAY_SEC + TAIL_PAD_SEC);
}

/** Vietnamese read at the default -8% rate is about 2.6 words per second. */
export function estimateSpeechSec(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length / 2.6;
}

export interface Timeline {
  scenes: { sceneId: string; start: number; duration: number }[];
  total: number;
}

export function buildTimeline(scenes: Scene[], minSecondsOf: (block: string) => number, narrationSec: (scene: Scene) => number): Timeline {
  let t = 0;
  const timed = scenes.map((s) => {
    const duration = sceneDuration(minSecondsOf(s.block), narrationSec(s));
    const item = { sceneId: s.id, start: t, duration };
    t += duration;
    return item;
  });
  return { scenes: timed, total: t };
}
