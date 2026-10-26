'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CHIPS = ['Lời đọc vui hơn', 'Ngắn gọn hơn', 'Thêm 1 cảnh', 'Màu sắc tươi hơn', 'Tiêu đề YouTube hấp dẫn hơn'];

export function ReviseBar({ onRevise, pending, disabled }: { onRevise: (feedback: string) => void; pending: boolean; disabled?: boolean }) {
  const [text, setText] = useState('');
  const submit = () => text.trim() && onRevise(text.trim());
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 rounded-xl border bg-card p-1.5 pl-3.5 focus-within:ring-2 focus-within:ring-ring">
        <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
        <label htmlFor="revise" className="sr-only">
          Nhờ AI sửa kịch bản
        </label>
        <Input
          id="revise"
          value={text}
          disabled={disabled || pending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Nhờ AI sửa, VD: thêm 2 cảnh về con mèo, lời đọc vui hơn"
          className="border-0 shadow-none focus-visible:ring-0"
        />
        <Button onClick={submit} disabled={disabled || pending || !text.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Sửa
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button key={c} type="button" disabled={disabled} onClick={() => setText((t) => (t ? `${t}, ${c.toLowerCase()}` : c))} className="min-h-8 rounded-full bg-muted px-3 text-caption text-slate-700 hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
