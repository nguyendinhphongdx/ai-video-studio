'use client';

import { Check, Copy, Download, FileText, Loader2, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/constants/routes';
import { FORMATS } from '@/core/domain/catalog';
import type { PublishKit } from '@/core/domain/episode';
import { cn } from '@/lib/utils';

import { useEpisodeAction } from '../../hooks/use-episode';
import { downloadUrl, episodeApi, type EpisodeView } from '../../services/episode.api';

function CopyField({ id, label, value, onChange, rows = 2, max }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; max?: number }) {
  const [copied, setCopied] = useState(false);
  const n = [...value].length;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không copy được, hãy chọn chữ và copy tay');
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="flex-1 text-small font-semibold">
          {label}
        </label>
        {max ? <span className={cn('text-caption tabular-nums', n > max ? 'font-bold text-destructive' : 'text-muted-foreground')}>{n}/{max}</span> : null}
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'Đã copy' : 'Copy'}
        </Button>
      </div>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="bg-muted text-small focus-visible:bg-card" />
    </div>
  );
}

function PlatformCard({ name, mark, color, children }: { name: string; mark: string; color: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg text-small font-extrabold text-white" style={{ background: color }} aria-hidden>
          {mark}
        </span>
        <h3 className="text-title font-bold">{name}</h3>
      </div>
      {children}
    </section>
  );
}

/** Step 3: everything needed to post by hand on each platform. */
export function PublishStage({ view }: { view: EpisodeView }) {
  const id = view.episode.id;
  const [kit, setKit] = useState<PublishKit | null>(view.episode.publish);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setKit(view.episode.publish);
  }, [view.episode.publish, dirty]);
  const save = useEpisodeAction(
    id,
    () =>
      episodeApi.saveScript(id, {
        title: view.episode.title,
        scenes: view.episode.scenes.map(({ id: sid, slotId, block, locked, narration, props }) => ({ id: sid, slotId, block, locked, narration, props })),
        publish: kit,
      }),
    'Đã lưu nội dung đăng bài',
  );

  if (view.episode.status !== 'published') {
    return (
      <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
        <p className="font-semibold">Duyệt video trước khi đăng</p>
        <Button asChild className="mt-4">
          <Link href={`${ROUTES.episode(id)}/produce`}>Tới bước duyệt video</Link>
        </Button>
      </div>
    );
  }
  if (!kit) return null;
  const edit = (fn: (k: PublishKit) => PublishKit) => {
    setKit(fn(kit));
    setDirty(true);
  };
  const tiktokText = `${kit.tiktok.caption} ${kit.tiktok.hashtags.join(' ')}`.trim();
  const thumb = view.renders.find((r) => r.thumbnailUrl);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-5 rounded-2xl border bg-[linear-gradient(120deg,var(--indigo-50),#fff_70%)] p-6">
        <PartyPopper className="size-10 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 font-bold">Video đã sẵn sàng để đăng</h2>
          <p className="text-small text-muted-foreground">Tải bộ nội dung, copy chữ cho từng nền tảng (sửa được trước khi copy), rồi đăng tay.</p>
        </div>
        <Button asChild size="lg">
          <a href={downloadUrl.zip(id)}>
            <Download aria-hidden />
            Tải bộ nội dung (.zip)
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={downloadUrl.markdown(id)}>
            <FileText aria-hidden />
            dang-bai.md
          </a>
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <figure className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
          {thumb?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb.thumbnailUrl} alt="Ảnh thu nhỏ của video" className="aspect-video w-full rounded-lg object-cover" />
          ) : null}
          <figcaption className="flex items-center gap-2 text-small">
            <b>Ảnh thu nhỏ</b>
            {thumb?.thumbnailUrl ? (
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <a href={thumb.thumbnailUrl} download>
                  <Download aria-hidden />
                  Tải
                </a>
              </Button>
            ) : null}
          </figcaption>
        </figure>
        <div className="flex flex-wrap gap-3">
          {view.renders.map((r) => (
            <figure key={r.id} className={cn('flex flex-col gap-2 rounded-2xl border bg-card p-3', r.format === 'portrait' ? 'w-44' : 'min-w-64 flex-1')}>
              <video controls preload="metadata" poster={r.thumbnailUrl ?? undefined} src={r.url} className="w-full rounded-lg bg-black" />
              <figcaption className="flex items-center gap-2 text-caption">
                <b>{FORMATS[r.format].label}</b>
                <a href={r.url} download className="ml-auto font-semibold text-primary hover:underline">
                  Tải mp4
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PlatformCard name="YouTube" mark="▶" color="#FF0033">
          <CopyField id="yt-title" label="Tiêu đề" value={kit.youtube.title} max={70} onChange={(v) => edit((k) => ({ ...k, youtube: { ...k.youtube, title: v } }))} />
          <CopyField id="yt-desc" label="Mô tả" rows={6} value={kit.youtube.description} onChange={(v) => edit((k) => ({ ...k, youtube: { ...k.youtube, description: v } }))} />
          <CopyField id="yt-tags" label="Tags" rows={3} value={kit.youtube.tags.join(', ')} onChange={(v) => edit((k) => ({ ...k, youtube: { ...k.youtube, tags: v.split(',').map((x) => x.trim()).filter(Boolean) } }))} />
        </PlatformCard>
        <PlatformCard name="Facebook" mark="f" color="#1877F2">
          <CopyField id="fb-post" label="Bài đăng" rows={9} value={kit.facebook.post} onChange={(v) => edit((k) => ({ ...k, facebook: { post: v } }))} />
        </PlatformCard>
        <PlatformCard name="TikTok · Reels · Shorts" mark="♪" color="#111111">
          <CopyField
            id="tt-cap"
            label="Caption"
            rows={5}
            max={2200}
            value={tiktokText}
            onChange={(v) => edit((k) => ({ ...k, tiktok: { caption: v.replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim(), hashtags: v.match(/#[^\s#]+/g) ?? [] } }))}
          />
        </PlatformCard>
      </div>
      {dirty ? (
        <div className="flex items-center gap-3">
          <span className="text-small font-semibold text-warning">● Nội dung đăng bài đã sửa</span>
          <Button onClick={() => save.mutate(undefined, { onSuccess: () => setDirty(false) })} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Lưu nội dung
          </Button>
        </div>
      ) : null}
    </div>
  );
}
