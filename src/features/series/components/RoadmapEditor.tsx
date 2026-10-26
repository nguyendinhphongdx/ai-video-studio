'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface RoadmapRow {
  topic: string;
  goal: string;
}

/** Editable list of planned episodes, in teaching order. */
export function RoadmapEditor({ value, onChange }: { value: RoadmapRow[]; onChange: (v: RoadmapRow[]) => void }) {
  const set = (i: number, patch: Partial<RoadmapRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    const [row] = next.splice(i, 1);
    next.splice(i + dir, 0, row!);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2.5">
      <ol className="flex flex-col gap-2.5">
        {value.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-caption font-bold">{i + 1}</span>
            <Input aria-label={`Chủ đề tập ${i + 1}`} value={r.topic} maxLength={300} onChange={(e) => set(i, { topic: e.target.value })} placeholder="Chủ đề" className="min-w-48 flex-1" />
            <Input aria-label={`Mục tiêu tập ${i + 1}`} value={r.goal} maxLength={300} onChange={(e) => set(i, { goal: e.target.value })} placeholder="Mục tiêu (không bắt buộc)" className="min-w-48 flex-[1.2]" />
            <div className="flex">
              <Button type="button" variant="ghost" size="icon" className="size-10 md:size-8" aria-label={`Đưa tập ${i + 1} lên`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-10 md:size-8" aria-label={`Đưa tập ${i + 1} xuống`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-10 md:size-8" aria-label={`Xoá tập ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button type="button" variant="outline" className="w-fit" onClick={() => onChange([...value, { topic: '', goal: '' }])} disabled={value.length >= 60}>
        <Plus aria-hidden />
        Thêm tập
      </Button>
    </div>
  );
}
