'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { customPoseKey, MAX_CUSTOM_POSES, POSE_ID, type SpriteKey } from '@/core/character/expressions';
import { charactersOf, missingPictures, removeCharacter, saveCharacter, setPicture, type Character } from '@/core/character/roster';
import type { SeriesBible } from '@/core/domain/series';
import { jobApi } from '@/features/app';
import { seriesApi, type SeriesView } from '@/features/series/services/series.api';
import { usageApi } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

import { usd } from '../model';
import { Section } from '../Section';

export const media = (p: string) => `/api/v1/media/${p.split('/').map(encodeURIComponent).join('/')}`;
const LABEL: Record<SpriteKey, string> = {
  neutral: 'Bình thường', talk: 'Đang nói', blink: 'Nháy mắt', happy: 'Vui', angry: 'Giận', sad: 'Buồn', surprised: 'Ngạc nhiên',
  walk1: 'Bước 1', walk2: 'Bước 2', walk3: 'Bước 3', walk4: 'Bước 4', wave1: 'Vẫy 1', wave2: 'Vẫy 2', point: 'Chỉ tay', think: 'Suy nghĩ',
  cross: 'Khoanh tay', bow: 'Cúi chào', sit: 'Ngồi', crouch: 'Lấy đà', leap: 'Bật nhảy', cheer: 'Ăn mừng',
};
const MAX_REFERENCES = 4;
const labelOf = (key: string) => (key.startsWith('pose:') ? key.slice(5) : (LABEL[key as SpriteKey] ?? key));
/** "Lý Tịnh" → "ly-tinh". */
export const slugOf = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/, '');

