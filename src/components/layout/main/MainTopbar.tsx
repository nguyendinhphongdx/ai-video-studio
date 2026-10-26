'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants/routes';
import { useCurrentChannel } from '@/features/app';
import { cn } from '@/lib/utils';

function ChannelLogo({ name, url, className }: { name: string; url: string | null; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={cn('size-8 rounded-lg object-cover', className)} />
  ) : (
    <span className={cn('grid size-8 place-items-center rounded-lg bg-primary text-caption font-bold text-primary-foreground', className)}>{name.slice(0, 2).toUpperCase()}</span>
  );
}

function ChannelSwitcher() {
  const { channels, current, setChannelId } = useCurrentChannel();
  if (!current) return <span className="text-small text-muted-foreground">Chưa có kênh</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-11 gap-2.5 px-2.5" aria-label={`Kênh hiện tại: ${current.name}. Đổi kênh`}>
          <ChannelLogo name={current.name} url={current.logoUrl} />
          <span className="font-semibold">{current.name}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Đổi kênh</DropdownMenuLabel>
        {channels.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => setChannelId(c.id)} className="gap-2.5">
            <ChannelLogo name={c.name} url={c.logoUrl} className="size-6 rounded-md" />
            <span className="flex-1">{c.name}</span>
            {c.id === current.id ? <Check className="size-4" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.channels}>Quản lý kênh</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Top bar: current channel and the switcher. Pages put their own title in the content. */
export function MainTopbar() {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b bg-card px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:h-16 md:px-8 md:py-0">
      <ChannelSwitcher />
    </header>
  );
}
