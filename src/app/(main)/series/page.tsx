import { ListVideo } from 'lucide-react';
import type { Metadata } from 'next';

import { ComingSoon } from '@/components/common/ComingSoon';

export const metadata: Metadata = { title: 'Series' };

export default function Page() {
  return <ComingSoon title="Series" description="Chương trình định kỳ của kênh: bible, khung tập, lộ trình và bộ nhớ." icon={ListVideo} stage="Giai đoạn 4" />;
}
