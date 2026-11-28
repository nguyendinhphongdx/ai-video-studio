import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { publishMarkdown } from '@/core/script/publish';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ markdown: z.string() });

export class GetPublishKit extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_publish_kit';
  readonly title = 'Lấy bộ đăng bài';
  readonly description = 'Bộ đăng bài của một video: tiêu đề, mô tả, hashtag và các tệp đã dựng (Markdown). Studio không tự đăng lên nền tảng nào.';
  readonly risk = 'read';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Lấy bộ đăng bài của video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    const { episode, renders } = await ownEpisode(ctx, episodeId);
    return { markdown: publishMarkdown(episode, renders) };
  }

  present({ markdown }: z.infer<typeof Output>) {
    return markdown;
  }
}
