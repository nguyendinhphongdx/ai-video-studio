'use client';

import { useParams } from 'next/navigation';

import { ProjectLibraryView } from '@/features/v2/views/ProjectLibraryView';

export default function ProjectLibraryPage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectLibraryView projectId={id} />;
}
