'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataColumn, type DataFilter } from '@/components/data-table';
import { fmtNum, fmtUsd, fmtVnd, KIND_LABEL, KIND_SHORT, purposeLabel } from '@/features/usage/lib/format';
import { usageApi, usageKeys, type UsageEventView, type UsageRange } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

import { episodeHref } from '../../model';

const RANGES = [
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: 'all', label: 'Tất cả' },
] as const satisfies readonly { key: UsageRange; label: string }[];

const KINDS = ['llm', 'image', 'tts'] as const;
const COLOR = { llm: 'var(--accent)', image: 'var(--warn, #c98a00)', tts: 'var(--ok, #1f8a4c)' } as const;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** This project's spending: budget on top, totals, a daily chart, where the money went, and every paid call. */
export function CostSection({ projectId }: { projectId: string }) {
  const [range, setRange] = useState<UsageRange>('30d');
  const summary = useQuery({ queryKey: [...usageKeys.summary(range), projectId], queryFn: () => usageApi.summary(range, projectId) });
  const month = useQuery({ queryKey: [...usageKeys.summary('month'), projectId], queryFn: () => usageApi.summary('month', projectId) });
  const s = summary.data;

  return (
    <div className="col" style={{ gap: 'var(--sp-5)' }}>
      <Budget projectId={projectId} month={month.data} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Chi phí đã dùng</h2>
        <div className="seg" role="group" aria-label="Khoảng thời gian">
          {RANGES.map((r) => (
            <button key={r.key} type="button" className={range === r.key ? 'on' : undefined} aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {summary.isError ? (
        <div className="alert warn" role="alert">
          {errorMessage(summary.error)}
        </div>
      ) : !s ? (
        <div className="card flat cap">Đang tải…</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <span className="cap">Tổng chi phí</span>
              <b>{fmtUsd(s.totals.usd)}</b>
              <span className="cap">{fmtVnd(s.totals.usd, s.fxUsdVnd)}</span>
            </div>
            <div className="stat">
              <span className="cap">Lượt gọi AI</span>
              <b>{s.totals.calls}</b>
              <span className="cap">{s.totals.unpriced ? `${s.totals.unpriced} lượt chưa có giá` : 'đều đã có giá'}</span>
            </div>
            <div className="stat">
              <span className="cap">Token văn bản</span>
              <b>{fmtNum(s.totals.inputTokens + s.totals.outputTokens + s.totals.cachedTokens)}</b>
              <span className="cap">
                vào {fmtNum(s.totals.inputTokens + s.totals.cachedTokens)} · ra {fmtNum(s.totals.outputTokens)}
              </span>
            </div>
            <div className="stat">
              <span className="cap">Ảnh AI</span>
              <b>{Math.round(s.totals.images)}</b>
              <span className="cap">ảnh đã tạo</span>
            </div>
            <div className="stat">
              <span className="cap">Giọng đọc</span>
              <b>{Math.round((s.totals.ttsSeconds / 60) * 10) / 10}</b>
              <span className="cap">phút âm thanh</span>
            </div>
          </div>
          <section className="card" aria-labelledby="c-daily">
            <h3 id="c-daily">Theo ngày</h3>
            <Daily s={s} />
          </section>
          <div className="grid2">
            <Ranked title="Theo việc" empty="Chưa có lượt gọi." rows={s.byPurpose.map((p) => ({ key: p.key ?? '', label: purposeLabel(p.key ?? ''), usd: p.usd, note: `${p.calls} lượt` }))} />
            <Ranked
              title="Tập tốn nhiều nhất"
              empty="Chưa có chi phí gắn với tập nào."
              rows={s.topEpisodes.map((e) => ({ key: e.id!, label: e.name ? <Link href={episodeHref(projectId, e.id!)}>{e.name}</Link> : 'Tập đã xoá', usd: e.usd, note: `${e.calls} lượt` }))}
            />
          </div>
          <Events projectId={projectId} range={range} />
        </>
      )}
    </div>
  );
}

function Budget({ projectId, month }: { projectId: string; month: Awaited<ReturnType<typeof usageApi.summary>> | undefined }) {
  const qc = useQueryClient();
  const budget = month?.budgets.find((b) => b.scope === 'channel' && b.channelId === projectId && b.period === 'month');
  const spent = month?.totals.usd ?? 0;
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
  const state = budget?.state;
  return (
    <section className="card" aria-labelledby="c-budget">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="c-budget">Ngân sách tháng này</h2>
        <span className="row">
          {state === 'over' && <span className="chip err">Đã vượt</span>}
          {state === 'alert' && <span className="chip warn">Gần hết</span>}
          {state === 'ok' && <span className="chip ok">Trong hạn mức</span>}
          <span className="mono">
            {fmtUsd(spent)}
            {budget ? ` / ${fmtUsd(budget.limitUsd)}` : ''}
          </span>
        </span>
      </div>
      {budget ? (
        <div className="bar" role="progressbar" aria-label="Đã dùng của ngân sách tháng" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(budget.pct))}>
          <i style={{ width: `${Math.min(100, budget.pct)}%` }} />
        </div>
      ) : (
        <p className="muted">Chưa đặt hạn mức: dự án này tiêu bao nhiêu cũng không bị nhắc. Đặt một hạn mức để được cảnh báo hoặc chặn.</p>
      )}
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field">
          <label htmlFor="bg-limit">Tối đa mỗi tháng (USD)</label>
          <input id="bg-limit" className="input" type="number" min={0.01} step={0.5} value={limit} onChange={(e) => setLimit(e.target.value)} style={{ width: 160 }} />
        </div>
        <div className="field">
          <label id="bg-mode">Khi vượt hạn mức</label>
          <div className="seg" role="group" aria-labelledby="bg-mode">
            <button type="button" className={mode === 'warn' ? 'on' : undefined} onClick={() => setMode('warn')}>
              Chỉ cảnh báo
            </button>
            <button type="button" className={mode === 'block' ? 'on' : undefined} onClick={() => setMode('block')}>
              Chặn việc tốn tiền
            </button>
          </div>
        </div>
        <button type="button" className="btn pri" disabled={!(n > 0) || save.isPending} onClick={() => save.mutate()}>
          Lưu ngân sách
        </button>
      </div>
    </section>
  );
}

/** Every day of the range, stacked by what was spent on. */
function Daily({ s }: { s: Awaited<ReturnType<typeof usageApi.summary>> }) {
  const rows = useMemo(() => {
    const by = new Map(s.daily.map((d) => [d.day, d]));
    const days: string[] = [];
    if (s.range === 'all') days.push(...s.daily.map((d) => d.day));
    else for (const d = new Date(s.from); d <= new Date(); d.setDate(d.getDate() + 1)) days.push(ymd(d));
    return days.map((day) => by.get(day) ?? { day, llm: 0, image: 0, tts: 0 });
  }, [s]);
  const total = (r: { llm: number; image: number; tts: number }) => r.llm + r.image + r.tts;
  const max = Math.max(1e-9, ...rows.map(total));
  const sum = (k: (typeof KINDS)[number]) => rows.reduce((n, r) => n + r[k], 0);
  if (!rows.some((r) => total(r) > 0)) return <p className="cap" style={{ padding: '24px 0', textAlign: 'center' }}>Chưa có lượt gọi nào trong khoảng này.</p>;
  return (
    <>
      <div className="row" style={{ gap: 16 }}>
        {KINDS.map((k) => (
          <span key={k} className="cap row" style={{ gap: 6 }}>
            <i className="dot" style={{ background: COLOR[k] }} aria-hidden />
            {KIND_LABEL[k]} {fmtUsd(sum(k))}
          </span>
        ))}
        <span className="cap" style={{ marginLeft: 'auto' }}>
          Cao nhất một ngày: {fmtUsd(max)}
        </span>
      </div>
      <div className="daily" role="img" aria-label={`Chi phí theo ngày, tổng ${fmtUsd(rows.reduce((n, r) => n + total(r), 0))}`}>
        {rows.map((r) => (
          <div key={r.day} className="day" title={`${r.day}: ${fmtUsd(total(r))}`}>
            <div className="stack" style={{ height: `${(total(r) / max) * 100}%`, minHeight: total(r) > 0 ? 2 : 0 }}>
              {KINDS.map((k) => (r[k] > 0 ? <div key={k} style={{ height: `${(r[k] / total(r)) * 100}%`, background: COLOR[k] }} /> : null))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Ranked({ title, rows, empty }: { title: string; rows: { key: string; label: React.ReactNode; usd: number; note: string }[]; empty: string }) {
  const max = Math.max(1e-9, ...rows.map((r) => r.usd));
  return (
    <section className="card">
      <h3>{title}</h3>
      {rows.length ? (
        <ul className="ranked">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {r.label}
                </span>
                <span className="mono">{fmtUsd(r.usd)}</span>
              </div>
              <div className="bar" aria-hidden>
                <i style={{ width: `${Math.max(2, (r.usd / max) * 100)}%` }} />
              </div>
              <span className="cap">{r.note}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cap">{empty}</p>
      )}
    </section>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Every paid call of the project, newest first, searchable and filterable by kind; older ones load on request. */
function Events({ projectId, range }: { projectId: string; range: UsageRange }) {
  const [rows, setRows] = useState<UsageEventView[]>([]);
  const [more, setMore] = useState(true);
  const first = useQuery({ queryKey: [...usageKeys.events(range, ''), projectId], queryFn: () => usageApi.events(range, '', undefined, projectId) });
  useEffect(() => {
    if (!first.data) return;
    setRows(first.data);
    setMore(first.data.length >= 40);
  }, [first.data]);
  const older = useMutation({
    mutationFn: () => usageApi.events(range, '', rows.at(-1)?.at, projectId),
    onSuccess: (page) => {
      setRows((r) => [...r, ...page]);
      setMore(page.length >= 40);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<DataColumn<UsageEventView>[]>(
    () => [
      { id: 'at', header: 'Lúc', cell: (e) => <span className="cap">{when(e.at)}</span>, sortValue: (e) => e.at, width: '110px' },
      { id: 'kind', header: 'Loại', cell: (e) => <span className="chip">{KIND_SHORT[e.kind]}</span>, sortValue: (e) => e.kind, width: '80px', hideBelow: 'sm' },
      {
        id: 'purpose',
        header: 'Việc',
        cell: (e) => (
          <>
            <b>{purposeLabel(e.purpose)}</b>
            <span className="cap" style={{ display: 'block' }}>
              {e.episodeId ? <Link href={episodeHref(projectId, e.episodeId)}>{e.episodeTitle ?? 'Tập'}</Link> : null}
              {e.episodeId ? ' · ' : ''}
              {e.model}
            </span>
          </>
        ),
        sortValue: (e) => purposeLabel(e.purpose),
      },
      {
        id: 'amount',
        header: 'Khối lượng',
        cell: (e) => <span className="cap">{e.kind === 'llm' ? `${fmtNum(e.inputTokens + e.cachedTokens)} vào · ${fmtNum(e.outputTokens)} ra` : e.kind === 'image' ? `${Math.round(e.units)} ảnh` : `${Math.round(e.units)} giây`}{e.estimated ? ' · ước tính' : ''}</span>,
        hideBelow: 'md',
      },
      { id: 'cost', header: 'Chi phí', cell: (e) => (e.costUsd === null ? <span className="chip warn">chưa có giá</span> : fmtUsd(e.costUsd)), sortValue: (e) => e.costUsd, align: 'right', mono: true },
    ],
    [projectId],
  );
  const kindFilter = useMemo<DataFilter<UsageEventView>>(() => ({ id: 'kind', label: 'Loại', options: KINDS.map((k) => ({ value: k, label: KIND_LABEL[k], match: (e: UsageEventView) => e.kind === k })) }), []);

  return (
    <section className="card" aria-labelledby="c-events">
      <h3 id="c-events">Lịch sử gọi AI</h3>
      <DataTable
        data={rows}
        columns={columns}
        rowId={(e) => e.id}
        label="Lịch sử gọi AI của dự án"
        loading={first.isLoading}
        error={first.isError ? errorMessage(first.error) : undefined}
        search={{ placeholder: 'Tìm theo việc, tập hoặc model', text: (e) => `${purposeLabel(e.purpose)} ${e.episodeTitle ?? ''} ${e.model}` }}
        filters={[kindFilter]}
        pageSizes={[10, 25, 50]}
        empty={<p className="cap">Chưa có lượt gọi nào trong khoảng này.</p>}
        footer={more && rows.length > 0 ? (
          <button type="button" className="btn sm" disabled={older.isPending} onClick={() => older.mutate()}>
            {older.isPending ? 'Đang tải…' : 'Tải thêm lượt cũ hơn'}
          </button>
        ) : undefined}
      />
    </section>
  );
}
