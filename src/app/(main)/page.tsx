import type { Metadata } from 'next';

import { HomeView } from '@/features/episode/views/HomeView';

export const metadata: Metadata = { title: 'Tạo video' };

export default function HomePage() {
  return <HomeView />;
}
