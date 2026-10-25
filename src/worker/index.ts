// Background worker: takes jobs from the SQLite queue one at a time and runs them through the core pipeline.
// Runs as its own process (npm run dev starts it next to Next.js) because renders take minutes.
import { UserFacingError, type Job } from '@/core/domain';
import { produce, reviseScript, writeScript } from '@/core/pipeline';
import { createLogger } from '@/server/logger';
import { jobRepository } from '@/server/modules/job/job.repository';
import { projectRepository } from '@/server/modules/project/project.repository';
import { pipelineDeps } from '@/server/pipeline-deps';
import { closeRemotion } from '@/tools/renderers';

const logger = createLogger('worker');
const POLL_MS = 1000;
let stopping = false;

async function run(job: Job) {
  let lastWrite = 0;
  const progress = (fraction: number, phase?: string) => {
    // Throttle DB writes; the UI polls every ~1.5s anyway.
    if (Date.now() - lastWrite < 500 && fraction < 1) return;
    lastWrite = Date.now();
    jobRepository.progress(job.id, fraction, phase ?? null);
    projectRepository.touch(job.projectId);
  };
  switch (job.kind) {
    case 'write_script':
      await writeScript(pipelineDeps, job.projectId, progress);
      return;
    case 'revise_script':
      await reviseScript(pipelineDeps, job.projectId, String(job.payload.feedback ?? ''), progress);
      return;
    case 'produce':
      await produce(pipelineDeps, job.projectId, progress);
      return;
  }
}

/** Put the project back where the person can act on it after a failed job. */
function rollback(job: Job) {
  const p = projectRepository.find(job.projectId);
  if (p?.status === 'producing') projectRepository.update(p.id, { status: 'script_review' });
}

function shortMessage(e: unknown): string {
  if (e instanceof UserFacingError) return e.message;
  return 'Có lỗi khi xử lý. Bấm Thử lại; nếu vẫn lỗi, xem nhật ký của worker.';
}

async function tick(): Promise<boolean> {
  const job = jobRepository.claimNext();
  if (!job) return false;
  logger.info(`start ${job.kind}`, { job: job.id, project: job.projectId });
  const started = Date.now();
  try {
    await run(job);
    jobRepository.finish(job.id);
    logger.info(`done ${job.kind} in ${Math.round((Date.now() - started) / 1000)}s`, { job: job.id });
  } catch (e) {
    const message = shortMessage(e);
    logger.error(`failed ${job.kind}`, { job: job.id, message, detail: e instanceof UserFacingError ? e.detail : (e as Error)?.stack ?? String(e) });
    jobRepository.fail(job.id, message);
    projectRepository.addEvent(job.projectId, `Lỗi: ${message}`);
    rollback(job);
  }
  return true;
}

async function main() {
  for (const job of jobRepository.failInterrupted('Bị gián đoạn do worker khởi động lại. Bấm Thử lại.')) rollback(job);
  logger.info('ready, waiting for jobs');
  while (!stopping) {
    const worked = await tick().catch((e) => {
      logger.error('queue error', { error: e });
      return false;
    });
    if (!worked) await new Promise((r) => setTimeout(r, POLL_MS));
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
