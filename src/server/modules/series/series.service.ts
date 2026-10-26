import type { Series, SeriesVersion } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import type { SeriesStore } from '@/core/ports';
import { lintFormat } from '@/core/series/format';
import { slotBlocks } from '@/core/script/script';
import { now, transaction } from '@/server/db';
import { ApiError, notFound } from '@/server/http/api-error';
import { channelService } from '@/server/modules/channel/channel.service';
import { skillService } from '@/server/modules/skill/skill.service';
import { toolCatalog } from '@/tools/registry';

import { seriesRepository } from './series.repository';
import type { CreateSeriesInput, SeriesFile, SeriesRulesInput } from './series.types';

async function validateRules(rules: SeriesRulesInput) {
  await skillService.get(rules.skillId);
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

export interface SeriesView extends Series {
  rules: SeriesVersion;
}

function load(id: string): Series {
  const s = seriesRepository.find(id);
  if (!s) throw notFound('series');
  return s;
}

export const seriesService = {
  async list(channelId: string): Promise<SeriesView[]> {
    return seriesRepository.list(channelId).map((s) => ({ ...s, rules: seriesRepository.version(s.id, s.currentVersion)! }));
  },

  async get(id: string): Promise<SeriesView> {
    const s = load(id);
    return { ...s, rules: seriesRepository.version(s.id, s.currentVersion)! };
  },

  async create(input: CreateSeriesInput): Promise<SeriesView> {
    await channelService.get(input.channelId);
    await validateRules(input);
    const ts = now();
    const series: Series = { id: newId(), channelId: input.channelId, name: input.name, status: 'active', currentVersion: 1, createdAt: ts, updatedAt: ts };
    transaction(() => {
      seriesRepository.insert(series);
      seriesRepository.insertVersion({ seriesId: series.id, version: 1, skillId: input.skillId, bible: input.bible, format: input.format, publish: input.publish, createdAt: ts });
    });
    return seriesService.get(series.id);
  },

  /** Rules are immutable per version: saving creates version N+1; episodes keep the version they were written with. */
  async saveRules(id: string, rules: SeriesRulesInput): Promise<SeriesView> {
    const s = load(id);
    await validateRules(rules);
    const ts = now();
    const version = s.currentVersion + 1;
    transaction(() => {
      seriesRepository.insertVersion({ seriesId: id, version, ...rules, createdAt: ts });
      seriesRepository.update({ ...s, currentVersion: version, updatedAt: ts });
    });
    return seriesService.get(id);
  },

  async versions(id: string): Promise<SeriesVersion[]> {
    load(id);
    return seriesRepository.versions(id);
  },

  async exportFile(id: string): Promise<SeriesFile> {
    const s = await seriesService.get(id);
    return { kind: 'ai-video-studio/series', schema: 1, name: s.name, skillId: s.rules.skillId, bible: s.rules.bible, format: s.rules.format, publish: s.rules.publish };
  },

  async importFile(channelId: string, file: SeriesFile): Promise<SeriesView> {
    return seriesService.create({ channelId, name: file.name, skillId: file.skillId, bible: file.bible, format: file.format, publish: file.publish });
  },
};

export const seriesStore: SeriesStore = {
  async get(id) {
    return load(id);
  },
  async version(seriesId, version) {
    const v = seriesRepository.version(seriesId, version);
    if (!v) throw notFound(`series v${version}`);
    return v;
  },
};
