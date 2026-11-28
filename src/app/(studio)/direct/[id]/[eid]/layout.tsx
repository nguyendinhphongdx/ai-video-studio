'use client';

import { useParams } from 'next/navigation';

import { SceneDirectorView } from '@/features/v2/views/SceneDirectorView';

// The director lives in the layout, not the page: a page under [sid] is rebuilt for every scene, which blinked the
// whole screen and threw the scene list back to the top.
export default function SceneDirectorLayout({ children }: { children: React.ReactNode }) {
  const { id, eid, sid } = useParams<{ id: string; eid: string; sid: string }>();
  return (
    <>
      <SceneDirectorView projectId={id} episodeId={eid} sceneId={sid} />
      {children}
    </>
  );
}
