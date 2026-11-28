import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { seriesService } from '@/server/modules/series/series.service';

import { ownSeries } from '../util';

const Input = z.object({
  seriesId: z.string(),
  name: z.string().max(80).optional(),
  premise: z.string().max(1000).optional(),
  host: z.string().max(200).optional(),
  catchphrases: z.array(z.string().max(200)).max(10).optional(),
  avoid: z.array(z.string().max(200)).max(30).optional(),
  instructions: z.string().max(20_000).optional(),
  titleTemplate: z.string().max(120).optional(),
  hashtags: z.array(z.string().regex(/^#\S+$/)).max(10).optional(),
  descriptionFooter: z.string().max(2000).optional(),
});
const Output = z.object({ name: z.string(), newVersion: z.boolean() });

export class UpdateSeries extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'update_series';
  readonly title = 'Sửa series';
  readonly description = 'Sửa series (chỉ truyền trường cần đổi): bible (premise, host, catchphrases, avoid, instructions), mẫu đăng bài (titleTemplate, hashtags, descriptionFooter) hoặc đổi tên. Mỗi lần sửa bible/đăng bài tạo phiên bản series mới; tập đã viết giữ phiên bản cũ.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize(a: z.infer<typeof Input>) {
    return `Sửa series ${a.seriesId}: ${Object.keys(a).filter((k) => k !== 'seriesId' && (a as Record<string, unknown>)[k] !== undefined).join(', ')}`;
  }

  protected async execute(a: z.infer<typeof Input>, ctx: ToolContext) {
    const s = await ownSeries(ctx, a.seriesId);
    const r = s.rules;
    const rulesChanged = ['premise', 'host', 'catchphrases', 'avoid', 'instructions', 'titleTemplate', 'hashtags', 'descriptionFooter'].some((k) => (a as Record<string, unknown>)[k] !== undefined);
    if (rulesChanged) {
      await seriesService.saveRules(s.id, {
        skillId: r.skillId,
        bible: { ...r.bible, premise: a.premise ?? r.bible.premise, host: a.host ?? r.bible.host, catchphrases: a.catchphrases ?? r.bible.catchphrases, avoid: a.avoid ?? r.bible.avoid, instructions: a.instructions ?? r.bible.instructions },
        format: r.format,
        publish: { title: a.titleTemplate ?? r.publish.title, hashtags: a.hashtags ?? r.publish.hashtags, descriptionFooter: a.descriptionFooter ?? r.publish.descriptionFooter },
      });
    }
    if (a.name) await seriesService.update(s.id, { name: a.name });
    return { name: a.name ?? s.name, newVersion: rulesChanged };
  }

  present({ name, newVersion }: z.infer<typeof Output>) {
    return `Đã sửa series "${name}".${newVersion ? ' Đã tạo phiên bản series mới.' : ''}`;
  }
}
