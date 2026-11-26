'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { appApi, queryKeys } from '@/features/app';
import { usageApi, usageKeys } from '@/features/usage/services/usage.api';

import { projectHref, usd } from '../model';
import { Loading, Page, Topbar } from '../Shell';

/** Product-level library: a map of what each project owns. Editing happens in the project's own library. */
export function LibraryAllView() {
  const channels = useQuery({ queryKey: queryKeys.channels, queryFn: appApi.channels });
  return (
    <>
      <Topbar crumbs={['Thư viện']} />
      <Page>
        <div className="head">
          <div>
            <h1>Thư viện</h1>
            <p>Tổng quan tài sản của mọi dự án. Nhân vật, bối cảnh và đạo cụ thuộc về từng dự án; mở dự án để sửa.</p>
          </div>
        </div>
        {channels.isLoading ? (
          <Loading />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Dự án</th>
                <th>Logo</th>
                <th>Người dẫn</th>
                <th>Intro / outro</th>
                <th>Nhạc nền</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(channels.data ?? []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td>{c.logoUrl ? <span className="chip ok">Có</span> : <span className="chip">Chưa có</span>}</td>
                  <td>{c.avatarUrl ? <span className="chip ok">Có</span> : <span className="chip">Chưa có</span>}</td>
                  <td>
                    {c.introDesign || c.introArtUrl ? <span className="chip ok">Đã thiết kế</span> : <span className="chip warn">Chưa thiết kế</span>}
                  </td>
                  <td className="mono">{c.music === 'none' ? 'Không' : c.music.replace(/^media:.*\//, '')}</td>
                  <td>
                    <Link className="btn sm" href={projectHref(c.id, 'library')}>
                      Mở
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Page>
    </>
  );
}

/** Product-level settings: AI connections and the monthly spend across every project. */
export function SettingsView() {
  const usage = useQuery({ queryKey: usageKeys.summary('month'), queryFn: () => usageApi.summary('month') });
  const s = usage.data;
  const budget = s?.budgets[0];
  return (
    <>
      <Topbar crumbs={['Cài đặt', 'Kết nối AI và chi phí']} />
      <Page width={1100}>
        <div className="grid3">
          <div className="card flat">
            <span className="eyebrow">Tháng này</span>
            <b className="mono" style={{ fontSize: 24 }}>
              {s ? usd(s.totals.usd) : '…'}
            </b>
            <span className="cap">{s ? `${s.totals.calls} lần gọi AI · ${s.totals.images} ảnh` : ''}</span>
          </div>
          <div className="card flat">
            <span className="eyebrow">Ngân sách</span>
            {budget ? (
              <>
                <b className="mono" style={{ fontSize: 24 }}>
                  {usd(budget.spentUsd)} / {usd(budget.limitUsd)}
                </b>
                <div className="bar">
                  <i style={{ width: `${Math.min(100, (budget.spentUsd / Math.max(budget.limitUsd, 0.01)) * 100)}%` }} />
                </div>
              </>
            ) : (
              <span className="cap">Chưa đặt ngân sách</span>
            )}
          </div>
          <div className="card flat">
            <span className="eyebrow">Chưa có giá</span>
            <b style={{ fontSize: 24 }}>{s?.totals.unpriced ?? '…'}</b>
            <span className="cap">lần gọi chưa biết giá</span>
          </div>
        </div>
        <div className="card">
          <h2>Chi phí theo dự án</h2>
          {usage.isLoading ? (
            <Loading />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Dự án</th>
                  <th>Lần gọi</th>
                  <th>Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {(s?.byChannel ?? []).map((g) => (
                  <tr key={g.id || 'none'}>
                    <td>{g.name || 'Không thuộc dự án'}</td>
                    <td className="mono">{g.calls}</td>
                    <td className="mono">{usd(g.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="alert">
          <span>Kết nối mô hình AI, bảng giá và ngân sách chi tiết vẫn sửa ở bản cũ trong lúc dựng v2.</span>
          <Link className="btn sm" href="/settings">
            Kết nối AI
          </Link>
          <Link className="btn sm" href="/usage">
            Chi phí chi tiết
          </Link>
        </div>
      </Page>
    </>
  );
}
