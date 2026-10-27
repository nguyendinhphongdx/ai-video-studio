import type { Metadata } from 'next';

import { ToolsView } from '@/features/tool/views/ToolsView';

export const metadata: Metadata = { title: 'Công cụ dựng' };

export default function ToolsPage() {
  return <ToolsView />;
}
