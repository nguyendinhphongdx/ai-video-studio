import type { Metadata } from 'next';

import { LibraryView } from '@/features/episode/views/ListViews';

export const metadata: Metadata = { title: 'Video' };

export default function LibraryPage() {
  return <LibraryView />;
}