/** Hidden file input behind a button; uploads the picture and hands back its media path. */
function UploadButton({ label, onUploaded, className = 'btn sm', disabled }: { label: string; onUploaded: (path: string) => void; className?: string; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className={className} disabled={disabled || busy} onClick={() => ref.current?.click()}>
        {busy ? 'Đang tải lên…' : label}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          try {
            onUploaded((await seriesApi.uploadCharacter(file)).path);
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

/**
 * One series' characters: pick one on top, see what belongs to them below (description, pictures, expressions,
 * actions, accessories). Hand edits are a draft until "Lưu nhân vật" (a new series version; written episodes keep
 * theirs). Drawing runs in the worker and saves itself, so it waits for a saved draft.
 */
export function CastEditor({ series, defaultOpen = true }: { series: SeriesView; defaultOpen?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const saved = series.rules.bible as SeriesBible;
  const [bible, setBible] = useState<SeriesBible>(saved);
  useEffect(() => setBible(series.rules.bible as SeriesBible), [series.rules]);
  const dirty = JSON.stringify(bible) !== JSON.stringify(saved);
  const set = (patch: Partial<SeriesBible>) => setBible((b) => ({ ...b, ...patch }));
  /** An edit from the character model; what it refuses is shown to the person. */
  const change = (edit: (b: SeriesBible) => SeriesBible) => {
    try {
      setBible(edit(bible));
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };
  const reload = () => void qc.invalidateQueries({ queryKey: ['series', series.channelId] });

  const save = useMutation({
    mutationFn: () => seriesApi.saveRules(series.id, { skillId: series.rules.skillId, bible, format: series.rules.format, publish: series.rules.publish }),
    onSuccess: () => {
      reload();
      toast.success('Đã lưu nhân vật · bản mới của series');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // Drawings under way (also those the assistant asked for). When one ends, its pictures are already saved.
  const drawing = useQuery({ queryKey: ['drawing', series.id], queryFn: () => seriesApi.drawing(series.id), refetchInterval: (q) => (q.state.data?.length ? 2000 : 15_000) });
  const job = drawing.data?.[0];
  const working = Boolean(job);
  const last = useRef<string | null>(null);
  useEffect(() => {
    const done = last.current && last.current !== job?.id ? last.current : null;
    last.current = job?.id ?? null;
    if (!done) return;
    reload();
    void jobApi.get(done).then((j) => (j.state === 'failed' ? toast.error(j.error ?? 'Chưa vẽ được. Thử lại nhé.') : toast.success('Đã vẽ xong và lưu vào series.')));
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const generate = useMutation({
    mutationFn: (req: { characterId: string; keys: string[] }) => seriesApi.drawCharacter(series.id, req),
    onSuccess: () => void drawing.refetch(),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const all = charactersOf(bible);
  const [picked, setPicked] = useState<string | null>(null);
  const c = all.find((x) => x.id === picked) ?? all[0]!;
  const people = all.filter((x) => x.kind === 'character');
  const shared = all.filter((x) => x.kind === 'prop' && !x.owner);
  const owned = all.filter((x) => x.owner === c.id);

  const [newName, setNewName] = useState('');
  const newId = slugOf(newName);
  const newOk = POSE_ID.test(newId) && !all.some((x) => x.id === newId);
  const add = (kind: Character['kind'], owner?: string) => {
    if (change((b) => saveCharacter(b, newId, { name: newName.trim(), kind, ...(owner ? { owner } : {}) }))) {
      setPicked(newId);
      setNewName('');
    }
  };

  const customPoses = bible.customPoses ?? {};
  const [poseName, setPoseName] = useState('');
  const [poseText, setPoseText] = useState('');
  const poseId = slugOf(poseName);
  const poseOk = POSE_ID.test(poseId) && !(poseId in customPoses) && poseText.trim().length >= 3 && Object.keys(customPoses).length < MAX_CUSTOM_POSES;
  const removePose = (id: string) => {
    const nextPoses = { ...customPoses };
    delete nextPoses[id];
    const nextSprites = { ...bible.characterSprites };
    delete nextSprites[customPoseKey(id)];
    set({ customPoses: nextPoses, characterSprites: nextSprites });
  };

  const blocked = dirty ? 'Lưu nhân vật trước khi vẽ' : !c.pictures.neutral && !c.references.length && !c.description ? 'Cần mô tả hoặc ảnh trước khi vẽ' : null;
  const group = (title: string, keys: string[], hint: string, extra?: Partial<Parameters<typeof SpriteGroup>[0]>) => (
    <SpriteGroup
      key={`${c.id}-${title}`}
      title={title}
      items={keys.map((k) => ({ key: k, label: labelOf(k), title: k.startsWith('pose:') ? customPoses[k.slice(5)] : undefined }))}
      hint={hint}
      get={(k) => c.pictures[k]}
      missingOf={(wanted) => missingPictures(c, wanted)}
      blocked={blocked}
      working={working}
      progress={job?.progress ?? 0}
      onGenerate={(wanted) => generate.mutate({ characterId: c.id, keys: wanted })}
      onSet={(k, path) => change((b) => setPicture(b, c.id, k, path))}
      {...extra}
    />
  );

  const thumb = (x: Character) => x.pictures.neutral ?? x.references[0];
  const tile = (x: Character) => (
    <button key={x.id} type="button" className={`who${x.id === c.id ? ' on' : ''}`} aria-pressed={x.id === c.id} onClick={() => setPicked(x.id)}>
      {thumb(x) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media(thumb(x)!)} alt="" className="sprite" />
      ) : (
        <span className="sprite">
          <span>Chưa vẽ</span>
        </span>
      )}
      <b>
        {x.main && <span title="Nhân vật chính">★ </span>}
        {x.name}
      </b>
    </button>
  );
  const field = (name: string) => `${name}-${series.id}`;

  return (
    <div className="card cast">
      <div className="sec-head">
        <button type="button" className="sec-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <ChevronDown size={20} className={open ? 'open' : undefined} aria-hidden />
          <span className="col" style={{ gap: 0 }}>
            <span className="eyebrow">Series · bản {series.currentVersion}</span>
            <h2>{series.name}</h2>
          </span>
          <span className="chip">
            {people.length} nhân vật · {all.length - people.length} đạo cụ
          </span>
        </button>
        <div className="sec-actions">
          {working && <span className="chip info">Đang vẽ… {Math.round((job?.progress ?? 0) * 100)}%</span>}
          {dirty && <span className="chip warn">Chưa lưu</span>}
          {dirty && (
            <button className="btn sm" onClick={() => setBible(saved)}>
              Bỏ thay đổi
            </button>
          )}
          <button className="btn sm pri" disabled={!dirty || save.isPending || working} onClick={() => save.mutate()}>
            {save.isPending ? 'Đang lưu…' : 'Lưu nhân vật'}
          </button>
        </div>
      </div>

      {open && (
        // A drawing saves into the series when it ends: editing meanwhile would be overwritten.
        <fieldset disabled={working} className="castbody">
          <div className="whos" role="group" aria-label="Nhân vật">
            {people.map(tile)}
          </div>
          {shared.length > 0 && (
            <>
              <span className="eyebrow">Đạo cụ chung</span>
              <div className="whos" role="group" aria-label="Đạo cụ chung">
                {shared.map(tile)}
              </div>
            </>
          )}
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field grow" style={{ maxWidth: 320 }}>
              <label htmlFor={field('new')}>Thêm nhân vật hoặc đạo cụ</label>
              <input id={field('new')} className="input" maxLength={60} placeholder="Tên, ví dụ: Ngao Bính" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <button type="button" className="btn sm" disabled={!newOk} onClick={() => add('character')}>
              + Nhân vật
            </button>
            <button type="button" className="btn sm" disabled={!newOk} onClick={() => add('prop')}>
              + Đạo cụ chung
            </button>
            {newName && !newOk && <span className="cap">Tên này đã có hoặc không dùng được.</span>}
          </div>

          <div className="whohead">
            <h3>{c.name}</h3>
            <span className="cap mono">{c.id}</span>
            {c.owner && (
              <button type="button" className="btn sm ghost" onClick={() => setPicked(c.owner)}>
                Của {all.find((x) => x.id === c.owner)?.name} →
              </button>
            )}
          </div>

          <Section key={`${c.id}-about`} title="Mô tả">
            <div className="aboutgrid">
              <div className="field">
                <label htmlFor={field('name')}>Tên</label>
                <input id={field('name')} className="input" maxLength={60} value={bible.roster?.[c.id]?.name ?? c.name} onChange={(e) => change((b) => saveCharacter(b, c.id, { name: e.target.value }))} />
              </div>
              {!c.hero && (
                <div className="field">
                  <label htmlFor={field('kind')}>Loại</label>
                  <select id={field('kind')} className="select" value={c.kind} onChange={(e) => change((b) => saveCharacter(b, c.id, { kind: e.target.value as Character['kind'] }))}>
                    <option value="character">Nhân vật</option>
                    <option value="prop">Đạo cụ</option>
                  </select>
                </div>
              )}
              {c.kind === 'prop' ? (
                <div className="field">
                  <label htmlFor={field('owner')}>Thuộc về</label>
                  <select id={field('owner')} className="select" value={c.owner ?? ''} onChange={(e) => change((b) => saveCharacter(b, c.id, { owner: e.target.value || null }))}>
                    <option value="">Đạo cụ chung</option>
                    {people.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={c.main} onChange={(e) => change((b) => saveCharacter(b, c.id, { main: e.target.checked }))} />
                  ★ Nhân vật chính (câu chuyện xoay quanh)
                </label>
              )}
            </div>
            <div className="field">
              <label htmlFor={field('desc')}>Ngoại hình và tính cách</label>
              <textarea id={field('desc')} className="area" rows={3} maxLength={400} value={c.description} placeholder="Tuổi, tóc, trang phục, màu… AI vẽ và viết theo mô tả này." onChange={(e) => change((b) => saveCharacter(b, c.id, { description: e.target.value }))} />
            </div>
            {c.hero && (
              <div className="field">
                <label htmlFor={field('chars')}>Mô tả chung cho mọi ảnh cảnh</label>
                <textarea id={field('chars')} className="area" rows={4} maxLength={2000} value={bible.characters} onChange={(e) => set({ characters: e.target.value })} placeholder="Tên và đặc điểm cố định của các nhân vật hay xuất hiện." />
                <span className="hint">{bible.characters.length} / 2000 ký tự</span>
              </div>
            )}
            {!c.hero && (
              <div>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => window.confirm(`Xoá "${c.name}" khỏi series? Tập đã viết giữ bản cũ.`) && change((b) => removeCharacter(b, c.id)) && setPicked(null)}
                >
                  Xoá {c.kind === 'prop' ? 'đạo cụ' : 'nhân vật'} này
                </button>
              </div>
            )}
          </Section>

          {c.hero && (
            <Section key={`${c.id}-refs`} title="Ảnh chuẩn" badge={`${bible.characterAssets.length}/${MAX_REFERENCES} ảnh`}>
              <div className="refs">
                {bible.characterAssets.map((p, i) => (
                  <div key={p} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media(p)} alt={`Ảnh chuẩn ${i + 1}`} className="sprite" style={{ width: '100%', objectFit: 'contain' }} />
                    <button type="button" className="btn sm" aria-label="Bỏ ảnh này" style={{ position: 'absolute', top: 4, right: 4, minHeight: 24, padding: '0 6px' }} onClick={() => set({ characterAssets: bible.characterAssets.filter((x) => x !== p) })}>
                      ×
                    </button>
                  </div>
                ))}
                {bible.characterAssets.length < MAX_REFERENCES && (
                  <div className="sprite refadd">
                    <UploadButton label="+ Thêm ảnh chuẩn" onUploaded={(p) => set({ characterAssets: [...bible.characterAssets, p] })} />
                  </div>
                )}
              </div>
              <span className="cap">Mọi ảnh cảnh được vẽ theo các ảnh này. Đổi ảnh thì các cảnh cần tạo lại ảnh.</span>
            </Section>
          )}

          {c.kind === 'prop'
            ? group('Ảnh', c.expressions, 'Ảnh nền trong suốt của đạo cụ.')
            : group('Biểu cảm', c.expressions, 'Ảnh toàn thân, nền trong suốt. "Bình thường" là ảnh gốc, các ảnh khác vẽ theo nó.')}
          {c.kind === 'character' &&
            group(
              'Hành động',
              c.actions.filter((k) => !k.startsWith('pose:')),
              c.hero ? 'Bước 1–4 là dáng đi, Vẫy 1–2 là vẫy tay, Lấy đà và Bật nhảy là nhảy. Thiếu tư thế nào thì cảnh dùng ảnh biểu cảm.' : 'Hiện nhân vật này có vẫy tay và chỉ tay. Đi, ngồi, cúi chào và hành động riêng sẽ có ở đợt sau.',
            )}
          {c.hero &&
            group('Hành động riêng', c.actions.filter((k) => k.startsWith('pose:')), 'Việc chỉ nhân vật này làm, ví dụ múa thương. AI vẽ theo mô tả và chọn nó khi viết cảnh.', {
              onRemoveItem: (k) => removePose(k.slice(5)),
              defaultOpen: Object.keys(customPoses).length > 0,
              children: (
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <div className="field" style={{ width: 180 }}>
                    <label htmlFor={field('pose')}>Tên hành động</label>
                    <input id={field('pose')} className="input" placeholder="ví dụ: Múa thương" maxLength={24} value={poseName} onChange={(e) => setPoseName(e.target.value)} />
                  </div>
                  <div className="field grow">
                    <label htmlFor={field('posetext')}>Trông thế nào (tiếng Anh vẽ chuẩn hơn)</label>
                    <input id={field('posetext')} className="input" maxLength={300} placeholder="spinning a red-tasselled spear above the head" value={poseText} onChange={(e) => setPoseText(e.target.value)} />
                  </div>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={!poseOk}
                    onClick={() => {
                      set({ customPoses: { ...customPoses, [poseId]: poseText.trim() } });
                      setPoseName('');
                      setPoseText('');
                    }}
                  >
                    + Thêm
                  </button>
                </div>
              ),
            })}

          {c.kind === 'character' && (
            <Section key={`${c.id}-own`} title="Phụ kiện" badge={owned.length}>
              {owned.length > 0 && <div className="whos">{owned.map(tile)}</div>}
              <div className="row">
                {shared.length > 0 && (
                  <select className="select" style={{ width: 'auto' }} value="" aria-label="Gắn đạo cụ chung cho nhân vật này" onChange={(e) => e.target.value && change((b) => saveCharacter(b, e.target.value, { owner: c.id }))}>
                    <option value="">+ Gắn từ đạo cụ chung…</option>
                    {shared.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" className="btn sm" disabled={!newOk} title={newOk ? undefined : 'Gõ tên ở ô "Thêm nhân vật hoặc đạo cụ" trước'} onClick={() => add('prop', c.id)}>
                  + Phụ kiện mới{newOk ? `: ${newName.trim()}` : ''}
                </button>
              </div>
              <span className="cap">Phụ kiện đi theo nhân vật: màn đạo diễn và AI chỉ đưa vào khi người đó có trong cảnh.</span>
            </Section>
          )}
          <span className="cap">Muốn làm nhanh? Nhờ Đạo diễn: “thêm phụ kiện cho Lý Tịnh”, “vẽ biểu cảm còn thiếu của Thái Ất”.</span>
        </fieldset>
      )}
    </div>
  );
}

/** One group of sprites (expressions, poses, a supporting character's poses): upload, remove, or have the AI draw the missing ones (with a cost estimate). Folds away; the draw button stays in the header. */
function SpriteGroup({ title, items, hint, get, missingOf, blocked, working, progress, onGenerate, onSet, onRemoveItem, flat, defaultOpen, children }: {
  title: string;
  items: { key: string; label: string; title?: string }[];
  hint: string;
  get: (key: string) => string | undefined;
  /** What drawing these would pay for (the plain picture comes first when it is missing). */
  missingOf: (keys: string[]) => string[];
  /** Why drawing is not possible now. */
  blocked: string | null;
  working: boolean;
  progress: number;
  onGenerate: (missing: string[]) => void;
  onSet: (key: string, path: string | null) => void;
  /** Removes the item itself (a custom pose), not just its picture. */
  onRemoveItem?: (key: string) => void;
  flat?: boolean;
  defaultOpen?: boolean;
  /** Extra controls under the pictures (for example the form that adds a pose). */
  children?: ReactNode;
}) {
  const missing = items.filter((i) => !get(i.key)).map((i) => i.key);
  const cost = missing.length ? missingOf(missing).length : 0;
  const estimate = useQuery({ queryKey: ['estimate', 'sprites', cost], queryFn: () => usageApi.estimate({ images: cost, texts: [], voice: '' }), enabled: cost > 0, staleTime: 60_000 });
  const name = title.toLowerCase();
  return (
    <Section
      flat={flat}
      title={title}
      badge={`${items.length - missing.length}/${items.length}`}
      defaultOpen={defaultOpen ?? missing.length > 0}
      actions={
        items.length > 0 && (
          <button className="btn sm dark" disabled={Boolean(blocked) || missing.length === 0 || working} onClick={() => onGenerate(missing)} title={blocked ?? undefined}>
            {working ? `Đang vẽ… ${Math.round(progress * 100)}%` : missing.length === 0 ? `Đã đủ ${name}` : `Vẽ ${cost} ảnh còn thiếu · ${estimate.data?.usd == null ? 'chưa rõ giá' : usd(estimate.data.usd)}`}
          </button>
        )
      }
    >
      {items.length > 0 && (
        <div className="spritegrid">
          {items.map(({ key, label, title: tip }) => {
            const p = get(key);
            return (
              <figure key={key} className="col" style={{ margin: 0, gap: 4 }} title={tip}>
                {p ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media(p)} alt={label} className="sprite" style={{ width: '100%', objectFit: 'contain' }} />
                ) : (
                  <div className="sprite" style={{ borderStyle: 'dashed' }}>
                    <span>Chưa vẽ</span>
                  </div>
                )}
                <figcaption className="cap" style={{ textAlign: 'center' }}>
                  {label}
                </figcaption>
                <div className="row" style={{ gap: 2, justifyContent: 'center' }}>
                  <UploadButton label={p ? 'Đổi' : 'Tải lên'} className="btn sm ghost" disabled={working} onUploaded={(path) => onSet(key, path)} />
                  {p && (
                    <button className="btn sm ghost" disabled={working} onClick={() => onSet(key, null)}>
                      Bỏ ảnh
                    </button>
                  )}
                  {onRemoveItem && (
                    <button className="btn sm ghost" disabled={working} onClick={() => onRemoveItem(key)}>
                      Xoá
                    </button>
                  )}
                </div>
              </figure>
            );
          })}
        </div>
      )}
      <span className="cap">{hint}</span>
      {children}
    </Section>
  );
}
