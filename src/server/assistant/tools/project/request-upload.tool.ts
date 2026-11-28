import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { linkService, UPLOAD_MINUTES } from '@/server/modules/mcp/links.service';

import { callerOf } from '../mcp-link';
import { ownScene } from '../scene/own-scene';

const Input = z.object({ purpose: z.enum(['logo', 'avatar', 'music', 'scene_picture']), episodeId: z.string().optional(), sceneId: z.string().optional() });
const Output = z.object({ url: z.string(), expiresAt: z.string() });

export class RequestUpload extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'request_upload';
  readonly title = 'Xin liên kết gửi file';
  readonly description = 'Xin một liên kết dùng MỘT lần để gửi file vào studio: logo, avatar (PNG/JPG/WEBP, tối đa 4MB), music (MP3/WAV, tối đa 20MB) cho dự án, hoặc scene_picture (PNG, tối đa 8MB, kèm episodeId và sceneId) thay ảnh một cảnh. Sau đó gửi file bằng lệnh curl được trả về.';
  readonly risk = 'write';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize({ purpose }: z.infer<typeof Input>) {
    return `Xin liên kết gửi file (${purpose})`;
  }

  protected async execute({ purpose, episodeId, sceneId }: z.infer<typeof Input>, ctx: ToolContext) {
    const { codeId, origin } = callerOf(ctx);
    const channelId = ctx.channelId;
    let link;
    if (purpose === 'scene_picture') {
      if (!episodeId || !sceneId) throw new UserFacingError('scene_picture cần episodeId và sceneId.');
      await ownScene(ctx, episodeId, sceneId);
      link = await linkService.upload(codeId, { purpose, channelId, episodeId, sceneId });
    } else {
      link = await linkService.upload(codeId, { purpose, channelId });
    }
    return { url: `${origin}/api/mcp/upload/${link.token}`, expiresAt: link.expiresAt };
  }

  present({ url }: z.infer<typeof Output>) {
    return `Gửi file trong ${UPLOAD_MINUTES} phút, dùng một lần:\ncurl -F "file=@/đường/dẫn/file" "${url}"`;
  }
}
