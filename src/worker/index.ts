// Background worker: runs queued jobs one at a time through the core workflows, and delivers outbox
// events to subscribers. Its own process (npm run dev starts it next to Next.js) because renders take minutes.
import { UserFacingError, type Episode, type Job } from '@/core/domain';
import { summarizeEpisode } from '@/core/workflows/memory';
import { produce } from '@/core/workflows/produce';
import { generateSceneAssets, type SceneAssetsRequest } from '@/core/workflows/assets';
import { reviseScript, writeScript } from '@/core/workflows/script';
import { createCoreDeps } from '@/server/core-deps';
import { dbReady } from '@/server/db';
import { jobPrefixes, storage } from '@/server/adapters/media/storage';
import { createLogger } from '@/server/logger';
import { characterSpriteService } from '@/server/modules/series/character-sprites.service';
import { channelService } from '@/server/modules/channel/channel.service';
import { assistantService } from '@/server/modules/assistant/assistant.service';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { jobQueue, jobRepository } from '@/server/modules/job/job.repository';
import { authService } from '@/server/modules/auth/auth.service';
import { outboxRepository } from '@/server/modules/outbox/outbox.repository';
import { prefsService } from '@/server/modules/prefs/prefs.service';
import { SUBSCRIBERS } from '@/server/subscribers';
import { closeRemotion, rendererCatalog } from '@/tools/renderers';
import { ctx, runWithContext, withUsage } from '@/server/context';

const logger = createLogger('worker');
const deps = createCoreDeps(rendererCatalog);
const POLL_MS = 1000;
let stopping = false;

const episodeOf = (job: Job): string => {
  if (!job.episodeId) throw new Error(`Job ${job.kind} needs an episode`);
  return job.episodeId;
};

/** The person chose to make pictures/voices as soon as a script exists: queue that work right after the script. */
async function chainAssets(episode: Episode): Promise<Episode> {
  if (episode.autoImages || episode.autoVoice) await jobRepository.insert(episode.id, 'scene_assets', { sceneIds: null, image: episode.autoImages, voice: episode.autoVoice });
  return episode;
}

const HANDLERS: Record<Job['kind'], (job: Job, progress: (f: number, phase?: string) => void) => Promise<unknown>> = {
  write_script: async (job, p) => await chainAssets(await writeScript(deps, episodeOf(job), p)),
  revise_script: async (job, p) => await chainAssets(await reviseScript(deps, episodeOf(job), String(job.payload.feedback ?? ''), p)),
  assistant_turn: async (job) => await assistantService.runTurn(String(job.payload.threadId)),
  scene_assets: (job, p) => generateSceneAssets(deps, episodeOf(job), job.payload as unknown as SceneAssetsRequest, p),
  produce: (job, p) => produce(deps, episodeOf(job), p),
  summarize: (job) => summarizeEpisode(deps, episodeOf(job)),
  generate_sprites: (job, p) => characterSpriteService.run(job, p),
  generate_art: async (job) => {
    const p = job.payload as { channelId: string; kind: 'intro' | 'outro'; prompt: string };
    await channelService.generateArt(p.channelId, p.kind, p.prompt);
  },
};

/** Put the episode back where the person can act on it after a failed job. */
async function rollback(job: Job) {
  const e = job.episodeId ? await episodeRepository.find(job.episodeId) : null;
  if (e?.status === 'producing') await episodeRepository.update(e.id, { status: 'script_review' });
}

const shortMessage = (e: unknown) => (e instanceof UserFacingError ? e.message : 'Có lỗi khi xử lý. Bấm Thử lại; nếu vẫn lỗi, xem nhật ký của worker.');

/** Takes the next queued job of any workspace and runs it inside that workspace, as the person who started it. */
async function runJob(): Promise<boolean> {
  const claimed = await jobQueue.claimNext();
  if (!claimed) return false;
  const { job } = claimed;
  const context = await authService.contextFor(claimed.workspaceId, claimed.userId);
  if (!context) {
    logger.error(`job ${job.id} has no workspace, dropped`, { job: job.id });
    await jobQueue.failUnscoped(job.id, 'Workspace của việc này không còn.');
    return true;
  }
  await runWithContext(context, () => runScopedJob(job));
  return true;
}

