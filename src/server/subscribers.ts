// Reactions to domain events, delivered by the worker from the outbox. Register new subscribers here.
import { defineSubscriber, type Subscriber } from '@/core/events/events';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { jobRepository } from '@/server/modules/job/job.repository';

/** An approved series episode becomes part of the series memory. */
const rememberApprovedEpisode = defineSubscriber({
  id: 'memory.on-approved',
  on: 'episode.approved',
  async handle({ episodeId }) {
    const e = episodeRepository.find(episodeId);
    if (!e?.seriesId || jobRepository.active(episodeId)) return;
    jobRepository.insert(episodeId, 'summarize', {});
  },
});

export const SUBSCRIBERS: Subscriber[] = [rememberApprovedEpisode as Subscriber];
