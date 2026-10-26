// Gathers everything the series agent knows about an episode into a ContextInput.
import type { ContextInput } from '../context/layer';
import { UserFacingError } from '../domain/errors';
import type { Episode } from '../domain/episode';
import type { CoreDeps } from '../ports';
import { activeSlots, formatFromSkill, type TemplateVars } from '../series/format';
import { slotBlocks } from '../script/script';

const RECENT_MEMORIES = 5;

export async function buildContext(deps: CoreDeps, episode: Episode): Promise<ContextInput> {
  const channel = await deps.channels.get(episode.channelId);
  let series: ContextInput['series'] = null;
  if (episode.seriesId) {
    const s = await deps.series.get(episode.seriesId);
    series = { series: s, version: await deps.series.version(s.id, episode.seriesVersion ?? s.currentVersion) };
  }
  const skill = await deps.skills.get(series?.version.skillId ?? episode.skillId);
  const format = series?.version.format ?? formatFromSkill(skill, episode.sceneCount);
  const slots = activeSlots(format, episode.number);
  if (!slots.some((s) => s.fill === 'ai')) throw new UserFacingError('Khung tập không có phần nào cho AI viết');
  const blocks = [...new Map(slots.filter((s) => s.fill === 'ai').flatMap((s) => slotBlocks(s, deps.tools)).map((b) => [b.ref, b])).values()];

  let memory: ContextInput['memory'] = { season: null, recent: [] };
  let neighbours: ContextInput['neighbours'] = { previousTopic: null, nextTopic: null };
  if (series) {
    memory = { season: await deps.memory.season(series.series.id), recent: await deps.memory.recent(series.series.id, episode.number, RECENT_MEMORIES) };
    if (episode.number !== null) {
      const all = await deps.episodes.listInSeries(series.series.id);
      neighbours = {
        previousTopic: all.find((e) => e.number === episode.number! - 1)?.topic ?? null,
        nextTopic: all.find((e) => e.number === episode.number! + 1)?.topic ?? null,
      };
    }
  }
  return { channel, series, skill, format, slots, blocks, memory, episode, neighbours };
}

export function templateVars(ctx: ContextInput, title: string): TemplateVars {
  return {
    n: ctx.episode.number !== null ? String(ctx.episode.number) : '',
    topic: ctx.episode.topic,
    next_topic: ctx.neighbours.nextTopic ?? '',
    series: ctx.series?.series.name ?? '',
    title,
    channel: ctx.channel.name,
  };
}
