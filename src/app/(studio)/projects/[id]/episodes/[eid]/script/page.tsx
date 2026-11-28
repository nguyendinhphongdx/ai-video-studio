'use client';

import { useParams } from 'next/navigation';

import { ScenesStep } from '@/features/v2/views/episode/ScenesStep';

export default function Page() {
  const { id, eid } = useParams<{ id: string; eid: string }>();
  return <ScenesStep projectId={id} episodeId={eid} />;
}
