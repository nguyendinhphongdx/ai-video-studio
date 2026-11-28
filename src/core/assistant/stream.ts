// The live side of a turn as AG-UI events: the loop emits them, the screen folds them into what is shown until the
// stored messages catch up.
import { EventType, type AGUIEvent } from '@ag-ui/core';

export type AssistantEvent = AGUIEvent;
export type Emit = (event: AssistantEvent) => void;

export interface LiveItem {
  kind: 'reasoning' | 'text' | 'tool';
  /** Model step id for reasoning and text; the call id for a tool. */
  id: string;
  text: string;
  /** Tool only. */
  name?: string;
  args?: string;
  state?: 'running' | 'done';
}

export interface LiveTurn {
  runId: string;
  items: LiveItem[];
  /** The run said it is over (finished, stopped, waiting for the person, or failed). */
  ended: null | 'done' | 'stopped' | 'interrupt' | 'error';
}

export const EMPTY_TURN: LiveTurn = { runId: '', items: [], ended: null };

function upsert(items: LiveItem[], kind: LiveItem['kind'], id: string, change: (item: LiveItem) => LiveItem): LiveItem[] {
  const at = items.findIndex((i) => i.kind === kind && i.id === id);
  if (at < 0) return [...items, change({ kind, id, text: '' })];
  return items.map((item, i) => (i === at ? change(item) : item));
}

/** Pure fold of one event into the turn. A new run starts from nothing, so replaying a turn never doubles it. */
export function applyEvent(turn: LiveTurn, event: AssistantEvent): LiveTurn {
  const items = (kind: LiveItem['kind'], id: string, change: (item: LiveItem) => LiveItem) => ({ ...turn, items: upsert(turn.items, kind, id, change) });
  switch (event.type) {
    case EventType.RUN_STARTED:
      return { runId: event.runId, items: [], ended: null };
    case EventType.REASONING_MESSAGE_CONTENT:
      return items('reasoning', event.messageId, (i) => ({ ...i, text: i.text + event.delta }));
    case EventType.TEXT_MESSAGE_CONTENT:
      return items('text', event.messageId, (i) => ({ ...i, text: i.text + event.delta }));
    case EventType.TOOL_CALL_START:
      return items('tool', event.toolCallId, (i) => ({ ...i, name: event.toolCallName, state: 'running' }));
    case EventType.TOOL_CALL_ARGS:
      return items('tool', event.toolCallId, (i) => ({ ...i, args: (i.args ?? '') + event.delta }));
    case EventType.CUSTOM:
      if (event.name !== 'tool_summary') return turn;
      return items('tool', (event.value as { toolCallId: string }).toolCallId, (i) => ({ ...i, text: (event.value as { summary: string }).summary }));
    case EventType.TOOL_CALL_RESULT:
      return items('tool', event.toolCallId, (i) => ({ ...i, state: 'done' }));
    case EventType.RUN_FINISHED: {
      const outcome = event.outcome?.type;
      return { ...turn, ended: outcome === 'interrupt' ? 'interrupt' : outcome === 'cancelled' ? 'stopped' : 'done' };
    }
    case EventType.RUN_ERROR:
      return { ...turn, ended: 'error' };
    default:
      return turn;
  }
}

/** What is still missing from the stored messages: a stored message or tool answer replaces its live item. */
export function pendingItems(turn: LiveTurn, messages: { role: string; toolCallId: string | null; data: unknown }[]): LiveItem[] {
  const steps = new Set(messages.map((m) => (m.data as { liveId?: string } | null)?.liveId).filter(Boolean));
  const calls = new Set(messages.filter((m) => m.role === 'tool').map((m) => m.toolCallId));
  return turn.items.filter((i) => (i.kind === 'tool' ? !calls.has(i.id) : !steps.has(i.id)));
}

/** Writes one model step's deltas as properly opened and closed AG-UI messages. */
export function stepStream(emit: Emit, messageId: string) {
  let open: 'reasoning' | 'text' | null = null;
  const close = () => {
    if (open === 'reasoning') {
      emit({ type: EventType.REASONING_MESSAGE_END, messageId });
      emit({ type: EventType.REASONING_END, messageId });
    } else if (open === 'text') emit({ type: EventType.TEXT_MESSAGE_END, messageId });
    open = null;
  };
  return {
    delta(kind: 'reasoning' | 'text', delta: string) {
      if (!delta) return;
      if (open !== kind) {
        close();
        if (kind === 'reasoning') {
          emit({ type: EventType.REASONING_START, messageId });
          emit({ type: EventType.REASONING_MESSAGE_START, messageId, role: 'reasoning' });
        } else emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' });
        open = kind;
      }
      emit({ type: kind === 'reasoning' ? EventType.REASONING_MESSAGE_CONTENT : EventType.TEXT_MESSAGE_CONTENT, messageId, delta });
    },
    close,
  };
}
