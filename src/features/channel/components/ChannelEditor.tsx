'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Music, Play, Square, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/constants/routes';
import { BRAND_FONT_IDS, BRAND_FONTS, MEDIA_MUSIC_PREFIX } from '@/core/domain/catalog';
import { queryKeys, useAppConfig } from '@/features/app';
import { useSkills } from '@/features/episode/hooks/use-episode';
import { musicSrc } from '@/features/episode/lib/preview';
import { episodeApi } from '@/features/episode/services/episode.api';
import { errorMessage } from '@/lib/api/client';

import { useChannelAction } from '../hooks/use-channels';
import { channelApi, toInput, type ChannelInput, type ChannelView } from '../services/channel.api';

import { BrandPreview } from './BrandPreview';
import { HashtagInput } from './HashtagInput';
import { PaletteEditor } from './PaletteEditor';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <h2 className="text-title font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/** Plays a short sample: a voice line or the music track. */
function useSample() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = async (key: string, getUrl: () => Promise<string | null>) => {
    audio.current?.pause();
    if (playing === key) return setPlaying(null);
    try {
      const url = await getUrl();
      if (!url) return;
      audio.current = new Audio(url.startsWith('/') || url.startsWith('http') ? url : `/${url}`);
      audio.current.onended = () => setPlaying(null);
      setPlaying(key);
      await audio.current.play();
    } catch (e) {
      setPlaying(null);
      toast.error(errorMessage(e));
    }
  };
  return { playing, toggle };
}

