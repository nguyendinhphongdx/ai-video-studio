'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';

/** Chips of short texts: Enter adds, the cross removes. */
export function ListInput({ id, value, onChange, placeholder, max = 30, normalize }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number; normalize?: (s: string) => string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = (normalize ? normalize(draft) : draft).trim();
    if (text && !value.includes(text)) onChange([...value, text].slice(0, max));
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring">
      {value.map((t) => (
        <span key={t} className="flex max-w-full items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-caption font-semibold text-accent-foreground">
          <span className="truncate">{t}</span>
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Bỏ ${t}`}>
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="h-8 min-w-40 flex-1 border-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
