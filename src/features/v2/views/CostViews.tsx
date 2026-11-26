'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { UsageKind } from '@/core/usage/cost';
import { appApi, queryKeys } from '@/features/app';
import { fmtNum, fmtUsd, fmtVnd, KIND_LABEL, KIND_SHORT, purposeLabel, RANGE_LABEL } from '@/features/usage/lib/format';
import { usageApi, usageKeys, type BudgetInput, type PriceRow, type UsageRange, type UsageSummary } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

const RANGES = Object.keys(RANGE_LABEL) as UsageRange[];
const KINDS: UsageKind[] = ['llm', 'image', 'tts'];
const KIND_COLOR: Record<UsageKind, string> = { llm: 'var(--ink)', image: 'var(--accent)', tts: 'var(--info)' };

/** Spending: totals, a day-by-day chart, where the money went, budgets and every call. */
export function CostTab() {
  const [range, setRange] = useState<UsageRange>('month');
  const q = useQuery({ queryKey: usageKeys.summary(range), queryFn: () => usageApi.summary(range) });
  const s = q.data;
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? 'on' : undefined} onClick={() => setRange(r)}>
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        {s && <span className="cap">1 USD = {s.fxUsdVnd.toLocaleString('vi-VN')} ₫</span>}
      </div>
      {!s ? (
        <div className="card flat cap">Đang tải…</div>
      ) : (
        <>
          <div className="grid4">
            <Tile label="Tổng chi" value={fmtUsd(s.totals.usd)} sub={fmtVnd(s.totals.usd, s.fxUsdVnd)} />
            <Tile label="Lần gọi AI" value={fmtNum(s.totals.calls)} sub={`${fmtNum(s.totals.inputTokens + s.totals.outputTokens)} token`} />
            <Tile label="Ảnh · giọng" value={`${fmtNum(s.totals.images)} ảnh`} sub={`${Math.round(s.totals.ttsSeconds)} giây lời đọc`} />
            <Tile label="Chưa có giá" value={String(s.totals.unpriced)} sub={s.totals.estimated ? `${s.totals.estimated} lần tính ước lượng` : 'lần gọi chưa biết giá'} warn={s.totals.unpriced > 0} />
          </div>
          <DailyBars daily={s.daily} />
          <div className="grid3">
            <Breakdown title="Theo dự án" rows={s.byChannel.map((g) => ({ k: g.id ?? 'none', name: g.name ?? 'Không thuộc dự án', usd: g.usd, calls: g.calls }))} />
            <Breakdown title="Theo việc" rows={s.byPurpose.map((g) => ({ k: g.key ?? 'none', name: purposeLabel(g.key ?? ''), usd: g.usd, calls: g.calls }))} />
            <Breakdown title="Theo mô hình" rows={s.byModel.map((g) => ({ k: `${g.kind}-${g.provider}-${g.key}`, name: `${g.key}`, hint: g.kind ? KIND_SHORT[g.kind] : '', usd: g.usd, calls: g.calls }))} />
          </div>
          {s.topEpisodes.length > 0 && <Breakdown title="Tập tốn nhất" rows={s.topEpisodes.map((g) => ({ k: g.id ?? '', name: g.name ?? 'Tập đã xoá', usd: g.usd, calls: g.calls }))} />}
          <Budgets budgets={s.budgets} />
          <Events range={range} />
        </>
      )}
    </>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="card flat">
      <span className="eyebrow">{label}</span>
      <b className="mono" style={{ fontSize: 22, color: warn ? 'var(--warn)' : undefined }}>
        {value}
      </b>
      <span className="cap">{sub}</span>
    </div>
  );
}

