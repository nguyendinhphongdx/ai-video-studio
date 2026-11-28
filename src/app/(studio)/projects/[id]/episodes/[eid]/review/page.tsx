'use client';

import { useParams } from 'next/navigation';

import { VideoStep } from '@/features/v2/views/episode/VideoStep';

export default function Page() {
  const { eid } = useParams<{ eid: string }>();
  return <VideoStep episodeId={eid} />;
}
