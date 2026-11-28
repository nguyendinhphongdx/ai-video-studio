import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { asJson, ownEpisode } from '../util';
import { Target } from './own-scene';

const Input = Target;
const Output = z.object({ pictures: z.array(z.object({ n: z.number(), name: z.string(), current: z.boolean() })) });

export class ListScenePictures extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_scene_pictures';
  readonly title = 'Xem ảnh cũ của cảnh';
  readonly description = 'Các ảnh đã từng vẽ cho một cảnh (mới nhất trước), kèm ảnh nào đang dùng. Bạn không nhìn thấy nội dung ảnh.';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem các ảnh cũ của cảnh';
  }

  protected async execute({ episodeId, sceneId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    const pictures = await episodeService.scenePictures(episodeId, sceneId);
    return { pictures: pictures.map((p, i) => ({ n: i + 1, name: p.name, current: p.current })) };
  }

  present({ pictures }: z.infer<typeof Output>) {
    return asJson(pictures);
  }
}
