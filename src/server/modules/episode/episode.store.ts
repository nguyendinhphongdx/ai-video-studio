import type { EpisodeStore } from '@/core/ports';
import { notFound } from '@/server/http/api-error';

import { episodeRepository } from './episode.repository';

export function loadEpisode(id: string) {
  const e = episodeRepository.find(id);
  if (!e) throw notFound('video');
  return e;
}

/** EpisodeStore port for the core workflows. */
export const episodeStore: EpisodeStore = {
  async get(id) {
    return loadEpisode(id);
  },
  async update(id, patch) {
    episodeRepository.update(id, patch);
    return loadEpisode(id);
  },
  async replaceRenders(episodeId, renders) {
    return episodeRepository.replaceRenders(episodeId, renders);
  },
  async addEvent(episodeId, message) {
    episodeRepository.addEvent(episodeId, message);
  },
  async updateScene(episodeId, sceneId, patch) {
    episodeRepository.updateScene(episodeId, sceneId, patch);
  },
  async listInSeries(seriesId) {
    return episodeRepository.list({ seriesId });
  },
};
