// Two workspaces on one throw-away database: nothing made in one is visible, changeable or downloadable from the other.
import fs from 'node:fs';

import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-isolation-test-${process.pid}`;
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => false } }));

type AuthScope = import('@/server/context').RequestContext;

let A: AuthScope;
let B: AuthScope;
let run: <T>(s: AuthScope, fn: () => T) => T;
let m: {
  channels: typeof import('@/server/modules/channel/channel.service');
  episodes: typeof import('@/server/modules/episode/episode.service');
  episodeRepo: typeof import('@/server/modules/episode/episode.repository');
  jobs: typeof import('@/server/modules/job/job.repository');
  usage: typeof import('@/server/modules/usage/usage.repository');
  prefs: typeof import('@/server/modules/prefs/prefs.service');
  media: typeof import('@/server/adapters/media/media-access');
  db: typeof import('@/server/db');
};
let channelId: string;
let episodeId: string;

beforeAll(async () => {
  fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  const { authService } = await import('@/server/modules/auth/auth.service');
  run = (await import('@/server/context')).runWithContext;
  m = {
    channels: await import('@/server/modules/channel/channel.service'),
    episodes: await import('@/server/modules/episode/episode.service'),
    episodeRepo: await import('@/server/modules/episode/episode.repository'),
    jobs: await import('@/server/modules/job/job.repository'),
    usage: await import('@/server/modules/usage/usage.repository'),
    prefs: await import('@/server/modules/prefs/prefs.service'),
    media: await import('@/server/adapters/media/media-access'),
    db: await import('@/server/db'),
  };
  A = (await authService.authenticate((await authService.signUp({ email: 'a@x.vn', password: 'secret-123', name: 'An' })).token))!;
  B = (await authService.authenticate((await authService.signUp({ email: 'b@x.vn', password: 'secret-123', name: 'Bình' })).token))!;
  // Workspace A makes a project, an episode, a job, a cost and a preference.
  const { NEW_CHANNEL } = await import('@/features/channel/services/channel.api');
  await run(A, async () => {
    channelId = (await m.channels.channelService.create({ ...NEW_CHANNEL, name: 'Kênh của An' })).id;
    episodeId = 'ep-of-a';
    const at = new Date().toISOString();
    await m.episodeRepo.episodeRepository.insert({ id: episodeId, channelId, seriesId: null, seriesVersion: null, number: null, topic: 'Vì sao trời xanh', goal: '', notes: '', skillId: 'x', status: 'draft', formats: ['landscape'], voice: 'vi-VN-HoaiMyNeural', music: false, sceneCount: 0, createdAt: at, updatedAt: at });
    await m.jobs.jobRepository.insert(episodeId, 'summarize', {});
    await m.usage.usageRepository.insert({ at: new Date().toISOString(), kind: 'llm', provider: 'x', model: 'y', purpose: 'test', channelId, seriesId: null, episodeId, sceneId: null, jobId: null, threadId: null, inputTokens: 1, outputTokens: 1, cachedTokens: 0, units: 0, costUsd: 0.5, estimated: false, durationMs: 1 });
    await m.prefs.prefsService.saveSfx({ volume: 0.3 });
  });
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('workspace isolation', () => {
  it('stamps every row with the workspace and the person who made it', async () => {
    for (const t of ['channels', 'episodes', 'jobs', 'usage_events']) {
      const rows = m.db.rowsOf<{ workspace_id: string; user_id: string }>(await m.db.orm().execute(sql`SELECT workspace_id, user_id FROM ${sql.identifier(t)}`));
      expect(rows.length, t).toBeGreaterThan(0);
      for (const r of rows) expect([r.workspace_id, r.user_id], t).toEqual([A.workspace.id, A.user.id]);
    }
  });

  it('shows the owner its own data', async () => {
    await run(A, async () => {
      expect((await m.channels.channelService.list()).map((c) => c.id)).toContain(channelId);
      expect((await m.episodeRepo.episodeRepository.find(episodeId))?.id).toBe(episodeId);
    });
  });

  it('lists nothing of another workspace', async () => {
    await run(B, async () => {
      expect((await m.channels.channelService.list()).map((c) => c.id)).not.toContain(channelId);
      expect(await m.episodeRepo.episodeRepository.list()).toEqual([]);
      expect(await m.jobs.jobRepository.listActive()).toEqual([]);
      expect((await m.usage.usageRepository.totals('2000-01-01')).usd).toBe(0);
      expect(await m.usage.usageRepository.events({ limit: 50 })).toEqual([]);
      expect((await m.prefs.prefsService.sfx()).volume).toBe(0.8);
    });
  });

  it('answers "not found" for another workspace’s ids, and cannot change or delete them', async () => {
    await run(B, async () => {
      await expect(async () => m.channels.channelService.get(channelId)).rejects.toThrow(/Không tìm thấy/);
      await expect(async () => m.episodes.episodeService.get(episodeId)).rejects.toThrow(/Không tìm thấy/);
      await m.episodeRepo.episodeRepository.update(episodeId, { title: 'bị sửa' });
      await m.episodeRepo.episodeRepository.remove(episodeId);
    });
    await run(A, async () => {
      const e = await m.episodeRepo.episodeRepository.find(episodeId);
      expect(e?.title).not.toBe('bị sửa');
    });
  });

  it('serves media files only to their workspace', async () => {
    await run(A, async () => {
      expect(await m.media.canReadMedia(`episodes/${episodeId}/voice/1.mp3`)).toBe(true);
      expect(await m.media.canReadMedia(`channels/${channelId}/logo/x.png`)).toBe(true);
      expect(await m.media.canReadMedia(`series-characters/${A.workspace.id}/c.png`)).toBe(true);
    });
    await run(B, async () => {
      expect(await m.media.canReadMedia(`episodes/${episodeId}/voice/1.mp3`)).toBe(false);
      expect(await m.media.canReadMedia(`channels/${channelId}/logo/x.png`)).toBe(false);
      expect(await m.media.canReadMedia(`series-characters/${A.workspace.id}/c.png`)).toBe(false);
      expect(await m.media.canReadMedia('series-characters/%')).toBe(false);
      expect(await m.media.canReadMedia('tts-preview/abc.mp3')).toBe(true);
    });
  });

  it('runs a queued job in the workspace that queued it', async () => {
    const claimed = await m.jobs.jobQueue.claimNext();
    expect(claimed?.workspaceId).toBe(A.workspace.id);
    expect(claimed?.userId).toBe(A.user.id);
  });
});

describe('assistant attachments', () => {
  it('keeps them in the workspace and removes them with the conversation', async () => {
    const { assistantService } = await import('@/server/modules/assistant/assistant.service');
    const { resolveMedia } = await import('@/server/adapters/media/media.service');
    const thread = await run(A, async () => (await assistantService.create(channelId)).thread);
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])], 'anh.png');
    const a = await run(A, async () => await assistantService.upload(thread.id, png));
    expect(await run(A, async () => await m.media.canReadMedia(a.path))).toBe(true);
    expect(await run(B, async () => await m.media.canReadMedia(a.path))).toBe(false);
    await expect(run(B, async () => await assistantService.upload(thread.id, png))).rejects.toThrow();
    await run(A, async () => await assistantService.remove(thread.id));
    expect(fs.existsSync(resolveMedia(a.path))).toBe(false);
  });
});
