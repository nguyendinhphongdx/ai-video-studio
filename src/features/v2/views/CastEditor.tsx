'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CAST_POSES, castPoseKey, customPoseKey, EXPRESSIONS, MAX_CUSTOM_POSES, POSE_ID, POSES, type CastPose, type SpriteKey } from '@/core/character/expressions';
import type { SeriesBible } from '@/core/domain/series';
import { seriesApi, type SeriesView } from '@/features/series/services/series.api';
import { usageApi } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

import { usd } from '../model';

export const media = (p: string) => `/api/v1/media/${p.split('/').map(encodeURIComponent).join('/')}`;
const LABEL: Record<SpriteKey, string> = {
  neutral: 'Bình thường', talk: 'Đang nói', blink: 'Nháy mắt', happy: 'Vui', angry: 'Giận', sad: 'Buồn', surprised: 'Ngạc nhiên',
  walk1: 'Bước 1', walk2: 'Bước 2', walk3: 'Bước 3', walk4: 'Bước 4', wave1: 'Vẫy 1', wave2: 'Vẫy 2', point: 'Chỉ tay', think: 'Suy nghĩ',
  cross: 'Khoanh tay', bow: 'Cúi chào', sit: 'Ngồi', crouch: 'Lấy đà', leap: 'Bật nhảy', cheer: 'Ăn mừng',
};
const CAST_LABEL: Record<CastPose, string> = { talk: 'Đang nói', wave1: 'Vẫy 1', wave2: 'Vẫy 2', point: 'Chỉ tay' };
const MAX_REFERENCES = 4;
const CAST_ID = /^[a-z0-9][a-z0-9-]{0,23}$/;

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
 * Edits one series' characters: reference pictures (every scene picture is drawn to match them), the description the
 * AI reads, the puppet's expression sprites (uploaded or generated from the reference) and the supporting cast.
 * Saving writes a new series version; episodes already written keep the version they pinned.
 */
