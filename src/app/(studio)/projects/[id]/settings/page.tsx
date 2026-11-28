'use client';

import { useParams } from 'next/navigation';

import { ProjectSettingsView } from '@/features/v2/views/ProjectSettingsView';

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectSettingsView projectId={id} />;
}
