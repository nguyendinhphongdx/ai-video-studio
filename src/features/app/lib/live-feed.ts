// The one connection of a tab to the live feed (0006). No React here, so reconnecting and the fallback are tested
// with a fake EventSource and fake timers.
import type { QueryClient } from '@tanstack/react-query';

import { isTerminal, patchJob, patchOwnJob, staleKeys, type LiveSignal } from './live-signals';

export const FEED_URL = '/api/v1/changes';
const BATCH_MS = 300;
/** The feed is "down" after this long without a connection; then one slow refresh keeps screens right. */
const DOWN_AFTER_MS = 10_000;
const FALLBACK_MS = 30_000;

type SourceCtor = new (url: string) => Pick<EventSource, 'close' | 'onopen' | 'onerror' | 'onmessage'>;

export class LiveFeed {
  private source: InstanceType<SourceCtor> | null = null;
  private pending = new Map<string, readonly unknown[]>();
  private batch: ReturnType<typeof setTimeout> | null = null;
  private downTimer: ReturnType<typeof setTimeout> | null = null;
  private fallback: ReturnType<typeof setInterval> | null = null;
  private opened = false;
  private stopped = false;

  constructor(
    private client: QueryClient,
    private Source: SourceCtor,
  ) {}

  start() {
    this.stopped = false;
    this.source = new this.Source(FEED_URL);
    this.source.onopen = () => {
      this.clearDown();
      // A change made between loading the page and connecting (or while the connection was down) is not announced
      // again: refresh what is on screen once.
      this.opened = true;
      void this.client.invalidateQueries();
    };
    this.source.onerror = () => {
      if (this.stopped || this.downTimer || this.fallback) return;
      this.downTimer = setTimeout(() => {
        this.downTimer = null;
        this.fallback = setInterval(() => void this.client.invalidateQueries(), FALLBACK_MS);
      }, DOWN_AFTER_MS);
    };
    this.source.onmessage = (m) => {
      try {
        this.receive(JSON.parse(m.data as string) as LiveSignal);
      } catch {
        // A frame that is not a signal is ignored.
      }
    };
  }

  stop() {
    this.stopped = true;
    this.source?.close();
    this.source = null;
    if (this.batch) clearTimeout(this.batch);
    this.batch = null;
    this.clearDown();
  }

  get isOpen() {
    return this.opened;
  }

  private clearDown() {
    if (this.downTimer) clearTimeout(this.downTimer);
    if (this.fallback) clearInterval(this.fallback);
    this.downTimer = this.fallback = null;
  }

  /** One signal: write progress straight into the cache, queue what it makes stale. */
  receive(s: LiveSignal) {
    if (s.topic === 'reset') {
      void this.client.invalidateQueries();
      return;
    }
    if (s.topic === 'job') this.patchJob(s);
    for (const key of staleKeys(s)) this.pending.set(JSON.stringify(key), key);
    if (this.pending.size && !this.batch) this.batch = setTimeout(() => this.flush(), BATCH_MS);
  }

  private patchJob(s: LiveSignal) {
    const episodeId = typeof s.data.episodeId === 'string' ? s.data.episodeId : null;
    this.client.setQueryData(['job', s.ref], (job: Parameters<typeof patchOwnJob>[0] | undefined) => (job ? patchOwnJob(job, s) : job));
    if (!episodeId) return;
    const patch = (view: Parameters<typeof patchJob>[0] | undefined) => {
      if (!view) return view;
      const next = patchJob(view, s);
      // This job is not in the cache yet (it just started): refetch the episode instead.
      if (next === null) {
        this.pending.set(JSON.stringify(['episode', episodeId]), ['episode', episodeId]);
        return view;
      }
      return next;
    };
    this.client.setQueryData(['episode', episodeId], patch);
    // The episode lists carry each episode's job too.
    this.client.setQueriesData({ queryKey: ['episodes'] }, (list: unknown) => (Array.isArray(list) ? list.map((v: { episode?: { id?: string } }) => (v?.episode?.id === episodeId ? patch(v as never) : v)) : list));
    this.client.setQueriesData({ queryKey: ['series-episodes'] }, (list: unknown) => (Array.isArray(list) ? list.map((v: { episode?: { id?: string } }) => (v?.episode?.id === episodeId ? patch(v as never) : v)) : list));
    if (!isTerminal(s.data.state) && !this.batch) this.batch = setTimeout(() => this.flush(), BATCH_MS);
  }

  private flush() {
    this.batch = null;
    const keys = [...this.pending.values()];
    this.pending.clear();
    for (const queryKey of keys) void this.client.invalidateQueries({ queryKey });
  }
}