export function CastEditor({ series }: { series: SeriesView }) {
  const qc = useQueryClient();
  const saved = series.rules.bible as SeriesBible;
  const [bible, setBible] = useState<SeriesBible>(saved);
  useEffect(() => setBible(series.rules.bible as SeriesBible), [series.rules]);
  const dirty = JSON.stringify(bible) !== JSON.stringify(saved);
  const set = (patch: Partial<SeriesBible>) => setBible((b) => ({ ...b, ...patch }));

  const save = useMutation({
    mutationFn: () => seriesApi.saveRules(series.id, { skillId: series.rules.skillId, bible, format: series.rules.format, publish: series.rules.publish }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['series', series.channelId] });
      toast.success('Đã lưu nhân vật · bản mới của series');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // AI expression set: a worker job; when done, the new sprites join the ones already set (still unsaved).
  const [jobId, setJobId] = useState<string | null>(null);
  // Where the finished pictures go: the hero's sprites, or one supporting character's poses.
  const jobFor = useRef<{ cast?: string }>({});
  const job = useQuery({ queryKey: ['sprite-job', jobId], queryFn: () => seriesApi.job(jobId!), enabled: Boolean(jobId), refetchInterval: 1500 });
  const state = job.data?.state;
  useEffect(() => {
    if (!jobId || !state) return;
    if (state === 'failed') {
      toast.error(job.data?.error ?? 'Chưa vẽ được ảnh nhân vật. Thử lại nhé.');
      setJobId(null);
    } else if (state === 'done') {
      const made = (job.data?.result as { sprites?: Record<string, string> } | null)?.sprites ?? {};
      const castId = jobFor.current.cast;
      setBible((b) =>
        castId
          ? { ...b, characterCast: { ...b.characterCast, ...Object.fromEntries(Object.entries(made).map(([k, v]) => [castPoseKey(castId, k as CastPose), v])) } }
          : { ...b, characterSprites: { ...b.characterSprites, ...made } },
      );
      toast.success('Đã vẽ xong. Nhớ bấm Lưu.');
      setJobId(null);
    }
  }, [jobId, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const reference = bible.characterAssets[0];
  const generate = useMutation({
    mutationFn: (req: { keys: string[]; cast?: string }) => {
      jobFor.current = { cast: req.cast };
      if (req.cast) {
        const own = Object.fromEntries(CAST_POSES.flatMap((k) => (bible.characterCast[castPoseKey(req.cast!, k)] ? [[k, bible.characterCast[castPoseKey(req.cast!, k)]!]] : [])));
        return seriesApi.generateSprites({ reference: bible.characterCast[req.cast]!, existing: own, expressions: req.keys, target: 'cast' });
      }
      const custom = req.keys.filter((k) => k.startsWith('pose:')).map((k) => ({ key: k, prompt: customPoses[k.slice(5)] ?? '' }));
      const standard = req.keys.filter((k) => !k.startsWith('pose:'));
      return seriesApi.generateSprites({ reference: reference!, existing: bible.characterSprites, ...(standard.length ? { expressions: standard } : {}), ...(custom.length ? { custom } : {}) });
    },
    onSuccess: (j) => setJobId(j.id),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const working = Boolean(jobId);
  const progress = job.data?.progress ?? 0;
  const setSprite = (k: string, path: string | null) => {
    const next = { ...bible.characterSprites };
    if (path) next[k] = path;
    else delete next[k];
    set({ characterSprites: next });
  };
  const heroGroup = (title: string, keys: readonly SpriteKey[], hint: string) => (
    <SpriteGroup
      title={title}
      items={keys.map((k) => ({ key: k, label: LABEL[k] }))}
      hint={hint}
      get={(k) => bible.characterSprites[k]}
      extraNeutral={!bible.characterSprites.neutral}
      canGenerate={Boolean(reference)}
      working={working}
      progress={progress}
      onGenerate={(keys) => generate.mutate({ keys })}
      onSet={setSprite}
    />
  );

  // The series' own poses: id → description; their pictures are characterSprites['pose:<id>'].
  const customPoses = bible.customPoses ?? {};
  const [poseId, setPoseId] = useState('');
  const [poseText, setPoseText] = useState('');
  const poseIdOk = POSE_ID.test(poseId) && !(poseId in customPoses);
  const poseOk = poseIdOk && poseText.trim().length >= 3 && Object.keys(customPoses).length < MAX_CUSTOM_POSES;
  const removePose = (id: string) => {
    const nextPoses = { ...customPoses };
    delete nextPoses[id];
    const nextSprites = { ...bible.characterSprites };
    delete nextSprites[customPoseKey(id)];
    set({ customPoses: nextPoses, characterSprites: nextSprites });
  };

  // Supporting cast: base pictures by id; poses `<id>:<pose>` sit beside them in the same map.
  const castIds = Object.keys(bible.characterCast).filter((k) => !k.includes(':'));
  const [openCast, setOpenCast] = useState<string | null>(null);
  const setCast = (k: string, path: string | null) => {
    const next = { ...bible.characterCast };
    if (path) next[k] = path;
    else delete next[k];
    set({ characterCast: next });
  };
  const removeCast = (id: string) => {
    const next = Object.fromEntries(Object.entries(bible.characterCast).filter(([k]) => k !== id && !k.startsWith(`${id}:`)));
    set({ characterCast: next });
    if (openCast === id) setOpenCast(null);
  };

  const [castId, setCastId] = useState('');
  const castIdOk = CAST_ID.test(castId) && !(castId in bible.characterCast);
  const castPoseCount = (id: string) => CAST_POSES.filter((k) => bible.characterCast[castPoseKey(id, k)]).length;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="eyebrow">Series · bản {series.currentVersion}</span>
          <h2>{series.name}</h2>
        </div>
        <div className="row">
          {dirty && <span className="chip warn">Chưa lưu</span>}
          {dirty && (
            <button className="btn sm ghost" onClick={() => setBible(saved)}>
              Bỏ thay đổi
            </button>
          )}
          <button className="btn sm pri" disabled={!dirty || save.isPending || working} onClick={() => save.mutate()}>
            Lưu nhân vật
          </button>
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="col" style={{ flex: '0 0 220px' }}>
          <span className="eyebrow">Ảnh chuẩn · {bible.characterAssets.length}/{MAX_REFERENCES}</span>
          <div className="grid2" style={{ gap: 8 }}>
            {bible.characterAssets.map((p, i) => (
              <div key={p} style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media(p)} alt={`Ảnh chuẩn ${i + 1}`} className="sprite" style={{ width: '100%', objectFit: 'contain' }} />
                <button className="btn sm" aria-label="Bỏ ảnh này" style={{ position: 'absolute', top: 4, right: 4, minHeight: 24, padding: '0 6px' }} onClick={() => set({ characterAssets: bible.characterAssets.filter((x) => x !== p) })}>
                  ×
                </button>
              </div>
            ))}
          </div>
          {bible.characterAssets.length < MAX_REFERENCES && <UploadButton label="+ Thêm ảnh chuẩn" onUploaded={(p) => set({ characterAssets: [...bible.characterAssets, p] })} />}
          <span className="cap">Mọi ảnh cảnh được vẽ theo các ảnh này. Đổi ảnh thì các cảnh cần tạo lại ảnh.</span>
        </div>

        <div className="col grow">
          {heroGroup('Biểu cảm', EXPRESSIONS, 'Ảnh toàn thân, nền trong suốt. Cần ít nhất Bình thường; thêm Đang nói và Nháy mắt để nhân vật nói và chớp mắt.')}
          {heroGroup('Tư thế', POSES, 'Bước 1–4 tạo dáng đi khi nhân vật vào, ra và đi ngang (vẽ hướng sang phải, đi sang trái tự lật). Vẫy 1–2 cho vẫy tay, Lấy đà và Bật nhảy cho nhảy. Thiếu tư thế nào thì cảnh đó dùng ảnh biểu cảm như cũ.')}

          <SpriteGroup
            title="Tư thế riêng"
            items={Object.keys(customPoses).map((id) => ({ key: customPoseKey(id), label: id, title: customPoses[id] }))}
            hint="Tư thế chỉ nhân vật này có, ví dụ múa thương hay cưỡi Phong Hoả Luân. AI vẽ theo mô tả; khi viết kịch bản, AI chọn tư thế này ở ô Tư thế riêng của cảnh."
            get={(k) => bible.characterSprites[k]}
            extraNeutral={!bible.characterSprites.neutral}
            canGenerate={Boolean(reference)}
            working={working}
            progress={progress}
            onGenerate={(keys) => generate.mutate({ keys })}
            onSet={setSprite}
            onRemoveItem={(k) => removePose(k.slice(5))}
            mono
          />
          <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field" style={{ width: 180 }}>
              <label htmlFor={`pose-id-${series.id}`}>Id tư thế</label>
              <input id={`pose-id-${series.id}`} className="input mono" placeholder="ví dụ: mua-thuong" maxLength={24} value={poseId} onChange={(e) => setPoseId(e.target.value.toLowerCase())} />
            </div>
            <div className="field grow">
              <label htmlFor={`pose-text-${series.id}`}>Tư thế trông thế nào (tiếng Anh vẽ chuẩn hơn)</label>
              <input id={`pose-text-${series.id}`} className="input" maxLength={300} placeholder="ví dụ: spinning a red-tasselled spear above the head, one leg raised" value={poseText} onChange={(e) => setPoseText(e.target.value)} />
            </div>
            <button
              className="btn sm"
              disabled={!poseOk}
              onClick={() => {
                set({ customPoses: { ...customPoses, [poseId]: poseText.trim() } });
                setPoseId('');
                setPoseText('');
              }}
            >
              + Thêm tư thế
            </button>
            {poseId && !poseIdOk && <span className="cap">Id chỉ gồm chữ thường, số và dấu gạch, không trùng.</span>}
          </div>

          <span className="eyebrow" style={{ marginTop: 8 }}>
            Nhân vật phụ và đạo cụ · {castIds.length}
          </span>
          <div className="grid4" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {castIds.map((k) => (
              <figure key={k} className="col" style={{ margin: 0, gap: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media(bible.characterCast[k]!)} alt={k} className="sprite" style={{ width: '100%', objectFit: 'contain', outline: openCast === k ? '2px solid var(--ink)' : undefined }} />
                <figcaption className="mono cap" style={{ textAlign: 'center' }}>
                  {k}
                </figcaption>
                <div className="row" style={{ gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <UploadButton label="Đổi" className="btn sm ghost" onUploaded={(path) => setCast(k, path)} />
                  <button className="btn sm ghost" aria-expanded={openCast === k} onClick={() => setOpenCast(openCast === k ? null : k)}>
                    Tư thế {castPoseCount(k)}/{CAST_POSES.length}
                  </button>
                  <button className="btn sm ghost" disabled={working} onClick={() => removeCast(k)}>
                    Bỏ
                  </button>
                </div>
              </figure>
            ))}
          </div>
          {openCast && bible.characterCast[openCast] && (
            <div className="card flat">
              <SpriteGroup
                title={`Tư thế của ${openCast}`}
                items={CAST_POSES.map((k) => ({ key: k, label: CAST_LABEL[k] }))}
                hint="Đang nói để nhân vật phụ mở miệng khi nói câu thoại của nó, Vẫy 1–2 cho vẫy tay, Chỉ tay để chỉ. Đồ vật (bảo vật) không cần tư thế."
                get={(k) => bible.characterCast[castPoseKey(openCast, k as CastPose)]}
                extraNeutral={false}
                canGenerate
                working={working}
                progress={progress}
                onGenerate={(keys) => generate.mutate({ keys, cast: openCast })}
                onSet={(k, path) => setCast(castPoseKey(openCast, k as CastPose), path)}
                columns={4}
              />
            </div>
          )}
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ width: 220 }}>
              <label htmlFor={`cast-${series.id}`}>Thêm nhân vật phụ hoặc đạo cụ</label>
              <input id={`cast-${series.id}`} className="input mono" placeholder="ví dụ: ngao-binh" value={castId} onChange={(e) => setCastId(e.target.value.toLowerCase())} />
            </div>
            <UploadButton
              label="Chọn ảnh và thêm"
              disabled={!castIdOk}
              onUploaded={(path) => {
                set({ characterCast: { ...bible.characterCast, [castId]: path } });
                setCastId('');
              }}
            />
            {castId && !castIdOk && <span className="cap">Id chỉ gồm chữ thường, số và dấu gạch, không trùng.</span>}
          </div>
          <span className="cap">Cảnh có nhân vật diễn gọi các id này ở ô Nhân vật phụ và Bảo vật.</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`chars-${series.id}`}>Mô tả nhân vật cho AI</label>
        <textarea id={`chars-${series.id}`} className="area" rows={4} maxLength={2000} value={bible.characters} onChange={(e) => set({ characters: e.target.value })} placeholder="Tên và đặc điểm cố định, ví dụ: Na Tra: bé trai tóc búi hai bên, áo đỏ, vòng vàng." />
        <span className="hint">{bible.characters.length} / 2000 ký tự</span>
      </div>
    </div>
  );
}

/** One row of sprites (expressions, poses, a supporting character's poses): upload, remove, or have the AI draw the missing ones (with a cost estimate). */
function SpriteGroup({ title, items, hint, get, extraNeutral, canGenerate, working, progress, onGenerate, onSet, onRemoveItem, mono, columns = 7 }: {
  title: string;
  items: { key: string; label: string; title?: string }[];
  hint: string;
  get: (key: string) => string | undefined;
  /** Drawing anything also draws the hero's neutral sprite first when it is missing (one more picture to pay for). */
  extraNeutral: boolean;
  canGenerate: boolean;
  working: boolean;
  progress: number;
  onGenerate: (missing: string[]) => void;
  onSet: (key: string, path: string | null) => void;
  /** Removes the item itself (a custom pose), not just its picture. */
  onRemoveItem?: (key: string) => void;
  mono?: boolean;
  columns?: number;
}) {
  const missing = items.filter((i) => !get(i.key)).map((i) => i.key);
  const cost = missing.length + (extraNeutral && missing.length && !missing.includes('neutral') ? 1 : 0);
  const estimate = useQuery({ queryKey: ['estimate', 'sprites', cost], queryFn: () => usageApi.estimate({ images: cost, texts: [], voice: '' }), enabled: cost > 0, staleTime: 60_000 });
  const name = title.toLowerCase();
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <span className="eyebrow">
          {title} · {items.length - missing.length}/{items.length}
        </span>
        {items.length > 0 && (
          <button className="btn sm dark" disabled={!canGenerate || missing.length === 0 || working} onClick={() => onGenerate(missing)} title={!canGenerate ? 'Cần ảnh chuẩn trước' : undefined}>
            {working ? `Đang vẽ… ${Math.round(progress * 100)}%` : missing.length === 0 ? `Đã đủ ${name}` : `Vẽ ${missing.length} ảnh còn thiếu · ${estimate.data?.usd == null ? 'chưa rõ giá' : usd(estimate.data.usd)}`}
          </button>
        )}
      </div>
      {items.length > 0 && (
        <div className="grid4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}>
          {items.map(({ key, label, title: tip }) => {
            const p = get(key);
            return (
              <figure key={key} className="col" style={{ margin: 0, gap: 4 }} title={tip}>
                {p ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media(p)} alt={label} className="sprite" style={{ width: '100%', objectFit: 'contain' }} />
                ) : (
                  <div className="sprite" style={{ borderStyle: 'dashed' }} />
                )}
                <figcaption className={mono ? 'mono cap' : 'cap'} style={{ textAlign: 'center' }}>
                  {label}
                </figcaption>
                <div className="row" style={{ gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
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
    </>
  );
}
