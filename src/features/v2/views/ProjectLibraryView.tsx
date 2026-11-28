'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { useChannel } from '@/features/channel/hooks/use-channels';
import { seriesApi } from '@/features/series/services/series.api';

import { projectHref } from '../model';
import { Empty, Loading, Page, Topbar } from '../Shell';
import { CastEditor } from './CastEditor';

/** Project library: the cast of each series (reference, expressions, supporting characters and props) and the project's brand assets. */
export function ProjectLibraryView({ projectId }: { projectId: string }) {
  const project = useChannel(projectId);
  const series = useQuery({ queryKey: ['series', projectId], queryFn: () => seriesApi.list(projectId) });
  const c = project.data;

  return (
    <>
      <Topbar crumbs={[{ label: c?.name ?? 'Dự án', href: projectHref(projectId) }, 'Thư viện dự án']}>
        <Link className="btn pri" href={projectHref(projectId, 'series/new')}>
          + Series mới
        </Link>
      </Topbar>
      <Page>
        <div className="head">
          <div>
            <h1>Thư viện dự án</h1>
            <p>Nhân vật, đạo cụ và tài sản thương hiệu mà mọi tập của dự án dùng chung.</p>
          </div>
        </div>

        {series.isLoading ? (
          <Loading />
        ) : (series.data ?? []).length === 0 ? (
          <Empty title="Dự án chưa có series nào">
            <p className="muted">Nhân vật thuộc về series. Tạo series (hoặc nhờ Đạo diễn lập), rồi dựng nhân vật ở đây.</p>
            <Link className="btn pri" href={projectHref(projectId, 'series/new')}>
              + Series mới
            </Link>
          </Empty>
        ) : (
          (series.data ?? []).map((s) => <CastEditor key={s.id} series={s} />)
        )}

        {c && (
          <div className="card">
            <h2>Thương hiệu</h2>
            <div className="grid4">
              {[
                ['Logo', c.logoUrl],
                ['Người dẫn', c.avatarUrl],
                ['Nền intro', c.introArtUrl],
                ['Nền outro', c.outroArtUrl],
              ].map(([label, url]) => (
                <div key={label} className="col" style={{ gap: 6 }}>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={label ?? ''} className="sprite" style={{ width: '100%', objectFit: 'contain', aspectRatio: '16 / 10' }} />
                  ) : (
                    <div className="sprite" style={{ aspectRatio: '16 / 10' }}>
                      <span>Chưa có</span>
                    </div>
                  )}
                  <span className="cap">{label}</span>
                </div>
              ))}
            </div>
            <span className="cap">Nhạc nền: {c.music === 'none' ? 'không dùng' : c.music.replace(/^media:.*\//, '')}</span>
          </div>
        )}
      </Page>
    </>
  );
}
