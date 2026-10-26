import { Boxes } from 'lucide-react';
import type { Metadata } from 'next';

import { ComingSoon } from '@/components/common/ComingSoon';

export const metadata: Metadata = { title: 'Tools' };

export default function Page() {
  return <ComingSoon title="Tools" description="Công cụ dựng và các khối cảnh của từng công cụ." icon={Boxes} stage="Giai đoạn 5" />;
}
