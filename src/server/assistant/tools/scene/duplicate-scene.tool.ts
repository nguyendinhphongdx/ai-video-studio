import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { newId } from '@/core/domain/ids';
import { episodeService } from '@/server/modules/episode/episode.service';

import { scriptInput } from '../util';
import { ownScene, Target } from './own-scene';

const Input = Target;
const Output = z.object({ sceneId: z.string() });

export class DuplicateScene extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'duplicate_scene';
  readonly title = 'Nhân đôi cảnh';
  readonly description = 'Nhân đôi một cảnh (lời đọc, thuộc tính, chỉnh tay), đặt ngay sau nó. Bản sao cần tạo lại ảnh/giọng nếu cảnh gốc có.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Nhân đôi một cảnh';
  }

  protected async execute({ episodeId, sceneId }: z.infer<typeof Input>, ctx: ToolContext) {
    const { v, scene, at } = await ownScene(ctx, episodeId, sceneId);
    const copy = { ...scene, id: newId() };
    const scenes = [...v.episode.scenes];
    scenes.splice(at + 1, 0, copy);
    await episodeService.saveScript(episodeId, scriptInput(v, scenes));
    return { sceneId: copy.id };
  }

  present({ sceneId }: z.infer<typeof Output>) {
    return `Đã nhân đôi, bản sao có id ${sceneId}.`;
  }
}
