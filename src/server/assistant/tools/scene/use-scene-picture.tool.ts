import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { ownScene, Target } from './own-scene';

const Input = Target.extend({ name: z.string() });
const Output = z.object({ name: z.string() });

export class UseScenePicture extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'use_scene_picture';
  readonly title = 'Dùng lại ảnh cũ';
  readonly description = 'Dùng lại một ảnh đã vẽ trước đó cho cảnh (name lấy từ list_scene_pictures). Không tốn tiền.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Dùng lại một ảnh cũ';
  }

  protected async execute({ episodeId, sceneId, name }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownScene(ctx, episodeId, sceneId);
    await episodeService.useScenePicture(episodeId, sceneId, name);
    return { name };
  }

  present() {
    return 'Đã dùng lại ảnh. Cảnh cần duyệt lại.';
  }
}
