import { Clapperboard } from 'lucide-react';
import type { Metadata } from 'next';

import { ComingSoon } from '@/components/common/ComingSoon';

export const metadata: Metadata = { title: 'Tạo video' };

export default function Page() {
  return <ComingSoon title="Tạo video" description="Hôm nay làm video gì? Gõ một ý tưởng, AI viết kịch bản theo skill của kênh." icon={Clapperboard} stage="Giai đoạn 2" />;
}
