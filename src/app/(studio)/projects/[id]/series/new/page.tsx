'use client';

import { useParams } from 'next/navigation';

import { NewSeriesView } from '@/features/v2/views/NewSeriesView';

export default function NewSeriesPage() {
  const { id } = useParams<{ id: string }>();
  return <NewSeriesView projectId={id} />;
}
