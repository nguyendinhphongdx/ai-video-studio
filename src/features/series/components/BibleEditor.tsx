'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EXPRESSIONS } from '@/core/character/expressions';
import type { SeriesBible } from '@/core/domain';
import { useJob } from '@/features/app';
import { errorMessage } from '@/lib/api/client';

import { seriesApi } from '../services/series.api';
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

const mediaSrc = (rel: string) => `/api/v1/media/${rel.split('/').map(encodeURIComponent).join('/')}`;

/** Reference pictures of the recurring characters: every scene picture is made to match them. */
function CharacterSheet({ value, onChange }: { value: SeriesBible; onChange: (v: SeriesBible) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const add = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { path } = await seriesApi.uploadCharacter(file);
      onChange({ ...value, characterAssets: [...value.characterAssets, path] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ảnh');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {value.characterAssets.map((p) => (
          <div key={p} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaSrc(p)} alt="Ảnh nhân vật" className="h-28 w-28 rounded-md border object-cover" />
            <button type="button" className="absolute right-1 top-1 rounded bg-background/90 px-1.5 text-caption" onClick={() => onChange({ ...value, characterAssets: value.characterAssets.filter((x) => x !== p) })}>
              Xoá
            </button>
          </div>
        ))}
        {value.characterAssets.length < 4 ? (
          <label className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-md border border-dashed text-center text-caption text-muted-foreground">
            {busy ? 'Đang tải…' : '+ Thêm ảnh nhân vật'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(e) => { void add(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        ) : null}
      </div>
      {error ? <p className="text-caption text-destructive">{error}</p> : null}
      <Textarea id="bible-characters" rows={3} maxLength={2000} value={value.characters} onChange={(e) => onChange({ ...value, characters: e.target.value })} placeholder="Tên và đặc điểm cố định, ví dụ: Na Tra: bé trai tóc búi hai bên, áo đỏ, vòng vàng trên cổ tay." />
    </div>
  );
}

const SPRITE_SLOTS: { key: string; label: string }[] = [
  { key: 'neutral', label: 'Bình thường (bắt buộc)' },
  { key: 'talk', label: 'Mở miệng nói' },
  { key: 'blink', label: 'Nhắm mắt' },
  { key: 'happy', label: 'Vui' },
  { key: 'angry', label: 'Giận' },
  { key: 'sad', label: 'Buồn' },
  { key: 'surprised', label: 'Ngạc nhiên' },
];

/** Whole-body PNG sprites (transparent background) of the character that acts in "Nhân vật diễn" scenes. */
function SpriteSheet({ value, onChange }: { value: SeriesBible; onChange: (v: SeriesBible) => void }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const put = async (key: string, file: File | undefined) => {
    if (!file) return;
    setBusy(key);
    setError('');
    try {
      const { path } = await seriesApi.uploadCharacter(file);
      onChange({ ...value, characterSprites: { ...value.characterSprites, [key]: path } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ảnh');
    } finally {
      setBusy('');
    }
  };
  const drop = (key: string) => {
    const next = { ...value.characterSprites };
    delete next[key];
    onChange({ ...value, characterSprites: next });
  };

  // AI expression set from the reference picture: a worker job; when it is done the new sprites join the ones already set.
  const [jobId, setJobId] = useState<string | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const reference = value.characterAssets[0];
  const missing = EXPRESSIONS.filter((e) => !value.characterSprites[e]).length;
  const job = useJob(jobId);
  const state = job.data?.state;
  useEffect(() => {
    if (!jobId || !state) return;
    if (state === 'failed') toast.error(job.data?.error ?? 'Chưa tạo được bộ biểu cảm. Thử lại nhé.');
    if (state === 'done') {
      const made = (job.data?.result as { sprites?: Record<string, string> } | null)?.sprites ?? {};
      const cur = latest.current;
      cur.onChange({ ...cur.value, characterSprites: { ...cur.value.characterSprites, ...made } });
      toast.success(`Đã tạo ${Object.keys(made).length} biểu cảm. Bấm Lưu để giữ lại.`);
    }
    if (state === 'done' || state === 'failed') setJobId(null);
  }, [jobId, state]); // eslint-disable-line react-hooks/exhaustive-deps
  const generate = async () => {
    if (!reference) return;
    setError('');
    try {
      setJobId((await seriesApi.generateSprites({ reference, existing: value.characterSprites })).id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const working = Boolean(jobId);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={!reference || missing === 0 || working} onClick={() => void generate()}>
          {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {working ? `Đang vẽ… ${Math.round((job.data?.progress ?? 0) * 100)}%` : 'Sinh bộ biểu cảm từ ảnh chuẩn'}
        </Button>
        <p className="min-w-0 flex-1 text-caption text-muted-foreground">
          {reference ? (missing > 0 ? `Tạo ${missing} biểu cảm còn thiếu từ ảnh chuẩn đầu tiên, tính phí ${missing} ảnh AI (khoảng 20-40 giây mỗi ảnh). Ảnh nền được tách tự động; xem lại rồi bấm Lưu.` : 'Đã đủ 7 biểu cảm.') : 'Tải ảnh chuẩn ở Bảng nhân vật phía trên trước, rồi mới sinh được bộ biểu cảm.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {SPRITE_SLOTS.map(({ key, label }) => {
          const path = value.characterSprites[key];
          return (
            <div key={key} className="flex w-28 flex-col gap-1">
              <label className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed bg-[repeating-conic-gradient(#eee_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] text-center text-caption text-muted-foreground">
                {path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaSrc(path)} alt={label} className="h-full w-full object-contain" />
                ) : busy === key ? (
                  'Đang tải…'
                ) : (
                  '+ Tải ảnh'
                )}
                <input type="file" accept="image/png,image/webp" className="sr-only" disabled={busy !== ''} onChange={(e) => { void put(key, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <div className="flex items-center justify-between text-caption">
                <span>{label}</span>
                {path ? <button type="button" onClick={() => drop(key)}>Xoá</button> : null}
              </div>
            </div>
          );
        })}
      </div>
      {error ? <p className="text-caption text-destructive">{error}</p> : null}
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
      <Field id="bible-characters" label="Bảng nhân vật (ảnh chuẩn)" hint="Tối đa 4 ảnh. Mọi ảnh cảnh được tạo theo các ảnh này để nhân vật không đổi giữa các cảnh. Đổi ảnh thì các cảnh cần tạo lại ảnh.">
        <CharacterSheet value={value} onChange={onChange} />
      </Field>
      <Field id="bible-sprites" label="Nhân vật diễn (ảnh toàn thân, nền trong suốt)" hint="Dùng cho cảnh @remotion/puppet: nhân vật đi vào, nói, nháy mắt, đổi biểu cảm. Cần ít nhất ảnh Bình thường; thêm ảnh Mở miệng và Nhắm mắt để nhân vật nói và nháy mắt.">
        <SpriteSheet value={value} onChange={onChange} />
      </Field>
      <Field id="bible-avoid" label="Tránh" hint="Từ ngắn (tối đa 3 chữ) sẽ bị chặn tự động nếu xuất hiện trong kịch bản.">
        <ListInput id="bible-avoid" value={value.avoid} onChange={(v) => set('avoid', v)} placeholder="Gõ điều cấm rồi Enter" />
      </Field>
      <Field id="bible-instructions" label="Hướng dẫn viết (Markdown)" hint="Như một AGENTS.md cho chương trình: giọng điệu, cách xưng hô, nhịp kể, cách nối tiếp giữa các tập.">
        <Textarea id="bible-instructions" rows={9} maxLength={20000} value={value.instructions} onChange={(e) => set('instructions', e.target.value)} className="font-mono text-small" />
      </Field>
    </div>
  );
}
