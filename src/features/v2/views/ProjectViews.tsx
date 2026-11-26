'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { useChannel } from '@/features/channel/hooks/use-channels';
import { useEpisodes, useSkills } from '@/features/episode/hooks/use-episode';
import { episodeApi } from '@/features/episode/services/episode.api';
import { errorMessage } from '@/lib/api/client';

import { currentStep, episodeHref, STATUS_CHIP } from '../model';
import { Empty, Loading, Page, Topbar } from '../Shell';

/** Project home: its episodes, newest first, each opening at the step it is at. */
export function ProjectEpisodesView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useChannel(projectId);
  const episodes = useEpisodes(projectId);
  const [topic, setTopic] = useState('');
  const create = useMutation({
    mutationFn: () => episodeApi.create({ channelId: projectId, topic: topic.trim(), formats: ['landscape'] }),
    onSuccess: (v) => router.push(episodeHref(projectId, v.episode.id, 'script')),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const list = [...(episodes.data ?? [])].sort((a, b) => b.episode.updatedAt.localeCompare(a.episode.updatedAt));

  return (
    <>
      <Topbar crumbs={[project.data?.name ?? 'Dự án', 'Các tập']} />
      <Page>
        <div className="head">
          <div>
            <h1>Các tập</h1>
            <p>{project.data?.description}</p>
          </div>
        </div>
        <form
          className="card flat row"
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim()) create.mutate();
          }}
        >
          <div className="field grow">
            <label htmlFor="new-topic">Tập mới</label>
            <input id="new-topic" className="input" placeholder="Tập này kể về chuyện gì?" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <button className="btn pri" style={{ alignSelf: 'flex-end' }} disabled={!topic.trim() || create.isPending}>
            Tạo tập
          </button>
        </form>
        {episodes.isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title="Dự án chưa có tập nào">
            <p className="muted">Gõ chủ đề ở trên để tạo tập đầu tiên.</p>
          </Empty>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Tập</th>
                <th>Tiêu đề</th>
                <th>Cảnh</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => {
                const e = v.episode;
                const s = STATUS_CHIP[e.status];
                const failed = v.job?.state === 'failed';
                const busy = v.job && (v.job.state === 'queued' || v.job.state === 'running');
                return (
                  <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => router.push(episodeHref(projectId, e.id, currentStep(e.status)))}>
                    <td className="mono">{e.number ?? '-'}</td>
                    <td>
                      <Link href={episodeHref(projectId, e.id, currentStep(e.status))} style={{ color: 'inherit', fontWeight: 600, textDecoration: 'none' }}>
                        {e.title || e.topic}
                      </Link>
                    </td>
                    <td className="mono">{e.scenes.length}</td>
                    <td>
                      <span className={`chip ${failed ? 'err' : busy ? 'info' : s.tone}`}>
                        <i />
                        {failed ? 'Lỗi' : busy ? `Đang chạy · ${Math.round((v.job?.progress ?? 0) * 100)}%` : s.label}
                      </span>
                    </td>
                    <td className="cap">{new Date(e.updatedAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Page>
    </>
  );
}

/** Project style and skills: how this project's videos look and which playbooks it owns. */
export function ProjectStyleView({ projectId }: { projectId: string }) {
  const project = useChannel(projectId);
  const skills = useSkills(projectId);
  const c = project.data;
  return (
    <>
      <Topbar crumbs={[c?.name ?? 'Dự án', 'Phong cách và skill']}>
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
              {skills.isLoading ? (
                <Loading />
              ) : (skills.data ?? []).length === 0 ? (
                <span className="cap">Dự án chưa có skill nào. Thêm từ kho để AI biết cách làm từng kiểu video.</span>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Nguồn</th>
                      <th>Phiên bản</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(skills.data ?? []).map((s) => (
                      <tr key={s.id}>
                        <td>
                          <b>{s.name}</b>
                          {s.id === c.defaultSkillId && <span className="chip acc" style={{ marginLeft: 8 }}>Mặc định</span>}
                          <div className="cap">{s.description}</div>
                        </td>
                        <td className="cap">{s.source.startsWith('market:') ? 'Từ kho' : s.source === 'ai' ? 'AI viết' : 'Tự viết'}</td>
                        <td className="mono">v{s.version}</td>
                        <td>
                          {s.issues.some((i) => i.level === 'error') ? (
                            <span className="chip err">Có lỗi</span>
                          ) : s.update ? (
                            <span className="chip warn">Có bản mới</span>
                          ) : (
                            <span className="chip ok">Ổn</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </Page>
    </>
  );
}