export function ChannelEditor({ channel }: { channel: ChannelView }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: config } = useAppConfig();
  const { data: skills } = useSkills();
  const [form, setForm] = useState<ChannelInput>(toInput(channel));
  const [baseline, setBaseline] = useState(JSON.stringify(toInput(channel)));
  const dirty = JSON.stringify(form) !== baseline;
  const logoInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const sample = useSample();

  // Uploads change the channel on the server; keep unrelated edits.
  useEffect(() => {
    const server = toInput(channel);
    setForm((f) => ({ ...f, music: server.music }));
    setBaseline((b) => JSON.stringify({ ...(JSON.parse(b) as ChannelInput), music: server.music }));
  }, [channel.music]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ChannelInput>(k: K, v: ChannelInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useChannelAction(channel.id, () => channelApi.update(channel.id, form), 'Đã lưu kênh');
  const logo = useChannelAction(channel.id, (f: File) => channelApi.uploadLogo(channel.id, f), 'Đã đổi logo');
  const music = useChannelAction(channel.id, (f: File) => channelApi.uploadMusic(channel.id, f), 'Đã tải nhạc nền lên');
  const remove = useMutation({
    mutationFn: () => channelApi.remove(channel.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.channels });
      toast.success('Đã xoá kênh');
      router.push(ROUTES.channels);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const tracks = config?.musicTracks ?? [];
  const uploaded = form.music.startsWith(MEDIA_MUSIC_PREFIX);

  return (
    <div className="grid items-start gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-6">
        <Card title="Thông tin kênh">
          <Field id="ch-name" label="Tên kênh">
            <Input id="ch-name" className="h-11" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={60} />
          </Field>
          <Field id="ch-desc" label="Mô tả" hint="Kênh nói về gì. AI đọc phần này mỗi khi viết kịch bản.">
            <Textarea id="ch-desc" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={500} />
          </Field>
          <Field id="ch-aud" label="Khán giả" hint="Độ tuổi, đặc điểm. VD: trẻ 2-6 tuổi, khán giả Việt Nam">
            <Input id="ch-aud" className="h-11" value={form.audience} onChange={(e) => set('audience', e.target.value)} maxLength={300} />
          </Field>
          <Field id="ch-style" label="Giọng văn" hint="Cách xưng hô, độ dài câu, cảm xúc">
            <Textarea id="ch-style" rows={3} value={form.style} onChange={(e) => set('style', e.target.value)} maxLength={500} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ch-outro" label="Lời chào cuối video">
              <Input id="ch-outro" value={form.outroText} onChange={(e) => set('outroText', e.target.value)} maxLength={80} />
            </Field>
            <Field id="ch-sub" label="Chữ trên nút đăng ký">
              <Input id="ch-sub" value={form.subscribeText} onChange={(e) => set('subscribeText', e.target.value)} maxLength={40} />
            </Field>
          </div>
          <Field id="ch-tags" label="Hashtag mặc định" hint="Luôn được thêm vào nội dung đăng bài">
            <HashtagInput id="ch-tags" value={form.hashtags} onChange={(v) => set('hashtags', v)} />
          </Field>
          <Field id="ch-skill" label="Kiểu video mặc định (skill)">
            <Select value={form.defaultSkillId ?? 'none'} onValueChange={(v) => set('defaultSkillId', v === 'none' ? null : v)}>
              <SelectTrigger id="ch-skill" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa chọn</SelectItem>
                {(skills ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card title="Thương hiệu">
          <div className="flex flex-wrap items-center gap-4">
            {channel.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.logoUrl} alt="Logo hiện tại" className="size-20 rounded-2xl border object-cover shadow-card" />
            ) : (
              <span className="grid size-20 place-items-center rounded-2xl text-h3 font-extrabold text-white" style={{ background: form.palette[0] }}>
                {form.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-small font-semibold">Logo</span>
              <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && logo.mutate(e.target.files[0])} />
              <Button variant="outline" onClick={() => logoInput.current?.click()} disabled={logo.isPending}>
                {logo.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
                Tải logo lên
              </Button>
              <span className="text-caption text-muted-foreground">Ảnh vuông PNG/JPG/WEBP, tối đa 4MB. Lưu ngay khi tải.</span>
            </div>
          </div>
          <Field id="ch-palette" label="Bảng màu" hint="Màu đầu tiên là màu chính; AI chọn màu cảnh hài hoà với bảng màu.">
            <PaletteEditor value={form.palette} onChange={(v) => set('palette', v)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ch-font" label="Font tiêu đề">
              <Select value={form.font} onValueChange={(v) => set('font', v as ChannelInput['font'])}>
                <SelectTrigger id="ch-font" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_FONT_IDS.map((f) => (
                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                      {BRAND_FONTS[f].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="ch-voice" label="Giọng đọc mặc định">
              <div className="flex gap-2">
                <Select value={form.voice} onValueChange={(v) => set('voice', v as ChannelInput['voice'])}>
                  <SelectTrigger id="ch-voice" className="h-11 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(config?.voices ?? {}).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label="Nghe thử giọng"
                  disabled={!config?.tts}
                  onClick={() => sample.toggle('voice', async () => (await episodeApi.previewVoice(`Xin chào, đây là kênh ${form.name || 'của bạn'}!`, form.voice)).url)}
                >
                  {sample.playing === 'voice' ? <Square aria-hidden /> : <Play aria-hidden />}
                </Button>
              </div>
            </Field>
          </div>
          <Field id="ch-music" label="Nhạc nền mặc định">
            <div className="flex flex-wrap gap-2">
              <Select value={form.music} onValueChange={(v) => set('music', v)}>
                <SelectTrigger id="ch-music" className="h-11 min-w-56 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không dùng nhạc nền</SelectItem>
                  {tracks.map((t) => (
                    <SelectItem key={t} value={t}>
                      Thư viện: {t}
                    </SelectItem>
                  ))}
                  {uploaded ? <SelectItem value={form.music}>Nhạc đã tải lên</SelectItem> : null}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="size-11" aria-label="Nghe thử nhạc" disabled={form.music === 'none'} onClick={() => sample.toggle('music', async () => (uploaded ? musicSrc(form.music) : `/audio/${form.music}`))}>
                {sample.playing === 'music' ? <Square aria-hidden /> : <Play aria-hidden />}
              </Button>
              <input ref={musicInput} type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" className="hidden" onChange={(e) => e.target.files?.[0] && music.mutate(e.target.files[0])} />
              <Button variant="outline" className="h-11" onClick={() => musicInput.current?.click()} disabled={music.isPending}>
                {music.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Music aria-hidden />}
                Tải nhạc lên
              </Button>
            </div>
          </Field>
        </Card>

        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-destructive/30 bg-card p-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-title font-bold">Xoá kênh</h2>
            <p className="text-small text-muted-foreground">Chỉ xoá được kênh chưa có video nào.</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                <Trash2 aria-hidden />
                Xoá kênh
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xoá kênh {channel.name}?</DialogTitle>
                <DialogDescription>Logo, nhạc và cài đặt của kênh sẽ bị xoá. Không hoàn tác được.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Huỷ</Button>
                </DialogClose>
                <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
                  Xoá kênh
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </div>

      <aside className="flex flex-col gap-3 rounded-2xl border bg-card p-5 lg:sticky lg:top-4">
        <h2 className="text-title font-bold">Xem trước với thương hiệu đang sửa</h2>
        <p className="text-caption text-muted-foreground">Chạy trực tiếp bằng @remotion/player: đổi màu, font, câu chào là thấy ngay, chưa cần lưu.</p>
        <BrandPreview input={form} logoUrl={channel.logoUrl} sampleTitle="Bé học màu sắc" />
      </aside>

      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-12">
            <span className="text-small font-semibold text-warning">● Có thay đổi chưa lưu</span>
            <Button variant="ghost" className="ml-auto" onClick={() => setForm(JSON.parse(baseline) as ChannelInput)}>
              Bỏ thay đổi
            </Button>
            <Button
              className="font-bold"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(undefined, {
                  onSuccess: (c) => {
                    setForm(toInput(c));
                    setBaseline(JSON.stringify(toInput(c)));
                  },
                })
              }
            >
              {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Lưu thay đổi
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
