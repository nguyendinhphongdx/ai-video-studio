import type { Metadata } from 'next';

import { SeriesListView } from '@/features/series/views/SeriesListView';

export const metadata: Metadata = { title: 'Series' };

export default function Page() {
  return <SeriesListView />;
}
