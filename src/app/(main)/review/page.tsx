import { Inbox } from 'lucide-react';
import type { Metadata } from 'next';

import { ComingSoon } from '@/components/common/ComingSoon';

export const metadata: Metadata = { title: 'Cần duyệt' };

export default function Page() {
  return <ComingSoon title="Cần duyệt" description="Kịch bản và video đang chờ bạn duyệt, của mọi series trong kênh." icon={Inbox} stage="Giai đoạn 2" />;
}
