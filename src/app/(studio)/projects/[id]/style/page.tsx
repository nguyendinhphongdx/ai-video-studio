'use client';

import { useParams } from 'next/navigation';

import { ProjectStyleView } from '@/features/v2/views/ProjectViews';

export default function ProjectStylePage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectStyleView projectId={id} />;
}
