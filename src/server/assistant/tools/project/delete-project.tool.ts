import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { channelService } from '@/server/modules/channel/channel.service';

const Input = z.object({ confirmName: z.string().describe('Tên chính xác của dự án (get_channel)') });
const Output = z.object({ name: z.string() });

export class DeleteProject extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'delete_project';
  readonly title = 'Xoá dự án';
  readonly description = 'Xoá hẳn một dự án cùng skill, tri thức và series của nó. Không khôi phục được. Dự án còn video thì phải xoá từng video trước. confirmName phải đúng từng chữ tên dự án.';
  readonly risk = 'destructive';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  async summarize(_input: z.infer<typeof Input>, ctx: ToolContext) {
    return `Xoá dự án “${(await channelService.get(ctx.channelId)).name}”`;
  }

  protected async execute({ confirmName }: z.infer<typeof Input>, ctx: ToolContext) {
    const { name } = await channelService.get(ctx.channelId);
    if (confirmName !== name) throw new UserFacingError(`confirmName không khớp. Muốn xoá thì truyền đúng tên dự án: "${name}".`);
    await channelService.remove(ctx.channelId);
    return { name };
  }

  present({ name }: z.infer<typeof Output>) {
    return `Đã xoá dự án "${name}".`;
  }
}
