'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { fold } from '@/core/text';
import { appApi, queryKeys } from '@/features/app';
import { episodeKeys } from '@/features/episode/hooks/use-episode';
import { episodeApi } from '@/features/episode/services/episode.api';

import { actionFor, relTime, summarize, type ProjectSummary } from '../lib/home';
import { currentStep, episodeHref, projectHref, STATUS_CHIP } from '../model';
import { Empty, Loading, Page, Topbar } from '../Shell';

type Sort = 'recent' | 'name' | 'episodes';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Gần đây' },
  { key: 'name', label: 'Tên' },
  { key: 'episodes', label: 'Nhiều tập' },
];
const WAITING_SHOWN = 6;

/** The mix of a project's episodes as one bar: published, being made, waiting on the person, failed, not started. */
function Mix({ s }: { s: ProjectSummary }) {
  if (!s.total) return <div className="mix empty" aria-hidden />;
  const parts = [
    ['ok', s.published, 'đã xuất bản'],
    ['info', s.producing, 'đang sản xuất'],
    ['warn', s.waiting, 'chờ duyệt'],
    ['err', s.failed, 'lỗi'],
    ['', s.early, 'chưa bắt đầu'],
  ] as const;
  return (
    <div className="mix" role="img" aria-label={parts.filter((p) => p[1]).map((p) => `${p[1]} ${p[2]}`).join(', ')}>
      {parts.map(([tone, n]) => (n ? <i key={tone || 'early'} className={tone} style={{ flexGrow: n }} /> : null))}
    </div>
  );
}

