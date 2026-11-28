import { z } from 'zod';

import type { ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';

import { ownEpisode } from '../util';

export const Target = z.object({ episodeId: z.string(), sceneId: z.string() });

/** A scene of an episode of this project that may be changed. */
export async function ownScene(ctx: ToolContext, episodeId: string, sceneId: string) {
  const v = await ownEpisode(ctx, episodeId);
  const at = v.episode.scenes.findIndex((s) => s.id === sceneId);
  const scene = v.episode.scenes[at];
  if (!scene) throw new UserFacingError('Không tìm thấy cảnh này trong video.');
  if (scene.locked) throw new UserFacingError('Cảnh này bị khoá theo series, không sửa được.');
  return { v, scene, at };
}
