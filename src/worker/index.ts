// Background worker: runs queued jobs one at a time through the core workflows, and delivers outbox
// events to subscribers. Its own process (npm run dev starts it next to Next.js) because renders take minutes.
import { UserFacingError, type Job } from '@/core/domain';
import { summarizeEpisode } from '@/core/workflows/memory';
import { produce } from '@/core/workflows/produce';
import { reviseScript, writeScript } from '@/core/workflows/script';
import { createCoreDeps } from '@/server/core-deps';
import { createLogger } from '@/server/logger';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { jobRepository } from '@/server/modules/job/job.repository';
import { outboxRepository } from '@/server/modules/outbox/outbox.repository';
import { SUBSCRIBERS } from '@/server/subscribers';
import { closeRemotion, rendererCatalog } from '@/tools/renderers';

const logger = createLogger('worker');
const deps = createCoreDeps(rendererCatalog);
const POLL_MS = 1000;
let stopping = false;

const HANDLERS: Record<Job['kind'], (job: Job, progress: (f: number, phase?: string) => void) => Promise<unknown>> = {
  write_script: (job, p) => writeScript(deps, job.episodeId, p),
  revise_script: (job, p) => reviseScript(deps, job.episodeId, String(job.payload.feedback ?? ''), p),
  produce: (job, p) => produce(deps, job.episodeId, p),
  summarize: (job) => summarizeEpisode(deps, job.episodeId),
};

/** Put the episode back where the person can act on it after a failed job. */
function rollback(job: Job) {
  const e = episodeRepository.find(job.episodeId);
  if (e?.status === 'producing') episodeRepository.update(e.id, { status: 'script_review' });
}

const shortMessage = (e: unknown) => (e instanceof UserFacingError ? e.message : 'Có lỗi khi xử lý. Bấm Thử lại; nếu vẫn lỗi, xem nhật ký của worker.');

async function runJob(): Promise<boolean> {
  const job = jobRepository.claimNext();
  if (!job) return false;
  logger.info(`start ${job.kind}`, { job: job.id, episode: job.episodeId });
  const started = Date.now();
  let lastWrite = 0;
  const progress = (fraction: number, phase?: string) => {
    if (Date.now() - lastWrite < 500 && fraction < 1) return;
    lastWrite = Date.now();
    jobRepository.progress(job.id, fraction, phase ?? null);
    episodeRepository.touch(job.episodeId);
  };
  try {
    await HANDLERS[job.kind](job, progress);
    jobRepository.finish(job.id);
    logger.info(`done ${job.kind} in ${Math.round((Date.now() - started) / 1000)}s`, { job: job.id });
  } catch (e) {
    const message = shortMessage(e);
    logger.error(`failed ${job.kind}`, { job: job.id, message, detail: e instanceof UserFacingError ? e.detail : ((e as Error)?.stack ?? String(e)) });
    jobRepository.fail(job.id, message);
    episodeRepository.addEvent(job.episodeId, `Lỗi: ${message}`);
    rollback(job);
  }
  return true;
}

async function deliverEvents(): Promise<boolean> {
  const items = outboxRepository.pending();
  for (const { id, event } of items) {
    let error: string | null = null;
    for (const s of SUBSCRIBERS.filter((x) => x.on === event.type)) {
      try {
        await s.handle(event as never);
      } catch (e) {
        error = `${s.id}: ${(e as Error).message}`;
        logger.error('subscriber failed', { subscriber: s.id, event: event.type, error: e });
      }
    }
    outboxRepository.done(id, error);
  }
  return items.length > 0;
}

async function main() {
  for (const job of jobRepository.failInterrupted('Bị gián đoạn do worker khởi động lại. Bấm Thử lại.')) rollback(job);
  logger.info('ready, waiting for jobs');
  while (!stopping) {
    const busy = (await deliverEvents().catch((e) => (logger.error('outbox error', { error: e }), false))) || (await runJob().catch((e) => (logger.error('queue error', { error: e }), false)));
    if (!busy) await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await closeRemotion();
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    stopping = true;
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

void main();
