'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The channel the person is working on; remembered per browser. */
interface ChannelState {
  channelId: string | null;
  setChannelId: (id: string) => void;
}

export const useChannelStore = create<ChannelState>()(
  persist((set) => ({ channelId: null, setChannelId: (channelId) => set({ channelId }) }), { name: 'avs-channel' }),
);
