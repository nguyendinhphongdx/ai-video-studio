'use client';

import { useParams } from 'next/navigation';

import { SceneDirectorView } from '@/features/v2/views/SceneDirectorView';

export default function SceneDirectorPage() {
  const { id, eid, sid } = useParams<{ id: string; eid: string; sid: string }>();
  return <SceneDirectorView projectId={id} episodeId={eid} sceneId={sid} />;
}
