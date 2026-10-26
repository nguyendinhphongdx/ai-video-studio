import { route } from '@/server/http/route';
import { jobRepository } from '@/server/modules/job/job.repository';

/** Queued and running jobs, for the "đang chạy" indicator. Per-episode job state comes with GET /episodes/:id. */
export const GET = route(async () => jobRepository.listActive());
