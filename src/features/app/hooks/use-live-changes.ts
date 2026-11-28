'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { LiveFeed } from '../lib/live-feed';

/**
 * The tab's one connection to the live feed. Mounted once, in the studio layout. Nothing else opens an EventSource
 * or sets a refetch interval to learn that something changed (docs/conventions/10-live-updates.md).
 */
export function useLiveChanges() {
  const client = useQueryClient();
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const feed = new LiveFeed(client, EventSource);
    feed.start();
    return () => feed.stop();
  }, [client]);
}
