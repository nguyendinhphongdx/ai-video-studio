'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DataTable, type DataColumn, type DataFilter } from '@/components/data-table';
import type { ChannelView } from '@/features/channel/services/channel.api';
import { seriesApi } from '@/features/series/services/series.api';
import Link from 'next/link';

import { appApi, queryKeys } from '@/features/app';

import { libraryState, type LibraryState } from '../lib/library';
import { projectHref } from '../model';
import { Page, Topbar } from '../Shell';
import { AiConnections, SystemTab } from './AiConnections';
import { useMe } from '@/features/auth/AccountBox';
import { CostTab, PricesTab } from './CostViews';
import { McpTab } from './McpTab';
import { WorkspaceTab } from './WorkspaceTab';

type LibRow = { c: ChannelView; lib: LibraryState };

const slot = (url: string | null, label: string) =>
  url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={label} className="slot" src={url} alt={label} title={label} />
  ) : (
    <span key={label} className="slot blank" title={`${label}: chưa có`} aria-label={`${label}: chưa có`} />
  );

const libColumns = (): DataColumn<LibRow>[] => [
  {
    id: 'name',
    header: 'Dự án',
    cell: ({ c }) => (
      <span className="eptitle">
        <b>{c.name}</b>
        <span className="cap clamp1" title={c.description || undefined}>
          {c.description || 'Chưa có mô tả'}
        </span>
      </span>
    ),
    sortValue: ({ c }) => c.name,
  },
  { id: 'brand', header: 'Thương hiệu', cell: ({ c }) => <span className="slots">{[slot(c.logoUrl, 'Logo'), slot(c.avatarUrl, 'Người dẫn'), slot(c.introArtUrl, 'Nền intro'), slot(c.outroArtUrl, 'Nền outro')]}</span> },
  {
    id: 'figures',
    header: 'Nhân vật',
    cell: ({ lib }) =>
      lib.figures ? (
        <span className="eptitle">
          <b>
            {lib.drawn}/{lib.figures} đã vẽ
          </b>
          <span className="bar" aria-hidden style={{ width: 90 }}>
            <i style={{ width: `${(lib.drawn / lib.figures) * 100}%` }} />
          </span>
        </span>
      ) : (
        <span className="cap">Chưa có</span>
      ),
    sortValue: ({ lib }) => lib.figures,
    hideBelow: 'sm',
  },
  { id: 'music', header: 'Nhạc nền', cell: ({ c }) => <span className="mono">{c.music === 'none' ? 'Không' : c.music.replace(/^media:.*\//, '')}</span>, sortValue: ({ c }) => c.music, hideBelow: 'md' },
  {
    id: 'done',
    header: 'Hoàn thiện',
    cell: ({ lib }) => {
      const missing = lib.parts.filter((p) => !p.done).map((p) => p.label);
      return (
        <span className="eptitle">
          <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <span className="bar" style={{ width: 70 }} role="progressbar" aria-label="Hoàn thiện" aria-valuemin={0} aria-valuemax={lib.total} aria-valuenow={lib.done}>
              <i style={{ width: `${(lib.done / lib.total) * 100}%` }} />
            </span>
            <span className="cap">
              {lib.done}/{lib.total}
            </span>
          </span>
          <span className="cap">{lib.complete ? 'Đủ bộ' : missing.length ? `Thiếu ${missing.join(', ')}` : 'Còn nhân vật chưa vẽ'}</span>
        </span>
      );
    },
    sortValue: ({ lib }) => lib.done / lib.total,
    hideBelow: 'sm',
  },
  {
    id: 'open',
    header: '',
    cell: ({ c }) => (
      <Link className="btn sm" href={projectHref(c.id, 'library')} onClick={(e) => e.stopPropagation()}>
        Mở
      </Link>
    ),
    align: 'right',
    width: 80,
  },
];

const libFilter: DataFilter<LibRow> = {
  id: 'state',
  label: 'Tình trạng',
  options: [
    { value: 'missing', label: 'Còn thiếu', match: ({ lib }) => !lib.complete },
    { value: 'full', label: 'Đủ bộ', match: ({ lib }) => lib.complete },
  ],
};

/** Product-level library: what each project's library holds and lacks. Editing happens in the project's own library. */
export function LibraryAllView() {
  const router = useRouter();
  const channels = useQuery({ queryKey: queryKeys.channels, queryFn: appApi.channels });
  const list = useMemo(() => channels.data ?? [], [channels.data]);
  const series = useQueries({ queries: list.map((c) => ({ queryKey: ['series', c.id], queryFn: () => seriesApi.list(c.id) })) });
  const rows = useMemo<LibRow[]>(() => list.map((c, i) => ({ c, lib: libraryState(c, series[i]?.data ?? []) })), [list, series]);
  const columns = useMemo(libColumns, []);
  const ready = rows.filter((r) => r.lib.complete).length;
  return (
    <>
      <Topbar crumbs={['Thư viện']} />
      <Page>
        <div className="head">
          <div>
            <h1>Thư viện</h1>
            <p>Tài sản của mọi dự án: logo, người dẫn, nền intro và outro, nhạc, nhân vật. Mở một dự án để sửa.</p>
          </div>
        </div>
        {list.length > 0 && (
          <dl className="metrics" aria-label="Tổng quan">
            <div className="metric">
              <dd>{list.length}</dd>
              <dt>Dự án</dt>
            </div>
            <div className="metric">
              <dd>{ready}</dd>
              <dt>Đủ bộ</dt>
            </div>
            <div className={`metric${list.length - ready ? ' hot' : ''}`}>
              <dd>{list.length - ready}</dd>
              <dt>Còn thiếu</dt>
            </div>
            <div className="metric">
              <dd>{rows.reduce((n, r) => n + r.lib.figures, 0)}</dd>
              <dt>Nhân vật</dt>
            </div>
          </dl>
        )}
        <DataTable
          data={rows}
          columns={columns}
          rowId={(r) => r.c.id}
          label="Thư viện của các dự án"
          loading={channels.isLoading}
          search={{ placeholder: 'Tìm dự án', text: (r) => `${r.c.name} ${r.c.description}` }}
          filters={[libFilter]}
          onRowClick={(r) => router.push(projectHref(r.c.id, 'library'))}
          initialState={{ sort: { id: 'name', dir: 'asc' } }}
          empty={<p className="cap">Chưa có dự án nào.</p>}
        />
      </Page>
    </>
  );
}

const SETTINGS_TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'ai', label: 'Kết nối AI' },
  { key: 'mcp', label: 'AI bên ngoài' },
  { key: 'cost', label: 'Chi phí' },
  { key: 'prices', label: 'Bảng giá' },
  { key: 'system', label: 'Hệ thống' },
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number]['key'];

/** Workspace settings: people, AI connections, spending across every project, and the price book. */
export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>('ai');
  const admin = useMe().data?.user.isAdmin;
  const owner = useMe().data?.role === 'owner';
  // The system tab (shared keys, which workspaces may use them) is for the system admin only; codes for outside AI are the owner's.
  const tabs = SETTINGS_TABS.filter((t) => (t.key !== 'system' || admin) && (t.key !== 'mcp' || owner));
  return (
    <>
      <Topbar crumbs={[{ label: 'Cài đặt', href: '/settings' }, SETTINGS_TABS.find((t) => t.key === tab)!.label]} />
      <Page width={1180}>
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <a key={t.key} href={`#${t.key}`} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : undefined} onClick={(e) => (e.preventDefault(), setTab(t.key))}>
              {t.label}
            </a>
          ))}
        </div>
        {tab === 'workspace' ? <WorkspaceTab /> : tab === 'ai' ? <AiConnections /> : tab === 'mcp' ? <McpTab /> :tab === 'cost' ? <CostTab /> : tab === 'system' ? <SystemTab /> : <PricesTab />}
      </Page>
    </>
  );
}
