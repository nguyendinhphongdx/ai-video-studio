import { z } from 'zod';

import { StudioTool } from '@/core/assistant/tool';
import { jobRepository } from '@/server/modules/job/job.repository';

import { asJson } from '../util';

const Input = z.object({});
const Output = z.object({ jobs: z.array(z.object({ kind: z.string(), state: z.string(), progress: z.number(), episodeId: z.string().nullable(), createdAt: z.string() })) });

export class ListRunningWork extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_running_work';
  readonly title = 'Xem việc đang chạy';
  readonly description = 'Mọi việc đang chờ hoặc đang chạy nền trong workspace (viết kịch bản, tạo ảnh/giọng, dựng video, vẽ ảnh): loại, tiến độ, episodeId. Không còn trong danh sách nghĩa là đã xong hoặc lỗi: xem get_episode.';
  readonly risk = 'read';
  override readonly scope = 'workspace';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem việc đang chạy';
  }

  protected async execute() {
    const jobs = await jobRepository.listActive();
    return { jobs: jobs.map((j) => ({ kind: j.kind, state: j.state, progress: Math.round(j.progress * 100), episodeId: j.episodeId, createdAt: j.createdAt })) };
  }

  present({ jobs }: z.infer<typeof Output>) {
    return jobs.length ? asJson(jobs) : 'Không có việc nào đang chạy.';
  }
}
