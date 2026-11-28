// The feed of one tab: server-sent events from the hub, after catching up on what the tab missed (0006).
import { createLogger } from '@/server/logger';
import { authService } from '@/server/modules/auth/auth.service';

import { changesHub } from './changes.hub';
import { changesRepository } from './changes.repository';
import type { Signal } from './changes.types';

const logger = createLogger('changes-feed');
const BEAT_MS = 15_000;
const CATCH_UP = 500;

/** Server-sent events for one signed-in tab until it leaves, signs out, or leaves the workspace. */
export function changesFeed(opts: { workspaceId: string; token: string | undefined; lastEventId: number; signal: AbortSignal }): Response {
  const encoder = new TextEncoder();
  let closed = false;
  let stop: (() => void) | null = null;
  let beat: ReturnType<typeof setInterval> | null = null;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        stop?.();
        if (beat) clearInterval(beat);
        try {
          controller.close();
        } catch {
          // Already closed by the reader leaving.
        }
      };
      // Every write is guarded: a write after the reader left must not throw (it used to: "Controller is already closed").
      const write = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          close();
        }
      };
      const send = (s: Signal) => write(`${s.id ? `id: ${s.id}\n` : ''}data: ${JSON.stringify({ topic: s.topic, ref: s.ref, data: s.data })}\n\n`);

      // Padding makes a buffering proxy release the first bytes.
      write(`retry: 1000\n: ${' '.repeat(2048)}\n\n`);
      stop = changesHub.add({ workspaceId: opts.workspaceId, send });
      opts.signal.addEventListener('abort', close);

      void (async () => {
        try {
          if (opts.lastEventId > 0) {
            // Joined the hub first, so nothing falls between the catch-up and the live rows (a repeat is harmless).
            const [rows, first] = await Promise.all([changesRepository.after(opts.workspaceId, opts.lastEventId, CATCH_UP), changesRepository.firstId()]);
            const lost = rows.length >= CATCH_UP || (first !== null && opts.lastEventId < first);
            if (lost) send({ id: 0, topic: 'reset', ref: '', data: {} });
            else for (const { workspaceId: _w, ...s } of rows) send(s);
          }
        } catch (e) {
          logger.warn('catch-up failed', { error: String((e as Error)?.message ?? e) });
          send({ id: 0, topic: 'reset', ref: '', data: {} });
        }
      })();

      beat = setInterval(() => {
        write(': beat\n\n');
        // A long connection must not outlive the person's right to it.
        void authService
          .authenticate(opts.token)
          .then((c) => {
            if (!c || c.workspaceId !== opts.workspaceId) close();
          })
          .catch(() => undefined);
      }, BEAT_MS);
    },
    cancel() {
      closed = true;
      stop?.();
      if (beat) clearInterval(beat);
    },
  });
  return new Response(body, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' } });
}
