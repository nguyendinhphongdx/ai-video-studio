'use client';

import { Download, Ellipsis } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { isActive, MAIN_NAV, SETUP_NAV } from './nav-items';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
}

/** "Add to home screen": the install prompt where the browser offers one, a hint on iOS. */
function InstallHint() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (standalone) return null;
  if (event) {
    return (
      <button type="button" onClick={() => void event.prompt()} className="flex min-h-12 items-center gap-3 rounded-lg bg-sidebar-primary px-3 text-small font-semibold text-white">
        <Download className="size-[18px]" aria-hidden />
        Cài ứng dụng lên màn hình chính
      </button>
    );
  }
  return ios ? <p className="rounded-lg bg-sidebar-accent px-3 py-3 text-caption leading-relaxed">Để cài như ứng dụng: bấm nút Chia sẻ của Safari rồi chọn “Thêm vào Màn hình chính”.</p> : null;
}

/** Thumb-reach navigation for phones: the four daily screens plus a sheet for setup. Hidden from md up (the sidebar takes over). */
export function MobileTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const setupActive = SETUP_NAV.some((i) => isActive(pathname, i.href));
  const tab = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold';
  return (
    <nav aria-label="Điều hướng nhanh" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden">
      {MAIN_NAV.map((item) => {
        const active = isActive(pathname, item.href, item.also);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn(tab, active ? 'text-white' : 'text-slate-400')}>
            <item.icon className={cn('size-5', active && 'text-sidebar-primary-foreground')} aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button type="button" className={cn(tab, setupActive ? 'text-white' : 'text-slate-400')}>
            <Ellipsis className="size-5" aria-hidden />
            Thêm
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="gap-1 rounded-t-2xl border-0 bg-sidebar px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 text-sidebar-foreground">
          <SheetTitle className="px-2 pb-2 text-white">Thiết lập</SheetTitle>
          <SheetDescription className="sr-only">Chi phí và cài đặt</SheetDescription>
          {SETUP_NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={isActive(pathname, item.href) ? 'page' : undefined} className={cn('flex min-h-12 items-center gap-3 rounded-lg px-3 text-body', isActive(pathname, item.href) && 'bg-sidebar-accent font-semibold text-white')}>
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          ))}
          <div className="pt-2">
            <InstallHint />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
