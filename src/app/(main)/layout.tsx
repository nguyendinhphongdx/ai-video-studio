import type { ReactNode } from 'react';

import { MainSidebar, MainTopbar } from '@/components/layout/main';

/** Sidebar + topbar shell shared by every page in the (main) group. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <MainSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MainTopbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-12 md:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
