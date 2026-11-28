'use client';

import { Check, Copy, Download, FileArchive, Film, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { FORMATS } from '@/core/domain/catalog';
import type { PublishKit } from '@/core/domain/episode';
import { useEpisode, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { downloadUrl, episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

import { Section } from '../../Section';
import { toSaveInput } from './save';

type Platform = 'youtube' | 'facebook' | 'tiktok';
const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
];
/** What each place accepts; the counter turns red past it. */
const LIMIT = { ytTitle: 100, ytDesc: 5000, ytTags: 500, fb: 63206, ttCaption: 2200 } as const;

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** Everything needed to post the video: preview and download it, fix the texts per platform, copy each one. */
export function PublishStep({ episodeId }: { episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  if (!v.episode.publish) return <p className="muted">Bộ xuất bản có sau khi duyệt video.</p>;
  return <Kit view={v} saved={v.episode.publish} />;
}

function Kit({ view: v, saved }: { view: EpisodeView; saved: PublishKit }) {
  const id = v.episode.id;
  const [draft, setDraft] = useState<PublishKit | null>(null);
  const [platform, setPlatform] = useState<Platform>('youtube');
  const kit = draft ?? saved;
  const save = useEpisodeAction(id, (publish: PublishKit) => episodeApi.saveScript(id, toSaveInput(v, { publish })), 'Đã lưu');
  const youtube = (patch: Partial<PublishKit['youtube']>) => setDraft({ ...kit, youtube: { ...kit.youtube, ...patch } });
  const tiktok = (patch: Partial<PublishKit['tiktok']>) => setDraft({ ...kit, tiktok: { ...kit.tiktok, ...patch } });

  const tags = kit.youtube.tags.join(',');
  const all = {
    youtube: `${kit.youtube.title}\n\n${kit.youtube.description}\n\n${tags}`,
    facebook: kit.facebook.post,
    tiktok: `${kit.tiktok.caption}\n${kit.tiktok.hashtags.join(' ')}`.trim(),
  }[platform];

  return (
    <div className="pubgrid">
      <aside className="pubmedia">
        <Section title="Video" flat>
          {v.renders.length === 0 ? (
            <p className="cap">Chưa có bản dựng nào.</p>
          ) : (
            v.renders.map((r, i) => (
              <div key={r.id} className="pubfile">
                {i === 0 && <video className="pubvideo" controls preload="metadata" poster={r.thumbnailUrl ?? undefined} src={r.url} />}
                <div className="pubfile-row">
                  <div>
                    <b>{FORMATS[r.format].label}</b>
                    <span className="cap"> · {clock(r.durationSec)}</span>
                  </div>
                  <a className="btn sm pri" href={r.url} download>
                    <Film size={14} aria-hidden /> Tải MP4
                  </a>
                </div>
                {r.thumbnailUrl && (
                  <a className="btn sm ghost" href={r.thumbnailUrl} download>
                    <ImageIcon size={14} aria-hidden /> Tải ảnh bìa
                  </a>
                )}
              </div>
            ))
          )}
        </Section>
        <div className="pubzip">
          <a className="btn" href={downloadUrl.zip(id)}>
            <FileArchive size={16} aria-hidden /> Tải tất cả (.zip)
          </a>
          <a className="btn ghost" href={downloadUrl.markdown(id)}>
            <Download size={16} aria-hidden /> Chỉ các nội dung (.md)
          </a>
          <span className="cap">Chưa đăng thẳng lên nền tảng được: bạn tải video lên rồi dán các ô bên cạnh.</span>
        </div>
      </aside>

      <div className="pubtexts">
        <div className="seg" role="tablist" aria-label="Nền tảng">
          {PLATFORMS.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={platform === p.id} className={platform === p.id ? 'on' : undefined} onClick={() => setPlatform(p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>{PLATFORMS.find((p) => p.id === platform)!.label}</h2>
            <CopyButton label="Chép tất cả" value={all} />
          </div>
          {platform === 'youtube' && (
            <>
              <Field label="Tiêu đề" max={LIMIT.ytTitle} value={kit.youtube.title} onChange={(title) => youtube({ title })} />
              <Field label="Mô tả" rows={8} max={LIMIT.ytDesc} value={kit.youtube.description} onChange={(description) => youtube({ description })} />
              <Field label="Thẻ (cách nhau bằng dấu phẩy)" rows={2} max={LIMIT.ytTags} value={tags} onChange={(t) => youtube({ tags: t.split(',') })} />
            </>
          )}
          {platform === 'facebook' && <Field label="Bài đăng" rows={8} max={LIMIT.fb} value={kit.facebook.post} onChange={(post) => setDraft({ ...kit, facebook: { post } })} />}
          {platform === 'tiktok' && (
            <>
              <Field label="Chú thích" rows={4} max={LIMIT.ttCaption} value={kit.tiktok.caption} onChange={(caption) => tiktok({ caption })} />
              <Field label="Hashtag (cách nhau bằng dấu cách)" value={kit.tiktok.hashtags.join(' ')} onChange={(t) => tiktok({ hashtags: t.split(' ') })} />
            </>
          )}
        </div>

        {draft && (
          <div className="savebar" role="status">
            <span>Có thay đổi chưa lưu.</span>
            <div className="row">
              <button type="button" className="btn sm ghost" onClick={() => setDraft(null)}>
                Bỏ thay đổi
              </button>
              <button type="button" className="btn sm dark" disabled={save.isPending} onClick={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}>
                {save.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => {
        setDone(true);
        toast.success(label === 'Chép' ? 'Đã chép' : 'Đã chép tất cả');
        setTimeout(() => setDone(false), 1500);
      },
      () => toast.error('Trình duyệt không cho chép. Bôi đen rồi chép tay.'),
    );
  return (
    <button type="button" className="btn sm ghost" onClick={copy}>
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {done ? 'Đã chép' : label}
    </button>
  );
}

function Field({ label, value, rows, max, onChange }: { label: string; value: string; rows?: number; max?: number; onChange: (v: string) => void }) {
  const over = max != null && value.length > max;
  return (
    <div className="field">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <label>{label}</label>
        <span className="row" style={{ gap: 8 }}>
          {max != null && (
            <span className={`cap${over ? ' over' : ''}`} aria-live="polite">
              {value.length}/{max}
            </span>
          )}
          <CopyButton label="Chép" value={value} />
        </span>
      </div>
      {rows ? <textarea className="area" aria-label={label} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className="input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
