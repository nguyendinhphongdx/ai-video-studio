'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { episodeApi } from '../services/episode.api';

type Idea = { topic: string; why: string };

const storeKey = (channelId: string, count: number) => `avs-topic-ideas:${channelId}:${count}`;
const read = (key: string): Idea[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null') as Idea[] | null;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/**
 * Ideas for the channel's next video, from its identity, knowledge and the videos it already has. They cost an AI call,
 * so nothing is asked until the person presses the button (`generate`); the last answer is kept in the browser per
 * channel and number of videos and shown again for free.
 */
export function useTopicIdeas(channelId: string | undefined, videoCount: number | undefined) {
  const [asked, setAsked] = useState(0);
  const [saved, setSaved] = useState<Idea[]>([]);
  const key = channelId && videoCount !== undefined ? storeKey(channelId, videoCount) : null;
  useEffect(() => {
    setSaved(key ? read(key) : []);
    setAsked(0);
  }, [key]);

  const query = useQuery({
    queryKey: ['topic-ideas', channelId, videoCount, asked],
    enabled: asked > 0 && key !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const ideas = await episodeApi.topicIdeas(channelId!);
      try {
        localStorage.setItem(key!, JSON.stringify(ideas));
      } catch {
        /* storage full or blocked: the ideas still show */
      }
      return ideas;
    },
  });
  return { ideas: query.data ?? saved, loading: query.isFetching, error: query.error, generate: () => setAsked((n) => n + 1), canAsk: key !== null };
}
