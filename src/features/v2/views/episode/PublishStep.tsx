'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { PublishKit } from '@/core/domain/episode';
import { useEpisode, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { downloadUrl, episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

import { toSaveInput } from './save';

/** Everything needed to post the video: download it, fix the texts, copy each one. */
export function PublishStep({ episodeId }: { episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  if (!v.episode.publish) return <p className="muted">Bộ xuất bản có sau khi duyệt video.</p>;
  return <Kit view={v} saved={v.episode.publish} />;
}

function Kit({ view: v, saved }: { view: EpisodeView; saved: PublishKit }) {
  const id = v.episode.id;
  const [draft, setDraft] = useState<PublishKit | null>(null);
  const kit = draft ?? saved;
  const save = useEpisodeAction(id, (publish: PublishKit) => episodeApi.saveScript(id, toSaveInput(v, { publish })), 'Đã lưu');
  const render = v.renders[0];
  const youtube = (patch: Partial<PublishKit['youtube']>) => setDraft({ ...kit, youtube: { ...kit.youtube, ...patch } });

  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
      <div className="col grow" style={{ gap: 16, minWidth: 320 }}>
        {draft && (
          <div className="alert warn" style={{ justifyContent: 'space-between' }}>
            <span>Có thay đổi chưa lưu.</span>
            <button className="btn sm dark" disabled={save.isPending} onClick={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}>
              Lưu
            </button>
          </div>
        )}
        <div className="card">
          <h2>YouTube</h2>
          <Copyable label="Tiêu đề" value={kit.youtube.title} onChange={(title) => youtube({ title })} />
          <Copyable label="Mô tả" rows={6} value={kit.youtube.description} onChange={(description) => youtube({ description })} />
          <Copyable label="Thẻ (cách nhau bằng dấu phẩy)" rows={2} value={kit.youtube.tags.join(',')} onChange={(t) => youtube({ tags: t.split(',') })} />
        </div>
        <div className="card">
          <h2>Facebook và TikTok</h2>
          <Copyable label="Bài đăng Facebook" rows={4} value={kit.facebook.post} onChange={(post) => setDraft({ ...kit, facebook: { post } })} />
          <Copyable label="Chú thích TikTok" rows={3} value={kit.tiktok.caption} onChange={(caption) => setDraft({ ...kit, tiktok: { ...kit.tiktok, caption } })} />
          <Copyable label="Hashtag TikTok" value={kit.tiktok.hashtags.join(' ')} onChange={(t) => setDraft({ ...kit, tiktok: { ...kit.tiktok, hashtags: t.split(' ') } })} />
        </div>
      </div>
      <aside className="card" style={{ flex: '0 0 320px' }}>
        <h2>Tải về</h2>
        {render?.thumbnailUrl && (
          <>
            <div className="thumb" style={{ background: `center / cover url(${render.thumbnailUrl})` }} />
            <a className="btn" href={render.thumbnailUrl} download>
              Tải ảnh bìa
            </a>
          </>
        )}
        {render && (
          <a className="btn pri" href={render.url} download>
            Tải video MP4
          </a>
        )}
        <a className="btn" href={downloadUrl.zip(id)}>
          Tải tất cả (.zip)
        </a>
        <span className="cap">Chưa đăng thẳng lên YouTube được: bạn tải video lên và dán các ô bên cạnh.</span>
      </aside>
    </div>
  );
}

function Copyable({ label, value, rows, onChange }: { label: string; value: string; rows?: number; onChange: (v: string) => void }) {
  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => toast.success(`Đã chép: ${label}`),
      () => toast.error('Trình duyệt không cho chép. Bôi đen rồi chép tay.'),
    );
  return (
    <div className="field">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <label>{label}</label>
        <button type="button" className="btn sm ghost" onClick={copy}>
          Chép
        </button>
      </div>
      {rows ? <textarea className="area" aria-label={label} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className="input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
