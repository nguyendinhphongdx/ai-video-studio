import type { Metadata } from 'next';

import { ChannelListView } from '@/features/channel/views/ChannelViews';

export const metadata: Metadata = { title: 'Kênh & thương hiệu' };

export default function ChannelsPage() {
  return <ChannelListView />;
}
