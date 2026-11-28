// One reader per web process, however many tabs are open (0006). It reads the newest `changes` rows a few times a
// second while somebody listens, and hands each row to the tabs of the workspace it belongs to.
import { createLogger } from '@/server/logger';
import { WORKER_ALIVE_MS } from '@/server/modules/config/config.service';
import { prefsService } from '@/server/modules/prefs/prefs.service';

import { changesRepository } from './changes.repository';
import type { Signal } from './changes.types';

const logger = createLogger('changes-hub');
const POLL_MS = 500;
/**
 * `id` is a serial: a transaction that commits late can show a row with an id below one already read. So every poll
 * looks back over this window, and what was already sent is dropped. Signals are idempotent: a repeat is harmless, a
 * miss is not.
 */
const LOOKBACK_MS = 5000;
const SEEN_MS = 10_000;
const LIMIT = 2000;
const WORKER_CHECK_MS = 5000;

export interface Listener {
  workspaceId: string;
  send(signal: Signal): void;
}

class Hub {
  private listeners = new Set<Listener>();
  private seen = new Map<number, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private polledAt = 0;
  private workerAt = 0;
  private workerAlive: boolean | null = null;

  /** Start listening; the returned function stops. */
  add(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.timer) {
      // A first listener hears from now on: a tab that joins asks for what it missed by itself.
      this.polledAt = Date.now();
      this.workerAlive = null;
      this.timer = setTimeout(() => void this.poll(), POLL_MS);
    }
    return () => void this.listeners.delete(listener);
  }

  get size() {
    return this.listeners.size;
  }

  private emit(workspaceId: string | null, signal: Signal) {
    for (const l of this.listeners) if (workspaceId === null || l.workspaceId === workspaceId) l.send(signal);
  }

  private async poll() {
    this.timer = null;
    try {
      const started = Date.now();
      const rows = await changesRepository.since(new Date(this.polledAt - LOOKBACK_MS).toISOString(), LIMIT);
      this.polledAt = started;
      for (const r of rows) {
        if (this.seen.has(r.id)) continue;
        this.seen.set(r.id, started + SEEN_MS);
        const { workspaceId, ...signal } = r;
        if (workspaceId) this.emit(workspaceId, signal);
      }
      // More rows than one read can hold: some may be unseen, so tell everyone to refresh what they show.
      if (rows.length >= LIMIT) this.emit(null, { id: 0, topic: 'reset', ref: '', data: {} });
      for (const [id, until] of this.seen) if (until < started) this.seen.delete(id);
      if (started - this.workerAt >= WORKER_CHECK_MS) await this.checkWorker(started);
    } catch (e) {
      logger.warn('reading changes failed', { error: String((e as Error)?.message ?? e) });
    }
    if (this.listeners.size) this.timer = setTimeout(() => void this.poll(), POLL_MS);
  }

  /** The worker's heartbeat is not a stored change: tell the tabs only when it starts or stops. */
  private async checkWorker(at: number) {
    this.workerAt = at;
    const alive = Date.now() - ((await prefsService.workerSeenAt()) ?? 0) < WORKER_ALIVE_MS;
    if (this.workerAlive !== null && alive !== this.workerAlive) this.emit(null, { id: 0, topic: 'worker', ref: '', data: { alive } });
    this.workerAlive = alive;
  }
}

// One hub per process, also across Next's dev reloads.
const g = globalThis as unknown as { __avsChangesHub?: Hub };
export const changesHub = (g.__avsChangesHub ??= new Hub());
