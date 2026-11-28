import { z } from 'zod';

import { StudioTool } from '@/core/assistant/tool';
import { configService } from '@/server/modules/config/config.service';
import { settingsService } from '@/server/modules/settings/settings.service';

import { asJson } from '../util';

const Input = z.object({});
const Output = z.object({ aiViet: z.unknown(), taoAnh: z.object({ ready: z.boolean(), provider: z.string(), model: z.string() }), giongEdge: z.unknown(), giongGoogle: z.unknown() });

export class GetSettingsStatus extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_settings_status';
  readonly title = 'Xem trạng thái cài đặt';
  readonly description = 'Xem studio đã cài gì: AI viết (provider, model), tạo ảnh, giọng đọc. Dùng khi một việc cần AI/ảnh/giọng mà có thể chưa được cài, để báo người dùng vào Cài đặt.';
  readonly risk = 'read';
  override readonly scope = 'workspace';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem trạng thái cài đặt';
  }

  protected async execute() {
    const [config, image] = await Promise.all([configService.get(), settingsService.publicImage()]);
    return { aiViet: config.llm, taoAnh: { ready: image.ready, provider: image.provider, model: image.model }, giongEdge: config.tts, giongGoogle: config.ttsGoogle };
  }

  present(output: z.infer<typeof Output>) {
    return asJson(output);
  }
}
