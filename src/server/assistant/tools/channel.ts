import { z } from 'zod';

import { DESIGN_GUIDE, KNOWLEDGE_GUIDE } from '@/core/assistant/guides';
import { defineTool } from '@/core/assistant/tool';
import { BRAND_FONT_IDS, VOICE_IDS, type BrandFont, type VoiceId } from '@/core/domain';
import { designSimilarity, normalizeDesign, SceneDesignSchema } from '@/core/domain/design';
import { channelService } from '@/server/modules/channel/channel.service';
import { ChannelInput } from '@/server/modules/channel/channel.types';
import { configService } from '@/server/modules/config/config.service';
import { knowledgeService } from '@/server/modules/knowledge/knowledge.service';
import { settingsService } from '@/server/modules/settings/settings.service';
import { seriesService } from '@/server/modules/series/series.service';
import { skillService } from '@/server/modules/skill/skill.service';
import { episodeService } from '@/server/modules/episode/episode.service';

import { asJson } from './util';

const designSummary = (d: { layers: { kind: string }[]; seconds: number; artPrompt: string } | null) => (d ? { layers: d.layers.map((l) => l.kind), seconds: d.seconds, usesArt: d.artPrompt !== '' } : null);

export const getSettingsStatus = defineTool({
  name: 'get_settings_status',
  description: 'Xem studio đã cài gì: AI viết (provider, model), tạo ảnh, giọng đọc. Dùng khi một việc cần AI/ảnh/giọng mà có thể chưa được cài, để báo người dùng vào Cài đặt.',
  risk: 'read',
  schema: z.object({}),
  summarize: () => 'Xem trạng thái cài đặt',
  async run() {
    const [config, image] = await Promise.all([configService.get(), settingsService.publicImage()]);
    return { ok: true, message: asJson({ aiViet: config.llm, taoAnh: { ready: image.ready, provider: image.provider, model: image.model }, giongEdge: config.tts, giongGoogle: config.ttsGoogle }) };
  },
});

export const getChannel = defineTool({
  name: 'get_channel',
  description: 'Xem kênh hiện tại: tên, mô tả, khán giả, giọng văn, giọng đọc, bảng màu, font, hashtag, câu chào cuối, chữ nút đăng ký, phong cách ảnh, logo/avatar có chưa, skill mặc định, các skill đã cài, tri thức (phiên bản), số series/video. designs=true để lấy cả JSON thiết kế mở đầu/kết (cần khi sửa thiết kế).',
  risk: 'read',
  schema: z.object({ designs: z.boolean().default(false) }),
  summarize: () => 'Xem thông tin kênh',
  async run({ designs }, ctx) {
    const c = await channelService.get(ctx.channelId);
    const [skills, knowledge, series, episodes] = await Promise.all([skillService.list(c.id), knowledgeService.get(c.id), seriesService.list(c.id), episodeService.list({ channelId: c.id })]);
    return {
      ok: true,
      message: asJson(
        {
          id: c.id, name: c.name, description: c.description, audience: c.audience, style: c.style, voice: c.voice, palette: c.palette, font: c.font, hashtags: c.hashtags, outroText: c.outroText, subscribeText: c.subscribeText, imageStyle: c.imageStyle,
          defaultSkillId: c.defaultSkillId, hasLogo: Boolean(c.logoPath), hasAvatar: Boolean(c.avatarPath), introArt: Boolean(c.introArtPath), outroArt: Boolean(c.outroArtPath),
          intro: designs ? c.introDesign : designSummary(c.introDesign), outro: designs ? c.outroDesign : designSummary(c.outroDesign),
          skills: skills.map((s) => ({ id: s.id, name: s.name })), knowledgeVersion: knowledge.current?.version ?? null, knowledgeChars: knowledge.current?.markdown.length ?? 0,
          series: series.map((s) => ({ id: s.id, name: s.name })), videos: episodes.length,
        },
        designs ? 14000 : 6000,
      ),
    };
  },
});

export const updateChannel = defineTool({
  name: 'update_channel',
  description: 'Sửa thông tin kênh (chỉ truyền các trường cần đổi): tên, mô tả, khán giả, giọng văn cho AI, giọng đọc, bảng màu (#RRGGBB, màu đầu là màu chính), font, hashtag, câu chào cuối, chữ nút đăng ký, phong cách ảnh AI (tiếng Anh), skill mặc định.',
  risk: 'write',
  schema: z.object({
    name: z.string().max(60).optional(),
    description: z.string().max(500).optional(),
    audience: z.string().max(300).optional(),
    style: z.string().max(500).optional(),
    voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]).optional(),
    palette: z.array(z.string()).min(1).max(6).optional(),
    font: z.enum(BRAND_FONT_IDS as [BrandFont, ...BrandFont[]]).optional(),
    hashtags: z.array(z.string()).max(10).optional(),
    outroText: z.string().max(80).optional(),
    subscribeText: z.string().max(40).optional(),
    imageStyle: z.string().max(500).optional(),
    defaultSkillId: z.string().nullable().optional(),
  }),
  summarize: (a) => `Sửa kênh: ${Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined).join(', ') || '(không có gì)'}`,
  async run(patch, ctx) {
    const c = await channelService.get(ctx.channelId);
    if (patch.defaultSkillId) await skillService.get(c.id, patch.defaultSkillId);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const next = ChannelInput.parse({
      name: c.name, description: c.description, font: c.font, imageStyle: c.imageStyle, introDesign: c.introDesign, outroDesign: c.outroDesign, audience: c.audience, style: c.style, voice: c.voice,
      outroText: c.outroText, subscribeText: c.subscribeText, hashtags: c.hashtags, music: c.music, palette: c.palette, defaultSkillId: c.defaultSkillId, ...defined,
    });
    await channelService.update(c.id, next);
    return { ok: true, message: `Đã sửa kênh: ${Object.keys(defined).join(', ')}.` };
  },
});

