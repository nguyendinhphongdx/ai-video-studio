// Live signals (0006): a change leaves a row in its own workspace, noise leaves none, and the feed hands each tab
// only its own workspace's rows.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-changes-test-${process.pid}`;
});
vi.mock('@/server/adapters/llm/llm.service', () => ({ llm: { isReady: async () => false } }));

type Scope = import('@/server/context').RequestContext;
type Signal = import('@/server/modules/changes/changes.types').Signal;

let A: Scope;
let B: Scope;
let run: <T>(s: Scope, fn: () => T) => T;
let repo: typeof import('@/server/modules/changes/changes.repository').changesRepository;
let hub: typeof import('@/server/modules/changes/changes.hub').changesHub;
let jobs: typeof import('@/server/modules/job/job.repository').jobRepository;
let episodes: typeof import('@/server/modules/episode/episode.repository').episodeRepository;
let channelId: string;

const rowsOf = (s: Scope) => repo.after(s.workspace.id, 0, 1000);
const wait = async (until: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!until() && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
};

beforeAll(async () => {
  fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  const { authService } = await import('@/server/modules/auth/auth.service');
  run = (await import('@/server/context')).runWithContext;
  repo = (await import('@/server/modules/changes/changes.repository')).changesRepository;
  hub = (await import('@/server/modules/changes/changes.hub')).changesHub;
  jobs = (await import('@/server/modules/job/job.repository')).jobRepository;
  episodes = (await import('@/server/modules/episode/episode.repository')).episodeRepository;
  A = (await authService.authenticate((await authService.signUp({ email: 'a@x.vn', password: 'secret-123', name: 'An' })).token))!;
  B = (await authService.authenticate((await authService.signUp({ email: 'b@x.vn', password: 'secret-123', name: 'Bình' })).token))!;
  const { NEW_CHANNEL } = await import('@/features/channel/services/channel.api');
  const channels = await import('@/server/modules/channel/channel.service');
  await run(A, async () => {
    channelId = (await channels.channelService.create({ ...NEW_CHANNEL, name: 'Kênh của An' })).id;
  });
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('change log', () => {
  it('records a change in the workspace that made it, and nowhere else', async () => {
    const mine = await rowsOf(A);
    expect(mine.some((r) => r.topic === 'project' && r.ref === channelId)).toBe(true);
    expect(await rowsOf(B)).toEqual([]);
  });

  it('announces a job when it starts, changes step, and ends, and keeps progress to one a second', async () => {
    await run(A, async () => {
      const job = await jobs.insert(null, 'generate_art', { channelId });
      const before = (await rowsOf(A)).filter((r) => r.topic === 'job' && r.ref === job.id).length;
      expect(before).toBe(1);
      await jobs.progress(job.id, 0.1, 'a');
      await jobs.progress(job.id, 0.2, 'a');
      await jobs.progress(job.id, 0.3, 'a');
      const afterSame = (await rowsOf(A)).filter((r) => r.topic === 'job' && r.ref === job.id);
      expect(afterSame).toHaveLength(2);
      await jobs.progress(job.id, 0.5, 'b');
      await jobs.finish(job.id);
      const all = (await rowsOf(A)).filter((r) => r.topic === 'job' && r.ref === job.id);
      expect(all).toHaveLength(4);
      expect(all.at(-1)?.data).toMatchObject({ state: 'done', progress: 1, kind: 'generate_art', channelId });
      expect(all[1]?.data).toMatchObject({ phase: 'a' });
    });
  });

  it('does not announce bookkeeping: touching an episode leaves no row', async () => {
    await run(A, async () => {
      const at = new Date().toISOString();
      await episodes.insert({ id: 'ep-live', channelId, seriesId: null, seriesVersion: null, number: null, topic: 't', goal: '', notes: '', skillId: 'x', status: 'draft', formats: ['landscape'], voice: 'vi-VN-HoaiMyNeural', music: false, sceneCount: 0, createdAt: at, updatedAt: at });
      const count = async () => (await rowsOf(A)).filter((r) => r.topic === 'episode' && r.ref === 'ep-live').length;
      expect(await count()).toBe(1);
      await episodes.touch('ep-live');
      await episodes.touch('ep-live');
      expect(await count()).toBe(1);
      await episodes.update('ep-live', { title: 'Mới' });
      expect(await count()).toBe(2);
    });
  });

  it('keeps data to ids, numbers and the progress label', async () => {
    const { SIGNAL_DATA, TOPICS } = await import('@/server/modules/changes/changes.types');
    for (const r of await rowsOf(A)) expect(SIGNAL_DATA[r.topic as (typeof TOPICS)[number]].safeParse(r.data).success, `${r.topic} ${JSON.stringify(r.data)}`).toBe(true);
  });

  it('tells a tab that reconnects only what it missed, in its own workspace', async () => {
    const all = await rowsOf(A);
    const first = all[0]!.id;
    expect((await repo.after(A.workspace.id, first, 1000)).map((r) => r.id)).toEqual(all.slice(1).map((r) => r.id));
    expect(await repo.after(B.workspace.id, 0, 1000)).toEqual([]);
    expect(await repo.firstId()).toBeLessThanOrEqual(first);
  });
});

describe('feed hub', () => {
  it('hands a row to the tabs of its workspace and to no other', async () => {
    const forA: Signal[] = [];
    const forB: Signal[] = [];
    const offA = hub.add({ workspaceId: A.workspace.id, send: (s) => forA.push(s) });
    const offB = hub.add({ workspaceId: B.workspace.id, send: (s) => forB.push(s) });
    await run(A, () => jobs.insert(null, 'generate_art', { channelId }));
    await wait(() => forA.some((s) => s.topic === 'job'));
    await new Promise((r) => setTimeout(r, 700));
    expect(forA.some((s) => s.topic === 'job')).toBe(true);
    expect(forB.filter((s) => s.topic !== 'worker')).toEqual([]);
    offA();
    offB();
  });

  it('sends a row once however many polls see it, and stops reading when nobody listens', async () => {
    const got: Signal[] = [];
    const off = hub.add({ workspaceId: A.workspace.id, send: (s) => got.push(s) });
    await run(A, () => jobs.insert(null, 'generate_art', { channelId }));
    await wait(() => got.some((s) => s.topic === 'job'));
    await new Promise((r) => setTimeout(r, 1600));
    const ids = got.filter((s) => s.id).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    off();
    expect(hub.size).toBe(0);
  });

  it('serves a tab as server-sent events and lets go when it leaves', async () => {
    const { changesFeed } = await import('@/server/modules/changes/changes.stream');
    const stop = new AbortController();
    const res = changesFeed({ workspaceId: A.workspace.id, token: undefined, lastEventId: 0, signal: stop.signal });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const reader = res.body!.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    expect(first).toContain('retry:');
    expect(hub.size).toBe(1);
    stop.abort();
    await wait(() => hub.size === 0);
    expect(hub.size).toBe(0);
    // Writing after it left must not throw.
    await expect(run(A, () => jobs.insert(null, 'generate_art', { channelId }))).resolves.toBeDefined();
  });
});

describe('cleanup', () => {
  it('deletes rows older than the time given and keeps the rest', async () => {
    const before = (await rowsOf(A)).length;
    await new Promise((r) => setTimeout(r, 20));
    await repo.prune(10_000);
    expect((await rowsOf(A)).length).toBe(before);
    await repo.prune(0);
    expect(await rowsOf(A)).toEqual([]);
  });
});
