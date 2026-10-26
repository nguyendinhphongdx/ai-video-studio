// Outbox: services append events in their own transaction; the worker delivers them to subscribers.
import type { DomainEvent, EventBus } from '@/core/events/events';
import { db, json, now } from '@/server/db';

export interface OutboxItem {
  id: number;
  event: DomainEvent;
}

export const outboxRepository = {
  pending(limit = 20): OutboxItem[] {
    const rows = db().prepare('SELECT id, payload FROM outbox WHERE handled_at IS NULL ORDER BY id LIMIT ?').all(limit) as { id: number; payload: string }[];
    return rows.map((r) => ({ id: r.id, event: json<DomainEvent>(r.payload, null as never) }));
  },
  done(id: number, error: string | null) {
    db().prepare('UPDATE outbox SET handled_at = ?, error = ? WHERE id = ?').run(now(), error, id);
  },
};

export const eventBus: EventBus = {
  async publish(event) {
    db().prepare('INSERT INTO outbox (type, payload, created_at) VALUES (?, ?, ?)').run(event.type, JSON.stringify(event), now());
  },
};
