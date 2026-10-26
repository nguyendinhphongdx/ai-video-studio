'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The assistant panel: open or not, which conversation each channel was on, and the scene being looked at (set by the scenes screen). */
interface AssistantState {
  open: boolean;
  setOpen: (open: boolean) => void;
  threadByChannel: Record<string, string>;
  setThread: (channelId: string, threadId: string | null) => void;
  /** Scene the person has open on the scenes screen; not persisted. */
  sceneId: string | null;
  setScene: (id: string | null) => void;
  /** A message to send as soon as the panel is ready (shortcuts elsewhere in the app). */
  queued: string | null;
  ask: (text: string) => void;
  clearQueued: () => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      open: false,
      setOpen: (open) => set({ open }),
      threadByChannel: {},
      setThread: (channelId, threadId) =>
        set((s) => {
          const next = { ...s.threadByChannel };
          if (threadId) next[channelId] = threadId;
          else delete next[channelId];
          return { threadByChannel: next };
        }),
      sceneId: null,
      setScene: (sceneId) => set({ sceneId }),
      queued: null,
      ask: (text) => set({ open: true, queued: text }),
      clearQueued: () => set({ queued: null }),
    }),
    { name: 'avs-assistant', partialize: (s) => ({ open: s.open, threadByChannel: s.threadByChannel }) },
  ),
);
