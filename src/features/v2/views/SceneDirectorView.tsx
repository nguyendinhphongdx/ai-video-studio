'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { Scene } from '@/core/domain/episode';
import type { ToolField } from '@/core/tools/tool';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { ScenePlayer } from '@/features/episode/components/preview';
import { isBusy, useEpisode, useEpisodeAction, useSkills, useTools } from '@/features/episode/hooks/use-episode';
import { blockIndex, brandOf, sceneSeconds } from '@/features/episode/lib/preview';
import { episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';
import { usageApi } from '@/features/usage/services/usage.api';

import { episodeHref, usd } from '../model';

const sceneHref = (projectId: string, episodeId: string, sceneId: string) => `/v2/direct/${projectId}/${episodeId}/${sceneId}`;
export { sceneHref };

/** Field keys read as part of the "what happens" sentence, in sentence order, with the words between them. */
const SENTENCE: { key: string; before: string }[] = [
  { key: 'action', before: 'Nhân vật' },
  { key: 'side', before: 'ở' },
  { key: 'emotion', before: ', mặt' },
  { key: 'mood', before: '. Không khí' },
  { key: 'transition', before: '. Mở cảnh bằng' },
];

/**
 * 08b Scene director. Stage first (live preview of the draft), shots below, and on the right the scene written as a
 * sentence of choices built from the block's own fields; free-text fields and advanced ones follow. Edits stay a
 * draft until saved; saving withdraws the scene's approval and marks its picture/voice stale (server rules).
 */
export function SceneDirectorView({ projectId, episodeId, sceneId }: { projectId: string; episodeId: string; sceneId: string }) {
  const router = useRouter();
  const q = useEpisode(episodeId);
  const tools = useTools();
  const project = useChannel(projectId);
  const skills = useSkills(projectId);
  const blocks = useMemo(() => blockIndex(tools.data), [tools.data]);
  const v = q.data;

  const [draft, setDraft] = useState<Scene | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const saved = v?.episode.scenes.find((s) => s.id === sceneId) ?? null;
  // A new scene (or fresh data after a save) resets the draft.
  useEffect(() => setDraft(saved ? structuredClone(saved) : null), [saved]);
  const dirty = Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved));

  const save = useEpisodeAction(episodeId, (scene: Scene) => episodeApi.saveScript(episodeId, toSaveInput(v!, scene)), 'Đã lưu cảnh');
  const gen = useEpisodeAction(episodeId, (what: { image: boolean; voice: boolean }) => episodeApi.assets(episodeId, { sceneIds: [sceneId], ...what, force: true }), 'Đã giao việc tạo lại');
  const approve = useEpisodeAction(episodeId, (approved: boolean) => episodeApi.approvals(episodeId, { sceneIds: [sceneId], approved }));

  const block = draft ? blocks.get(draft.block) : undefined;
  const fields = block?.fields ?? [];
  const wantsImage = fields.some((f) => f.key === 'imagePrompt');
  const estimate = useQuery({
    queryKey: ['estimate', 'scene', episodeId, sceneId, draft?.narration, wantsImage],
    queryFn: () => usageApi.estimate({ images: wantsImage ? 1 : 0, texts: [draft?.narration ?? ''], voice: v?.episode.voice ?? '' }),
    enabled: Boolean(draft && v),
    staleTime: 60_000,
  });

  if (!v || !draft || !block) return <div className="ed" style={{ minHeight: '100dvh', padding: 24 }}>{q.error ? 'Không tải được cảnh này.' : 'Đang tải…'}</div>;

  const scenes = v.episode.scenes;
  const index = scenes.findIndex((s) => s.id === sceneId);
  const assets = v.assets[sceneId];
  const busy = isBusy(v);
  const readOnly = draft.locked || v.episode.status === 'published';
  const setProp = (key: string, value: unknown) => setDraft({ ...draft, props: { ...draft.props, [key]: value } });
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const sentence = SENTENCE.filter((s) => byKey.get(s.key)?.kind === 'choice' && (!byKey.get(s.key)?.advanced || advanced));
  const inSentence = new Set(sentence.map((s) => s.key));
  const rest = fields.filter((f) => !inSentence.has(f.key) && (advanced || !f.advanced));
  const skill = skills.data?.find((s) => s.id === v.episode.skillId);
  const voiceLine = assets?.voiceSeconds ? new Map([[sceneId, { url: '', seconds: assets.voiceSeconds }]]) : undefined;
  const seconds = sceneSeconds(draft, blocks, voiceLine);
  const previewProps = {
    ...draft.props,
    ...(assets?.imageUrl ? { image: assets.imageUrl } : {}),
    ...(draft.block === 'remotion/puppet' ? { sprites: v.sprites, cast: v.cast } : {}),
  };
  const go = (id: string) => {
    if (dirty && !confirm('Cảnh này còn thay đổi chưa lưu. Bỏ thay đổi?')) return;
    router.push(sceneHref(projectId, episodeId, id));
  };
  const cost = estimate.data?.usd;

  return (
    <div className="ed" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="edtop">
        <Link className="btn sm ghost" href={episodeHref(projectId, episodeId, 'storyboard')}>
          ← Storyboard
        </Link>
        <div className="col" style={{ gap: 0, flex: '1 1 auto' }}>
          <span className="cap">
            {v.episode.title || v.episode.topic} · Cảnh {String(index + 1).padStart(2, '0')} / {scenes.length}
          </span>
          <b>{String(draft.props.caption ?? draft.props.heading ?? draft.props.title ?? block.name)}</b>
        </div>
        {dirty && <span className="chip warn">Chưa lưu</span>}
        {dirty && (
          <button className="btn sm ghost" onClick={() => setDraft(structuredClone(saved!))}>
            Bỏ thay đổi
          </button>
        )}
        <button className="btn sm" disabled={!dirty || save.isPending || busy || readOnly} onClick={() => save.mutate(draft)}>
          Lưu cảnh
        </button>
        <button
          className="btn pri"
          disabled={dirty || busy || gen.isPending || readOnly}
          title={dirty ? 'Lưu cảnh trước khi tạo' : undefined}
          onClick={() => gen.mutate({ image: wantsImage, voice: true })}
        >
          Tạo lại cảnh · {cost == null ? 'chưa rõ giá' : usd(cost)}
        </button>
      </header>

      <div className="edbody" style={{ flex: 1 }}>
        <main className="edcenter" style={{ padding: '16px 20px', gap: 12 }}>
          {busy && (
            <div className="alert">
              <span>Đang chạy: {v.job?.phase ?? v.job?.kind} · {Math.round((v.job?.progress ?? 0) * 100)}%</span>
            </div>
          )}
          {v.job?.state === 'failed' && <div className="alert bad">{v.job.error ?? 'Việc vừa chạy bị lỗi.'}</div>}
          <div style={{ width: '100%', maxWidth: 1000, alignSelf: 'center' }}>
            <ScenePlayer key={`${sceneId}-${assets?.imageUrl ?? ''}`} block={draft.block} props={previewProps} ordinal={index + 1} brand={brandOf(project.data ?? null)} durationSec={seconds} narrationSrc={dirty ? null : (assets?.voiceUrl ?? null)} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <span className="cap">
              {block.name} · {seconds.toFixed(1)} giây{dirty ? ' · xem trước bản nháp, giọng cũ tắt' : ''}
            </span>
            <div className="row" style={{ gap: 6 }}>
              {assets?.imageStale && <span className="chip warn">Ảnh không còn khớp mô tả</span>}
              {assets?.voiceStale && <span className="chip warn">Giọng không còn khớp lời</span>}
            </div>
          </div>
          <div className="shotstrip" style={{ overflowX: 'auto', paddingBottom: 4 }}>
            {scenes.map((s, i) => {
              const a = v.assets[s.id];
              return (
                <button key={s.id} className={`shot${s.id === sceneId ? ' on' : ''}`} onClick={() => go(s.id)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
                  <div className={a?.imageUrl ? 'thumb' : `thumb ${'abcde'[i % 5]}`} style={a?.imageUrl ? { background: `center / cover url(${a.imageUrl})` } : undefined}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <span className="cap">
                    {blocks.get(s.block)?.name ?? s.block}
                    {s.approved ? ' · ✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        <aside className="edright" style={{ flexBasis: 400, gap: 14, overflowY: 'auto' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>Chuyện gì xảy ra</b>
            {draft.locked && <span className="chip">Khoá theo series</span>}
          </div>

          {sentence.length > 0 && (
            <div className="beats">
              <div className="beat on">
                <span className="n">1</span>
                <p style={{ lineHeight: 2.2 }}>
                  {sentence.map((s) => (
                    <span key={s.key}>
                      {s.before}{' '}
                      <OptSelect field={byKey.get(s.key)!} value={draft.props[s.key]} disabled={readOnly} onChange={(x) => setProp(s.key, x)} />{' '}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="sd-line">Lời đọc</label>
            <textarea id="sd-line" className="area" maxLength={600} readOnly={readOnly} value={draft.narration} onChange={(e) => setDraft({ ...draft, narration: e.target.value })} />
            <span className="hint">{draft.narration.length} / 600 ký tự. Đổi lời thì phải tạo lại giọng.</span>
          </div>

          {rest.map((f) => (
            <FieldEditor key={f.key} field={f} value={draft.props[f.key]} disabled={readOnly} onChange={(x) => setProp(f.key, x)} cast={v.cast} />
          ))}

          {fields.some((f) => f.advanced) && (
            <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setAdvanced(!advanced)}>
              {advanced ? 'Ẩn tuỳ chọn nâng cao' : 'Tuỳ chọn nâng cao'}
            </button>
          )}

          <hr className="sep" />
          <div className="col" style={{ gap: 8 }}>
            <span className="eyebrow">Đang áp dụng</span>
            <div className="row" style={{ gap: 6 }}>
              {project.data?.imageStyle && <span className="chip">Phong cách: {project.data.imageStyle.slice(0, 32)}</span>}
              {skill && <span className="chip">Skill: {skill.name}</span>}
            </div>
            <span className="cap">
              Đổi ở{' '}
              <Link href={`/v2/projects/${projectId}/style`} style={{ color: 'inherit' }}>
                Phong cách và skill
              </Link>
              .
            </span>
          </div>

          <hr className="sep" />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">Duyệt cảnh</span>
            {draft.approved ? <span className="chip ok">Đã duyệt</span> : assets?.ready ? <span className="chip info">Sẵn sàng</span> : <span className="chip">Chưa đủ ảnh hoặc giọng</span>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {draft.approved ? (
              <button className="btn sm" disabled={dirty || approve.isPending} onClick={() => approve.mutate(false)}>
                Bỏ duyệt
              </button>
            ) : (
              <button className="btn sm dark" disabled={dirty || !assets?.ready || approve.isPending} onClick={() => approve.mutate(true)}>
                Duyệt cảnh
              </button>
            )}
            {index < scenes.length - 1 && (
              <button className="btn sm ghost" onClick={() => go(scenes[index + 1]!.id)}>
                Cảnh sau →
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function OptSelect({ field, value, disabled, onChange }: { field: ToolField; value: unknown; disabled: boolean; onChange: (v: string) => void }) {
  return (
    <select className="opt" aria-label={field.label} disabled={disabled} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} style={{ font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
      {(field.options ?? []).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label.toLowerCase()}
        </option>
      ))}
    </select>
  );
}

function FieldEditor({ field: f, value, disabled, onChange, cast }: { field: ToolField; value: unknown; disabled: boolean; onChange: (v: unknown) => void; cast: Record<string, string> }) {
  const id = `sd-${f.key}`;
  // Id fields that name a cast member get a picker of the series cast instead of a free-text box.
  const castIds = Object.keys(cast);
  const pick = f.kind === 'text' && (f.key === 'companion' || f.key === 'item') && castIds.length > 0;
  return (
    <div className="field">
      <label htmlFor={id}>{f.label}</label>
      {f.kind === 'choice' ? (
        <select id={id} className="select" disabled={disabled} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(f.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : pick ? (
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className={`btn sm ${!value ? 'dark' : ''}`} disabled={disabled} onClick={() => onChange('')}>
            Không
          </button>
          {castIds.map((c) => (
            <button key={c} type="button" className={`btn sm ${value === c ? 'dark' : ''}`} disabled={disabled} onClick={() => onChange(c)} title={c}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cast[c]} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
              {c}
            </button>
          ))}
        </div>
      ) : f.kind === 'textarea' ? (
        <textarea id={id} className="area" maxLength={f.maxLength} readOnly={disabled} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : f.kind === 'count' ? (
        <input id={id} className="input" type="number" min={f.min} max={f.max} readOnly={disabled} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} />
      ) : f.kind === 'color' ? (
        <input id={id} className="input" type="color" disabled={disabled} value={String(value ?? '#000000')} onChange={(e) => onChange(e.target.value)} style={{ padding: 2, width: 64 }} />
      ) : (
        <input id={id} className="input" maxLength={f.maxLength} readOnly={disabled} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.hint && <span className="hint">{f.hint}</span>}
    </div>
  );
}

/** The script save endpoint takes the whole script; only this scene changes. */
function toSaveInput(v: EpisodeView, scene: Scene) {
  return {
    title: v.episode.title,
    publish: v.episode.publish,
    scenes: v.episode.scenes.map((s) => {
      const x = s.id === scene.id ? scene : s;
      return { id: x.id, slotId: x.slotId, block: String(x.block), locked: x.locked, narration: x.narration, props: x.props };
    }),
  };
}
