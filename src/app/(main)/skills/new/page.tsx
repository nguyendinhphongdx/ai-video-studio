import type { Metadata } from 'next';

import { SkillEditorView } from '@/features/skill/views/SkillViews';

export const metadata: Metadata = { title: 'Soạn skill mới' };

export default function Page() {
  return <SkillEditorView id={null} />;
}
