import type { Metadata } from 'next';

import { ToolsView } from '@/features/tool/views/ToolsView';

export const metadata: Metadata = { title: 'Tools' };

export default function ToolsPage() {
  return <ToolsView />;
}
