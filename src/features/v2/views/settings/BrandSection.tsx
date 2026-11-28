'use client';

import { Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

import { BRAND_FONT_IDS, BRAND_FONTS, MEDIA_MUSIC_PREFIX } from '@/core/domain/catalog';
import { useAppConfig } from '@/features/app/hooks/use-app';
import { ChannelArtPanel } from '@/features/channel/components/ChannelArtPanel';
import { IMAGE_STYLE_PRESETS } from '@/features/channel/components/ChannelEditor';
import { BrandPreview } from '@/features/channel/components/BrandPreview';
import { PaletteEditor } from '@/features/channel/components/PaletteEditor';
import { useChannelAction } from '@/features/channel/hooks/use-channels';
import { channelApi, type ChannelInput, type ChannelView } from '@/features/channel/services/channel.api';

import { projectHref } from '../../model';
import { LogoDrawer } from '../LogoDraft';
import type { FormProps } from './sections';

/** One file picker that uploads at once (images and music are saved the moment they are chosen, not with the form). */
function Upload1({ label, accept, busy, onFile }: { label: string; accept: string; busy: boolean; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => (e.target.files?.[0] && onFile(e.target.files[0]), (e.target.value = ''))} />
      <button type="button" className="btn" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 size={16} className="spin" aria-hidden /> : <Upload size={16} aria-hidden />}
        {label}
      </button>
    </>
  );
}

/** How the project looks: logo, colours, type, picture style, intro and outro; one live preview of the result. */
export function BrandSection({ project, form, set, setForm }: FormProps & { project: ChannelView; setForm: (fn: (f: ChannelInput) => ChannelInput) => void }) {
  const config = useAppConfig();
  const logo = useChannelAction(project.id, (f: File) => channelApi.uploadLogo(project.id, f), 'Đã đổi logo');
  const avatar = useChannelAction(project.id, (f: File) => channelApi.uploadAvatar(project.id, f), 'Đã đổi avatar');
  const removeAvatar = useChannelAction(project.id, () => channelApi.removeAvatar(project.id), 'Đã xoá avatar');
  const music = useChannelAction(project.id, (f: File) => channelApi.uploadMusic(project.id, f), 'Đã tải nhạc nền lên');
  const tracks = config.data?.musicTracks ?? [];
  const uploaded = form.music.startsWith(MEDIA_MUSIC_PREFIX);

  return (
    <div className="brand-grid">
      <div className="col" style={{ gap: 'var(--sp-5)' }}>
        <section className="card" aria-labelledby="s-logo">
          <h2 id="s-logo">Logo và avatar</h2>
          <div className="brand-marks">
            <div className="brand-mark">
              <div className="brand-img" aria-hidden>
                {project.logoUrl ? <img src={project.logoUrl} alt="" /> : <span className="cap">Chưa có</span>}
              </div>
              <div className="col" style={{ gap: 6 }}>
                <b>Logo</b>
                <Upload1 label={project.logoUrl ? 'Đổi logo' : 'Tải logo lên'} accept="image/png,image/jpeg,image/webp,image/svg+xml" busy={logo.isPending} onFile={(f) => logo.mutate(f)} />
              </div>
            </div>
            <div className="brand-mark">
              <div className="brand-img round" aria-hidden>
                {project.avatarUrl ? <img src={project.avatarUrl} alt="" /> : <span className="cap">Chưa có</span>}
              </div>
              <div className="col" style={{ gap: 6 }}>
                <b>Avatar</b>
                <div className="row">
                  <Upload1 label={project.avatarUrl ? 'Đổi avatar' : 'Tải avatar lên'} accept="image/png,image/jpeg,image/webp" busy={avatar.isPending} onFile={(f) => avatar.mutate(f)} />
                  {project.avatarUrl && (
                    <button type="button" className="btn" disabled={removeAvatar.isPending} onClick={() => removeAvatar.mutate(undefined)}>
                      Xoá
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <LogoDrawer projectId={project.id} />
          <span className="hint cap">Lưu ngay khi tải. PNG, JPG, WEBP, tối đa 4MB. Avatar hiện trong cảnh mở đầu và kết, thay cho logo lớn.</span>
        </section>

        <section className="card" aria-labelledby="s-look">
          <h2 id="s-look">Màu, chữ và hình vẽ</h2>
          <div className="field">
            <label>Bảng màu</label>
            <PaletteEditor value={form.palette} onChange={(v) => set('palette', v)} />
            <span className="hint">Màu đầu tiên là màu chính; AI chọn màu cảnh hài hoà với bảng màu.</span>
          </div>
          <div className="field">
            <label htmlFor="br-font">Font tiêu đề</label>
            <select id="br-font" className="input" value={form.font} onChange={(e) => set('font', e.target.value as ChannelInput['font'])} style={{ maxWidth: 280, fontFamily: form.font }}>
              {BRAND_FONT_IDS.map((f) => (
                <option key={f} value={f}>
                  {BRAND_FONTS[f].label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="br-img">Phong cách ảnh AI</label>
            <textarea id="br-img" className="area" rows={3} maxLength={500} value={form.imageStyle} onChange={(e) => set('imageStyle', e.target.value)} placeholder="VD: flat vector illustration, pastel palette, soft shadows, friendly characters" />
            <div className="row" style={{ gap: 6 }}>
              {IMAGE_STYLE_PRESETS.map((p) => (
                <button key={p.label} type="button" className={`chip pick${form.imageStyle === p.value ? ' on' : ''}`} onClick={() => set('imageStyle', p.value)}>
                  {p.label}
                </button>
              ))}
            </div>
            <span className="hint">Chất liệu, ánh sáng, màu của ảnh AI (tiếng Anh càng tốt). Áp cho mọi cảnh dùng ảnh AI. Skill mặc định chọn ở <Link href={projectHref(project.id, 'style')}>Phong cách và skill</Link>.</span>
          </div>
          <div className="field">
            <label htmlFor="br-music">Nhạc nền mặc định</label>
            <div className="row">
              <select id="br-music" className="input grow" value={form.music} onChange={(e) => set('music', e.target.value)}>
                <option value="none">Không có nhạc</option>
                {tracks.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {uploaded && <option value={form.music}>Nhạc đã tải lên</option>}
              </select>
              <Upload1 label="Tải nhạc lên" accept="audio/mpeg,audio/wav,.mp3,.wav" busy={music.isPending} onFile={(f) => music.mutate(f)} />
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="s-art">
          <h2 id="s-art">Intro và outro</h2>
          <p className="muted">Thiết kế do trợ lý làm (nói bạn muốn gì). Ở đây chọn có ảnh AI nền hay không và vẽ ảnh.</p>
          <div className="legacy-ui">
            <ChannelArtPanel channel={project} form={form} setForm={setForm} />
          </div>
        </section>
      </div>

      <aside className="card brand-prev" aria-labelledby="s-prev">
        <h3 id="s-prev">Xem trước với thương hiệu đang sửa</h3>
        <div className="legacy-ui">
        <BrandPreview input={form} logoUrl={project.logoUrl} avatarUrl={project.avatarUrl} introArtUrl={project.introArtUrl} outroArtUrl={project.outroArtUrl} sampleTitle="Tiêu đề video mẫu" />
        </div>
      </aside>
    </div>
  );
}
