'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { queryKeys } from '@/features/app';
import { AskAiButton } from '@/features/assistant/components/AskAiButton';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { channelApi } from '@/features/channel/services/channel.api';
import { seriesApi } from '@/features/series/services/series.api';
import { setupApi } from '@/features/setup/services/setup.api';
import { usageApi } from '@/features/usage/services/usage.api';
import { api, errorMessage } from '@/lib/api/client';
import type { KnowledgeView } from '@/server/modules/knowledge/knowledge.service';

import { setupPrompt, type SetupKey } from '../lib/setup-prompts';
import { projectHref, usd } from '../model';
import { LogoDraftCard } from './LogoDraft';

/**
 * What the project still lacks, as a checklist: a tick for each finished part, an empty circle for each open one. An open
 * part has a link to where it is edited and either "AI làm" (a ready request to the assistant, confirmed in its panel) or,
 * for pictures with a known idea, a draw button that shows its price first. Disappears when everything is done.
 */
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
  const missingArt = (['intro', 'outro'] as const).filter((k) => c && bible?.brandIdeas?.introArt && !(k === 'intro' ? c.introArtUrl : c.outroArtUrl));
  const images = Math.max(toDraw.length, missingArt.length);
  const estimate = useQuery({ queryKey: ['setup-estimate', images], queryFn: () => usageApi.estimate({ images: 1, texts: [], voice: '' }), enabled: images > 0 });
  const price = (n: number) => (estimate.data?.usd == null ? 'chưa có đơn giá' : `ước tính ${usd(estimate.data.usd * n)}`);

  const draw = useMutation({
    mutationFn: (what: 'library' | 'intro' | 'outro') => (what === 'library' ? setupApi.drawLibrary(withLibrary!.id) : channelApi.generateArt(projectId, what, bible!.brandIdeas!.introArt)),
    onSuccess: (j) => setJobId(j.id),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!c || !knowledge.data || !series.data) return null;
  const settings = projectHref(projectId, 'settings');
  const library = projectHref(projectId, 'library');
  const facts = { name: c.name, description: c.description, audience: c.audience, imageStyle: c.imageStyle };
  const channelPage = `/channels/${projectId}`;
  type Item = { key: string; label: string; done: boolean; hint: string; href: string; ai?: SetupKey; draw?: { what: 'library' | 'intro' | 'outro'; text: string } };
  const generalMissing = [!c.description.trim() && 'mô tả', !c.audience.trim() && 'khán giả'].filter(Boolean).join(' và ');
  const items: Item[] = [
    { key: 'general', label: 'Thông tin chung', done: Boolean(c.description.trim() && c.audience.trim()), hint: `Thiếu ${generalMissing}`, href: settings, ai: 'general' },
    { key: 'knowledge', label: 'Tri thức', done: Boolean(knowledge.data.current?.markdown.trim()), hint: 'Sự thật và quy tắc mọi video phải bám theo', href: settings, ai: 'knowledge' },
    { key: 'style', label: 'Phong cách hình vẽ', done: Boolean(c.imageStyle.trim()), hint: 'AI vẽ mọi ảnh cùng một phong cách', href: channelPage, ai: 'style' },
    { key: 'skill', label: 'Skill', done: Boolean(c.defaultSkillId), hint: 'Cách làm video của dự án', href: projectHref(projectId, 'style'), ai: 'skill' },
    {
      key: 'library',
      label: 'Thư viện nhân vật',
      done: series.data.some((s) => s.rules.bible.characterAssets.length) && !toDraw.length,
      hint: toDraw.length ? `Còn ${toDraw.length} ảnh chưa vẽ` : 'Chưa có nhân vật nào',
      href: library,
      draw: toDraw.length ? { what: 'library', text: `Vẽ ${toDraw.length} ảnh (${price(toDraw.length)})` } : undefined,
    },
    { key: 'logo', label: 'Logo', done: Boolean(c.logoUrl), hint: 'Tải lên hoặc nhờ AI vẽ', href: settings, ai: 'logo' },
    ...(['intro', 'outro'] as const).map((k): Item => {
      const done = Boolean(k === 'intro' ? c.introArtUrl : c.outroArtUrl);
      const known = Boolean(bible?.brandIdeas?.introArt);
      return {
        key: `${k}Art`,
        label: `Tranh nền ${k}`,
        done,
        hint: known ? 'Đã có ý tưởng, chờ vẽ' : 'Chưa có ý tưởng tranh',
        href: channelPage,
        ai: known ? undefined : (`${k}Art` as SetupKey),
        draw: known ? { what: k, text: `Vẽ 1 ảnh (${price(1)})` } : undefined,
      };
    }),
  ];
  const left = items.filter((i) => !i.done).length;
  if (!left) return null;
  const busy = Boolean(jobId) || draw.isPending;

  return (
    <section className="card setup" aria-labelledby="setup-title">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="setup-title">Thiết lập dự án</h2>
        <span className="cap">
          Xong {items.length - left}/{items.length}
        </span>
      </div>
      <div className="bar" role="progressbar" aria-label="Tiến độ thiết lập" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={items.length - left}>
        <i style={{ width: `${((items.length - left) / items.length) * 100}%` }} />
      </div>
      <ul className="checks">
        {items.map((i) => (
          <li key={i.key} className={i.done ? 'done' : undefined}>
            <span className="tick" aria-hidden>
              {i.done && <Check size={13} strokeWidth={3} />}
            </span>
            <div className="checks-main">
              <Link href={i.href}>{i.label}</Link>
              <span className="sr-only">{i.done ? ' (đã xong)' : ' (chưa xong)'}</span>
              {!i.done && <span className="cap">{i.hint}</span>}
              {!i.done && i.key === 'logo' && <LogoDraftCard projectId={projectId} />}
            </div>
            {!i.done && i.draw && (
              <button type="button" className="btn sm pri" disabled={busy} onClick={() => draw.mutate(i.draw!.what)}>
                {i.draw.text}
              </button>
            )}
            {!i.done && i.ai && <AskAiButton label="AI làm" {...setupPrompt(i.ai, facts)} />}
          </li>
        ))}
      </ul>
      {jobId && (
        <span className="cap" role="status">
          {job.data?.phase ?? 'Đang chờ vẽ'} · {Math.round((job.data?.progress ?? 0) * 100)}%
        </span>
      )}
    </section>
  );
}