/** Product home: what waits on the person, then every project with its state at a glance. */
export function HomeView() {
  const channels = useQuery({ queryKey: queryKeys.channels, queryFn: appApi.channels });
  const list = useMemo(() => channels.data ?? [], [channels.data]);
  const episodes = useQueries({ queries: list.map((c) => ({ queryKey: episodeKeys.list(c.id), queryFn: () => episodeApi.list(c.id) })) });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(true);

  const projects = list.map((c, i) => {
    const eps = episodes[i]?.data ?? [];
    return { c, eps, sum: summarize(eps), loading: Boolean(episodes[i]?.isLoading) };
  });
  const waiting = projects
    .flatMap(({ c, eps }) => eps.filter((v) => v.episode.status === 'script_review' || v.episode.status === 'video_review' || v.job?.state === 'failed').map((view) => ({ project: c, view })))
    .sort((a, b) => b.view.episode.updatedAt.localeCompare(a.view.episode.updatedAt));
  const totals = projects.reduce((n, p) => ({ eps: n.eps + p.sum.total, published: n.published + p.sum.published, producing: n.producing + p.sum.producing }), { eps: 0, published: 0, producing: 0 });

  const shown = projects
    .filter((p) => !query.trim() || fold(`${p.c.name} ${p.c.description}`).includes(fold(query.trim())))
    .sort((a, b) => (sort === 'name' ? a.c.name.localeCompare(b.c.name, 'vi') : sort === 'episodes' ? b.sum.total - a.sum.total : (b.sum.lastAt ?? b.c.createdAt ?? '').localeCompare(a.sum.lastAt ?? a.c.createdAt ?? '')));
  const rows = all ? waiting : waiting.slice(0, WAITING_SHOWN);

  return (
    <>
      <Topbar crumbs={['Trang chủ']}>
        <Link className="btn pri" href="/projects/new">
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

        {list.length > 0 && (
          <dl className="metrics" aria-label="Tổng quan">
            {[
              ['Dự án', list.length, ''],
              ['Tập', totals.eps, ''],
              ['Chờ bạn', waiting.length, waiting.length ? 'hot' : ''],
              ['Đang sản xuất', totals.producing, ''],
              ['Đã xuất bản', totals.published, ''],
            ].map(([label, n, tone]) => (
              <div key={label} className={`metric ${tone}`}>
                <dd>{n}</dd>
                <dt>{label}</dt>
              </div>
            ))}
          </dl>
        )}

        {waiting.length > 0 && (
          <section className="card todo" aria-labelledby="todo-h">
            <button type="button" className="todo-head" aria-expanded={open} aria-controls="todo-list" onClick={() => setOpen((v) => !v)}>
              <ChevronDown size={18} className={open ? 'open' : undefined} aria-hidden />
              <h2 id="todo-h">Đang chờ bạn</h2>
              <span className="chip warn">{waiting.length}</span>
            </button>
            {open && (
              <>
                <ul id="todo-list">
                  {rows.map(({ project, view }) => {
                    const failed = view.job?.state === 'failed';
                    const s = STATUS_CHIP[view.episode.status];
                    return (
                      <li key={view.episode.id}>
                        <Link href={episodeHref(project.id, view.episode.id, currentStep(view.episode.status))}>
                          <span className="todo-main">
                            <b>{view.episode.title || view.episode.topic}</b>
                            <span className="cap">
                              {project.name} · {relTime(view.episode.updatedAt)}
                            </span>
                          </span>
                          <span className={`chip ${failed ? 'err' : s.tone}`}>
                            <i />
                            {failed ? 'Lỗi, cần xử lý' : s.label}
                          </span>
                          <span className="todo-go">{actionFor(view)} →</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {waiting.length > WAITING_SHOWN && (
                  <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAll((v) => !v)}>
                    {all ? 'Thu gọn' : `Xem tất cả ${waiting.length} việc`}
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {channels.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title="Chưa có dự án nào">
            <p className="muted">Tạo dự án đầu tiên để bắt đầu viết tập phim.</p>
            <Link className="btn pri" href="/projects/new">
              + Dự án mới
            </Link>
          </Empty>
        ) : (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>Các dự án</h2>
              <div className="row">
                <input className="input" type="search" aria-label="Tìm dự án" placeholder="Tìm dự án" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 220 }} />
                <div className="seg" role="group" aria-label="Sắp xếp">
                  {SORTS.map((s) => (
                    <button key={s.key} type="button" className={sort === s.key ? 'on' : undefined} aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="projgrid">
              {shown.map(({ c, eps, sum, loading }) => {
                // Cover: the project's intro art, else the newest episode's thumbnail, else a plain block.
                const cover = c.introArtUrl ?? [...eps].sort((a, b) => b.episode.updatedAt.localeCompare(a.episode.updatedAt)).flatMap((v) => v.renders).find((r) => r.thumbnailUrl)?.thumbnailUrl;
                return (
                  <Link key={c.id} href={projectHref(c.id)} className="card proj">
                    <div className="proj-cover" style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                      {c.palette[0] && <i className="proj-dot" style={{ background: c.palette[0] }} aria-hidden />}
                      {(sum.waiting > 0 || sum.failed > 0) && <span className={`chip ${sum.failed ? 'err' : 'warn'}`}>{sum.failed ? `${sum.failed} lỗi` : `${sum.waiting} chờ duyệt`}</span>}
                    </div>
                    <div className="proj-body">
                      <h3>{c.name}</h3>
                      <span className="cap proj-desc">{c.description || 'Chưa có mô tả'}</span>
                      <Mix s={sum} />
                      <div className="row proj-meta">
                        <span className="cap">{loading ? 'Đang tải…' : `${sum.total} tập · ${sum.published} đã xuất bản`}</span>
                        <span className="cap">{relTime(sum.lastAt)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              <Link href="/projects/new" className="card proj-new">
                <Plus size={22} aria-hidden />
                <b>Dự án mới</b>
                <span className="cap">Bắt đầu một bộ phim mới</span>
              </Link>
            </div>
            {shown.length === 0 && <p className="cap">Không có dự án nào khớp "{query}".</p>}
          </>
        )}
      </Page>
    </>
  );
}
