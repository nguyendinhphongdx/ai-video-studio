'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useChannelStore } from '@/stores/channel-store';

import { appApi } from '../services/app.service';

export const queryKeys = {
  config: ['config'] as const,
  channels: ['channels'] as const,
  llmSettings: ['settings', 'llm'] as const,
};

export function useAppConfig() {
  return useQuery({ queryKey: queryKeys.config, queryFn: appApi.config, refetchInterval: 15_000 });
}

/** A page about one channel's video or series makes that channel the current one, so the top bar and the assistant talk about the same channel. */
export function useFollowChannel(channelId: string | undefined) {
  const { setChannelId } = useChannelStore();
  useEffect(() => {
    if (channelId) setChannelId(channelId);
  }, [channelId, setChannelId]);
}

/** Channels plus the current one (falls back to the first channel). */
export function useCurrentChannel() {
  const { channelId, setChannelId } = useChannelStore();
  const channels = useQuery({ queryKey: queryKeys.channels, queryFn: appApi.channels });
  const list = channels.data ?? [];
  const current = list.find((c) => c.id === channelId) ?? list[0] ?? null;
  useEffect(() => {
    if (current && current.id !== channelId) setChannelId(current.id);
  }, [current, channelId, setChannelId]);
  return { channels: list, current, setChannelId, isLoading: channels.isLoading };
}
