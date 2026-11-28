import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { episodeService } from '@/server/modules/episode/episode.service';

import { scriptInput } from '../util';
import { ownScene, Target } from './own-scene';

const Input = Target.extend({ afterSceneId: z.string().optional() });
const Output = z.object({ sceneNumber: z.number() });

export class MoveScene extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'move_scene';
  readonly title = 'Đổi thứ tự cảnh';
  readonly description = 'Chuyển một cảnh đến ngay sau cảnh afterSceneId (cùng phần của khung video). Bỏ trống afterSceneId để đưa lên đầu phần đó. Ảnh, giọng và duyệt được giữ.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Đổi thứ tự cảnh';
  }

  protected async execute({ episodeId, sceneId, afterSceneId }: z.infer<typeof Input>, ctx: ToolContext) {
    const { v, scene } = await ownScene(ctx, episodeId, sceneId);
    const rest = v.episode.scenes.filter((s) => s.id !== sceneId);
    const after = afterSceneId ? rest.findIndex((s) => s.id === afterSceneId) : -1;
    if (afterSceneId && rest[after]?.slotId !== scene.slotId) throw new UserFacingError('afterSceneId phải là một cảnh cùng phần (slot) với cảnh đang chuyển.');
    const first = rest.findIndex((s) => s.slotId === scene.slotId && !s.locked);
    const where = afterSceneId ? after + 1 : first >= 0 ? first : v.episode.scenes.indexOf(scene);
    rest.splice(where, 0, scene);
    await episodeService.saveScript(episodeId, scriptInput(v, rest));
    return { sceneNumber: where + 1 };
  }

  present({ sceneNumber }: z.infer<typeof Output>) {
    return `Đã chuyển cảnh thành cảnh số ${sceneNumber}.`;
  }
}
