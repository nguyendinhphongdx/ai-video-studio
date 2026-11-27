'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';

import { appApi, queryKeys } from '@/features/app';

import { projectHref } from '../model';
import { Loading, Page, Topbar } from '../Shell';
import { AiConnections } from './AiConnections';
import { CostTab, PricesTab } from './CostViews';
import { WorkspaceTab } from './WorkspaceTab';

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

const SETTINGS_TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'ai', label: 'Kết nối AI' },
  { key: 'cost', label: 'Chi phí' },
  { key: 'prices', label: 'Bảng giá' },
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number]['key'];

/** Workspace settings: people, AI connections, spending across every project, and the price book. */
export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>('ai');
  return (
    <>
      <Topbar crumbs={['Cài đặt', SETTINGS_TABS.find((t) => t.key === tab)!.label]} />
      <Page width={1180}>
        <div className="tabs" role="tablist">
          {SETTINGS_TABS.map((t) => (
            <a key={t.key} href={`#${t.key}`} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : undefined} onClick={(e) => (e.preventDefault(), setTab(t.key))}>
              {t.label}
            </a>
          ))}
        </div>
        {tab === 'workspace' ? <WorkspaceTab /> : tab === 'ai' ? <AiConnections /> : tab === 'cost' ? <CostTab /> : <PricesTab />}
      </Page>
    </>
  );
}
