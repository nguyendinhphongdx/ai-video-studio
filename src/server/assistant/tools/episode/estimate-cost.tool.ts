import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { makePlan } from '@/core/scenes/make-plan';
import { episodeService } from '@/server/modules/episode/episode.service';
import { usageService } from '@/server/modules/usage/usage.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ images: z.number(), voices: z.number(), voiceSeconds: z.number(), usd: z.number().nullable(), fxUsdVnd: z.number(), approvable: z.number() });

export class EstimateCost extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'estimate_cost';
  readonly title = 'Ước tính chi phí';
  readonly description = 'Ước tính chi phí để tạo phần ảnh và giọng còn thiếu của video (không gọi AI, không tốn tiền): số ảnh, số giây giọng, USD, VND. Dùng để báo giá cho người dùng TRƯỚC khi xin đồng ý tạo.';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Ước tính chi phí ảnh và giọng của video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    const v = await episodeService.get(episodeId);
    const plan = makePlan(v.episode.scenes, v.assets);
    if (plan.empty) return { images: 0, voices: 0, voiceSeconds: 0, usd: 0, fxUsdVnd: 0, approvable: plan.approvable.length };
    const e = await usageService.estimate({ images: plan.images, texts: plan.voiceTexts, voice: v.episode.voice });
    return { images: plan.images, voices: plan.voices, voiceSeconds: e.voiceSeconds, usd: e.usd, fxUsdVnd: e.fxUsdVnd, approvable: plan.approvable.length };
  }

  present({ images, voices, voiceSeconds, usd, fxUsdVnd, approvable }: z.infer<typeof Output>) {
    if (!images && !voices) return 'Mọi cảnh đã đủ ảnh và giọng, không cần tạo thêm, chi phí $0.';
    const money = usd === null ? 'chưa có giá trong bảng giá nên chưa ước tính được tiền' : usd === 0 ? '$0 (miễn phí)' : `khoảng $${usd.toFixed(3)} (≈ ${Math.round(usd * fxUsdVnd).toLocaleString('vi-VN')} ₫)`;
    return `Còn thiếu ${images} ảnh và ${voices} giọng (~${voiceSeconds} giây). Chi phí: ${money}. ${approvable} cảnh đã đủ nhưng chưa duyệt.`;
  }
}
