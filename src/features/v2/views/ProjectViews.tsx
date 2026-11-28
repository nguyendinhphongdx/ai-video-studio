'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { DataTable, type DataColumn } from '@/components/data-table';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { useEpisodes, useSkills } from '@/features/episode/hooks/use-episode';
import type { SkillSummary } from '@/features/episode/services/episode.api';
import { usageApi } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

import { currentStep, episodeHref, projectHref, usd } from '../model';
import { Loading, Page, Topbar } from '../Shell';
import { episodeColumns, episodeStats, statusFilter } from './episodes/columns';
import { NewEpisodePanel } from './NewEpisodePanel';
import { SetupChecklist } from './SetupChecklist';

/** Project home: where the project stands, how to add the next episode, and every episode in a table that sorts, searches and filters. */
export function ProjectEpisodesView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useChannel(projectId);
  const episodes = useEpisodes(projectId);
  const costs = useQuery({ queryKey: ['episode-costs', projectId], queryFn: () => usageApi.episodeCosts(projectId), staleTime: 30_000 });
  const columns = useMemo(() => episodeColumns(projectId, costs.data), [projectId, costs.data]);
  const list = episodes.data ?? [];
  const stats = episodeStats(list, costs.data);

  return (
    <>
      <Topbar crumbs={[project.data?.name ?? 'Dự án', 'Các tập']} />
      <Page>
        <div className="head">
          <div>
            <span className="eyebrow">Dự án</span>
            <h1>{project.data?.name ?? 'Các tập'}</h1>
            {project.data?.description && <p>{project.data.description}</p>}
          </div>
          <div className="row">
            <Link className="btn" href={projectHref(projectId, 'settings')}>
              Cài đặt dự án
            </Link>
            <button
              type="button"
              className="btn pri"
              onClick={() => {
                const box = document.getElementById('new-topic');
                box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                box?.focus({ preventScroll: true });
              }}
            >
              + Tập mới
            </button>
          </div>
        </div>

        <div className="stats" aria-label="Tình hình dự án">
          <div className="stat">
            <span className="eyebrow">Tổng số tập</span>
            <b>{stats.total}</b>
            <span className="cap">{stats.planned} đã lên kế hoạch</span>
          </div>
          <div className={`stat${stats.waiting ? ' hot' : ''}`}>
            <span className="eyebrow">Chờ bạn duyệt</span>
            <b>{stats.waiting}</b>
            <span className="cap">kịch bản hoặc video</span>
          </div>
          <div className="stat">
            <span className="eyebrow">Đang sản xuất</span>
            <b>{stats.producing}</b>
          </div>
          <div className="stat">
            <span className="eyebrow">Đã xuất bản</span>
            <b>{stats.published}</b>
          </div>
          <div className="stat">
            <span className="eyebrow">Chi phí AI</span>
            <b>{usd(stats.cost)}</b>
            <Link className="cap" href="/settings">
              Xem chi tiết
            </Link>
          </div>
        </div>

        <div className="eplayout">
          <NewEpisodePanel projectId={projectId} episodeCount={episodes.data?.length} />
          <SetupChecklist projectId={projectId} />
        </div>

        <DataTable
          label="Các tập"
          data={list}
          columns={columns}
          rowId={(v) => v.episode.id}
          loading={episodes.isLoading}
          error={episodes.error ? errorMessage(episodes.error) : undefined}
          search={{ placeholder: 'Tìm theo tên hoặc chủ đề', text: (v) => `${v.episode.title} ${v.episode.topic} ${v.episode.number ?? ''}` }}
          filters={[statusFilter]}
          initialState={{ sort: { id: 'number', dir: 'asc' } }}
          onRowClick={(v) => router.push(episodeHref(projectId, v.episode.id, currentStep(v.episode.status)))}
          empty={
            <div className="col" style={{ alignItems: 'center' }}>
              <h3>Dự án chưa có tập nào</h3>
              <p className="muted">Gõ chủ đề ở ô Tập mới, hoặc bấm Gợi ý chủ đề để AI đề xuất tập mở đầu.</p>
            </div>
          }
        />
      </Page>
    </>
  );
}

