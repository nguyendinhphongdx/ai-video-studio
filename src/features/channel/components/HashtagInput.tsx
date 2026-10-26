'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';

export function HashtagInput({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tags = draft
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));
    if (tags.length) onChange([...new Set([...value, ...tags])].slice(0, 10));
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring">
      {value.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-caption font-semibold text-accent-foreground">
          {t}
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
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={value.length ? '' : '#tenkenh, Enter để thêm'}
        className="h-8 min-w-32 flex-1 border-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