function designTool(kind: 'intro' | 'outro') {
  const label = kind === 'intro' ? 'mở đầu' : 'kết';
  return defineTool({
    name: `set_${kind}_design`,
    description: `Lưu thiết kế cảnh ${label} RIÊNG của kênh (thay toàn bộ thiết kế ${label} hiện có). Truyền cả thiết kế đầy đủ. ${DESIGN_GUIDE}`,
    risk: 'write',
    schema: z.object({ design: SceneDesignSchema }),
    summarize: (a) => `Lưu thiết kế ${label} của kênh (${a.design.layers.length} lớp${a.design.artPrompt ? ', có ảnh nền AI' : ''})`,
    async run({ design }, ctx) {
      const c = await channelService.get(ctx.channelId);
      const clean = normalizeDesign(design, c.palette);
      const next = ChannelInput.parse({
        name: c.name, description: c.description, font: c.font, imageStyle: c.imageStyle, audience: c.audience, style: c.style, voice: c.voice, outroText: c.outroText, subscribeText: c.subscribeText, hashtags: c.hashtags,
        music: c.music, palette: c.palette, defaultSkillId: c.defaultSkillId, introDesign: kind === 'intro' ? clean : c.introDesign, outroDesign: kind === 'outro' ? clean : c.outroDesign,
      });
      await channelService.update(c.id, next);
      const before = kind === 'intro' ? c.introDesign : c.outroDesign;
      const alike = before ? designSimilarity(before, clean) : 0;
      const sameNote = before && alike >= 0.7 ? ` CẢNH BÁO: thiết kế mới giống bản cũ ${Math.round(alike * 100)}% (cùng bố cục, nền, vị trí các lớp), người dùng sẽ thấy gần như không đổi. Nếu họ muốn thay đổi rõ rệt, hãy thiết kế lại bằng một kiểu bố cục KHÁC (xem các kiểu bố cục trong hướng dẫn) rồi gọi lại công cụ này.` : '';
      const art = clean.layers.some((l) => l.kind === 'art');
      return { ok: true, message: `Đã lưu thiết kế ${label}: ${clean.layers.length} lớp, ${clean.seconds} giây.${before ? ` Giống bản cũ ${Math.round(alike * 100)}%.` : ''}${sameNote}${art ? ` Thiết kế dùng ảnh nền AI: gọi generate_channel_art (kind=${kind}) với prompt "${clean.artPrompt}" để tạo ảnh.` : ''}` };
    },
  });
}
export const setIntroDesign = designTool('intro');
export const setOutroDesign = designTool('outro');

export const generateChannelArt = defineTool({
  name: 'generate_channel_art',
  description: 'Tạo ảnh nền AI cho cảnh mở đầu hoặc kết của kênh (tốn tiền ảnh, chạy nền ~20 giây). prompt bằng tiếng Anh, không chữ trong ảnh; để trống thì dùng artPrompt trong thiết kế.',
  risk: 'paid',
  schema: z.object({ kind: z.enum(['intro', 'outro']), prompt: z.string().max(400).default('') }),
  summarize: (a) => `Tạo ảnh nền AI cho ${a.kind === 'intro' ? 'mở đầu' : 'kết'} của kênh`,
  async run({ kind, prompt }, ctx) {
    await channelService.requestArt(ctx.channelId, kind, prompt);
    return { ok: true, message: 'Đã giao worker tạo ảnh nền. Ảnh sẽ hiện ở trang kênh sau khoảng 20 giây.' };
  },
});

export const getKnowledge = defineTool({
  name: 'get_knowledge',
  description: 'Đọc tri thức hiện tại của kênh (toàn văn, kèm số phiên bản).',
  risk: 'read',
  schema: z.object({}),
  summarize: () => 'Đọc tri thức của kênh',
  async run(_a, ctx) {
    const k = (await knowledgeService.get(ctx.channelId)).current;
    return { ok: true, message: k ? `Phiên bản ${k.version}:\n${k.markdown}` : 'Kênh chưa có tri thức.' };
  },
});

export const saveKnowledge = defineTool({
  name: 'save_knowledge',
  description: `Lưu tri thức của kênh thành một phiên bản mới (truyền TOÀN BỘ văn bản Markdown). Video đã viết trước đó sẽ được gợi ý viết lại. ${KNOWLEDGE_GUIDE}`,
  risk: 'write',
  schema: z.object({ markdown: z.string().min(1).max(60_000), note: z.string().max(200).default('') }),
  summarize: (a) => `Lưu tri thức của kênh (${a.markdown.length} ký tự)${a.note ? `: ${a.note}` : ''}`,
  async run({ markdown, note }, ctx) {
    const v = await knowledgeService.save(ctx.channelId, markdown, note);
    return { ok: true, message: `Đã lưu tri thức, phiên bản v${v.current?.version}.` };
  },
});

export const channelTools = [getSettingsStatus, getChannel, updateChannel, setIntroDesign, setOutroDesign, generateChannelArt, getKnowledge, saveKnowledge];
