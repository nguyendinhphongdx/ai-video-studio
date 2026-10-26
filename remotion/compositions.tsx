import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';

import { BrandContext, SceneFade, ensureFonts, type SceneBrand } from './primitives';
import { BLOCKS } from './blocks';

ensureFonts();

/** Narration starts a little after the picture (keep in sync with NARRATION_DELAY_SEC in src/core/timeline.ts). */
const NARRATION_DELAY_FRAMES = 6;

function Missing({ block }: { block: string }) {
  return (
    <AbsoluteFill style={{ background: '#1f2937', color: '#e5e7eb', justifyContent: 'center', alignItems: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>
      @{block}: xem sau khi render
    </AbsoluteFill>
  );
}

export interface SceneClipProps {
  block: string;
  props: Record<string, unknown>;
  ordinal: number;
  brand: SceneBrand;
  durationSec: number;
  narrationSrc: string | null;
  width: number;
  height: number;
  [key: string]: unknown;
}

/** One scene = one clip. The worker renders these and joins them. */
export function SceneClip({ block, props, ordinal, brand, narrationSrc }: SceneClipProps) {
  const draw = BLOCKS[block];
  return (
    <BrandContext.Provider value={brand}>
      <AbsoluteFill style={{ background: '#000' }}>
        <SceneFade>{draw ? draw(props, ordinal) : <Missing block={block} />}</SceneFade>
        {narrationSrc ? (
          <Sequence from={NARRATION_DELAY_FRAMES} layout="none">
            <Audio src={narrationSrc} />
          </Sequence>
        ) : null}
      </AbsoluteFill>
    </BrandContext.Provider>
  );
}

export interface StoryboardScene {
  key: string;
  block: string;
  props: Record<string, unknown>;
  ordinal: number;
  durationSec: number;
  narrationSrc: string | null;
}

export interface StoryboardProps {
  scenes: StoryboardScene[];
  brand: SceneBrand;
  /** File under public/audio/, or null for no music. */
  music: string | null;
  [key: string]: unknown;
}

/** Whole plan back to back, for the live preview in the storyboard. */
export function Storyboard({ scenes, brand, music }: StoryboardProps) {
  const { fps } = useVideoConfig();
  let from = 0;
  return (
    <BrandContext.Provider value={brand}>
      <AbsoluteFill style={{ background: '#000' }}>
        {music ? <Audio src={staticFile(`audio/${music}`)} loop volume={0.12} /> : null}
        {scenes.map((s) => {
          const len = Math.max(1, Math.round(s.durationSec * fps));
          const seq = (
            <Sequence key={s.key} from={from} durationInFrames={len} premountFor={fps}>
              <SceneFade>{BLOCKS[s.block] ? BLOCKS[s.block]!(s.props, s.ordinal) : <Missing block={s.block} />}</SceneFade>
              {s.narrationSrc ? (
                <Sequence from={NARRATION_DELAY_FRAMES} layout="none">
                  <Audio src={s.narrationSrc} />
                </Sequence>
              ) : null}
            </Sequence>
          );
          from += len;
          return seq;
        })}
      </AbsoluteFill>
    </BrandContext.Provider>
  );
}
