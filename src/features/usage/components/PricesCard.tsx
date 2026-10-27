'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { usePrices, useUsageActions } from '../hooks/use-usage';
import { KIND_SHORT } from '../lib/format';
import type { PriceRow } from '../services/usage.api';

type Row = Omit<PriceRow, 'id'>;
const blank = (): Row => ({ kind: 'llm', provider: null, pattern: '', inputPerMtok: 0, outputPerMtok: 0, cachedPerMtok: 0, perUnit: 0, note: '' });

function Num({ label, value, onChange, step = 0.01 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-caption text-muted-foreground">{label}</Label>
      <Input type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9" />
    </div>
  );
}

/** Dollar prices used to turn tokens, pictures and voice into money. Editing never changes costs already recorded. */
export function PricesCard({ fxUsdVnd }: { fxUsdVnd: number }) {
  const { data } = usePrices();
  const { savePrices, resetPrices, saveFx } = useUsageActions();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fx, setFx] = useState(fxUsdVnd);
  useEffect(() => setRows(data ? data.map(({ id: _id, ...r }) => r) : null), [data]);
  useEffect(() => setFx(fxUsdVnd), [fxUsdVnd]);
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <details className="group rounded-2xl border bg-card p-5">
      <summary className="cursor-pointer list-none text-body font-bold marker:hidden">
        Bảng giá và tỷ giá <span className="ml-1 text-caption font-normal text-muted-foreground">(bấm để mở)</span>
      </summary>
      <div className="mt-4 flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-44 flex-col gap-1.5">
            <Label htmlFor="fx">Tỷ giá (1 USD = … ₫)</Label>
            <Input id="fx" type="number" min={1} value={fx} onChange={(e) => setFx(Number(e.target.value))} />
          </div>
          <Button variant="outline" disabled={saveFx.isPending || !(fx > 0) || fx === fxUsdVnd} onClick={() => saveFx.mutate(fx)}>
            Lưu tỷ giá
          </Button>
        </div>
        <p className="text-caption text-muted-foreground">
          Giá USD cho mỗi triệu token (văn bản, giọng) hoặc mỗi ảnh. Một model khớp dòng nào có chữ khớp nằm trong tên model; dòng cụ thể hơn thắng. Giá mặc định chỉ để tham khảo, hãy đối chiếu với trang giá của nhà cung cấp. Model không khớp dòng nào sẽ hiện "chưa có giá".
        </p>
        {rows ? (
          <ul className="flex flex-col gap-3">
            {rows.map((r, i) => (
              <li key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="flex flex-col gap-1">
                  <Label className="text-caption text-muted-foreground">Loại</Label>
                  <Select value={r.kind} onValueChange={(v) => set(i, { kind: v as Row['kind'] })}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['llm', 'image', 'tts'] as const).map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_SHORT[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-caption text-muted-foreground">Nhà cung cấp (trống = mọi nhà)</Label>
                  <Input className="h-9" value={r.provider ?? ''} placeholder="gemini" onChange={(e) => set(i, { provider: e.target.value.trim() || null })} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-caption text-muted-foreground">Tên model chứa…</Label>
                  <Input className="h-9" value={r.pattern} placeholder="flash" onChange={(e) => set(i, { pattern: e.target.value })} />
                </div>
                <Num label="Vào /1M token" value={r.inputPerMtok} onChange={(v) => set(i, { inputPerMtok: v })} />
                <Num label="Ra /1M token" value={r.outputPerMtok} onChange={(v) => set(i, { outputPerMtok: v })} />
                <Num label="Cache /1M token" value={r.cachedPerMtok} onChange={(v) => set(i, { cachedPerMtok: v })} />
                <Num label="Mỗi ảnh" value={r.perUnit} step={0.001} onChange={(v) => set(i, { perUnit: v })} />
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
                  <Label className="text-caption text-muted-foreground">Ghi chú</Label>
                  <Input className="h-9" value={r.note} onChange={(e) => set(i, { note: e.target.value })} />
                </div>
                <div className="flex items-end justify-end">
                  <Button variant="ghost" size="icon" aria-label="Xoá dòng giá" onClick={() => setRows((rs) => rs!.filter((_, j) => j !== i))}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Skeleton className="h-40 rounded-xl" />
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRows((rs) => [...(rs ?? []), blank()])}>
            <Plus aria-hidden />
            Thêm dòng giá
          </Button>
          <Button disabled={!rows || savePrices.isPending} onClick={() => savePrices.mutate(rows!)}>
            Lưu bảng giá
          </Button>
          <Button variant="ghost" disabled={resetPrices.isPending} onClick={() => resetPrices.mutate()}>
            <RotateCcw aria-hidden />
            Khôi phục giá mặc định
          </Button>
        </div>
      </div>
    </details>
  );
}
