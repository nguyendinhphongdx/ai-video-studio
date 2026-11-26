import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AssistantDock } from '@/features/assistant/components/AssistantDock';

import './v2.css';

export const metadata: Metadata = { title: { default: 'Studio v2', template: '%s · Studio v2' } };

/** v2 lives beside v1 under /v2 while it is rebuilt; every v2 style is scoped to this wrapper. */
export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="v2">
      {children}
      {/* The one AI assistant ("Đạo diễn"), on every page; it works on the project the page is about. */}
      <AssistantDock />
    </div>
  );
}
