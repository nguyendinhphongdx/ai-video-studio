'use client';

import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ToolField } from '@/core/tools/tool';
import { cn } from '@/lib/utils';

const SWATCHES = ['#FF6B6B', '#FF9F43', '#FECA57', '#1DD1A1', '#48DBFB', '#2F8BE6', '#5F27CD', '#A55EEA', '#FF78C4', '#10AC84'];

/** One editor control, chosen by the block's declared field kind. */
export function FieldInput({ field, value, onChange, id }: { field: ToolField; value: unknown; onChange: (v: unknown) => void; id: string }) {
  const label = (
    <Label htmlFor={id} className="text-small">
      {field.label}
    </Label>
  );
  switch (field.kind) {
    case 'textarea':
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <Textarea id={id} rows={3} value={String(value ?? '')} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'count': {
      const n = Number(value ?? 1);
      const min = field.min ?? 1;
      const max = field.max ?? 10;
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <div className="flex w-fit items-center rounded-lg border">
            <Button variant="ghost" size="icon" aria-label="Bớt" onClick={() => onChange(Math.max(min, n - 1))} disabled={n <= min}>
              <Minus aria-hidden />
            </Button>
            <output id={id} className="min-w-10 text-center font-bold tabular-nums">
              {n}
            </output>
            <Button variant="ghost" size="icon" aria-label="Thêm" onClick={() => onChange(Math.min(max, n + 1))} disabled={n >= max}>
              <Plus aria-hidden />
            </Button>
          </div>
        </div>
      );
    }
    case 'color': {
      const c = String(value ?? '#48DBFB');
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <div className="flex flex-wrap items-center gap-1.5">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Màu ${s}`}
                aria-pressed={s.toLowerCase() === c.toLowerCase()}
                onClick={() => onChange(s)}
                className={cn('size-7 rounded-full border-2 border-card ring-1 ring-border', s.toLowerCase() === c.toLowerCase() && 'ring-2 ring-foreground')}
                style={{ background: s }}
              />
            ))}
            <input id={id} type="color" value={c} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-8 cursor-pointer rounded border-0 bg-transparent" aria-label="Màu khác" />
          </div>
        </div>
      );
    }
    case 'choice':
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <Select value={String(value ?? '')} onValueChange={onChange}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'emoji':
    case 'text':
    default:
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <Input id={id} value={String(value ?? '')} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} className={field.kind === 'emoji' ? 'w-24 text-center text-xl' : undefined} />
        </div>
      );
  }
}
