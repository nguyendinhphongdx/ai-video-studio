'use client';

// @remotion/player wrappers. Imported through ./index (next/dynamic, no SSR): Remotion needs the browser.
import { Player, Thumbnail, type PlayerRef } from '@remotion/player';
import { useEffect, useRef } from 'react';

import { FORMATS, FPS, type Format } from '@/core/domain/catalog';
import { SceneClip, Storyboard, type SceneClipProps, type StoryboardProps } from '@video/compositions';
import type { SceneBrand } from '@video/primitives';

export interface StoryboardPlayerProps {
  props: StoryboardProps;
  durationInFrames: number;
  format: Format;
  /** Jump to a frame and play; `nonce` lets the same frame be requested twice. */
  seek?: { frame: number; nonce: number } | null;
  className?: string;
}

/** The whole episode, live, before any render. */
export function StoryboardPlayer({ props, durationInFrames, format, seek, className }: StoryboardPlayerProps) {
  const ref = useRef<PlayerRef>(null);
  const { width, height } = FORMATS[format];
  useEffect(() => {
    if (!seek || !ref.current) return;
    ref.current.seekTo(Math.min(seek.frame, durationInFrames - 1));
    ref.current.play();
  }, [seek, durationInFrames]);
  return (
    <Player
      ref={ref}
      component={Storyboard}
      inputProps={props}
      durationInFrames={durationInFrames}
      fps={FPS}
      compositionWidth={width}
      compositionHeight={height}
      // Scenes fade in from black; open on a frame where the first scene is visible.
      initialFrame={Math.min(20, durationInFrames - 1)}
      controls
      clickToPlay
      doubleClickToFullscreen
      acknowledgeRemotionLicense
      className={className}
      style={{ width: '100%', aspectRatio: `${width} / ${height}`, borderRadius: 12, overflow: 'hidden', background: '#000' }}
    />
  );
}

export interface ScenePlayerProps {
  block: string;
  props: Record<string, unknown>;
  ordinal: number;
  brand: SceneBrand;
  durationSec: number;
  narrationSrc?: string | null;
}

/** One scene looping, used in the scene editor so edits show immediately. */
export function ScenePlayer({ block, props, ordinal, brand, durationSec, narrationSrc = null }: ScenePlayerProps) {
  const inputProps: SceneClipProps = { block, props, ordinal, brand, durationSec, narrationSrc, width: 1920, height: 1080 };
  return (
    <Player
      component={SceneClip}
      inputProps={inputProps}
      durationInFrames={Math.max(1, Math.round(durationSec * FPS))}
      fps={FPS}
      compositionWidth={1920}
      compositionHeight={1080}
      autoPlay
      loop
      controls
      acknowledgeRemotionLicense
      style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', background: '#000' }}
    />
  );
}

/** A still of one scene, taken once the entrance animation has settled. */
export function SceneThumbnail({ block, props, ordinal, brand, durationSec }: Omit<ScenePlayerProps, 'narrationSrc'>) {
  const durationInFrames = Math.max(1, Math.round(durationSec * FPS));
  const inputProps: SceneClipProps = { block, props, ordinal, brand, durationSec, narrationSrc: null, width: 1920, height: 1080 };
  return (
    <Thumbnail
      component={SceneClip}
      inputProps={inputProps}
      compositionWidth={1920}
      compositionHeight={1080}
      durationInFrames={durationInFrames}
      fps={FPS}
      frameToDisplay={Math.min(durationInFrames - 10, Math.round(FPS * 2.6))}
      style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', background: '#e3e6ee' }}
    />
  );
}
