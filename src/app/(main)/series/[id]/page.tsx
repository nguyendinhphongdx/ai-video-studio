import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { SeriesDetailView } from '@/features/series/views/SeriesDetailView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <SeriesDetailView id={id} />
    </Suspense>
  );
}
