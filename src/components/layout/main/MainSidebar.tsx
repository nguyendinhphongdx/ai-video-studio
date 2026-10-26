'use client';

import { Play } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAppConfig } from '@/features/app';
import { cn } from '@/lib/utils';

import { isActive, MAIN_NAV, SETUP_NAV, type NavItem } from './nav-items';

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg px-3 text-small transition-colors',
        active ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white',
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

/** Fixed dark sidebar (design canvas "AI Video Studio — thiết kế lại"). */
export function MainSidebar() {
  const pathname = usePathname();
  const { data: config } = useAppConfig();
  return (
    <nav aria-label="Điều hướng chính" className="hidden w-60 shrink-0 flex-col gap-1 bg-sidebar px-4 py-6 md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-6">
        <span className="grid size-8 place-items-center rounded-[9px] bg-sidebar-primary">
          <Play className="size-[18px] fill-white text-white" aria-hidden />
        </span>
        <span className="text-[16px] font-bold text-white">AI Video Studio</span>
      </Link>
      {MAIN_NAV.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
      <div className="px-3 pb-1 pt-5 text-caption font-semibold uppercase tracking-wider text-slate-400">Thiết lập</div>
      {SETUP_NAV.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
      <div className="mt-auto rounded-xl bg-sidebar-accent px-3 py-3.5 text-caption leading-relaxed text-sidebar-foreground">
        <div className="mb-1 font-semibold text-white">{config ? (config.llm.ready ? `AI: ${config.llm.providerLabel} · ${config.llm.model}` : 'AI: chưa cài đặt') : 'Đang tải…'}</div>
        <div>{config ? `Giọng đọc: ${config.tts ? 'Edge TTS' : 'tắt'} · ${config.activeJobs ? `${config.activeJobs} việc đang chạy` : 'không có việc chạy'}` : ''}</div>
      </div>
    </nav>
  );
}
