'use client';

import { EventType } from '@ag-ui/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { applyEvent, EMPTY_TURN, type AssistantEvent, type LiveTurn } from '@/core/assistant/stream';

import { assistantApi } from '../services/assistant.api';

/** Events after which the stored conversation has something new. */
const STORED: string[] = [EventType.TEXT_MESSAGE_END, EventType.REASONING_END, EventType.TOOL_CALL_RESULT, EventType.RUN_FINISHED, EventType.RUN_ERROR];

/**
 * The running turn as it happens, from the AG-UI event stream. A reload replays the turn from its start; a dropped
 * connection resumes after the last event (the browser sends Last-Event-ID). If the stream does not work at all, the
 * polled conversation still shows every finished step.
 */
export function useLiveTurn(threadId: string | null, running: boolean): LiveTurn {
  const qc = useQueryClient();
  const [state, setState] = useState<{ threadId: string; turn: LiveTurn } | null>(null);

  useEffect(() => {
    if (!threadId || !running || typeof EventSource === 'undefined') return;
    let turn = EMPTY_TURN;
    const source = new EventSource(assistantApi.eventsUrl(threadId));
    // The conversation used to be polled while a turn ran. Now only if this stream breaks, so a step that finished
    // still reaches the screen.
    let rescue: ReturnType<typeof setInterval> | null = null;
    const refresh = () => void qc.invalidateQueries({ queryKey: ['assistant-thread', threadId] });
    source.onopen = () => {
      if (rescue) clearInterval(rescue);
      rescue = null;
    };
    source.onerror = () => {
      rescue ??= setInterval(refresh, 1500);
    };
    source.onmessage = (message) => {
      const event = JSON.parse(message.data as string) as AssistantEvent;
      turn = applyEvent(turn, event);
      setState({ threadId, turn });
      if (STORED.includes(event.type)) refresh();
      if (turn.ended) source.close();
    };
    return () => {
      source.close();
      if (rescue) clearInterval(rescue);
    };
  }, [threadId, running, qc]);

  return running && state?.threadId === threadId ? state.turn : EMPTY_TURN;
}
