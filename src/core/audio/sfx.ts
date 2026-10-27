// Sound effects laid over a finished video: a soft sweep into most scenes, a thud on a stamp, ticks on typed text.
// Blocks say which sound goes with their own animation (BlockDefinition.sfx); this plans the whole video. The
// restraint rules (short sounds, quiet under the voice, a gap between cues, one big hit at a time) follow the
// sound-design notes of video-shotcraft (Apache-2.0), see NOTICE.
export const SFX_KINDS = ['whoosh', 'whoosh-soft', 'impact', 'riser', 'pop', 'stamp', 'tick', 'sparkle', 'paper'] as const;
export type SfxKind = (typeof SFX_KINDS)[number];

/** A sound a block wants during its scene; `at` is seconds from the scene start (may be slightly negative). */
export interface SfxCue {
  kind: SfxKind;
  at: number;
  volume?: number;
}

export interface PlacedCue {
  kind: SfxKind;
  atSec: number;
  volume: number;
  sceneId: string;
}

export interface SfxPort {
  enabled(): Promise<boolean>;
  /** Master level 0-1 applied to every cue. */
  volume(): Promise<number>;
  /** An audio file for the sound (a person's own pack wins over the built-in one), or null when none can be made. */
  file(kind: SfxKind, variant: number): Promise<string | null>;
}

/** Loudness of each sound before the master level; all are kept well under the voice. */
export const BASE_VOLUME: Record<SfxKind, number> = { whoosh: 0.5, 'whoosh-soft': 0.34, impact: 0.55, riser: 0.4, pop: 0.35, stamp: 0.5, tick: 0.2, sparkle: 0.3, paper: 0.3 };

const MIN_GAP_SEC = 0.22;
const TICK_GAP_SEC = 0.08;
/** Sweep into the next scene when the block brought no sound of its own; the cycle keeps it from sounding the same each time. */
const TRANSITION_CYCLE: SfxKind[] = ['whoosh-soft', 'whoosh-soft', 'whoosh'];
const isEntrance = (k: SfxKind) => k === 'whoosh' || k === 'whoosh-soft' || k === 'impact' || k === 'riser';

export interface CueScene {
  id: string;
  block: string;
  props: Record<string, unknown>;
  ordinal: number;
}

export function planCues(scenes: CueScene[], durations: number[], hooks: (scene: CueScene, durationSec: number) => SfxCue[] | undefined, master = 1): PlacedCue[] {
  const placed: PlacedCue[] = [];
  let start = 0;
  scenes.forEach((scene, i) => {
    const dur = durations[i] ?? 0;
    const cues = [...(hooks(scene, dur) ?? [])];
    // Every cut after the first gets a sweep unless the scene already opens with its own entrance sound.
    if (i > 0 && !cues.some((c) => isEntrance(c.kind) && c.at <= 0.15)) cues.push({ kind: TRANSITION_CYCLE[i % TRANSITION_CYCLE.length]!, at: -0.06 });
    for (const c of cues) {
      const atSec = Math.max(0, start + c.at);
      if (c.at < dur) placed.push({ kind: c.kind, atSec, volume: Math.min(1, (c.volume ?? BASE_VOLUME[c.kind]) * master), sceneId: scene.id });
    }
    start += dur;
  });
  placed.sort((a, b) => a.atSec - b.atSec);
  // Crowded cues turn into mush: keep the first of any that land too close together.
  const out: PlacedCue[] = [];
  for (const c of placed) {
    const prev = out.at(-1);
    const gap = c.kind === 'tick' && prev?.kind === 'tick' ? TICK_GAP_SEC : MIN_GAP_SEC;
    if (prev && c.atSec - prev.atSec < gap) continue;
    out.push(c);
  }
  return out;
}