/** Project style and skills: how this project's videos look and which playbooks it owns. */
export function ProjectStyleView({ projectId }: { projectId: string }) {
  const project = useChannel(projectId);
  const skills = useSkills(projectId);
  const c = project.data;
  const skillCols = useMemo(() => skillColumns(c?.defaultSkillId ?? null), [c?.defaultSkillId]);
  return (
    <>
      <Topbar crumbs={[{ label: c?.name ?? 'Dự án', href: projectHref(projectId) }, 'Phong cách và skill']}>
        <Link className="btn" href={`/channels/${projectId}`}>
          Sửa ở bản cũ
        </Link>
      </Topbar>
      <Page>
        {!c ? (
          <Loading />
        ) : (
          <>
            <div className="grid3">
              <div className="card flat">
                <span className="eyebrow">Hình ảnh</span>
                <p>{c.imageStyle || <span className="cap">Chưa đặt phong cách vẽ</span>}</p>
                <div className="row" style={{ gap: 6 }}>
                  {c.palette.map((p) => (
                    <i key={p} title={p} style={{ width: 28, height: 28, borderRadius: 6, background: p, border: '1px solid var(--line)' }} />
                  ))}
                </div>
                <span className="cap">Chữ: {c.font}</span>
              </div>
              <div className="card flat">
                <span className="eyebrow">Giọng văn</span>
                <p>{c.style || <span className="cap">Chưa đặt</span>}</p>
                <span className="cap">Khán giả: {c.audience || 'chưa đặt'}</span>
              </div>
              <div className="card flat">
                <span className="eyebrow">Intro và outro</span>
                <div className="grid2" style={{ gap: 8 }}>
                  {(['intro', 'outro'] as const).map((k) => {
                    const url = k === 'intro' ? c.introArtUrl : c.outroArtUrl;
                    const designed = k === 'intro' ? c.introDesign : c.outroDesign;
                    return (
                      <div key={k} className="thumb d" style={url ? { background: `center / cover url(${url})` } : undefined}>
                        <span>
                          {k === 'intro' ? 'Intro' : 'Outro'} · {designed ? 'AI đã thiết kế' : 'mặc định'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2>Skill của dự án</h2>
                <Link className="btn sm" href="/skills">
                  + Thêm từ kho
                </Link>
              </div>
              <DataTable
                label="Skill của dự án"
                data={skills.data ?? []}
                columns={skillCols}
                rowId={(k) => k.id}
                loading={skills.isLoading}
                search={{ placeholder: 'Tìm skill', text: (k) => `${k.name} ${k.description}` }}
                initialState={{ sort: { id: 'name', dir: 'asc' } }}
                empty={<span className="cap">Dự án chưa có skill nào. Thêm từ kho để AI biết cách làm từng kiểu video.</span>}
              />
            </div>
          </>
        )}
      </Page>
    </>
  );
}

const sourceLabel = (k: SkillSummary) => (k.source.startsWith('market:') ? 'Từ kho' : k.source === 'ai' ? 'AI viết' : 'Tự viết');
const skillHealth = (k: SkillSummary) => (k.issues.some((i) => i.level === 'error') ? 0 : k.update ? 1 : 2);

function skillColumns(defaultSkillId: string | null): DataColumn<SkillSummary>[] {
  return [
    {
      id: 'name',
      header: 'Skill',
      sortValue: (k) => k.name,
      cell: (k) => (
        <>
          <b>{k.name}</b>
          {k.id === defaultSkillId && <span className="chip acc" style={{ marginLeft: 8 }}>Mặc định</span>}
          <div className="cap">{k.description}</div>
        </>
      ),
    },
    { id: 'source', header: 'Nguồn', hideBelow: 'sm', sortValue: sourceLabel, cell: (k) => <span className="cap">{sourceLabel(k)}</span> },
    { id: 'version', header: 'Phiên bản', mono: true, hideBelow: 'sm', sortValue: (k) => k.version, cell: (k) => `v${k.version}` },
    {
      id: 'health',
      header: 'Trạng thái',
      sortValue: skillHealth,
      cell: (k) => (skillHealth(k) === 0 ? <span className="chip err">Có lỗi</span> : skillHealth(k) === 1 ? <span className="chip warn">Có bản mới</span> : <span className="chip ok">Ổn</span>),
    },
  ];
}
