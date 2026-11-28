import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode, scriptInput } from '../util';

const Input = z.object({ episodeId: z.string(), sceneId: z.string() });
const Output = z.object({ sceneId: z.string() });

export class RemoveScene extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'remove_scene';
  readonly title = 'Xoá một cảnh';
  readonly description = 'Xoá một cảnh khỏi video (không xoá được cảnh khoá của series).';
  readonly risk = 'destructive';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Xoá một cảnh của video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId, sceneId }: z.infer<typeof Input>, ctx: ToolContext) {
    const v = await ownEpisode(ctx, episodeId);
    const scene = v.episode.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new UserFacingError('Không tìm thấy cảnh này.');
    if (scene.locked) throw new UserFacingError('Cảnh này bị khoá theo series, không xoá được.');
    await episodeService.saveScript(episodeId, scriptInput(v, v.episode.scenes.filter((s) => s.id !== sceneId)));
    return { sceneId };
  }

  present() {
    return 'Đã xoá cảnh.';
  }
}
