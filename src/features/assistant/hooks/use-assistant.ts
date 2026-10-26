'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import { errorMessage } from '@/lib/api/client';
import { useAssistantStore } from '@/stores/assistant-store';

import { assistantApi, type Focus, type PermissionMode } from '../services/assistant.api';

/** Where the person is, from the URL and the scene open on the scenes screen. */
export function useFocus(): Focus {
  const pathname = usePathname();
  const sceneId = useAssistantStore((s) => s.sceneId);
  return useMemo(() => {
    const m = (re: RegExp) => re.exec(pathname)?.[1] ?? null;
    const episodeId = m(/^\/episodes\/([^/]+)/);
    return { route: pathname, episodeId, seriesId: m(/^\/series\/([^/]+)/), sceneId: episodeId ? sceneId : null, skillId: m(/^\/skills\/([^/]+)/) };
  }, [pathname, sceneId]);
}

/** Queries that show data the assistant can change; refreshed whenever it finishes a step. */
const DATA_KEYS = [['episode'], ['episodes'], ['channel'], ['channels'], ['series'], ['series-one'], ['series-episodes'], ['series-memory'], ['skills'], ['skill'], ['market'], ['knowledge'], ['config'], ['settings']];

export function useThread(channelId: string | undefined) {
  const qc = useQueryClient();
  const threadId = useAssistantStore((s) => (channelId ? (s.threadByChannel[channelId] ?? null) : null));
  const setThread = useAssistantStore((s) => s.setThread);
  const threads = useQuery({ queryKey: ['assistant-threads', channelId], queryFn: () => assistantApi.threads(channelId!), enabled: Boolean(channelId) });
  const view = useQuery({
    queryKey: ['assistant-thread', threadId],
    queryFn: () => assistantApi.get(threadId!),
    enabled: Boolean(threadId),
    refetchInterval: (q) => (q.state.data?.running ? 900 : false),
  });

  // A remembered thread that no longer exists (deleted, other database): fall back to the newest one.
  useEffect(() => {
    if (!channelId || !threads.data) return;
    if (threadId && view.isError) setThread(channelId, threads.data[0]?.id ?? null);
    else if (!threadId && threads.data[0]) setThread(channelId, threads.data[0].id);
  }, [channelId, threads.data, threadId, view.isError, setThread]);

  // The screens behind the panel show what the assistant just changed.
  const seen = useRef(0);
  const count = view.data?.messages.length ?? 0;
  const running = view.data?.running ?? false;
  useEffect(() => {
    if (count !== seen.current) {
      seen.current = count;
      for (const key of DATA_KEYS) void qc.invalidateQueries({ queryKey: key });
    }
  }, [count, qc]);
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !running) for (const key of DATA_KEYS) void qc.invalidateQueries({ queryKey: key });
    wasRunning.current = running;
  }, [running, qc]);

  return { threadId, threads: threads.data ?? [], view: view.data ?? null, loading: view.isLoading && Boolean(threadId), refresh: () => void qc.invalidateQueries({ queryKey: ['assistant-thread', threadId] }) };
}

export function useAssistantActions(channelId: string | undefined, threadId: string | null, mode: PermissionMode) {
  const qc = useQueryClient();
  const setThread = useAssistantStore((s) => s.setThread);
  const focus = useFocus();
  const put = (view: { thread: { id: string } }) => {
    qc.setQueryData(['assistant-thread', view.thread.id], view);
    void qc.invalidateQueries({ queryKey: ['assistant-threads', channelId] });
  };
  const send = useMutation({
    mutationFn: async (text: string) => {
      let id = threadId;
      if (!id) {
        const created = await assistantApi.create(channelId!, mode);
        id = created.thread.id;
        setThread(channelId!, id);
      }
      return assistantApi.send(id, text, focus);
    },
    onSuccess: put,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const decide = useMutation({ mutationFn: (a: { messageId: number; approve: boolean }) => assistantApi.decide(threadId!, a.messageId, a.approve), onSuccess: put, onError: (e) => toast.error(errorMessage(e)) });
  const setMode = useMutation({
    mutationFn: async (m: PermissionMode) => {
      if (!threadId) return null;
      return assistantApi.setMode(threadId, m);
    },
    onSuccess: (v) => v && put(v),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: (m: PermissionMode) => assistantApi.create(channelId!, m),
    onSuccess: (v) => {
      setThread(channelId!, v.thread.id);
      put(v);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return { send, decide, setMode, create, focus };
}
