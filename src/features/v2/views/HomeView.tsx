'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { appApi, queryKeys } from '@/features/app';
import { episodeApi } from '@/features/episode/services/episode.api';
import { episodeKeys } from '@/features/episode/hooks/use-episode';

import { currentStep, episodeHref, projectHref, STATUS_CHIP } from '../model';
import { Empty, Loading, Page, Topbar } from '../Shell';

/** Product home: every project at a glance, and the episodes that are waiting on the person. */
export function HomeView() {
  const channels = useQuery({ queryKey: queryKeys.channels, queryFn: appApi.channels });
  const list = channels.data ?? [];
  const episodes = useQueries({ queries: list.map((c) => ({ queryKey: episodeKeys.list(c.id), queryFn: () => episodeApi.list(c.id) })) });

  const waiting = list.flatMap((c, i) =>
    (episodes[i]?.data ?? [])
      .filter((v) => v.episode.status === 'script_review' || v.episode.status === 'video_review' || v.job?.state === 'failed')
      .map((v) => ({ project: c, view: v })),
  );

  return (
    <>
      <Topbar crumbs={['Trang chủ']}>
        <Link className="btn" href="/">
          Mở bản cũ
        </Link>
        <Link className="btn pri" href="/channels">
          + Dự án mới
        </Link>
      </Topbar>
      <Page>
        <div className="head">
          <div>
            <h1>Dự án của bạn</h1>
            <p>Mỗi dự án có thư viện, phong cách, skill và cài đặt riêng.</p>
          </div>
        </div>

        {waiting.length > 0 && (
          <div className="card flat">
            <span className="eyebrow">Đang chờ bạn · {waiting.length}</span>
            {waiting.slice(0, 5).map(({ project, view }) => {
              const s = STATUS_CHIP[view.episode.status];
              const failed = view.job?.state === 'failed';
              return (
                <Link key={view.episode.id} href={episodeHref(project.id, view.episode.id, currentStep(view.episode.status))} className="row" style={{ justifyContent: 'space-between', color: 'inherit', textDecoration: 'none' }}>
                  <span>
                    <b>{view.episode.title || view.episode.topic}</b> <span className="cap">· {project.name}</span>
                  </span>
                  <span className={`chip ${failed ? 'err' : s.tone}`}>
                    <i />
                    {failed ? 'Lỗi, cần xử lý' : s.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {channels.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title="Chưa có dự án nào">
            <p className="muted">Tạo dự án đầu tiên để bắt đầu viết tập phim.</p>
            <Link className="btn pri" href="/channels">
              + Dự án mới
            </Link>
          </Empty>
        ) : (
          <div className="grid3">
            {list.map((c, i) => {
              const eps = episodes[i]?.data ?? [];
              const done = eps.filter((v) => v.episode.status === 'published').length;
              return (
                <Link key={c.id} href={projectHref(c.id)} className="card" style={{ color: 'inherit', textDecoration: 'none', padding: 0, overflow: 'hidden', gap: 0 }}>
                  <div className="thumb a" style={{ borderRadius: 0, background: c.introArtUrl ? `center / cover url(${c.introArtUrl})` : undefined }}>
                    <span>{c.palette[0] && <i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: c.palette[0], marginRight: 6 }} />}{c.name}</span>
                  </div>
                  <div className="col" style={{ padding: 16, gap: 4 }}>
                    <h3>{c.name}</h3>
                    <span className="cap">{c.description || 'Chưa có mô tả'}</span>
                    <span className="cap">
                      {eps.length} tập · {done} đã xuất bản
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Page>
    </>
  );
}
