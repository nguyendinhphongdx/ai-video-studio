import type { EpisodeStore } from '@/core/ports';
import { notFound } from '@/server/http/api-error';

import { episodeRepository } from './episode.repository';

export async function loadEpisode(id: string) {
  const e = await episodeRepository.find(id);
  if (!e) throw notFound('video');
  return e;
}

/** EpisodeStore port for the core workflows. */
export const episodeStore: EpisodeStore = {
  async get(id) {
    return await loadEpisode(id);
  },
  async update(id, patch) {
    await episodeRepository.update(id, patch);
    return await loadEpisode(id);
  },
  async replaceRenders(episodeId, renders) {
    return await episodeRepository.replaceRenders(episodeId, renders);
  },
  async addEvent(episodeId, message) {
    await episodeRepository.addEvent(episodeId, message);
  },
  async updateScene(episodeId, sceneId, patch) {
    await episodeRepository.updateScene(episodeId, sceneId, patch);
  },
  async listInSeries(seriesId) {
    return await episodeRepository.list({ seriesId });
  },
};
