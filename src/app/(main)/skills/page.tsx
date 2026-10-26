import type { Metadata } from 'next';

import { SkillListView } from '@/features/skill/views/SkillViews';

export const metadata: Metadata = { title: 'Skills' };

export default function SkillsPage() {
  return <SkillListView />;
}
