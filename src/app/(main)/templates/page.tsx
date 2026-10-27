import type { Metadata } from 'next';

import { TemplatesView } from '@/features/templates/views/TemplatesView';

export const metadata: Metadata = { title: 'Thư viện mẫu' };

export default function TemplatesPage() {
  return <TemplatesView />;
}
