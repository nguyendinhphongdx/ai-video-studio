// Two workspaces on one throw-away database: nothing made in one is visible, changeable or downloadable from the other.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-isolation-test-${process.pid}`;
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => false } }));

type AuthScope = import('@/server/modules/auth/auth.types').AuthScope;

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
  run = (await import('@/server/http/scope')).runInScope;
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
  A = authService.scopeOf((await authService.signUp({ email: 'a@x.vn', password: 'secret-123', name: 'An' })).token)!;
  B = authService.scopeOf((await authService.signUp({ email: 'b@x.vn', password: 'secret-123', name: 'Bình' })).token)!;
  // Workspace A makes a project, an episode, a job, a cost and a preference.
  const { NEW_CHANNEL } = await import('@/features/channel/services/channel.api');
  await run(A, async () => {
    channelId = (await m.channels.channelService.create({ ...NEW_CHANNEL, name: 'Kênh của An' })).id;
    episodeId = 'ep-of-a';
    const at = new Date().toISOString();
    m.episodeRepo.episodeRepository.insert({ id: episodeId, channelId, seriesId: null, seriesVersion: null, number: null, topic: 'Vì sao trời xanh', goal: '', notes: '', skillId: 'x', status: 'draft', formats: ['landscape'], voice: 'vi-VN-HoaiMyNeural', music: false, sceneCount: 0, createdAt: at, updatedAt: at });
    m.jobs.jobRepository.insert(episodeId, 'summarize', {});
    m.usage.usageRepository.insert({ at: new Date().toISOString(), kind: 'llm', provider: 'x', model: 'y', purpose: 'test', channelId, seriesId: null, episodeId, sceneId: null, jobId: null, threadId: null, inputTokens: 1, outputTokens: 1, cachedTokens: 0, units: 0, costUsd: 0.5, estimated: false, durationMs: 1 });
    await m.prefs.prefsService.saveSfx({ volume: 0.3 });
  });
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('workspace isolation', () => {
  it('stamps every row with the workspace and the person who made it', () => {
    for (const t of ['channels', 'episodes', 'jobs', 'usage_events']) {
      const rows = m.db.db().prepare(`SELECT workspace_id, user_id FROM ${t}`).all() as { workspace_id: string; user_id: string }[];
      expect(rows.length, t).toBeGreaterThan(0);
      for (const r of rows) expect([r.workspace_id, r.user_id], t).toEqual([A.workspace.id, A.user.id]);
    }
  });

  it('shows the owner its own data', async () => {
    await run(A, async () => {
      expect((await m.channels.channelService.list()).map((c) => c.id)).toContain(channelId);
      expect(m.episodeRepo.episodeRepository.find(episodeId)?.id).toBe(episodeId);
    });
  });

  it('lists nothing of another workspace', async () => {
    await run(B, async () => {
      expect((await m.channels.channelService.list()).map((c) => c.id)).not.toContain(channelId);
      expect(m.episodeRepo.episodeRepository.list()).toEqual([]);
      expect(m.jobs.jobRepository.listActive()).toEqual([]);
      expect(m.usage.usageRepository.totals('2000-01-01').usd).toBe(0);
      expect(m.usage.usageRepository.events({ limit: 50 })).toEqual([]);
      expect((await m.prefs.prefsService.sfx()).volume).toBe(0.8);
    });
  });

  it('answers "not found" for another workspace’s ids, and cannot change or delete them', async () => {
    await run(B, async () => {
      await expect(m.channels.channelService.get(channelId)).rejects.toThrow(/Không tìm thấy/);
      await expect(m.episodes.episodeService.get(episodeId)).rejects.toThrow(/Không tìm thấy/);
      m.episodeRepo.episodeRepository.update(episodeId, { title: 'bị sửa' });
      m.episodeRepo.episodeRepository.remove(episodeId);
    });
    await run(A, async () => {
      const e = m.episodeRepo.episodeRepository.find(episodeId);
      expect(e?.title).not.toBe('bị sửa');
    });
  });

  it('serves media files only to their workspace', () => {
    run(A, () => {
      expect(m.media.canReadMedia(`episodes/${episodeId}/voice/1.mp3`)).toBe(true);
      expect(m.media.canReadMedia(`channels/${channelId}/logo/x.png`)).toBe(true);
      expect(m.media.canReadMedia(`series-characters/${A.workspace.id}/c.png`)).toBe(true);
    });
    run(B, () => {
      expect(m.media.canReadMedia(`episodes/${episodeId}/voice/1.mp3`)).toBe(false);
      expect(m.media.canReadMedia(`channels/${channelId}/logo/x.png`)).toBe(false);
      expect(m.media.canReadMedia(`series-characters/${A.workspace.id}/c.png`)).toBe(false);
      expect(m.media.canReadMedia('series-characters/%')).toBe(false);
      expect(m.media.canReadMedia('tts-preview/abc.mp3')).toBe(true);
    });
  });

  it('runs a queued job in the workspace that queued it', () => {
    const claimed = m.jobs.jobQueue.claimNext();
    expect(claimed?.workspaceId).toBe(A.workspace.id);
    expect(claimed?.userId).toBe(A.user.id);
  });
});
