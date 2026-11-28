import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { channelService } from '@/server/modules/channel/channel.service';
import { episodeService } from '@/server/modules/episode/episode.service';
import { knowledgeService } from '@/server/modules/knowledge/knowledge.service';
import { seriesService } from '@/server/modules/series/series.service';
import { skillService } from '@/server/modules/skill/skill.service';

import { asJson } from '../util';

const Input = z.object({ designs: z.boolean().default(false) });
const Ref = z.object({ id: z.string(), name: z.string() });
const Output = z.object({ designs: z.boolean(), channel: z.object({ id: z.string(), name: z.string(), skills: z.array(Ref), series: z.array(Ref), videos: z.number() }).loose() });

const designSummary = (d: { layers: { kind: string }[]; seconds: number; artPrompt: string } | null) => (d ? { layers: d.layers.map((l) => l.kind), seconds: d.seconds, usesArt: d.artPrompt !== '' } : null);

export class GetChannel extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_channel';
  readonly title = 'Xem thông tin kênh';
  readonly description = 'Xem kênh hiện tại: tên, mô tả, khán giả, giọng văn, giọng đọc, bảng màu, font, hashtag, câu chào cuối, chữ nút đăng ký, phong cách ảnh, logo/avatar có chưa, skill mặc định, các skill đã cài, tri thức (phiên bản), số series/video. designs=true để lấy cả JSON thiết kế mở đầu/kết (cần khi sửa thiết kế).';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem thông tin kênh';
  }

  protected async execute({ designs }: z.infer<typeof Input>, ctx: ToolContext) {
    const c = await channelService.get(ctx.channelId);
    const [skills, knowledge, series, episodes] = await Promise.all([skillService.list(c.id), knowledgeService.get(c.id), seriesService.list(c.id), episodeService.list({ channelId: c.id })]);
    return {
      designs,
      channel: {
        id: c.id, name: c.name, description: c.description, audience: c.audience, style: c.style, voice: c.voice, palette: c.palette, font: c.font, hashtags: c.hashtags, outroText: c.outroText, subscribeText: c.subscribeText, imageStyle: c.imageStyle,
        defaultSkillId: c.defaultSkillId, hasLogo: Boolean(c.logoPath), hasAvatar: Boolean(c.avatarPath), introArt: Boolean(c.introArtPath), outroArt: Boolean(c.outroArtPath),
        intro: designs ? c.introDesign : designSummary(c.introDesign), outro: designs ? c.outroDesign : designSummary(c.outroDesign),
        skills: skills.map((s) => ({ id: s.id, name: s.name })), knowledgeVersion: knowledge.current?.version ?? null, knowledgeChars: knowledge.current?.markdown.length ?? 0,
        series: series.map((s) => ({ id: s.id, name: s.name })), videos: episodes.length,
      },
    };
  }

  present({ designs, channel }: z.infer<typeof Output>) {
    return asJson(channel, designs ? 14000 : 6000);
  }
}
