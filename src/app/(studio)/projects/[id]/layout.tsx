'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { useFollowChannel } from '@/features/app';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { ProjectShell } from '@/features/v2/Shell';

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const project = useChannel(id);
  useFollowChannel(id);
  return (
    <ProjectShell projectId={id} name={project.data?.name ?? ''}>
      {children}
    </ProjectShell>
  );
}
