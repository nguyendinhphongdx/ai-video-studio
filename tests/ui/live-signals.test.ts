import { describe, expect, it } from 'vitest';

import { patchJob, patchOwnJob, staleKeys, type LiveSignal } from '@/features/app/lib/live-signals';
import { SIGNAL_DATA, TOPICS } from '@/server/modules/changes/changes.types';

const sig = (topic: LiveSignal['topic'], ref: string, data: Record<string, unknown> = {}): LiveSignal => ({ topic, ref, data });
const has = (keys: readonly (readonly unknown[])[], key: unknown[]) => keys.some((k) => JSON.stringify(k) === JSON.stringify(key));

describe('what a signal makes stale', () => {
  it('has an answer for every topic in the catalog', () => {
    const sample: Record<string, LiveSignal> = { job: sig('job', 'j', { state: 'done' }) };
    for (const topic of TOPICS) expect(staleKeys(sample[topic] ?? sig(topic, 'r')).length, topic).toBeGreaterThan(0);
    expect(Object.keys(SIGNAL_DATA).sort()).toEqual([...TOPICS].sort());
  });

  it('refreshes a finished job and everything it may have changed, once', () => {
    const keys = staleKeys(sig('job', 'j1', { state: 'done', threadId: 't1' }));
    for (const k of [['job', 'j1'], ['channel'], ['usage'], ['episodes'], ['episode'], ['drawing'], ['logo-draft'], ['assistant-thread', 't1']]) expect(has(keys, k), JSON.stringify(k)).toBe(true);
  });

  it('refreshes nothing for a job that is only running (its progress is patched in)', () => {
    expect(staleKeys(sig('job', 'j', { state: 'running', progress: 0.4 }))).toEqual([]);
  });

  it('shows a job that has just been queued where it is waited for', () => {
    const keys = staleKeys(sig('job', 'j', { state: 'queued', threadId: 't' }));
    expect(has(keys, ['drawing'])).toBe(true);
    expect(has(keys, ['assistant-thread', 't'])).toBe(true);
  });

  it('maps the other topics to the queries that show them', () => {
    expect(has(staleKeys(sig('episode', 'e')), ['episode', 'e'])).toBe(true);
    expect(has(staleKeys(sig('project', 'p')), ['channel', 'p'])).toBe(true);
    expect(has(staleKeys(sig('series', 's')), ['series-one', 's'])).toBe(true);
    expect(has(staleKeys(sig('knowledge', 'p')), ['knowledge', 'p'])).toBe(true);
    expect(has(staleKeys(sig('member', 'w')), ['workspace', 'members'])).toBe(true);
    expect(has(staleKeys(sig('worker', '')), ['config'])).toBe(true);
  });
});

describe('writing progress into what is cached', () => {
  it('moves the progress and step of the job an episode view shows', () => {
    const view = { id: 'e', job: { id: 'j', state: 'running', progress: 0.1, phase: 'a' } };
    const next = patchJob(view, sig('job', 'j', { state: 'running', progress: 0.6, phase: 'b' }));
    expect(next).toEqual({ id: 'e', job: { id: 'j', state: 'running', progress: 0.6, phase: 'b' } });
    expect(view.job.progress).toBe(0.1);
  });

  it('asks for a refetch when the cache does not know that job yet', () => {
    expect(patchJob({ id: 'e', job: null }, sig('job', 'j', { state: 'queued' }))).toBeNull();
    expect(patchJob({ id: 'e', job: { id: 'other' } }, sig('job', 'j', { state: 'running' }))).toBeNull();
  });

  it('does not write the end of a job into its own cache: the result comes with the refetch', () => {
    const job = { id: 'j', state: 'running', progress: 0.9, phase: null };
    expect(patchOwnJob(job, sig('job', 'j', { state: 'done', progress: 1 }))).toBe(job);
    expect(patchOwnJob(job, sig('job', 'j', { state: 'running', progress: 0.95, phase: 'x' }))).toEqual({ id: 'j', state: 'running', progress: 0.95, phase: 'x' });
  });
});
