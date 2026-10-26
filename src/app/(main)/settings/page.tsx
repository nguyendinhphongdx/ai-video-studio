import type { Metadata } from 'next';

import { PageHeader } from '@/components/common/PageHeader';
import { LlmSettingsCard, TtsSettingsCard } from '@/features/settings';

export const metadata: Metadata = { title: 'Cài đặt' };

export default function SettingsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Cài đặt" description="Chọn model AI viết kịch bản và giọng đọc dựng video. Đổi nhà cung cấp không cần sửa code, có hiệu lực ngay cả với worker." />
      <LlmSettingsCard />
      <TtsSettingsCard />
    </div>
  );
}