async function runScopedJob(job: Job): Promise<void> {
  logger.info(`start ${job.kind}`, { job: job.id, episode: job.episodeId });
  const started = Date.now();
  let lastWrite = 0;
  const progress = async (fraction: number, phase?: string) => {
    if (Date.now() - lastWrite < 500 && fraction < 1) return;
    lastWrite = Date.now();
    await jobRepository.progress(job.id, fraction, phase ?? null);
    if (job.episodeId) await episodeRepository.touch(job.episodeId);
  };
  try {
    // Everything paid that this job does is attributed to its video (or channel, for channel art).
    const episode = job.episodeId ? await episodeRepository.find(job.episodeId) : null;
    const channelId = episode?.channelId ?? (typeof job.payload.channelId === 'string' ? job.payload.channelId : undefined);
    const result = await withMedia(job, channelId, () => withUsage({ jobId: job.id, episodeId: episode?.id, seriesId: episode?.seriesId ?? undefined, channelId }, () => HANDLERS[job.kind](job, progress)));
    // Only jobs that produce data (not an episode change) keep their return value.
    await jobRepository.finish(job.id, job.kind === 'generate_sprites' ? result : undefined);
    logger.info(`done ${job.kind} in ${Math.round((Date.now() - started) / 1000)}s`, { job: job.id });
  } catch (e) {
    const message = shortMessage(e);
    logger.error(`failed ${job.kind}`, { job: job.id, message, detail: e instanceof UserFacingError ? e.detail : ((e as Error)?.stack ?? String(e)) });
    await jobRepository.fail(job.id, message);
    if (job.episodeId) await episodeRepository.addEvent(job.episodeId, `Lỗi: ${message}`);
    await rollback(job);
  }
}

/**
 * With object storage on: fetch the job's media (its video, channel and character pictures) before it runs and store
 * what it made afterwards, even when it failed half way (finished pictures and voices are worth keeping).
 */
async function withMedia<T>(job: Job, channelId: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (!storage.enabled) return fn();
  const prefixes = jobPrefixes(ctx().workspaceId, job.episodeId, channelId);
  for (const p of prefixes) await storage.pull(p.prefix, p);
  try {
    return await fn();
  } finally {
    for (const p of prefixes) await storage.push(p.prefix, p).catch((e) => logger.error('media upload failed', { job: job.id, prefix: p.prefix, error: String((e as Error)?.message ?? e) }));
  }
}

async function deliverEvents(): Promise<boolean> {
  const items = await outboxRepository.pending();
  for (const { id, event, workspaceId, userId } of items) {
    let error: string | null = null;
    // Subscribers run in the workspace the event was published in, like the request that caused it.
    const context = await authService.contextFor(workspaceId, userId);
    if (!context) {
      await outboxRepository.done(id, 'no workspace');
      continue;
    }
    for (const s of SUBSCRIBERS.filter((x) => x.on === event.type)) {
      try {
        await runWithContext(context, () => s.handle(event as never));
      } catch (e) {
        error = `${s.id}: ${(e as Error).message}`;
        logger.error('subscriber failed', { subscriber: s.id, event: event.type, error: e });
      }
    }
    await outboxRepository.done(id, error);
  }
  return items.length > 0;
}

async function main() {
  // Connect and apply any pending migrations (web and worker take turns through an advisory lock).
  await dbReady();
  // Say "I am here" on a timer of its own: a long render must not look like a dead worker.
  await prefsService.workerBeat();
  setInterval(async () => {
    try {
      await prefsService.workerBeat();
    } catch (e) {
      logger.warn('heartbeat failed', { error: String((e as Error)?.message ?? e) });
    }
  }, 5000).unref();
  for (const { job, workspaceId, userId } of await jobQueue.failInterrupted('Bị gián đoạn do worker khởi động lại. Bấm Thử lại.')) {
    const context = await authService.contextFor(workspaceId, userId);
    if (context) await runWithContext(context, () => rollback(job));
  }
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
