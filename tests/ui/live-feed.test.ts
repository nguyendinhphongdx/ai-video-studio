import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveFeed } from '@/features/app/lib/live-feed';

class FakeSource {
  static all: FakeSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((m: { data: string }) => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeSource.all.push(this);
  }
  close() {
    this.closed = true;
  }
  push(signal: unknown) {
    this.onmessage?.({ data: JSON.stringify(signal) });
  }
}

let client: QueryClient;
let invalidate: { mock: { calls: unknown[][] } } & ((...a: unknown[]) => unknown) & { mockResolvedValue: (v: unknown) => unknown };
let feed: LiveFeed;
const last = () => FakeSource.all.at(-1)!;
const keysInvalidated = () => invalidate.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey?: unknown } | undefined)?.queryKey));

beforeEach(() => {
  vi.useFakeTimers();
  FakeSource.all = [];
  client = new QueryClient();
  invalidate = vi.spyOn(client, 'invalidateQueries') as unknown as typeof invalidate;
  invalidate.mockResolvedValue(undefined);
  feed = new LiveFeed(client, FakeSource as never);
  feed.start();
});
afterEach(() => {
  feed.stop();
  vi.useRealTimers();
});

describe('the live feed of a tab', () => {
  it('opens one connection and refreshes what is on screen once when it opens', () => {
    expect(FakeSource.all).toHaveLength(1);
    expect(last().url).toBe('/api/v1/changes');
    last().onopen?.();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('refreshes what a signal touches, in one batch', () => {
    last().push({ topic: 'episode', ref: 'e1', data: {} });
    last().push({ topic: 'episode', ref: 'e1', data: {} });
    last().push({ topic: 'project', ref: 'p1', data: {} });
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    const keys = keysInvalidated();
    expect(keys).toContain('["episode","e1"]');
    expect(keys).toContain('["channel","p1"]');
    expect(keys.filter((k) => k === '["episode","e1"]')).toHaveLength(1);
  });

  it('moves a running job on screen without asking for anything', () => {
    client.setQueryData(['episode', 'e1'], { episode: { id: 'e1' }, job: { id: 'j1', state: 'running', progress: 0.1, phase: 'a' } });
    client.setQueryData(['episodes', 'p'], [{ episode: { id: 'e1' }, job: { id: 'j1', state: 'running', progress: 0.1, phase: 'a' } }, { episode: { id: 'e2' }, job: null }]);
    last().push({ topic: 'job', ref: 'j1', data: { state: 'running', progress: 0.7, phase: 'b', kind: 'produce', episodeId: 'e1' } });
    expect(client.getQueryData<{ job: { progress: number; phase: string } }>(['episode', 'e1'])?.job).toMatchObject({ progress: 0.7, phase: 'b' });
    expect(client.getQueryData<{ job: { progress: number } | null }[]>(['episodes', 'p'])?.[0]?.job).toMatchObject({ progress: 0.7 });
    vi.advanceTimersByTime(300);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('refetches the episode when it did not know the job yet', () => {
    client.setQueryData(['episode', 'e1'], { episode: { id: 'e1' }, job: null });
    last().push({ topic: 'job', ref: 'j9', data: { state: 'queued', progress: 0, phase: null, kind: 'produce', episodeId: 'e1' } });
    vi.advanceTimersByTime(300);
    expect(keysInvalidated()).toContain('["episode","e1"]');
  });

  it('refreshes everything when told its position is lost', () => {
    last().push({ topic: 'reset', ref: '', data: {} });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith();
  });

  it('keeps screens right with one slow refresh while the feed is down, and stops when it is back', () => {
    last().onerror?.();
    vi.advanceTimersByTime(9_000);
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000 + 30_000);
    expect(invalidate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(invalidate).toHaveBeenCalledTimes(2);
    last().onopen?.();
    const calls = invalidate.mock.calls.length;
    vi.advanceTimersByTime(120_000);
    expect(invalidate.mock.calls.length).toBe(calls);
  });

  it('does not refresh by itself when the connection only blinked', () => {
    last().onerror?.();
    vi.advanceTimersByTime(3_000);
    last().onopen?.();
    const calls = invalidate.mock.calls.length;
    vi.advanceTimersByTime(120_000);
    expect(invalidate.mock.calls.length).toBe(calls);
  });

  it('lets go of the connection and its timers when stopped', () => {
    last().onerror?.();
    feed.stop();
    expect(last().closed).toBe(true);
    vi.advanceTimersByTime(120_000);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
