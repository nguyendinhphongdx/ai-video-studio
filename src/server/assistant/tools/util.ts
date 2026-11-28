import { UserFacingError } from '@/core/domain/errors';
import type { ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';
import type { EpisodeView } from '@/server/modules/episode/episode.types';
import { seriesService } from '@/server/modules/series/series.service';

export const clip = (text: string, max = 6000) => (text.length > max ? `${text.slice(0, max)}\n…(đã rút gọn, còn ${text.length - max} ký tự)` : text);
export const asJson = (value: unknown, max = 6000) => clip(JSON.stringify(value, null, 1), max);

/** The assistant works inside one channel: ids from other channels are refused. */
export async function ownEpisode(ctx: ToolContext, id: string): Promise<EpisodeView> {
  const v = await episodeService.get(id);
  if (v.episode.channelId !== ctx.channelId) throw new UserFacingError('Video này không thuộc kênh đang trò chuyện.');
  return v;
}

export async function ownSeries(ctx: ToolContext, id: string) {
  const s = await seriesService.get(id);
  if (s.channelId !== ctx.channelId) throw new UserFacingError('Series này không thuộc kênh đang trò chuyện.');
  return s;
}

/** Compact, model-readable description of an episode and each scene's state. */
export function describeEpisode(v: EpisodeView) {
  const e = v.episode;
  const done = e.scenes.filter((s) => s.approved).length;
  return {
    id: e.id,
    number: e.number,
    seriesId: e.seriesId,
    topic: e.topic,
    goal: e.goal,
    title: e.title,
    status: e.status,
    skillId: e.skillId,
    voice: e.voice,
    formats: e.formats,
    autoImages: e.autoImages,
    autoVoice: e.autoVoice,
    job: v.job ? { kind: v.job.kind, state: v.job.state, progress: Math.round(v.job.progress * 100), error: v.job.error } : null,
    knowledge: v.knowledge,
    approved: `${done}/${e.scenes.length}`,
    issues: v.issues.map((i) => i.message),
    scenes: e.scenes.map((s, i) => {
      const a = v.assets[s.id];
      return {
        n: i + 1,
        id: s.id,
        slot: s.slotId,
        block: s.block,
        locked: s.locked,
        narration: s.narration,
        props: s.props,
        approved: s.approved,
        image: !a?.needsImage ? 'không cần' : a.imageUrl ? 'có' : a.imageStale ? 'cũ (mô tả đã đổi)' : 'chưa tạo',
        voice: !a?.needsVoice ? 'không cần' : a.voiceUrl ? 'có' : a.voiceStale ? 'cũ (lời đọc đã đổi)' : 'chưa tạo',
      };
    }),
  };
}
