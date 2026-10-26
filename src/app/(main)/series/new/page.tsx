import type { Metadata } from 'next';

import { SeriesNewView } from '@/features/series/views/SeriesNewView';

export const metadata: Metadata = { title: 'Tạo series' };

export default function Page() {
  return <SeriesNewView />;
}
