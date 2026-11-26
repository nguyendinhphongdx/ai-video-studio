import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AssistantDock } from '@/features/assistant/components/AssistantDock';

import './v2.css';

export const metadata: Metadata = { title: { default: 'AI Video Studio', template: '%s · AI Video Studio' } };

/** The studio shell: every page's styles are scoped to the .v2 wrapper (design system "Cut"). */
export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="v2">
      {children}
      {/* The one AI assistant ("Đạo diễn"), on every page; it works on the project the page is about. */}
      <AssistantDock />
    </div>
  );
}
