import { LayoutGrid } from 'lucide-react';
import type { Metadata } from 'next';

import { ComingSoon } from '@/components/common/ComingSoon';

export const metadata: Metadata = { title: 'Thư viện' };

export default function Page() {
  return <ComingSoon title="Thư viện" description="Mọi video của kênh, lọc theo trạng thái." icon={LayoutGrid} stage="Giai đoạn 2" />;
}
