import type { Job } from '@/core/domain';
import type { SeriesProposal } from '@/core/series/plan';
import { api } from '@/lib/api/client';
import type { EpisodeView } from '@/server/modules/episode/episode.types';
import type { SeriesMemoryView, SeriesStats, SeriesView } from '@/server/modules/series/series.service';
import type { CreateSeriesInput, EpisodeMemoryPatch, SeriesFile, SeriesPatch, SeriesRulesInput } from '@/server/modules/series/series.types';

export type { CreateSeriesInput, EpisodeMemoryPatch, Job, SeriesFile, SeriesMemoryView, SeriesProposal, SeriesRulesInput, SeriesStats, SeriesView };

const s = (id: string, rest = '') => `/series/${id}${rest}`;

export const seriesApi = {
  list: (channelId: string) => api<SeriesView[]>(`/series?channelId=${encodeURIComponent(channelId)}`),
  get: (id: string) => api<SeriesView>(s(id)),
  create: (input: CreateSeriesInput) => api<SeriesView>('/series', { body: input }),
  update: (id: string, patch: SeriesPatch) => api<SeriesView>(s(id), { method: 'PATCH', body: patch }),
  saveRules: (id: string, rules: SeriesRulesInput) => api<SeriesView>(s(id, '/rules'), { method: 'PUT', body: rules }),
  versions: (id: string) => api<SeriesView['rules'][]>(s(id, '/versions')),
  importFile: (channelId: string, file: SeriesFile) => api<SeriesView>('/series/import', { body: { channelId, file } }),
  template: (channelId: string, skillId: string) => api<SeriesProposal>(`/series/template?channelId=${encodeURIComponent(channelId)}&skillId=${encodeURIComponent(skillId)}`),
  episodes: (id: string) => api<EpisodeView[]>(`/episodes?seriesId=${encodeURIComponent(id)}`),
  addEpisode: (channelId: string, seriesId: string, topic: string, goal: string) =>
    api<EpisodeView>('/episodes', { body: { channelId, seriesId, topic, goal, formats: ['landscape'], planOnly: true } }),
  editEpisode: (episodeId: string, patch: { topic?: string; goal?: string }) => api<EpisodeView>(`/episodes/${episodeId}`, { method: 'PATCH', body: patch }),
  removeEpisode: (episodeId: string) => api<{ ok: true }>(`/episodes/${episodeId}`, { method: 'DELETE' }),
  reorder: (id: string, episodeIds: string[]) => api<SeriesView>(s(id, '/reorder'), { body: { episodeIds } }),
  write: (id: string, episodeIds: string[]) => api<EpisodeView[]>(s(id, '/write'), { body: { episodeIds } }),
  memory: (id: string) => api<SeriesMemoryView>(s(id, '/memory')),
  saveEpisodeMemory: (id: string, episodeId: string, patch: EpisodeMemoryPatch) => api<SeriesMemoryView>(s(id, `/memory/${episodeId}`), { method: 'PUT', body: patch }),
  saveSeason: (id: string, summary: string) => api<SeriesMemoryView>(s(id, '/memory/season'), { method: 'PUT', body: { summary } }),
};

export const exportUrl = (id: string) => `/api/v1${s(id, '/export')}`;
