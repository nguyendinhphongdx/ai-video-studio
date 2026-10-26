'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SeriesBible } from '@/core/domain';

import { ListInput } from './ListInput';

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** The fixed part of the show: what the AI keeps the same in every episode. */
export function BibleEditor({ value, onChange }: { value: SeriesBible; onChange: (v: SeriesBible) => void }) {
  const set = <K extends keyof SeriesBible>(key: K, v: SeriesBible[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="flex flex-col gap-5">
      <Field id="bible-premise" label="Ý tưởng chương trình" hint="1-2 câu: chương trình nói về gì, vì sao khán giả thích xem.">
        <Textarea id="bible-premise" rows={3} maxLength={1000} value={value.premise} onChange={(e) => set('premise', e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="bible-host" label="Nhân vật dẫn" hint="Tên và tính cách, ví dụ: Gà Bông, vui vẻ, hay hỏi lại bé.">
          <Input id="bible-host" maxLength={200} value={value.host} onChange={(e) => set('host', e.target.value)} />
        </Field>
        <Field id="bible-catch" label="Câu cửa miệng (bắt buộc có trong mỗi tập)" hint="Hệ thống kiểm tra từng câu trước khi cho duyệt.">
          <ListInput id="bible-catch" value={value.catchphrases} onChange={(v) => set('catchphrases', v)} max={10} placeholder="Gõ câu rồi Enter" />
        </Field>
      </div>
      <Field id="bible-avoid" label="Tránh" hint="Từ ngắn (tối đa 3 chữ) sẽ bị chặn tự động nếu xuất hiện trong kịch bản.">
        <ListInput id="bible-avoid" value={value.avoid} onChange={(v) => set('avoid', v)} placeholder="Gõ điều cấm rồi Enter" />
      </Field>
      <Field id="bible-instructions" label="Hướng dẫn viết (Markdown)" hint="Như một AGENTS.md cho chương trình: giọng điệu, cách xưng hô, nhịp kể, cách nối tiếp giữa các tập.">
        <Textarea id="bible-instructions" rows={9} maxLength={20000} value={value.instructions} onChange={(e) => set('instructions', e.target.value)} className="font-mono text-small" />
      </Field>
    </div>
  );
}
