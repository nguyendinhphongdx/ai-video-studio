import type { Metadata } from 'next';

import { ReviewView } from '@/features/episode/views/ListViews';

export const metadata: Metadata = { title: 'Cần duyệt' };

export default function ReviewPage() {
  return <ReviewView />;
}
