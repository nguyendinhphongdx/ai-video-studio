// Outbox: services append events in their own transaction; the worker delivers them to subscribers.
import { asc, eq, isNull } from 'drizzle-orm';

import type { DomainEvent, EventBus } from '@/core/events/events';
import { json, now } from '@/server/db';
import { orm, owner } from '@/server/orm';
import { outbox } from '@/server/schema';

export interface OutboxItem {
  id: number;
  event: DomainEvent;
  workspaceId: string | null;
  userId: string | null;
}

export const outboxRepository = {
  /** Undelivered events of every workspace (the worker serves them all), each with the scope it was published in. */
  async pending(limit = 20): Promise<OutboxItem[]> {
    const rows = await orm().select({ id: outbox.id, payload: outbox.payload, workspaceId: outbox.workspaceId, userId: outbox.userId }).from(outbox).where(isNull(outbox.handledAt)).orderBy(asc(outbox.id)).limit(limit);
    return rows.map((r) => ({ id: r.id, event: json<DomainEvent>(r.payload, null as never), workspaceId: r.workspaceId, userId: r.userId }));
  },
  async done(id: number, error: string | null) {
    await orm().update(outbox).set({ handledAt: now(), error }).where(eq(outbox.id, id));
  },
};

export const eventBus: EventBus = {
  async publish(event) {
    await orm().insert(outbox).values({ type: event.type, payload: JSON.stringify(event), createdAt: now(), ...owner() });
  },
};
