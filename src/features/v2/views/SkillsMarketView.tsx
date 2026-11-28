'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { appApi, queryKeys } from '@/features/app';
import { skillApi, skillKeys } from '@/features/skill/services/skill.api';
import { fold } from '@/core/text';
import { errorMessage } from '@/lib/api/client';

import { Section } from '../Section';
import { Empty, Loading, Page, Topbar } from '../Shell';

/** Product-level skill market. Installing makes a project-owned copy; the market entry itself is never edited. */
export function SkillsMarketView() {
  const qc = useQueryClient();
  const channels = useQuery({ queryKey: queryKeys.channels, queryFn: appApi.channels });
  const [target, setTarget] = useState('');
  const projectId = target || channels.data?.[0]?.id || '';
  const market = useQuery({ queryKey: skillKeys.market(projectId), queryFn: () => skillApi.market(projectId || undefined) });
  const [tag, setTag] = useState('');

  const install = useMutation({
    mutationFn: (marketId: string) => skillApi.install(projectId, marketId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: skillKeys.market(projectId) });
      void qc.invalidateQueries({ queryKey: skillKeys.list(projectId) });
      toast.success('Đã cài vào dự án');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const [q, setQ] = useState('');
  const skills = market.data ?? [];
  const counts = new Map<string, number>();
  for (const s of skills) for (const t of s.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const tags = [...counts.keys()].sort();
  const needle = fold(q.trim());
  const shown = skills.filter((s) => (!tag || s.tags.includes(tag)) && (!needle || fold(`${s.name} ${s.description} ${s.tags.join(' ')}`).includes(needle)));
  const have = shown.filter((s) => s.installedAs);
  const fresh = shown.filter((s) => !s.installedAs);

  const card = (s: (typeof skills)[number]) => {
    const bad = s.issues.find((i) => i.level === 'error');
    return (
      <article key={s.id} className="skillcard">
        <div className="skillcard-top">
          <h3>{s.name}</h3>
          <span className="mono cap">v{s.version}</span>
        </div>
        <p className="muted clamp3">{s.description}</p>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {s.tags.slice(0, 3).map((t) => (
            <button key={t} type="button" className="chip" onClick={() => setTag(t)}>
              {t}
            </button>
          ))}
          <span className="cap">
            {s.scenes.min}-{s.scenes.max} cảnh
          </span>
        </div>
        {bad && <div className="alert bad">{bad.message}</div>}
        <div className="skillcard-foot">
          {s.installedAs ? (
            <span className="chip ok">
              <i />
              Đã có trong dự án
            </span>
          ) : (
            <button type="button" className="btn sm dark" disabled={!projectId || install.isPending} onClick={() => install.mutate(s.id)}>
              Cài vào dự án
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <>
      <Topbar crumbs={['Kho skill']}>
        <label className="cap" htmlFor="mk-target">
          Cài vào
        </label>
        <select id="mk-target" className="select" style={{ width: 240 }} value={projectId} onChange={(e) => setTarget(e.target.value)}>
          {(channels.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Topbar>
      <Page>
        <div className="head">
          <div>
            <h1>Kho skill</h1>
            <p>Skill là cách làm mẫu cho một kiểu video. Cài vào dự án sẽ tạo bản sao riêng để dự án tự chỉnh.</p>
          </div>
        </div>
        <div className="skillbar">
          <input className="input" type="search" aria-label="Tìm skill" placeholder="Tìm theo tên, mô tả, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="cap">
            {shown.length}/{skills.length} skill
          </span>
        </div>
        {tags.length > 0 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Lọc theo tag">
            <button type="button" className={`btn sm ${tag ? 'ghost' : 'dark'}`} onClick={() => setTag('')}>
              Tất cả · {skills.length}
            </button>
            {tags.map((t) => (
              <button key={t} type="button" className={`btn sm ${tag === t ? 'dark' : 'ghost'}`} onClick={() => setTag(tag === t ? '' : t)}>
                {t} · {counts.get(t)}
              </button>
            ))}
          </div>
        )}
        {market.isLoading ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty title={skills.length ? 'Không có skill khớp' : 'Kho đang trống'}>
            {skills.length > 0 && (
              <button type="button" className="btn sm" onClick={() => (setQ(''), setTag(''))}>
                Xoá bộ lọc
              </button>
            )}
          </Empty>
        ) : (
          <>
            {fresh.length > 0 && (
              <Section title="Có thể cài" badge={fresh.length}>
                <div className="skillgrid">{fresh.map(card)}</div>
              </Section>
            )}
            {have.length > 0 && (
              <Section title="Đã có trong dự án" badge={have.length} defaultOpen={fresh.length === 0}>
                <div className="skillgrid">{have.map(card)}</div>
              </Section>
            )}
          </>
        )}
      </Page>
    </>
  );
}
