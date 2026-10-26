import { Tv } from 'lucide-react';
import type { Metadata } from 'next';

import { ComingSoon } from '@/components/common/ComingSoon';

export const metadata: Metadata = { title: 'Kênh & thương hiệu' };

export default function Page() {
  return <ComingSoon title="Kênh & thương hiệu" description="Logo, bảng màu, giọng đọc, khán giả và giọng văn của kênh." icon={Tv} stage="Giai đoạn 3" />;
}
