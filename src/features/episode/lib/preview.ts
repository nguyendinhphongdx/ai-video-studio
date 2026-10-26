// Builds @remotion/player props from a script, using the same timing rules as the worker
// (estimated speech length until real voice previews are loaded).
import { FPS, MEDIA_MUSIC_PREFIX } from '@/core/domain/catalog';
import type { Scene } from '@/core/domain/episode';
import { estimateSpeechSec, sceneDuration } from '@/core/timeline';
import type { ChannelView } from '@/features/app';
import type { SceneBrand } from '@video/primitives';
import type { StoryboardProps, StoryboardScene } from '@video/compositions';

import type { BlockInfo, ToolInfo } from '../services/episode.api';

export function blockIndex(tools: ToolInfo[] | undefined): Map<string, BlockInfo & { previewable: boolean; toolName: string }> {
  const map = new Map<string, BlockInfo & { previewable: boolean; toolName: string }>();
  for (const t of tools ?? []) for (const b of t.blocks) map.set(b.ref, { ...b, previewable: t.previewable, toolName: t.name });
  return map;
}

export function brandOf(channel: ChannelView | null): SceneBrand {
  return {
    name: channel?.name ?? '',
    font: channel?.font ?? 'Baloo2',
    logoSrc: channel?.logoUrl ?? null,
    outroText: channel?.outroText ?? '',
    subscribeText: channel?.subscribeText ?? '',
    palette: channel?.palette ?? [],
  };
}

/** Player source for a channel's music setting ("music.wav", "media:<path>" or "none"). */
export function musicSrc(music: string | undefined): string | null {
  if (!music || music === 'none') return null;
  if (music.startsWith(MEDIA_MUSIC_PREFIX)) return `/api/v1/media/${music.slice(MEDIA_MUSIC_PREFIX.length).split('/').map(encodeURIComponent).join('/')}`;
  return music;
}

export interface VoiceLine {
  url: string;
  seconds: number;
}

export function sceneSeconds(scene: Scene, blocks: Map<string, BlockInfo>, voice?: Map<string, VoiceLine>): number {
  const spoken = voice?.get(scene.id)?.seconds ?? estimateSpeechSec(scene.narration);
  return sceneDuration(blocks.get(scene.block)?.minSeconds ?? 3, spoken);
}

export function storyboardProps(
  scenes: Scene[],
  blocks: Map<string, BlockInfo>,
  brand: SceneBrand,
  opts: { voice?: Map<string, VoiceLine>; music: string | null },
): { props: StoryboardProps; durationInFrames: number; starts: number[] } {
  const sbScenes: StoryboardScene[] = [];
  const starts: number[] = [];
  let frames = 0;
  scenes.forEach((s, i) => {
    const sec = sceneSeconds(s, blocks, opts.voice);
    starts.push(frames);
    frames += Math.max(1, Math.round(sec * FPS));
    sbScenes.push({
      key: s.id,
      block: s.block,
      props: s.props,
      ordinal: scenes.slice(0, i + 1).filter((x) => x.block === s.block).length,
      durationSec: sec,
      narrationSrc: opts.voice?.get(s.id)?.url ?? null,
    });
  });
  return { props: { scenes: sbScenes, brand, music: opts.music }, durationInFrames: Math.max(1, frames), starts };
}
