import { notFound } from '@/server/http/api-error';
import { route } from '@/server/http/route';
import { jobRepository } from '@/server/modules/job/job.repository';

/** Any job by id (series-level jobs return their result here). */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  const job = jobRepository.find(id);
  if (!job) throw notFound('job');
  return job;
});
