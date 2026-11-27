// Outbox: services append events in their own transaction; the worker delivers them to subscribers.
import type { DomainEvent, EventBus } from '@/core/events/events';
import { db, json, now } from '@/server/db';
import { ctx } from '@/server/context';

export interface OutboxItem {
  id: number;
  event: DomainEvent;
  workspaceId: string | null;
  userId: string | null;
}

export const outboxRepository = {
  /** Undelivered events of every workspace (the worker serves them all), each with the scope it was published in. */
  async pending(limit = 20): Promise<OutboxItem[]> {
    const rows = db().prepare('SELECT id, payload, workspace_id, user_id FROM outbox WHERE handled_at IS NULL ORDER BY id LIMIT ?').all(limit) as { id: number; payload: string; workspace_id: string | null; user_id: string | null }[];
    return rows.map((r) => ({ id: r.id, event: json<DomainEvent>(r.payload, null as never), workspaceId: r.workspace_id, userId: r.user_id }));
  },
  async done(id: number, error: string | null) {
    db().prepare('UPDATE outbox SET handled_at = ?, error = ? WHERE id = ?').run(now(), error, id);
  },
};

export const eventBus: EventBus = {
  async publish(event) {
    db().prepare('INSERT INTO outbox (type, payload, created_at, workspace_id, user_id) VALUES (?, ?, ?, ?, ?)').run(event.type, JSON.stringify(event), now(), ctx().workspaceId, ctx().userId);
  },
};
