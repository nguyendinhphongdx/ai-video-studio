'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { appApi, queryKeys } from '@/features/app';
import { skillApi, skillKeys } from '@/features/skill/services/skill.api';
import { errorMessage } from '@/lib/api/client';

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

  const skills = market.data ?? [];
  const tags = [...new Set(skills.flatMap((s) => s.tags))].sort();
  const shown = tag ? skills.filter((s) => s.tags.includes(tag)) : skills;

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
        {tags.length > 0 && (
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm ${tag ? 'ghost' : 'dark'}`} onClick={() => setTag('')}>
              Tất cả
            </button>
            {tags.map((t) => (
              <button key={t} className={`btn sm ${tag === t ? 'dark' : 'ghost'}`} onClick={() => setTag(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        {market.isLoading ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty title="Kho đang trống" />
        ) : (
          <div className="grid3">
            {shown.map((s) => (
              <div key={s.id} className="card flat">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h3>{s.name}</h3>
                  <span className="mono cap">v{s.version}</span>
                </div>
                <p className="muted" style={{ flex: 1 }}>
                  {s.description}
                </p>
                <div className="row" style={{ gap: 6 }}>
                  {s.tags.slice(0, 3).map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                  <span className="cap">
                    {s.scenes.min}-{s.scenes.max} cảnh
                  </span>
                </div>
                {s.issues.some((i) => i.level === 'error') && <div className="alert bad">{s.issues[0]?.message}</div>}
                {s.installedAs ? (
                  <span className="chip ok">
                    <i />
                    Đã có trong dự án
                  </span>
                ) : (
                  <button className="btn sm dark" style={{ alignSelf: 'flex-start' }} disabled={!projectId || install.isPending} onClick={() => install.mutate(s.id)}>
                    Cài vào dự án
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Page>
    </>
  );
}
