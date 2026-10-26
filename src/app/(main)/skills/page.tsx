import { Layers } from 'lucide-react';
import type { Metadata } from 'next';

import { ComingSoon } from '@/components/common/ComingSoon';

export const metadata: Metadata = { title: 'Skills' };

export default function Page() {
  return <ComingSoon title="Skills" description="Công thức làm video, soạn bằng Markdown và gọi tool bằng @." icon={Layers} stage="Giai đoạn 5" />;
}
