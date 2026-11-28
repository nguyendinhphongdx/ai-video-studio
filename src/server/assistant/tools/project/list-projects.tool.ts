import { z } from 'zod';

import { StudioTool } from '@/core/assistant/tool';
import { channelService } from '@/server/modules/channel/channel.service';

import { asJson } from '../util';

const Input = z.object({});
const Output = z.object({ projects: z.array(z.object({ projectId: z.string(), name: z.string(), description: z.string() })) });

export class ListProjects extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_projects';
  readonly title = 'Xem các dự án';
  readonly description = 'Các dự án (kênh) của workspace. projectId lấy ở đây là bắt buộc với mọi công cụ làm việc trong một dự án.';
  readonly risk = 'read';
  override readonly scope = 'workspace';
  // The Assistant already lives inside one project.
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem các dự án';
  }

  protected async execute() {
    return { projects: (await channelService.list()).map((c) => ({ projectId: c.id, name: c.name, description: c.description })) };
  }

  present({ projects }: z.infer<typeof Output>) {
    return asJson(projects, 14000);
  }
}