function DailyBars({ daily }: { daily: UsageSummary['daily'] }) {
  const max = Math.max(0.0001, ...daily.map((d) => d.llm + d.image + d.tts));
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Chi theo ngày</h3>
        <div className="row" style={{ gap: 12 }}>
          {KINDS.map((k) => (
            <span key={k} className="cap row" style={{ gap: 6 }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: KIND_COLOR[k], display: 'inline-block' }} />
              {KIND_LABEL[k]}
            </span>
          ))}
        </div>
      </div>
      {daily.length === 0 ? (
        <span className="cap">Chưa có lần gọi nào trong khoảng này.</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
          {daily.map((d) => {
            const total = d.llm + d.image + d.tts;
            return (
              <div key={d.day} title={`${d.day}: ${fmtUsd(total)}`} style={{ flex: '1 1 0', minWidth: 4, maxWidth: 36, height: '100%', display: 'flex', flexDirection: 'column-reverse' }}>
                {KINDS.map((k) => (
                  <i key={k} style={{ display: 'block', height: `${(d[k] / max) * 100}%`, background: KIND_COLOR[k] }} />
                ))}
              </div>
            );
          })}
        </div>
      )}
      {daily.length > 0 && (
        <div className="row cap" style={{ justifyContent: 'space-between' }}>
          <span>{daily[0]?.day}</span>
          <span>{daily[daily.length - 1]?.day}</span>
        </div>
      )}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { k: string; name: string; hint?: string; usd: number; calls: number }[] }) {
  const max = Math.max(0.0001, ...rows.map((r) => r.usd));
  return (
    <div className="card flat">
      <h3>{title}</h3>
      {rows.length === 0 && <span className="cap">Chưa có.</span>}
      {rows.slice(0, 8).map((r) => (
        <div key={r.k} className="col" style={{ gap: 4 }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>
              {r.name}
              {r.hint && <span className="cap"> · {r.hint}</span>}
            </span>
            <span className="mono">{fmtUsd(r.usd)}</span>
          </div>
          <div className="bar" title={`${r.calls} lần gọi`}>
            <i style={{ width: `${(r.usd / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Budgets({ budgets }: { budgets: UsageSummary['budgets'] }) {
  const qc = useQueryClient();
  const channels = useQuery({ queryKey: queryKeys.channels, queryFn: appApi.channels });
  const done = () => void qc.invalidateQueries({ queryKey: usageKeys.all });
  const save = useMutation({ mutationFn: usageApi.saveBudget, onSuccess: () => (done(), toast.success('Đã lưu ngân sách')), onError: (e) => toast.error(errorMessage(e)) });
  const remove = useMutation({ mutationFn: usageApi.removeBudget, onSuccess: done, onError: (e) => toast.error(errorMessage(e)) });
  const empty: BudgetInput = { scope: 'global', channelId: null, period: 'month', limitUsd: 50, mode: 'warn', alertPct: 80 };
  const [draft, setDraft] = useState<BudgetInput | null>(null);
  const tone = (st: string) => (st === 'over' ? 'err' : st === 'alert' ? 'warn' : 'ok');

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Ngân sách</h3>
        <button className="btn sm" onClick={() => setDraft(empty)}>
          + Thêm ngân sách
        </button>
      </div>
      {budgets.length === 0 && !draft && <span className="cap">Chưa đặt ngân sách nào. Đặt một hạn mức để được cảnh báo hoặc chặn việc tốn tiền khi vượt.</span>}
      {budgets.length > 0 && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Áp dụng cho</th>
              <th>Kỳ</th>
              <th>Đã dùng</th>
              <th>Khi vượt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id}>
                <td>{b.scope === 'global' ? 'Mọi dự án' : (b.channelName ?? 'Dự án đã xoá')}</td>
                <td>{b.period === 'day' ? 'Mỗi ngày' : 'Mỗi tháng'}</td>
                <td style={{ minWidth: 200 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="mono">
                      {fmtUsd(b.spentUsd)} / {fmtUsd(b.limitUsd)}
                    </span>
                    <span className={`chip ${tone(b.state)}`}>{Math.round(b.pct)}%</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${Math.min(100, b.pct)}%` }} />
                  </div>
                </td>
                <td>{b.mode === 'block' ? 'Chặn việc tốn tiền' : `Cảnh báo từ ${b.alertPct}%`}</td>
                <td>
                  <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    <button className="btn sm ghost" onClick={() => setDraft({ id: b.id, scope: b.scope, channelId: b.channelId, period: b.period, limitUsd: b.limitUsd, mode: b.mode, alertPct: b.alertPct })}>
                      Sửa
                    </button>
                    <button className="btn sm ghost" disabled={remove.isPending} onClick={() => confirm('Xoá ngân sách này?') && remove.mutate(b.id)}>
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {draft && (
        <div className="card flat">
          <div className="grid3">
            <div className="field">
              <label htmlFor="bd-scope">Áp dụng cho</label>
              <select id="bd-scope" className="select" value={draft.scope === 'global' ? '' : (draft.channelId ?? '')} onChange={(e) => setDraft({ ...draft, scope: e.target.value ? 'channel' : 'global', channelId: e.target.value || null })}>
                <option value="">Mọi dự án</option>
                {(channels.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bd-period">Kỳ</label>
              <select id="bd-period" className="select" value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value as 'day' | 'month' })}>
                <option value="month">Mỗi tháng</option>
                <option value="day">Mỗi ngày</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="bd-limit">Hạn mức (USD)</label>
              <input id="bd-limit" className="input" type="number" min={0.01} step={0.5} value={draft.limitUsd} onChange={(e) => setDraft({ ...draft, limitUsd: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Khi vượt</label>
              <div className="seg" style={{ alignSelf: 'flex-start' }}>
                <button className={draft.mode === 'warn' ? 'on' : undefined} onClick={() => setDraft({ ...draft, mode: 'warn' })}>
                  Cảnh báo
                </button>
                <button className={draft.mode === 'block' ? 'on' : undefined} onClick={() => setDraft({ ...draft, mode: 'block' })}>
                  Chặn
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="bd-alert">Báo trước khi tới (%)</label>
              <input id="bd-alert" className="input" type="number" min={1} max={100} value={draft.alertPct} onChange={(e) => setDraft({ ...draft, alertPct: Number(e.target.value) })} />
            </div>
          </div>
          <div className="row">
            <button className="btn pri sm" disabled={!(draft.limitUsd > 0) || save.isPending} onClick={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}>
              Lưu ngân sách
            </button>
            <button className="btn sm ghost" onClick={() => setDraft(null)}>
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Events({ range }: { range: UsageRange }) {
  const [kind, setKind] = useState('');
  const q = useInfiniteQuery({
    queryKey: usageKeys.events(range, kind),
    queryFn: ({ pageParam }) => usageApi.events(range, kind, pageParam || undefined),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length < 40 ? undefined : last[last.length - 1]?.at),
  });
  const rows = q.data?.pages.flat() ?? [];
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Từng lần gọi</h3>
        <div className="seg">
          {['', ...KINDS].map((k) => (
            <button key={k || 'all'} className={kind === k ? 'on' : undefined} onClick={() => setKind(k)}>
              {k ? KIND_SHORT[k as UsageKind] : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Lúc</th>
            <th>Việc</th>
            <th>Dự án / tập</th>
            <th>Mô hình</th>
            <th>Khối lượng</th>
            <th>Chi phí</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td className="mono cap">{new Date(e.at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>{purposeLabel(e.purpose)}</td>
              <td className="cap">
                {e.channelName ?? '-'}
                {e.episodeTitle ? ` · ${e.episodeTitle}` : ''}
              </td>
              <td className="mono cap">{e.model}</td>
              <td className="mono cap">{e.kind === 'llm' ? `${fmtNum(e.inputTokens)} → ${fmtNum(e.outputTokens)}` : e.kind === 'image' ? `${e.units} ảnh` : `${Math.round(e.units)} giây`}</td>
              <td className="mono">
                {e.costUsd === null ? <span className="chip warn">Chưa có giá</span> : fmtUsd(e.costUsd)}
                {e.estimated && <span className="cap"> · ước lượng</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !q.isLoading && <span className="cap">Không có lần gọi nào.</span>}
      {q.hasNextPage && (
        <button className="btn sm" style={{ alignSelf: 'center' }} disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
          {q.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}

type Draft = Omit<PriceRow, 'id'> & { key: string };

/** The price book: how much each model costs, used for every cost figure and estimate. Editable; resettable to the shipped defaults. */
export function PricesTab() {
  const qc = useQueryClient();
  const prices = useQuery({ queryKey: usageKeys.prices, queryFn: usageApi.prices });
  const summary = useQuery({ queryKey: usageKeys.summary('month'), queryFn: () => usageApi.summary('month') });
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [fx, setFx] = useState('');
  const toDraft = (p: PriceRow[]): Draft[] => p.map(({ id, ...r }) => ({ ...r, key: String(id) }));
  useEffect(() => {
    if (prices.data) setRows(toDraft(prices.data));
  }, [prices.data]);
  useEffect(() => {
    if (summary.data) setFx(String(summary.data.fxUsdVnd));
  }, [summary.data]);
  const done = (p: PriceRow[]) => {
    qc.setQueryData(usageKeys.prices, p);
    void qc.invalidateQueries({ queryKey: usageKeys.all });
  };
  const save = useMutation({ mutationFn: () => usageApi.savePrices(rows!.map(({ key: _k, ...r }) => r)), onSuccess: (p) => (done(p), toast.success('Đã lưu bảng giá')), onError: (e) => toast.error(errorMessage(e)) });
  const reset = useMutation({ mutationFn: usageApi.resetPrices, onSuccess: (p) => (done(p), toast.success('Đã đặt lại giá mặc định')), onError: (e) => toast.error(errorMessage(e)) });
  const saveFx = useMutation({ mutationFn: () => usageApi.saveFx(Number(fx)), onSuccess: () => (void qc.invalidateQueries({ queryKey: usageKeys.all }), toast.success('Đã lưu tỷ giá')), onError: (e) => toast.error(errorMessage(e)) });

  if (!rows) return <div className="card flat cap">Đang tải…</div>;
  const dirty = JSON.stringify(rows) !== JSON.stringify(toDraft(prices.data ?? []));
  const set = (key: string, patch: Partial<Draft>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const num = (v: number, onChange: (n: number) => void, label: string) => <input className="input mono" aria-label={label} type="number" min={0} step="any" value={v} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 96, minHeight: 32 }} />;

  return (
    <>
      <div className="card flat row" style={{ justifyContent: 'space-between' }}>
        <div className="field" style={{ width: 240 }}>
          <label htmlFor="fx">Tỷ giá (₫ cho 1 USD)</label>
          <input id="fx" className="input mono" type="number" min={1} value={fx} onChange={(e) => setFx(e.target.value)} />
        </div>
        <button className="btn sm" disabled={!(Number(fx) > 0) || String(summary.data?.fxUsdVnd) === fx || saveFx.isPending} onClick={() => saveFx.mutate()}>
          Lưu tỷ giá
        </button>
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h3>Bảng giá</h3>
            <span className="cap">Giá USD. Văn bản tính theo triệu token; ảnh tính theo ảnh. Mẫu tên mô hình khớp theo phần đầu, ví dụ &quot;gemini-2.5-flash&quot;.</span>
          </div>
          <div className="row">
            {dirty && <span className="chip warn">Chưa lưu</span>}
            <button className="btn sm ghost" disabled={reset.isPending} onClick={() => confirm('Đặt lại toàn bộ bảng giá về mặc định?') && reset.mutate()}>
              Đặt lại mặc định
            </button>
            <button className="btn sm pri" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              Lưu bảng giá
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Loại</th>
                <th>Nhà cung cấp</th>
                <th>Mẫu tên mô hình</th>
                <th>Vào / 1M</th>
                <th>Ra / 1M</th>
                <th>Cache / 1M</th>
                <th>Mỗi ảnh</th>
                <th>Ghi chú</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    <select className="select" aria-label="Loại" value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value as UsageKind })} style={{ minHeight: 32, width: 96 }}>
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {KIND_SHORT[k]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="input mono" aria-label="Nhà cung cấp" placeholder="mọi" value={r.provider ?? ''} onChange={(e) => set(r.key, { provider: e.target.value || null })} style={{ width: 110, minHeight: 32 }} />
                  </td>
                  <td>
                    <input className="input mono" aria-label="Mẫu tên mô hình" value={r.pattern} onChange={(e) => set(r.key, { pattern: e.target.value })} style={{ width: 180, minHeight: 32 }} />
                  </td>
                  <td>{num(r.inputPerMtok, (n) => set(r.key, { inputPerMtok: n }), 'Giá vào')}</td>
                  <td>{num(r.outputPerMtok, (n) => set(r.key, { outputPerMtok: n }), 'Giá ra')}</td>
                  <td>{num(r.cachedPerMtok, (n) => set(r.key, { cachedPerMtok: n }), 'Giá cache')}</td>
                  <td>{num(r.perUnit, (n) => set(r.key, { perUnit: n }), 'Giá mỗi ảnh')}</td>
                  <td>
                    <input className="input" aria-label="Ghi chú" value={r.note} onChange={(e) => set(r.key, { note: e.target.value })} style={{ width: 160, minHeight: 32 }} />
                  </td>
                  <td>
                    <button className="btn sm ghost" aria-label="Xoá dòng" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="btn sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setRows([...rows, { key: `new-${Date.now()}`, kind: 'llm', provider: null, pattern: '', inputPerMtok: 0, outputPerMtok: 0, cachedPerMtok: 0, perUnit: 0, note: '' }])}
        >
          + Thêm dòng giá
        </button>
      </div>
    </>
  );
}
