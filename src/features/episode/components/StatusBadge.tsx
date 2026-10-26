import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { TONE_CLASS, type StatusInfo } from '../lib/status';

export function StatusBadge({ status, className }: { status: StatusInfo; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold', TONE_CLASS[status.tone], className)}>
      {status.tone === 'info' ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
      {status.label}
    </span>
  );
}
