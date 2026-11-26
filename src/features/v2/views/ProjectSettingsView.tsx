'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { VOICES } from '@/core/domain/catalog';
import { KnowledgeCard } from '@/features/channel/components/KnowledgeCard';
import { useChannel, useChannelAction } from '@/features/channel/hooks/use-channels';
import { channelApi, toInput, type ChannelInput } from '@/features/channel/services/channel.api';
import { usageApi, usageKeys } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

import { usd } from '../model';
import { Loading, Page, Topbar } from '../Shell';

const TABS = [
  { key: 'general', label: 'Chung' },
  { key: 'voice', label: 'Giọng' },
  { key: 'knowledge', label: 'Tri thức' },
  { key: 'budget', label: 'Ngân sách' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/** Project settings: what the AI must know about the project, its voice, its knowledge and its spending limit. */
export function ProjectSettingsView({ projectId }: { projectId: string }) {
  const project = useChannel(projectId);
  const [tab, setTab] = useState<Tab>('general');
  const [form, setForm] = useState<ChannelInput | null>(null);
  useEffect(() => {
    if (project.data && !form) setForm(toInput(project.data));
  }, [project.data, form]);
  const save = useChannelAction(projectId, (input: ChannelInput) => channelApi.update(projectId, input), 'Đã lưu cài đặt dự án');
  const dirty = Boolean(form && project.data && JSON.stringify(form) !== JSON.stringify(toInput(project.data)));
  const set = <K extends keyof ChannelInput>(k: K, v: ChannelInput[K]) => form && setForm({ ...form, [k]: v });

  return (
    <>
      <Topbar crumbs={[project.data?.name ?? 'Dự án', 'Cài đặt dự án']}>
        {dirty && <span className="chip warn">Chưa lưu</span>}
        {(tab === 'general' || tab === 'voice') && (
          <button className="btn pri" disabled={!dirty || save.isPending} onClick={() => form && save.mutate(form)}>
            Lưu
          </button>
        )}
      </Topbar>
      <Page width={960}>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <a key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : undefined} href={`#${t.key}`} onClick={(e) => (e.preventDefault(), setTab(t.key))}>
              {t.label}
            </a>
          ))}
        </div>
        {!form ? (
          <Loading />
        ) : tab === 'general' ? (
          <div className="card">
            <div className="field">
              <label htmlFor="ps-name">Tên dự án</label>
              <input id="ps-name" className="input" maxLength={60} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ps-desc">Dự án nói về gì</label>
              <textarea id="ps-desc" className="area" maxLength={500} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ps-aud">Khán giả</label>
              <input id="ps-aud" className="input" maxLength={300} value={form.audience} onChange={(e) => set('audience', e.target.value)} />
              <span className="hint">AI viết cho đúng những người này.</span>
            </div>
            <div className="field">
              <label htmlFor="ps-style">Giọng văn</label>
              <textarea id="ps-style" className="area" maxLength={500} value={form.style} onChange={(e) => set('style', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ps-tags">Hashtag</label>
              <input
                id="ps-tags"
                className="input"
                value={form.hashtags.join(' ')}
                onChange={(e) => set('hashtags', e.target.value.split(/\s+/).filter(Boolean).slice(0, 10))}
              />
              <span className="hint">Cách nhau bằng dấu cách, mỗi cái bắt đầu bằng #.</span>
            </div>
          </div>
        ) : tab === 'voice' ? (
          <div className="card">
            <span className="cap">Giọng đọc mặc định cho tập mới. Mỗi tập vẫn đổi được riêng.</span>
            <div className="col" style={{ gap: 8 }}>
              {Object.entries(VOICES).map(([id, label]) => (
                <label key={id} className={`card flat row${form.voice === id ? ' sel' : ''}`} style={{ cursor: 'pointer', gap: 12 }}>
                  <input type="radio" name="voice" checked={form.voice === id} onChange={() => set('voice', id as ChannelInput['voice'])} />
                  <span className="grow">{label}</span>
                  <span className="mono cap">{id}</span>
                </label>
              ))}
            </div>
            <div className="field">
              <label htmlFor="ps-outro">Câu kết video</label>
              <input id="ps-outro" className="input" maxLength={80} value={form.outroText} onChange={(e) => set('outroText', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ps-sub">Lời mời đăng ký</label>
              <input id="ps-sub" className="input" maxLength={40} value={form.subscribeText} onChange={(e) => set('subscribeText', e.target.value)} />
            </div>
          </div>
        ) : tab === 'knowledge' ? (
          <KnowledgeCard channelId={projectId} />
        ) : (
          <BudgetTab projectId={projectId} />
        )}
      </Page>
    </>
  );
}

function BudgetTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const summary = useQuery({ queryKey: usageKeys.summary('month'), queryFn: () => usageApi.summary('month') });
  const budget = summary.data?.budgets.find((b) => b.scope === 'channel' && b.channelId === projectId && b.period === 'month');
  const spent = summary.data?.byChannel.find((g) => g.id === projectId)?.usd ?? 0;
  const [limit, setLimit] = useState('');
  const [mode, setMode] = useState<'warn' | 'block'>('warn');
  useEffect(() => {
    if (budget) {
      setLimit(String(budget.limitUsd));
      setMode(budget.mode);
    }
  }, [budget]);
  const save = useMutation({
    mutationFn: () => usageApi.saveBudget({ id: budget?.id, scope: 'channel', channelId: projectId, period: 'month', limitUsd: Number(limit), mode, alertPct: budget?.alertPct ?? 80 }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usageKeys.all });
      toast.success('Đã lưu ngân sách');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const n = Number(limit);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Ngân sách tháng của dự án</h2>
        <span className="mono">
          Đã dùng {usd(spent)}
          {budget ? ` / ${usd(budget.limitUsd)}` : ''}
        </span>
      </div>
      {budget && (
        <div className="bar">
          <i style={{ width: `${Math.min(100, budget.pct)}%` }} />
        </div>
      )}
      <div className="field">
        <label htmlFor="bg-limit">Tối đa mỗi tháng (USD)</label>
        <input id="bg-limit" className="input" type="number" min={0.01} step={0.5} value={limit} onChange={(e) => setLimit(e.target.value)} style={{ maxWidth: 200 }} />
      </div>
      <div className="field">
        <label>Khi vượt hạn mức</label>
        <div className="seg" style={{ alignSelf: 'flex-start' }}>
          <button className={mode === 'warn' ? 'on' : undefined} onClick={() => setMode('warn')}>
            Chỉ cảnh báo
          </button>
          <button className={mode === 'block' ? 'on' : undefined} onClick={() => setMode('block')}>
            Chặn việc tốn tiền
          </button>
        </div>
      </div>
      <button className="btn pri" style={{ alignSelf: 'flex-start' }} disabled={!(n > 0) || save.isPending} onClick={() => save.mutate()}>
        Lưu ngân sách
      </button>
    </div>
  );
}
