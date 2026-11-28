'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { useChannel } from '@/features/channel/hooks/use-channels';
import { seriesApi } from '@/features/series/services/series.api';

import { libraryState } from '../lib/library';
import { projectHref } from '../model';
import { Section } from '../Section';
import { Empty, Loading, Page, Topbar } from '../Shell';
import { CastEditor } from './CastEditor';

/**
 * Project library, in groups that fold: the brand kit (edited in settings) and, per series, its characters. The page opens
 * on the first series; the others, and every group inside a series that has nothing yet, start folded.
 */
export function ProjectLibraryView({ projectId }: { projectId: string }) {
  const project = useChannel(projectId);
  const series = useQuery({ queryKey: ['series', projectId], queryFn: () => seriesApi.list(projectId) });
  const c = project.data;
  const list = series.data ?? [];
  const lib = c ? libraryState(c, list) : null;
  const brand: [string, string | null][] = c
    ? [
        ['Logo', c.logoUrl],
        ['Người dẫn', c.avatarUrl],
        ['Nền intro', c.introArtUrl],
        ['Nền outro', c.outroArtUrl],
      ]
    : [];

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
            <p>Thương hiệu và nhân vật mà mọi tập của dự án dùng chung.</p>
          </div>
        </div>

        {c && lib && (
          <section className="card" aria-labelledby="lib-brand">
            <Section
              title={<span id="lib-brand">Thương hiệu</span>}
              badge={`${lib.parts.filter((p) => p.done).length}/${lib.parts.length}`}
              actions={
                <Link className="btn sm" href={`${projectHref(projectId, 'settings')}#brand`}>
                  Chỉnh thương hiệu
                </Link>
              }
            >
              <div className="brandtiles">
                {brand.map(([label, url]) => (
                  <figure key={label} className="col" style={{ margin: 0, gap: 6 }}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={label} className="sprite" style={{ width: '100%', objectFit: 'contain', aspectRatio: '16 / 10' }} />
                    ) : (
                      <div className="sprite" style={{ aspectRatio: '16 / 10', borderStyle: 'dashed' }}>
                        <span>Chưa có</span>
                      </div>
                    )}
                    <figcaption className="cap">{label}</figcaption>
                  </figure>
                ))}
              </div>
              <span className="cap">Nhạc nền: {c.music === 'none' ? 'không dùng' : c.music.replace(/^media:.*\//, '')}</span>
            </Section>
          </section>
        )}

        {series.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title="Dự án chưa có series nào">
            <p className="muted">Nhân vật thuộc về series. Tạo series (hoặc nhờ Đạo diễn lập), rồi dựng nhân vật ở đây.</p>
            <Link className="btn pri" href={projectHref(projectId, 'series/new')}>
              + Series mới
            </Link>
          </Empty>
        ) : (
          list.map((s, i) => <CastEditor key={s.id} series={s} defaultOpen={i === 0} />)
        )}
      </Page>
    </>
  );
}
