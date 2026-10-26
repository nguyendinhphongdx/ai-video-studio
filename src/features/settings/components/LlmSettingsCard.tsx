'use client';

import { CircleAlert, CircleCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api/client';
import { EFFORTS, PROVIDER_IDS, PROVIDERS, type Effort, type LlmSettingsInput, type LlmTestResult, type ProviderId } from '@/server/modules/settings/settings.types';

import { useLlmSettings } from '../hooks/use-llm-settings';

const EFFORT_LABEL: Record<Effort, string> = { low: 'Thấp: nhanh, rẻ', medium: 'Vừa', high: 'Cao: kỹ hơn, chậm hơn' };

interface Form {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  effort: Effort;
}

function StatusBanner({ result }: { result: LlmTestResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <div role="status" className="flex items-center gap-2.5 rounded-lg bg-success-soft px-3.5 py-3 text-small font-semibold text-success">
      <CircleCheck className="size-4 shrink-0" aria-hidden />
      Kết nối thành công: {result.model}
    </div>
  ) : (
    <div role="alert" className="flex items-center gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-small font-semibold text-destructive">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {result.error}
    </div>
  );
}

export function LlmSettingsCard() {
  const { query, save, test } = useLlmSettings();
  const saved = query.data;
  const [form, setForm] = useState<Form | null>(null);
  const [result, setResult] = useState<LlmTestResult | null>(null);

  useEffect(() => {
    if (saved) setForm({ provider: saved.provider, model: saved.model, apiKey: '', baseUrl: saved.baseUrl, effort: saved.effort });
  }, [saved]);

  if (!saved || !form) return <Skeleton className="h-96 rounded-2xl" />;

  const preset = PROVIDERS[form.provider];
  const sameProvider = form.provider === saved.provider;
  const keyed = sameProvider && saved.hasKey;
  const input = (): LlmSettingsInput => ({
    provider: form.provider,
    model: form.model,
    apiKey: form.apiKey,
    effort: form.effort,
    ...(form.provider === 'openai-compatible' ? { baseUrl: form.baseUrl } : {}),
  });
  const set = (patch: Partial<Form>) => {
    setForm({ ...form, ...patch });
    setResult(null);
  };
  const onProvider = (provider: ProviderId) =>
    set({ provider, model: provider === saved.provider ? saved.model : PROVIDERS[provider].defaultModel, baseUrl: provider === saved.provider ? saved.baseUrl : PROVIDERS[provider].baseUrl, apiKey: '' });

  const onSave = () =>
    save.mutate(input(), {
      onSuccess: (s) => toast.success(s.ready ? 'Đã lưu. AI sẵn sàng.' : 'Đã lưu, nhưng còn thiếu key hoặc model.'),
      onError: (e) => toast.error(errorMessage(e)),
    });
  const onTest = () => test.mutate(input(), { onSuccess: setResult, onError: (e) => setResult({ ok: false, error: errorMessage(e) }) });
  const onClearKey = () => save.mutate({ clearKey: true }, { onSuccess: () => toast.success('Đã xoá API key') });

  return (
    <section aria-labelledby="llm-h" className="flex flex-col gap-5 rounded-2xl border bg-card p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="llm-h" className="text-title font-bold">
          Model viết kịch bản (LLM)
        </h2>
        <span className={saved.ready ? 'rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-success' : 'rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-semibold text-warning'}>
          {saved.ready ? 'Đang dùng' : 'Chưa sẵn sàng'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="llm-provider">Nhà cung cấp</Label>
        <Select value={form.provider} onValueChange={(v) => onProvider(v as ProviderId)}>
          <SelectTrigger id="llm-provider" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {PROVIDERS[id].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="llm-model">Model</Label>
        <Input id="llm-model" list="llm-models" className="h-11" value={form.model} placeholder={preset.defaultModel || 'VD: llama3.1'} onChange={(e) => set({ model: e.target.value })} autoComplete="off" />
        <datalist id="llm-models">
          {preset.models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      {form.provider === 'openai-compatible' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="llm-base">Base URL</Label>
          <Input id="llm-base" className="h-11" value={form.baseUrl} placeholder="http://localhost:11434/v1" onChange={(e) => set({ baseUrl: e.target.value })} />
          <span className="text-caption text-muted-foreground">Ollama: http://localhost:11434/v1 · LM Studio: http://localhost:1234/v1 · OpenRouter: https://openrouter.ai/api/v1</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="llm-key">API key{preset.needsKey ? '' : ' (không bắt buộc)'}</Label>
        <div className="flex gap-2.5">
          <Input
            id="llm-key"
            type="password"
            className="h-11 flex-1"
            value={form.apiKey}
            placeholder={keyed ? saved.apiKey : preset.needsKey ? 'Dán API key vào đây' : 'Để trống nếu máy chủ không cần'}
            onChange={(e) => set({ apiKey: e.target.value })}
            autoComplete="off"
          />
          {sameProvider && saved.keySource === 'settings' ? (
            <Button variant="outline" className="h-11" onClick={onClearKey} disabled={save.isPending}>
              Xoá key
            </Button>
          ) : null}
        </div>
        <span className="text-caption text-muted-foreground">
          {keyed
            ? saved.keySource === 'env'
              ? 'Đang dùng key trong file .env. Nhập key mới để thay.'
              : 'Đã lưu key. Để trống để giữ nguyên.'
            : 'Key được lưu riêng trên máy này (data/settings.json), không hiện lại dạng đầy đủ.'}
          {preset.keyUrl ? (
            <>
              {' '}
              Lấy key ở{' '}
              <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
                {new URL(preset.keyUrl).host}
              </a>
              .
            </>
          ) : null}
        </span>
      </div>

      {form.provider === 'anthropic' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="llm-effort">Mức suy nghĩ</Label>
          <Select value={form.effort} onValueChange={(v) => set({ effort: v as Effort })}>
            <SelectTrigger id="llm-effort" className="h-11 w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EFFORTS.map((e) => (
                <SelectItem key={e} value={e}>
                  {EFFORT_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <StatusBanner result={result} />

      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="outline" className="h-11" onClick={onTest} disabled={test.isPending}>
          {test.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Kiểm tra kết nối
        </Button>
        <Button className="h-11 px-6 font-bold" onClick={onSave} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Lưu cài đặt
        </Button>
      </div>
    </section>
  );
}
