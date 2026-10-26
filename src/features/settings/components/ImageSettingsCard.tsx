'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/features/app';
import { errorMessage } from '@/lib/api/client';
import { IMAGE_PROVIDER_IDS, IMAGE_PROVIDERS, type ImageProviderId } from '@/server/modules/settings/settings.types';

import { settingsApi } from '../services/settings.service';

const KEY = ['settings', 'image'] as const;

/** Provider for the pictures of @remotion/vox scenes. Without it, other video types are unaffected. */
export function ImageSettingsCard() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: settingsApi.image });
  const save = useMutation({
    mutationFn: settingsApi.saveImage,
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      void qc.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
  const test = useMutation({ mutationFn: settingsApi.testImage });
  const saved = query.data;
  const [form, setForm] = useState<{ provider: ImageProviderId; model: string; apiKey: string } | null>(null);
  useEffect(() => {
    if (saved) setForm({ provider: saved.provider, model: saved.model, apiKey: '' });
  }, [saved]);
  if (!saved || !form) return <Skeleton className="h-72 rounded-2xl" />;

  const preset = IMAGE_PROVIDERS[form.provider];
  const same = form.provider === saved.provider;
  const keyNote = same && saved.hasKey ? (saved.keySource === 'llm' ? 'Đang dùng chung key với model viết kịch bản. Nhập key riêng để thay.' : saved.keySource === 'env' ? 'Đang dùng key trong file .env. Nhập key mới để thay.' : 'Đã lưu key. Để trống để giữ nguyên.') : 'Key được lưu riêng trên máy này (data/settings.json).';
  const onProvider = (provider: ImageProviderId) => setForm({ provider, model: provider === saved.provider ? saved.model : IMAGE_PROVIDERS[provider].defaultModel, apiKey: '' });

  return (
    <section aria-labelledby="img-h" className="flex flex-col gap-5 rounded-2xl border bg-card p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="img-h" className="text-title font-bold">
          Tạo ảnh AI (Nano Banana / Gemini)
        </h2>
        <span className={saved.ready ? 'rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-success' : 'rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-semibold text-warning'}>{saved.ready ? 'Đang dùng' : 'Chưa sẵn sàng'}</span>
      </div>
      <p className="text-small text-muted-foreground">Dùng cho các cảnh có ảnh AI (@remotion/vox và @remotion/picture): AI tạo một ảnh cho mỗi cảnh lúc sản xuất; chuyển động, chú thích, giọng đọc và nhạc do studio dựng. Nano Banana là tên gọi của model gemini-2.5-flash-image, dùng Google API key (lấy ở AI Studio). Ảnh giống nhau được dùng lại, không tính tiền hai lần.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="img-provider">Nhà cung cấp</Label>
          <Select value={form.provider} onValueChange={(v) => onProvider(v as ImageProviderId)}>
            <SelectTrigger id="img-provider" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_PROVIDER_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {IMAGE_PROVIDERS[id].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="img-model">Model ảnh</Label>
          <Input id="img-model" list="img-models" className="h-11" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} autoComplete="off" />
          <datalist id="img-models">
            {preset.models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="img-key">API key</Label>
        <div className="flex gap-2.5">
          <Input id="img-key" type="password" className="h-11 flex-1" value={form.apiKey} placeholder={same && saved.hasKey ? saved.apiKey : 'Dán API key vào đây'} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} autoComplete="off" />
          {same && saved.keySource === 'settings' ? (
            <Button variant="outline" className="h-11" disabled={save.isPending} onClick={() => save.mutate({ clearKey: true }, { onSuccess: () => toast.success('Đã xoá API key') })}>
              Xoá key
            </Button>
          ) : null}
        </div>
        <span className="text-caption text-muted-foreground">
          {keyNote}{' '}
          Lấy key ở{' '}
          <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
            {new URL(preset.keyUrl).host}
          </a>
          .
        </span>
      </div>
      {test.data ? (
        test.data.ok ? (
          <div role="status" className="flex items-center gap-2.5 rounded-lg bg-success-soft px-3.5 py-3 text-small font-semibold text-success">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            Tạo ảnh thành công với {test.data.model} ({Math.round(test.data.bytes / 1024)} KB)
          </div>
        ) : (
          <div role="alert" className="flex items-center gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-small font-semibold text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {test.data.error}
          </div>
        )
      ) : null}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="outline" className="h-11" disabled={test.isPending} onClick={() => test.mutate(form, { onError: (e) => toast.error(errorMessage(e)) })} title="Tạo thử một ảnh quả táo (tính phí một ảnh)">
          {test.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Thử tạo ảnh
        </Button>
        <Button
          className="h-11 px-6 font-bold"
          disabled={save.isPending}
          onClick={() => save.mutate(form, { onSuccess: (s) => toast.success(s.ready ? 'Đã lưu. Tạo ảnh sẵn sàng.' : 'Đã lưu, nhưng còn thiếu API key.'), onError: (e) => toast.error(errorMessage(e)) })}
        >
          {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Lưu cài đặt
        </Button>
      </div>
    </section>
  );
}
