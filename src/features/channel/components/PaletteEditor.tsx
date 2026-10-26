'use client';

import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Up to 6 brand colours; the first is the main one. */
export function PaletteEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const set = (i: number, c: string) => onChange(value.map((x, k) => (k === i ? c.toUpperCase() : x)));
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {value.map((c, i) => (
        <div key={i} className="group relative flex flex-col items-center gap-1">
          <label className="relative block size-12 cursor-pointer overflow-hidden rounded-xl border shadow-card" style={{ background: c }}>
            <span className="sr-only">{i === 0 ? 'Màu chính' : `Màu ${i + 1}`}</span>
            <input type="color" value={c} onChange={(e) => set(i, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <span className="font-mono text-[10px] text-muted-foreground">{i === 0 ? 'Chính' : c}</span>
          {value.length > 1 ? (
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Bỏ màu ${c}`} className="absolute -right-1.5 -top-1.5 hidden size-5 place-items-center rounded-full bg-foreground text-background group-hover:grid">
              <X className="size-3" aria-hidden />
            </button>
          ) : null}
        </div>
      ))}
      {value.length < 6 ? (
        <Button variant="outline" size="icon" className="size-12 rounded-xl border-dashed" onClick={() => onChange([...value, '#FFC53D'])} aria-label="Thêm màu">
          <Plus aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
