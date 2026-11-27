import type { EpisodeMemory, EpisodeStatus, Series, SeriesVersion } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import type { SeriesStore } from '@/core/ports';
import { lintFormat } from '@/core/series/format';
import { defaultFormat, type SeriesProposal } from '@/core/series/plan';
import { slotBlocks } from '@/core/script/script';
import { now, transaction } from '@/server/db';
import { ApiError, conflict, notFound } from '@/server/http/api-error';
import { channelService } from '@/server/modules/channel/channel.service';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { memoryRepository, memoryStore } from '@/server/modules/memory/memory.repository';
import { skillService } from '@/server/modules/skill/skill.service';
import { toolCatalog } from '@/tools/registry';

import { seriesRepository } from './series.repository';
import type { CreateSeriesInput, EpisodeMemoryPatch, SeriesFile, SeriesPatch, SeriesRulesInput } from './series.types';

async function validateRules(channelId: string, rules: SeriesRulesInput) {
  await skillService.get(channelId, rules.skillId);
  const errors = lintFormat(rules.format);
  for (const slot of rules.format.slots) {
    try {
      if (slot.fill === 'ai') slotBlocks(slot, toolCatalog);
      if (slot.fill === 'locked' && slot.locked && !toolCatalog.block(slot.locked.block)) errors.push(`Khe "${slot.name}" dùng khối không tồn tại: @${slot.locked.block}`);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  if (errors.length) throw new ApiError(400, 'validation_error', errors.join('; '));
}

export type SeriesStats = Record<EpisodeStatus, number> & { total: number };

export interface SeriesView extends Series {
  rules: SeriesVersion;
  stats: SeriesStats;
}

const emptyStats = (): SeriesStats => ({ planned: 0, draft: 0, script_review: 0, producing: 0, video_review: 0, published: 0, total: 0 });

function statsOf(counts: Partial<Record<EpisodeStatus, number>> | undefined): SeriesStats {
  const stats = emptyStats();
  for (const [status, n] of Object.entries(counts ?? {})) {
    stats[status as EpisodeStatus] = n;
    stats.total += n;
  }
  return stats;
}

async function load(id: string): Promise<Series> {
  const s = await seriesRepository.find(id);
  if (!s) throw notFound('series');
  return s;
}

async function view(s: Series, counts?: Partial<Record<EpisodeStatus, number>>): Promise<SeriesView> {
  return { ...s, rules: (await seriesRepository.version(s.id, s.currentVersion))!, stats: statsOf(counts ?? (await episodeRepository.countsBySeries(s.channelId)).get(s.id)) };
}

export interface SeriesMemoryView {
  season: string | null;
  episodes: EpisodeMemory[];
}

export const seriesService = {
  async list(channelId: string): Promise<SeriesView[]> {
    const counts = await episodeRepository.countsBySeries(channelId);
    return Promise.all((await seriesRepository.list(channelId)).map((s) => view(s, counts.get(s.id) ?? {})));
  },

  async get(id: string): Promise<SeriesView> {
    return await view(await load(id));
  },

  /** Creates the series (version 1) together with its planned episodes. */
  async create(input: CreateSeriesInput): Promise<SeriesView> {
    const channel = await channelService.get(input.channelId);
    await validateRules(input.channelId, input);
    const ts = now();
    const series: Series = { id: newId(), channelId: input.channelId, name: input.name, status: 'active', currentVersion: 1, createdAt: ts, updatedAt: ts };
    await transaction(async () => {
      await seriesRepository.insert(series);
      await seriesRepository.insertVersion({ seriesId: series.id, version: 1, skillId: input.skillId, bible: input.bible, format: input.format, publish: input.publish, createdAt: ts });
      for (const [i, item] of input.roadmap.entries()) {
        const id = newId();
        await episodeRepository.insert({
          id, channelId: channel.id, seriesId: series.id, seriesVersion: null, number: i + 1, topic: item.topic, goal: item.goal, notes: '', skillId: input.skillId, status: 'planned',
          formats: ['landscape'], voice: channel.voice, music: true, sceneCount: null, createdAt: ts, updatedAt: ts,
        });
        await episodeRepository.addEvent(id, `Thêm tập vào lộ trình series ${series.name}`);
      }
    });
    return await seriesService.get(series.id);
  },

  async update(id: string, patch: SeriesPatch): Promise<SeriesView> {
    const s = await load(id);
    await seriesRepository.update({ ...s, name: patch.name ?? s.name, status: patch.status ?? s.status, updatedAt: now() });
    return await seriesService.get(id);
  },

  /** Rules are immutable per version: saving creates version N+1; episodes keep the version they were written with. */
  async saveRules(id: string, rules: SeriesRulesInput): Promise<SeriesView> {
    const s = await load(id);
    await validateRules(s.channelId, rules);
    const ts = now();
    const version = s.currentVersion + 1;
    await transaction(async () => {
      await seriesRepository.insertVersion({ seriesId: id, version, ...rules, createdAt: ts });
      await seriesRepository.update({ ...s, currentVersion: version, updatedAt: ts });
    });
    return await seriesService.get(id);
  },

  async versions(id: string): Promise<SeriesVersion[]> {
    await load(id);
    return await seriesRepository.versions(id);
  },

  async exportFile(id: string): Promise<SeriesFile> {
    const s = await seriesService.get(id);
    const roadmap = (await episodeRepository.list({ seriesId: id })).map((e) => ({ topic: e.topic, goal: e.goal }));
    return { kind: 'ai-video-studio/series', schema: 1, name: s.name, skillId: s.rules.skillId, bible: s.rules.bible, format: s.rules.format, publish: s.rules.publish, roadmap };
  },

  async importFile(channelId: string, file: SeriesFile): Promise<SeriesView> {
    return await seriesService.create({ channelId, name: file.name, skillId: file.skillId, bible: file.bible, format: file.format, publish: file.publish, roadmap: file.roadmap });
  },

  /** A blank proposal (format from the skill, empty bible) for people who write the series themselves. */
  async template(channelId: string, skillId: string): Promise<SeriesProposal> {
    await channelService.get(channelId);
    const { skill } = await skillService.get(channelId, skillId);
    return {
      name: '',
      skillId,
      bible: { premise: '', instructions: '', host: '', catchphrases: [], avoid: [], characterAssets: [], characters: '', characterSprites: {}, characterCast: {} },
      format: defaultFormat(skill, toolCatalog),
      publish: { title: '{series} | Tập {n}: {topic}', hashtags: [], descriptionFooter: '' },
      roadmap: [],
    };
  },

  async memory(id: string): Promise<SeriesMemoryView> {
    await load(id);
    const season = await memoryStore.season(id);
    return { season, episodes: (await memoryRepository.list(id)).reverse() };
  },

  async saveEpisodeMemory(id: string, episodeId: string, patch: EpisodeMemoryPatch): Promise<SeriesMemoryView> {
    await load(id);
    const current = (await memoryRepository.list(id)).find((m) => m.episodeId === episodeId);
    if (!current) throw notFound('episode memory');
    await memoryStore.save({ ...current, ...patch });
    return await seriesService.memory(id);
  },

  async saveSeason(id: string, summary: string): Promise<SeriesMemoryView> {
    await load(id);
    await memoryRepository.setSeason(id, summary);
    return await seriesService.memory(id);
  },

  /** Reorders planned episodes among the numbers they already hold; started episodes keep their number. */
  async reorder(id: string, episodeIds: string[]): Promise<SeriesView> {
    await load(id);
    const all = await episodeRepository.list({ seriesId: id });
    const picked = episodeIds.map((eid) => all.find((e) => e.id === eid));
    if (picked.some((e) => !e) || new Set(episodeIds).size !== episodeIds.length) throw new ApiError(400, 'validation_error', 'Danh sách tập không hợp lệ');
    if (picked.some((e) => e!.status !== 'planned')) throw conflict('Chỉ đổi được thứ tự các tập còn trong lộ trình.');
    const numbers = picked.map((e) => e!.number!).sort((a, b) => a - b);
    await episodeRepository.renumber(episodeIds.map((eid, i) => ({ id: eid, number: numbers[i]! })));
    return await seriesService.get(id);
  },
};

export const seriesStore: SeriesStore = {
  async get(id) {
    return await load(id);
  },
  async version(seriesId, version) {
    const v = await seriesRepository.version(seriesId, version);
    if (!v) throw notFound(`series v${version}`);
    return v;
  },
};
