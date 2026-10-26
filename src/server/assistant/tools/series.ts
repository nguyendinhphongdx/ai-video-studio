import { z } from 'zod';

import { SERIES_GUIDE } from '@/core/assistant/guides';
import { defineTool } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';
import { seriesService } from '@/server/modules/series/series.service';

import { asJson, ownSeries } from './util';

const Roadmap = z.array(z.object({ topic: z.string().min(3).max(300), goal: z.string().max(300).default('') })).min(1).max(60);

export const listSeries = defineTool({
  name: 'list_series',
  description: 'Các series của kênh với tiến độ (số tập theo trạng thái).',
  risk: 'read',
  schema: z.object({}),
  summarize: () => 'Xem các series của kênh',
  async run(_a, ctx) {
    const list = await seriesService.list(ctx.channelId);
    return { ok: true, message: asJson(list.map((s) => ({ id: s.id, name: s.name, status: s.status, version: s.currentVersion, skillId: s.rules.skillId, stats: s.stats }))) };
  },
});

export const getSeries = defineTool({
  name: 'get_series',
  description: 'Xem một series: bible, mẫu đăng bài, khung một tập (các khe) và lộ trình các tập (số, chủ đề, trạng thái, id).',
  risk: 'read',
  schema: z.object({ seriesId: z.string() }),
  summarize: (a) => `Xem series ${a.seriesId}`,
  async run({ seriesId }, ctx) {
    const s = await ownSeries(ctx, seriesId);
    const eps = await episodeService.list({ seriesId });
    return {
      ok: true,
      message: asJson(
        {
          id: s.id, name: s.name, version: s.currentVersion, skillId: s.rules.skillId, bible: s.rules.bible, publish: s.rules.publish,
          format: s.rules.format.slots.map((x) => ({ id: x.id, name: x.name, fill: x.fill, when: x.when, blocks: x.blocks, scenes: x.scenes })),
          episodes: eps.map((v) => ({ id: v.episode.id, number: v.episode.number, topic: v.episode.topic, goal: v.episode.goal, status: v.episode.status })),
        },
        9000,
      ),
    };
  },
});

export const createSeries = defineTool({
  name: 'create_series',
  description: `Tạo một series mới của kênh cùng lộ trình các tập (mỗi tập chưa viết kịch bản). Khung một tập được dựng tự động từ skill đã chọn (skill phải thuộc kênh). ${SERIES_GUIDE}`,
  risk: 'write',
  schema: z.object({
    name: z.string().min(1).max(80),
    skillId: z.string(),
    premise: z.string().max(1000),
    host: z.string().max(200).default(''),
    catchphrases: z.array(z.string().max(200)).max(10).default([]),
    avoid: z.array(z.string().max(200)).max(30).default([]),
    instructions: z.string().max(20_000).default(''),
    hashtags: z.array(z.string().regex(/^#\S+$/)).max(10).default([]),
    titleTemplate: z.string().max(120).default('{series} | Tập {n}: {topic}'),
    roadmap: Roadmap,
  }),
  summarize: (a) => `Tạo series “${a.name}” với ${a.roadmap.length} tập`,
  async run(a, ctx) {
    const tpl = await seriesService.template(ctx.channelId, a.skillId);
    const s = await seriesService.create({
      channelId: ctx.channelId,
      name: a.name,
      skillId: a.skillId,
      bible: { ...tpl.bible, premise: a.premise, host: a.host, catchphrases: a.catchphrases, avoid: a.avoid, instructions: a.instructions },
      format: tpl.format,
      publish: { title: a.titleTemplate, hashtags: a.hashtags, descriptionFooter: '' },
      roadmap: a.roadmap,
    });
    return { ok: true, message: `Đã tạo series "${s.name}" (id ${s.id}) với ${s.stats.total} tập trong lộ trình. Khung mỗi tập: ${s.rules.format.slots.map((x) => x.name).join(' → ')}.` };
  },
});

export const updateSeries = defineTool({
  name: 'update_series',
  description: 'Sửa series (chỉ truyền trường cần đổi): bible (premise, host, catchphrases, avoid, instructions), mẫu đăng bài (titleTemplate, hashtags, descriptionFooter) hoặc đổi tên. Mỗi lần sửa bible/đăng bài tạo phiên bản series mới; tập đã viết giữ phiên bản cũ.',
  risk: 'write',
  schema: z.object({
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
  }),
  summarize: (a) => `Sửa series ${a.seriesId}: ${Object.keys(a).filter((k) => k !== 'seriesId' && (a as Record<string, unknown>)[k] !== undefined).join(', ')}`,
  async run(a, ctx) {
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
    return { ok: true, message: `Đã sửa series "${a.name ?? s.name}".${rulesChanged ? ' Đã tạo phiên bản series mới.' : ''}` };
  },
});

export const addSeriesEpisodes = defineTool({
  name: 'add_series_episodes',
  description: 'Thêm các tập mới vào cuối lộ trình của series (chưa viết kịch bản). Dùng write_script để viết từng tập.',
  risk: 'write',
  schema: z.object({ seriesId: z.string(), episodes: Roadmap }),
  summarize: (a) => `Thêm ${a.episodes.length} tập vào series ${a.seriesId}`,
  async run({ seriesId, episodes }, ctx) {
    await ownSeries(ctx, seriesId);
    const made: string[] = [];
    for (const e of episodes) {
      const v = await episodeService.create({ channelId: ctx.channelId, seriesId, topic: e.topic, goal: e.goal, notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
      made.push(`tập ${v.episode.number} (id ${v.episode.id})`);
    }
    return { ok: true, message: `Đã thêm: ${made.join(', ')}.` };
  },
});

export const seriesTools = [listSeries, getSeries, createSeries, updateSeries, addSeriesEpisodes];
