// Extension point: Domain event.
// Services publish what happened; subscribers react (episode approved -> write series memory, ...).
// Events go through an outbox, so a reaction never runs inside the request that caused it.
export type DomainEvent =
  | { type: 'episode.script_ready'; episodeId: string }
  | { type: 'episode.script_approved'; episodeId: string }
  | { type: 'episode.produced'; episodeId: string }
  | { type: 'episode.approved'; episodeId: string }
  | { type: 'episode.rejected'; episodeId: string; feedback: string };

export type EventType = DomainEvent['type'];
export type EventOf<T extends EventType> = Extract<DomainEvent, { type: T }>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}

export interface Subscriber<T extends EventType = EventType> {
  id: string;
  on: T;
  handle(event: EventOf<T>): Promise<void>;
}

export function defineSubscriber<T extends EventType>(s: Subscriber<T>): Subscriber<T> {
  return s;
}
