import type { ReactNode } from 'react';

import { MainSidebar, MainTopbar, MobileTabBar } from '@/components/layout/main';
import { AssistantDock } from '@/features/assistant/components/AssistantDock';

/** Sidebar + topbar shell shared by every page in the (main) group. On phones the sidebar becomes a bottom tab bar. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <MainSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MainTopbar />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-12 md:py-10 md:pb-10">{children}</div>
        </main>
      </div>
      <MobileTabBar />
      <AssistantDock />
    </div>
  );
}
