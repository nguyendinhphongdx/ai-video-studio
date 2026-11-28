'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { VOICES } from '@/core/domain/catalog';
import { CAPTION_LOOKS, EXTRA_ACTIONS, EXTRA_EMOTIONS, MAX_EXTRAS, MAX_HOLD_SEC, newExtra, tuneOf, type Extra, type TuneLayer } from '@/core/domain/tune';
import type { ToolField } from '@/core/tools/tool';
import { episodeKeys, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { episodeApi, type BlockInfo, type EpisodeView } from '@/features/episode/services/episode.api';

import { usd } from '../../model';
import { CastPicker, Chips, FieldEditor, Section, ShotTiles, Slider } from './controls';
import type { TabId } from './Timeline';
import type { Draft } from './useDraft';

export interface TabProps {
  view: EpisodeView;
  draft: Draft;
  block: BlockInfo;
  projectId: string;
  readOnly: boolean;
  busy: boolean;
  /** Saves first when needed, then asks the worker to draw or read this scene again (paid). */
  redo: (what: { image: boolean; voice: boolean }) => void;
  price: { image: number | null | undefined; voice: number | null | undefined };
}

/** Block fields each tab draws with its own controls; anything else a block has is listed under "Cảnh". */
const OWNED = ['imagePrompt', 'hero', 'shot', 'action', 'emotion', 'side', 'pose', 'lead', 'companion', 'companionEmotion', 'companionAction', 'item', 'motion', 'rhythm', 'fx', 'mood', 'transition', 'caption'];

export function tabsOf(block: BlockInfo): { id: TabId; label: string }[] {
  const has = (...keys: string[]) => block.fields.some((f) => keys.includes(f.key));
  return [
    { id: 'scene' as const, label: 'Cảnh', show: true },
    { id: 'picture' as const, label: 'Hình', show: has('imagePrompt') },
    { id: 'cast' as const, label: 'Nhân vật', show: has('action') },
    { id: 'camera' as const, label: 'Máy quay', show: has('motion', 'mood', 'transition') },
    { id: 'text' as const, label: 'Chữ', show: has('caption') },
    { id: 'audio' as const, label: 'Âm thanh', show: true },
  ].filter((t) => t.show);
}

const field = (block: BlockInfo, key: string): ToolField | undefined => block.fields.find((f) => f.key === key);
const price = (n: number | null | undefined) => (n == null ? 'chưa rõ giá' : usd(n));

function ChoiceSection({ name, title, hint, p }: { name: string; title?: string; hint?: string; p: TabProps }) {
  const f = field(p.block, name);
  if (!f) return null;
  return (
    <Section title={title ?? f.label} hint={hint}>
      <Chips label={f.label} options={f.options ?? []} value={String(p.draft.value!.props[name] ?? '')} disabled={p.readOnly} onChange={(v) => p.draft.setProp(name, v)} />
    </Section>
  );
}

export function SceneTab({ p, types, onType, ops, approve, goNext }: { p: TabProps; types: BlockInfo[]; onType: (to: BlockInfo) => void; ops: { canEdit: boolean; canMove: (d: -1 | 1) => boolean; duplicate: () => void; remove: () => void; move: (d: -1 | 1) => void; disabled: boolean }; approve: { run: (v: boolean) => void; disabled: boolean }; goNext: (() => void) | null }) {
  const s = p.draft.value!;
  const assets = p.view.assets[s.id];
  const hold = tuneOf(s.props).holdSec ?? 0;
  const extra = p.block.fields.filter((f) => !OWNED.includes(f.key));
  return (
    <>
      {types.length > 1 && (
        <Section title="Cách dựng cảnh" hint={p.block.summary}>
          <Chips label="Cách dựng cảnh" options={types.map((t) => ({ value: t.ref, label: t.name }))} value={s.block} disabled={p.readOnly} onChange={(ref) => ref !== s.block && onType(types.find((t) => t.ref === ref)!)} />
        </Section>
      )}
      {extra.length > 0 && (
        <Section title="Nội dung">
          {extra.map((f) => (
            <FieldEditor key={f.key} field={f} value={s.props[f.key]} disabled={p.readOnly} onChange={(v) => p.draft.setProp(f.key, v)} />
          ))}
        </Section>
      )}
      <Section title="Nhịp">
        <Slider label="Nghỉ cuối cảnh" min={0} max={MAX_HOLD_SEC} step={0.5} value={hold} show={`${hold}s`} disabled={p.readOnly} onChange={(v) => p.draft.setTune({ holdSec: v })} />
      </Section>
      <Section title="Sắp xếp" hint={p.draft.dirty ? 'Lưu hoặc bỏ thay đổi trước khi sắp xếp.' : undefined}>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" disabled={ops.disabled || !ops.canMove(-1)} onClick={() => ops.move(-1)}>
            ↑ Lên
          </button>
          <button className="btn sm" disabled={ops.disabled || !ops.canMove(1)} onClick={() => ops.move(1)}>
            ↓ Xuống
          </button>
          <button className="btn sm" disabled={ops.disabled || !ops.canEdit} onClick={ops.duplicate}>
            Nhân đôi
          </button>
          <button className="btn sm danger" disabled={ops.disabled || !ops.canEdit} onClick={() => confirm('Xoá cảnh này? Không hoàn tác được.') && ops.remove()}>
            Xoá cảnh
          </button>
        </div>
      </Section>
      <Section title="Duyệt cảnh">
        <div className="row" style={{ gap: 6 }}>
          {s.approved ? <span className="chip ok">Đã duyệt</span> : assets?.ready ? <span className="chip info">Sẵn sàng</span> : <span className="chip warn">Chưa đủ ảnh hoặc giọng</span>}
          <button className={`btn sm${s.approved ? '' : ' dark'}`} disabled={approve.disabled || (!s.approved && !assets?.ready)} onClick={() => approve.run(!s.approved)}>
            {s.approved ? 'Bỏ duyệt' : 'Duyệt cảnh'}
          </button>
          {goNext && (
            <button className="btn sm ghost" onClick={goNext}>
              Cảnh sau →
            </button>
          )}
        </div>
      </Section>
      <span className="cap">
        Phong cách vẽ và skill dùng chung cả dự án, đổi ở{' '}
        <Link href={`/projects/${p.projectId}/style`} style={{ color: 'inherit' }}>
          Phong cách và skill
        </Link>
        .
      </span>
    </>
  );
}

export function PictureTab({ p, onWrite, writing }: { p: TabProps; onWrite: () => void; writing: boolean }) {
  const s = p.draft.value!;
  const assets = p.view.assets[s.id];
  const shot = field(p.block, 'shot');
  const prompt = field(p.block, 'imagePrompt')!;
  const hero = field(p.block, 'hero');
  // Listed again whenever the scene's picture changes (a redraw or picking an old one).
  const history = useQuery({ queryKey: [...episodeKeys.one(p.view.episode.id), 'pictures', s.id, s.assets.imagePath], queryFn: () => episodeApi.scenePictures(p.view.episode.id, s.id) });
  const pickOld = useEpisodeAction(p.view.episode.id, (name: string) => episodeApi.useScenePicture(p.view.episode.id, s.id, name), 'Đã dùng lại ảnh này');
  return (
    <>
      <Section title={prompt.label} hint={prompt.hint}>
        <textarea className="area" aria-label={prompt.label} maxLength={prompt.maxLength} readOnly={p.readOnly} value={String(s.props.imagePrompt ?? '')} onChange={(e) => p.draft.setProp('imagePrompt', e.target.value)} />
        <button type="button" className="btn sm" disabled={p.readOnly || writing || !s.narration.trim()} onClick={onWrite}>
          {writing ? 'AI đang viết…' : '✦ Viết lại theo lời đọc'}
        </button>
      </Section>
      {hero && (
        <Section title={hero.label} hint={hero.hint}>
          <Chips label={hero.label} options={hero.options ?? []} value={String(s.props.hero ?? 'yes')} disabled={p.readOnly} onChange={(v) => p.draft.setProp('hero', v)} />
        </Section>
      )}
      {shot && (
        <Section title="Kiểu khung hình" hint="Khung hình nằm trong ảnh, nên đổi khung thì phải vẽ lại.">
          <ShotTiles options={shot.options ?? []} value={String(s.props.shot ?? 'auto')} disabled={p.readOnly} onChange={(v) => p.draft.setProp('shot', v)} />
        </Section>
      )}
      <Section title="Vẽ ảnh">
        {assets?.imageStale && <span className="chip warn">Ảnh đang có không còn khớp mô tả</span>}
        <button className="btn sm pri" disabled={p.readOnly || p.busy} onClick={() => p.redo({ image: true, voice: false })}>
          {assets?.imageUrl || assets?.imageStale ? 'Vẽ lại ảnh' : 'Vẽ ảnh'} · {price(p.price.image)}
        </button>
        {(history.data?.length ?? 0) > 0 && (
          <>
            <span className="cap">Các bản đã vẽ (bấm để dùng lại, không tốn tiền)</span>
            <div className="takes">
              {history.data!.map((h) => (
                <button key={h.name} type="button" className={`take${h.current && !assets?.imageStale ? ' pick' : ''}`} disabled={p.readOnly || p.busy || p.draft.dirty || pickOld.isPending || (h.current && !assets?.imageStale)} onClick={() => pickOld.mutate(h.name)} title={p.draft.dirty ? 'Lưu cảnh trước' : 'Dùng ảnh này'}>
                  <div className="thumb" style={{ background: `center / cover url(${h.url})` }} />
                </button>
              ))}
            </div>
          </>
        )}
      </Section>
    </>
  );
}

const LAYER_NAME: Record<TuneLayer, string> = { hero: 'Vai chính', companion: 'Nhân vật phụ', item: 'Vật phẩm' };

/** As many more people and things as the scene needs; the same one may appear twice. */
function Extras({ p, people, things }: { p: TabProps; people: string[]; things: string[] }) {
  const extras = tuneOf(p.draft.value!.props).extras ?? [];
  const full = extras.length >= MAX_EXTRAS;
  const patch = (index: number, change: Partial<Extra>, tag: string) => p.draft.setExtras((list) => list.map((x, i) => (i === index ? { ...x, ...change } : x)), `${tag}:${index}`);
  const add = (id: string, kind: Extra['kind']) => p.draft.setExtras((list) => [...list, newExtra(id, kind, list)], '');
  const group = (title: string, ids: string[], kind: Extra['kind']) =>
    ids.length > 0 && (
      <>
        <span className="cap">{title}</span>
        <div className="castgrid">
          {ids.map((id) => (
            <button key={id} type="button" className="pick" disabled={p.readOnly || full} onClick={() => add(id, kind)} title={`Thêm ${id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.view.cast[id]} alt="" />
              <span>+ {id}</span>
            </button>
          ))}
        </div>
      </>
    );
  return (
    <Section title={`Thêm người và vật phẩm (${extras.length}/${MAX_EXTRAS})`} hint="Bấm để đưa thêm vào khung, rồi kéo trên hình để đặt chỗ. Không tốn tiền.">
      {extras.map((x, i) => (
        <div key={`${x.id}-${i}`} className="col extra">
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <Slider label={x.id} min={0.4} max={1.8} step={0.05} value={x.scale} show={`${Math.round(x.scale * 100)}%`} disabled={p.readOnly} onChange={(scale) => patch(i, { scale }, 'size')} />
            <button className="btn sm ghost danger" disabled={p.readOnly} aria-label={`Bỏ ${x.id}`} onClick={() => p.draft.setExtras((list) => list.filter((_, k) => k !== i), '')}>
              ×
            </button>
          </div>
          {x.kind === 'person' && (
            <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
              <select className="select" aria-label={`${x.id} làm gì`} disabled={p.readOnly} value={x.action} onChange={(e) => patch(i, { action: e.target.value as Extra['action'] }, 'action')}>
                {EXTRA_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {ACTION_NAME[a]}
                  </option>
                ))}
              </select>
              <select className="select" aria-label={`Biểu cảm của ${x.id}`} disabled={p.readOnly} value={x.emotion} onChange={(e) => patch(i, { emotion: e.target.value as Extra['emotion'] }, 'emotion')}>
                {EXTRA_EMOTIONS.map((a) => (
                  <option key={a} value={a}>
                    {EMOTION_NAME[a]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
      {group('Người', people, 'person')}
      {group('Vật phẩm', things, 'item')}
    </Section>
  );
}

const ACTION_NAME = { idle: 'Đứng nghe', talk: 'Đang nói', wave: 'Vẫy tay', point: 'Chỉ tay' } as const;
const EMOTION_NAME = { neutral: 'Bình thường', happy: 'Vui', angry: 'Giận', sad: 'Buồn', surprised: 'Ngạc nhiên' } as const;

export function CastTab({ p, people, things }: { p: TabProps; people: string[]; things: string[] }) {
  const s = p.draft.value!;
  const tune = tuneOf(s.props);
  const cast = p.view.cast;
  const poses = Object.keys(p.view.sprites).filter((k) => k.startsWith('pose:')).map((k) => k.slice(5));
  const placed: TuneLayer[] = ['hero', ...(s.props.companion ? (['companion'] as const) : []), ...(s.props.item ? (['item'] as const) : [])];
  return (
    <>
      <Section title="Người đứng vai chính">
        <CastPicker label="Vai chính" ids={people} cast={cast} noneLabel="Nhân vật chính" value={String(s.props.lead ?? '')} disabled={p.readOnly} onChange={(v) => p.draft.setProp('lead', v)} />
      </Section>
      <ChoiceSection p={p} name="action" />
      <ChoiceSection p={p} name="emotion" />
      <ChoiceSection p={p} name="side" title="Đứng ở" />
      {!s.props.lead && poses.length > 0 && (
        <Section title="Tư thế riêng">
          <Chips label="Tư thế riêng" options={[{ value: '', label: 'Theo hành động' }, ...poses.map((x) => ({ value: x, label: x }))]} value={String(s.props.pose ?? '')} disabled={p.readOnly} onChange={(v) => p.draft.setProp('pose', v)} />
        </Section>
      )}
      <Section title="Nhân vật phụ">
        <CastPicker label="Nhân vật phụ" ids={people} cast={cast} noneLabel="Không có" value={String(s.props.companion ?? '')} disabled={p.readOnly} onChange={(v) => p.draft.setProp('companion', v)} />
      </Section>
      {s.props.companion ? (
        <>
          <ChoiceSection p={p} name="companionAction" />
          <ChoiceSection p={p} name="companionEmotion" />
        </>
      ) : null}
      <Section title="Vật phẩm đi kèm">
        <CastPicker label="Vật phẩm" ids={things} cast={cast} noneLabel="Không có" value={String(s.props.item ?? '')} disabled={p.readOnly} onChange={(v) => p.draft.setProp('item', v)} />
      </Section>
      <Extras p={p} people={people} things={things} />
      <Section title="Vị trí và kích cỡ" hint="Kéo thẳng nhân vật trên khung hình; kéo chấm tròn để phóng to, thu nhỏ. Không tốn tiền.">
        {placed.map((layer) => {
          const at = tune[layer] ?? { dx: 0, dy: 0, scale: 1 };
          return (
            <div key={layer} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
              <Slider label={LAYER_NAME[layer]} min={0.4} max={1.8} step={0.05} value={at.scale} show={`${Math.round(at.scale * 100)}%`} disabled={p.readOnly} onChange={(scale) => p.draft.setTune({ [layer]: { ...at, scale } }, `size:${layer}`)} />
              <button className="btn sm ghost" disabled={p.readOnly || !tune[layer]} onClick={() => p.draft.setTune({ [layer]: undefined })} title="Về vị trí và cỡ chuẩn">
                ↺
              </button>
            </div>
          );
        })}
      </Section>
    </>
  );
}

export function CameraTab({ p, onReplay }: { p: TabProps; onReplay: () => void }) {
  const s = p.draft.value!;
  return (
    <>
      {(['motion', 'rhythm', 'fx', 'transition'] as const).map((name) => {
        const f = field(p.block, name);
        if (!f) return null;
        return (
          <Section key={name} title={f.label}>
            <select className="select" aria-label={f.label} disabled={p.readOnly} value={String(s.props[name] ?? 'auto')} onChange={(e) => (p.draft.setProp(name, e.target.value), onReplay())}>
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Section>
        );
      })}
      <ChoiceSection p={p} name="mood" title="Thời tiết và ánh sáng" />
      <button className="btn sm" onClick={onReplay}>
        ▶ Xem lại từ đầu
      </button>
      <span className="cap">Máy quay và hiệu ứng được dựng khi ghép video, đổi thoải mái, không tốn tiền.</span>
    </>
  );
}

const LOOK_NAME = { bar: 'Dải mờ', pill: 'Viên trắng', chip: 'Thẻ màu', ribbon: 'Ruy băng' } as const;

export function TextTab({ p }: { p: TabProps }) {
  const s = p.draft.value!;
  const tune = tuneOf(s.props);
  const caption = field(p.block, 'caption')!;
  // Only the picture block draws several caption styles.
  const looks = Boolean(field(p.block, 'motion'));
  return (
    <>
      <Section title="Chữ trên màn hình" hint="Để trống thì cảnh không có chữ.">
        <input className="input" aria-label={caption.label} maxLength={caption.maxLength} readOnly={p.readOnly} value={String(s.props.caption ?? '')} onChange={(e) => p.draft.setProp('caption', e.target.value)} />
      </Section>
      <Section title="Vị trí">
        <Chips label="Vị trí chữ" options={[{ value: '', label: 'Tự động' }, { value: 'top', label: 'Trên' }, { value: 'bottom', label: 'Dưới' }, { value: 'off', label: 'Ẩn chữ' }]} value={tune.captionPlace ?? ''} disabled={p.readOnly} onChange={(v) => p.draft.setTune({ captionPlace: (v || undefined) as typeof tune.captionPlace })} />
      </Section>
      {looks && (
        <Section title="Kiểu chữ">
          <Chips label="Kiểu chữ" options={[{ value: '', label: 'Tự đổi theo cảnh' }, ...CAPTION_LOOKS.map((x) => ({ value: x, label: LOOK_NAME[x] }))]} value={tune.captionLook ?? ''} disabled={p.readOnly} onChange={(v) => p.draft.setTune({ captionLook: (v || undefined) as typeof tune.captionLook })} />
        </Section>
      )}
    </>
  );
}

export function AudioTab({ p, voiceUrl }: { p: TabProps; voiceUrl: string | null }) {
  const s = p.draft.value!;
  const tune = tuneOf(s.props);
  const e = p.view.episode;
  const assets = p.view.assets[s.id];
  const options = useEpisodeAction(e.id, (input: { music?: boolean; musicVolume?: number }) => episodeApi.updateOptions(e.id, input));
  const level = e.musicVolume ?? 0.12;
  const sfx = tune.sfxVolume ?? 1;
  return (
    <>
      <Section title="Lời đọc" hint={`${s.narration.length} / 600 ký tự. Đổi lời, giọng điệu hay tốc độ thì phải đọc lại.`}>
        <textarea className="area" aria-label="Lời đọc" maxLength={600} readOnly={p.readOnly} value={s.narration} onChange={(x) => p.draft.setNarration(x.target.value)} />
      </Section>
      <Section title="Giọng điệu cảnh này" hint={e.voice.startsWith('gemini') ? undefined : 'Giọng Edge chỉ đổi được tốc độ.'}>
        <Chips label="Giọng điệu" options={[{ value: '', label: 'Kể chuyện' }, { value: 'cheerful', label: 'Vui' }, { value: 'gentle', label: 'Nhẹ nhàng' }, { value: 'dramatic', label: 'Kịch tính' }, { value: 'whisper', label: 'Thì thầm' }]} value={tune.voiceStyle ?? ''} disabled={p.readOnly || !e.voice.startsWith('gemini')} onChange={(v) => p.draft.setTune({ voiceStyle: (v || undefined) as typeof tune.voiceStyle })} />
        <Chips label="Tốc độ đọc" options={[{ value: 'slow', label: 'Chậm' }, { value: '', label: 'Vừa' }, { value: 'fast', label: 'Nhanh' }]} value={tune.voiceSpeed ?? ''} disabled={p.readOnly} onChange={(v) => p.draft.setTune({ voiceSpeed: (v || undefined) as typeof tune.voiceSpeed })} />
      </Section>
      <Section title={`Giọng: ${VOICES[e.voice] ?? e.voice}`}>
        {voiceUrl ? <audio controls src={voiceUrl} style={{ width: '100%' }} /> : <span className="cap">{assets?.voiceStale ? 'Giọng cũ không còn khớp.' : 'Cảnh này chưa có giọng.'}</span>}
        <button className="btn sm pri" disabled={p.readOnly || p.busy || !s.narration.trim()} onClick={() => p.redo({ image: false, voice: true })}>
          {assets?.voiceUrl || assets?.voiceStale ? 'Đọc lại' : 'Tạo giọng'} · {price(p.price.voice)}
        </button>
      </Section>
      <Section title="Tiếng động cảnh này">
        <Slider label="Hiệu ứng" min={0} max={2} step={0.1} value={sfx} show={sfx === 0 ? 'Tắt' : `${Math.round(sfx * 100)}%`} disabled={p.readOnly} onChange={(v) => p.draft.setTune({ sfxVolume: v })} />
      </Section>
      <Section title="Nhạc nền cả video" hint="Áp dụng cho mọi cảnh, lưu ngay.">
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={e.music} disabled={p.readOnly || p.busy || options.isPending} onChange={(x) => options.mutate({ music: x.target.checked })} />
          Có nhạc nền
        </label>
        {e.music && (
          // Saved when the thumb is let go, not on every step of the way.
          <input type="range" aria-label="Âm lượng nhạc nền" key={level} min={0} max={0.4} step={0.02} defaultValue={level} disabled={p.readOnly || p.busy} onPointerUp={(x) => options.mutate({ musicVolume: Number(x.currentTarget.value) })} onKeyUp={(x) => options.mutate({ musicVolume: Number(x.currentTarget.value) })} />
        )}
      </Section>
    </>
  );
}
