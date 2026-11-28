'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { EpisodeShell } from '@/features/v2/views/episode/EpisodeShell';

export default function EpisodeLayout({ children }: { children: ReactNode }) {
  const { id, eid } = useParams<{ id: string; eid: string }>();
  return (
    <EpisodeShell projectId={id} episodeId={eid}>
      {children}
    </EpisodeShell>
  );
}
