// The live events of a turn: the worker writes them in small batches, the web serves them as server-sent events from
// any position, so a reload or a dropped connection catches up.
import { EventType } from '@ag-ui/core';

import type { AssistantEvent, Emit } from '@/core/assistant/stream';
import { ctx, runWithContext } from '@/server/context';
import { createLogger } from '@/server/logger';
import { jobRepository } from '@/server/modules/job/job.repository';

import { assistantRepository } from './assistant.repository';

const logger = createLogger('assistant-stream');
const FLUSH_MS = 150;
const POLL_MS = 200;
const BEAT_MS = 15_000;

const DELTAS: string[] = [EventType.TEXT_MESSAGE_CONTENT, EventType.REASONING_MESSAGE_CONTENT];

/** Collects events and writes them in order every moment, joining neighbouring pieces of the same message. */
export function eventSink(threadId: string): { emit: Emit; close(): Promise<void> } {
  let buffer: AssistantEvent[] = [];
  let writing = Promise.resolve();
  const flush = () => {
    const batch = buffer;
    buffer = [];
    // Losing live events must not lose the turn: the screen still reads the stored messages.
    if (batch.length) writing = writing.then(() => assistantRepository.addEvents(threadId, batch)).catch((e) => logger.warn('events not saved', { error: String((e as Error)?.message ?? e) }));
    return writing;
  };
  const timer = setInterval(flush, FLUSH_MS);
  return {
    emit(event) {
      const last = buffer.at(-1) as { type: string; messageId?: string; delta?: string } | undefined;
      const next = event as { type: string; messageId?: string; delta?: string };
      if (last && DELTAS.includes(next.type) && last.type === next.type && last.messageId === next.messageId) last.delta = `${last.delta}${next.delta}`;
      else buffer.push({ ...event });
    },
    async close() {
      clearInterval(timer);
      await flush();
    },
  };
}

const isEnd = (event: string) => /^\{"type":"RUN_(FINISHED|ERROR)"/.test(event);

/** Server-sent events after `position`, until the run ends, nothing is running any more, or the reader leaves. */
export function eventStream(threadId: string, position: number, signal: AbortSignal): Response {
  // The stream is read after the request handler returns: keep its context.
  const context = ctx();
  const encoder = new TextEncoder();
  let after = position;
  let beat = Date.now();
  let closed = false;
  const body = new ReadableStream<Uint8Array>({
    start: (controller) =>
      void runWithContext(context, async () => {
        const send = (text: string) => controller.enqueue(encoder.encode(text));
        try {
          send('retry: 2000\n\n');
          while (!closed && !signal.aborted) {
            // Asked before reading, so the last events of a turn that just finished are not missed.
            const running = Boolean(await jobRepository.activeAssistant(threadId));
            const rows = await assistantRepository.eventsAfter(threadId, after);
            if (closed || signal.aborted) break;
            for (const row of rows) send(`id: ${row.position}\ndata: ${row.event}\n\n`);
            if (rows.length) after = rows.at(-1)!.position;
            if (rows.some((r) => isEnd(r.event)) || (!running && !rows.length)) break;
            if (Date.now() - beat > BEAT_MS) {
              send(': beat\n\n');
              beat = Date.now();
            }
            await new Promise((r) => setTimeout(r, POLL_MS));
          }
          if (!closed) controller.close();
        } catch (e) {
          logger.warn('stream ended with an error', { error: String((e as Error)?.message ?? e) });
          if (!closed) controller.error(e);
        }
      }),
    cancel: () => void (closed = true),
  });
  return new Response(body, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' } });
}
