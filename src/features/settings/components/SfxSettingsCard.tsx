'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { errorMessage } from '@/lib/api/client';

import { settingsApi } from '../services/settings.service';

const KEY = ['settings', 'sfx'] as const;

/** Sound effects laid over the finished video (sweeps between scenes, a thud on a stamp...). Free, made on this machine. */
export function SfxSettingsCard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: KEY, queryFn: settingsApi.sfx });
  const save = useMutation({
    mutationFn: settingsApi.saveSfx,
    onSuccess: (d) => qc.setQueryData(KEY, d),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data) return <Skeleton className="h-40 rounded-2xl" />;
  return (
    <section aria-labelledby="sfx-h" className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="sfx-h" className="text-title font-bold">
            Hiệu ứng âm thanh
          </h2>
          <p className="text-small text-muted-foreground">Tiếng lướt giữa các cảnh, tiếng đập khi zoom mạnh, dấu mộc, tiếng gõ chữ. Tạo ngay trên máy, miễn phí, đặt dưới giọng đọc và nhạc nền.</p>
        </div>
        <Switch checked={data.enabled} onCheckedChange={(enabled) => save.mutate({ enabled })} aria-label="Bật hiệu ứng âm thanh" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sfx-volume">Âm lượng chung: {Math.round(data.volume * 100)}%</Label>
        <input id="sfx-volume" type="range" min={0} max={100} step={5} disabled={!data.enabled} value={Math.round(data.volume * 100)} onChange={(e) => qc.setQueryData(KEY, { ...data, volume: Number(e.target.value) / 100 })} onPointerUp={(e) => save.mutate({ volume: Number((e.target as HTMLInputElement).value) / 100 })} onKeyUp={(e) => save.mutate({ volume: Number((e.target as HTMLInputElement).value) / 100 })} className="w-full accent-primary" />
      </div>
      <p className="text-caption text-muted-foreground">
        Muốn dùng âm thanh riêng? Thả file .mp3 hoặc .wav vào <code className="rounded bg-muted px-1">data/sfx/&lt;loại&gt;/</code> (loại: whoosh, whoosh-soft, impact, riser, pop, stamp, tick, sparkle, paper). Có nhiều file thì dùng luân phiên. Áp dụng cho lần sản xuất tiếp theo.
      </p>
    </section>
  );
}
