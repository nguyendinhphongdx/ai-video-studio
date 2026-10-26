import type { Metadata } from 'next';

import { LibraryView } from '@/features/episode/views/ListViews';

export const metadata: Metadata = { title: 'Thư viện' };

export default function LibraryPage() {
  return <LibraryView />;
}
