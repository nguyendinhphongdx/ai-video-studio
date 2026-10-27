import Link from 'next/link';

import { ROUTES } from '@/constants/routes';

import { fmtNum, fmtUsd, KIND_SHORT, purposeLabel } from '../lib/format';
import type { UsageSummary } from '../services/usage.api';

interface Row {
  key: string;
  label: React.ReactNode;
  usd: number;
  note: string;
}

/** A ranked list where the bar shows each row's share of the biggest one. */
function Ranked({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  const max = Math.max(0.0000001, ...rows.map((r) => r.usd));
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-5">
      <h3 className="text-body font-bold">{title}</h3>
      {rows.length ? (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-small">
                <span className="min-w-0 truncate font-medium">{r.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">{fmtUsd(r.usd)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (r.usd / max) * 100)}%` }} />
              </div>
              <div className="text-caption text-muted-foreground">{r.note}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

export function Breakdowns({ s }: { s: UsageSummary }) {
  const calls = (n: number) => `${n} lượt`;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Ranked title="Theo kênh" empty="Chưa có chi phí gắn với kênh." rows={s.byChannel.filter((c) => c.id).map((c) => ({ key: c.id!, label: c.name ?? 'Kênh đã xoá', usd: c.usd, note: calls(c.calls) }))} />
      <Ranked
        title="Video tốn nhiều nhất"
        empty="Chưa có chi phí gắn với video."
        rows={s.topEpisodes.map((e) => ({ key: e.id!, label: e.name ? <Link href={ROUTES.episode(e.id!)} className="hover:underline">{e.name}</Link> : 'Video đã xoá', usd: e.usd, note: calls(e.calls) }))}
      />
      <Ranked title="Theo tác vụ" empty="Chưa có lượt gọi." rows={s.byPurpose.map((p) => ({ key: p.key ?? '', label: purposeLabel(p.key ?? ''), usd: p.usd, note: `${calls(p.calls)}${p.inputTokens + p.outputTokens ? ` · ${fmtNum(p.inputTokens)} vào / ${fmtNum(p.outputTokens)} ra` : ''}${p.units ? ` · ${Math.round(p.units)} đơn vị` : ''}` }))} />
      <Ranked title="Theo model" empty="Chưa có lượt gọi." rows={s.byModel.map((m) => ({ key: `${m.kind}|${m.provider}|${m.key}`, label: `${m.key}`, usd: m.usd, note: `${KIND_SHORT[m.kind!]} · ${m.provider} · ${calls(m.calls)}${m.usd === 0 && m.calls ? ' · chưa có giá hoặc miễn phí' : ''}` }))} />
    </div>
  );
}
