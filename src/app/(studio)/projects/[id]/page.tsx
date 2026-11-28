'use client';

import { useParams } from 'next/navigation';

import { ProjectEpisodesView } from '@/features/v2/views/ProjectViews';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectEpisodesView projectId={id} />;
}
