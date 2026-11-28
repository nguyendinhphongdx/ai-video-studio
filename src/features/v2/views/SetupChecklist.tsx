'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { queryKeys } from '@/features/app';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { channelApi } from '@/features/channel/services/channel.api';
import { seriesApi } from '@/features/series/services/series.api';
import { setupApi } from '@/features/setup/services/setup.api';
import { usageApi } from '@/features/usage/services/usage.api';
import { api, errorMessage } from '@/lib/api/client';
import type { KnowledgeView } from '@/server/modules/knowledge/knowledge.service';

import { projectHref, usd } from '../model';

/** What the project still lacks, with the way to fill each part. Pictures are only drawn after their price is shown. */
export function SetupChecklist({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const project = useChannel(projectId);
  const knowledge = useQuery({ queryKey: ['knowledge', projectId], queryFn: () => api<KnowledgeView>(`/channels/${projectId}/knowledge`) });
  const series = useQuery({ queryKey: ['setup-series', projectId], queryFn: () => seriesApi.list(projectId) });
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => channelApi.job(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (q) => (q.state.data && ['done', 'failed'].includes(q.state.data.state) ? false : 2000),
  });
  const state = job.data?.state;
  useEffect(() => {
    if (state !== 'done' && state !== 'failed') return;
    if (state === 'failed') toast.error(job.data?.error ?? 'Vẽ ảnh không xong. Thử lại.');
    setJobId(null);
    void qc.invalidateQueries({ queryKey: queryKeys.channels });
    void qc.invalidateQueries({ queryKey: ['channel'] });
    void qc.invalidateQueries({ queryKey: ['setup-series', projectId] });
  }, [state, job.data?.error, qc, projectId]);

  const withLibrary = (series.data ?? []).find((s) => s.rules.bible.library?.length);
  const bible = withLibrary?.rules.bible;
  const toDraw = (bible?.library ?? []).filter((i) => (i.kind === 'hero' ? !bible!.characterAssets.length : !bible!.characterCast[i.id]));
  const c = project.data;
  const needsArt = Boolean(c && !c.introArtUrl && bible?.brandIdeas?.introArt);
  const images = Math.max(toDraw.length, needsArt ? 1 : 0);
  const estimate = useQuery({ queryKey: ['setup-estimate', images], queryFn: () => usageApi.estimate({ images: 1, texts: [], voice: '' }), enabled: images > 0 });
  const price = (n: number) => (estimate.data?.usd == null ? 'chưa có đơn giá' : `ước tính ${usd(estimate.data.usd * n)}`);

  const draw = useMutation({
    mutationFn: (what: 'library' | 'intro') => (what === 'library' ? setupApi.drawLibrary(withLibrary!.id) : channelApi.generateArt(projectId, 'intro', bible!.brandIdeas!.introArt)),
    onSuccess: (j) => setJobId(j.id),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!c || !knowledge.data || !series.data) return null;
  const settings = projectHref(projectId, 'settings');
  const library = projectHref(projectId, 'library');
  const items = [
    { label: 'Thông tin chung', done: Boolean(c.description.trim() && c.audience.trim()), href: settings },
    { label: 'Tri thức', done: Boolean(knowledge.data.current?.markdown.trim()), href: settings },
    { label: 'Phong cách hình vẽ', done: Boolean(c.imageStyle.trim()), href: `/channels/${projectId}` },
    { label: 'Skill', done: Boolean(c.defaultSkillId), href: projectHref(projectId, 'style') },
    { label: toDraw.length ? `Thư viện nhân vật (còn ${toDraw.length} ảnh)` : 'Thư viện nhân vật', done: series.data.some((s) => s.rules.bible.characterAssets.length) && !toDraw.length, href: library },
    { label: 'Logo', done: Boolean(c.logoUrl), href: `/channels/${projectId}` },
    { label: 'Tranh nền intro', done: Boolean(c.introArtUrl), href: `/channels/${projectId}` },
  ];
  const left = items.filter((i) => !i.done).length;
  if (!left) return null;
  const busy = Boolean(jobId) || draw.isPending;

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Thiết lập dự án</h2>
        <span className="cap">
          Xong {items.length - left}/{items.length}
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${((items.length - left) / items.length) * 100}%` }} />
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {items.map((i) => (
          <Link key={i.label} href={i.href} className={`chip ${i.done ? 'ok' : 'warn'}`} style={{ textDecoration: 'none' }}>
            <i />
            {i.label}
          </Link>
        ))}
      </div>
      {(toDraw.length > 0 || needsArt) && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {toDraw.length > 0 && (
            <button className="btn pri" disabled={busy} onClick={() => draw.mutate('library')}>
              Vẽ {toDraw.length} ảnh thư viện ({price(toDraw.length)})
            </button>
          )}
          {needsArt && (
            <button className="btn" disabled={busy} onClick={() => draw.mutate('intro')}>
              Vẽ tranh intro (1 ảnh, {price(1)})
            </button>
          )}
          {jobId && (
            <span className="cap">
              {job.data?.phase ?? 'Đang chờ vẽ'} · {Math.round((job.data?.progress ?? 0) * 100)}%
            </span>
          )}
        </div>
      )}
    </section>
  );
}
