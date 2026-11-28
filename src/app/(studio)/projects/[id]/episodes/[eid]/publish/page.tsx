'use client';

import { useParams } from 'next/navigation';

import { PublishStep } from '@/features/v2/views/episode/PublishStep';

export default function Page() {
  const { eid } = useParams<{ eid: string }>();
  return <PublishStep episodeId={eid} />;
}
