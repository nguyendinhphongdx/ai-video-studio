import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';

import { tuneOf } from '../src/core/domain/tune';
import { BrandContext, ensureFonts, type SceneBrand } from './primitives';
import { SceneFade, entranceFor } from './shots/transitions';
import { BLOCKS } from './blocks';

ensureFonts();

/** Narration starts a little after the picture (keep in sync with NARRATION_DELAY_SEC in src/core/timeline.ts). */
const NARRATION_DELAY_FRAMES = 6;
const narrationFrom = (props: Record<string, unknown>, fps: number) => NARRATION_DELAY_FRAMES + Math.round((tuneOf(props).voiceDelay ?? 0) * fps);

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
  const { fps } = useVideoConfig();
  const draw = BLOCKS[block];
  return (
    <BrandContext.Provider value={brand}>
      <AbsoluteFill style={{ background: '#000' }}>
        <SceneFade entrance={entranceFor(block, ordinal, props.transition)} colors={brand.palette}>{draw ? draw(props, ordinal) : <Missing block={block} />}</SceneFade>
        {narrationSrc ? (
          <Sequence from={narrationFrom(props, fps)} layout="none">
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
  /** A file under public/audio/ ("music.wav") or a URL, or null for no music. */
  music: string | null;
  musicVolume?: number;
  [key: string]: unknown;
}

/** Whole plan back to back, for the live preview in the storyboard. */
export function Storyboard({ scenes, brand, music, musicVolume = 0.12 }: StoryboardProps) {
  const { fps } = useVideoConfig();
  let from = 0;
  return (
    <BrandContext.Provider value={brand}>
      <AbsoluteFill style={{ background: '#000' }}>
        {music ? <Audio src={/^(https?:|\/|data:)/.test(music) ? music : staticFile(`audio/${music}`)} loop volume={musicVolume} /> : null}
        {scenes.map((s) => {
          const len = Math.max(1, Math.round(s.durationSec * fps));
          const seq = (
            <Sequence key={s.key} from={from} durationInFrames={len} premountFor={fps}>
              <SceneFade entrance={entranceFor(s.block, s.ordinal, s.props.transition)} colors={brand.palette}>{BLOCKS[s.block] ? BLOCKS[s.block]!(s.props, s.ordinal) : <Missing block={s.block} />}</SceneFade>
              {s.narrationSrc ? (
                <Sequence from={narrationFrom(s.props, fps)} layout="none">
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
