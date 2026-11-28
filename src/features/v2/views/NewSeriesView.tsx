'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { lintFormat } from '@/core/series/format';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { useSkills, useTools } from '@/features/episode';
import { BibleEditor } from '@/features/series/components/BibleEditor';
import { FormatEditor } from '@/features/series/components/FormatEditor';
import { PublishEditor } from '@/features/series/components/PublishEditor';
import { RoadmapEditor } from '@/features/series/components/RoadmapEditor';
import { seriesApi, type SeriesProposal } from '@/features/series/services/series.api';
import { errorMessage } from '@/lib/api/client';

import { projectHref } from '../model';
import { Page, Topbar } from '../Shell';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div>
        <h2>{title}</h2>
        {hint && <p className="cap">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** New series in a project: name + skill → a proposal from the skill's template → edit it → create v1 with its roadmap. */
export function NewSeriesView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const project = useChannel(projectId).data;
  const { data: skills } = useSkills(projectId);
  const { data: tools } = useTools();
  const [name, setName] = useState('');
  const [skillId, setSkillId] = useState('');
  const [proposal, setProposal] = useState<SeriesProposal | null>(null);
  const usable = (skills ?? []).filter((s) => !s.issues.some((i) => i.level === 'error'));

  useEffect(() => {
    if (!skillId && usable.length) setSkillId(usable.find((s) => s.id === project?.defaultSkillId)?.id ?? usable[0]!.id);
  }, [usable, skillId, project]);

  const blank = useMutation({
    mutationFn: () => seriesApi.template(projectId, skillId),
    onSuccess: (p) => setProposal({ ...p, name: name.trim() }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: (p: SeriesProposal) =>
      seriesApi.create({ channelId: projectId, name: p.name.trim(), skillId: p.skillId, bible: p.bible, format: p.format, publish: p.publish, roadmap: p.roadmap.map((r) => ({ topic: r.topic.trim(), goal: r.goal.trim() })) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['series'] });
      void qc.invalidateQueries({ queryKey: ['episodes'] });
      toast.success('Đã tạo series');
      router.push(projectHref(projectId));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const crumbs = [{ label: project?.name ?? 'Dự án', href: projectHref(projectId) }, 'Series mới'];

  if (!proposal) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <Page width={760}>
          <div className="head">
            <div>
              <h1>Series mới</h1>
              <p>Nhanh nhất: mở Đạo diễn và nói ý tưởng, ví dụ “lập series 10 tập dạy bé đếm”. Hoặc tự dựng từ khung mẫu của skill.</p>
            </div>
          </div>
          <form
            className="card"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && skillId) blank.mutate();
            }}
          >
            <div className="field">
              <label htmlFor="ns-name">Tên series</label>
              <input id="ns-name" className="input" maxLength={80} autoFocus placeholder="Ví dụ: Bé học đếm cùng Gà Bông" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ns-skill">Skill dùng cho series</label>
              <select id="ns-skill" className="select" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                {usable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {skills && !usable.length && (
                <span className="cap">
                  Dự án chưa có skill. <Link href={projectHref(projectId, 'style')}>Cài skill</Link>
                </span>
              )}
            </div>
            <div className="row">
              <button className="btn pri" disabled={!name.trim() || !skillId || blank.isPending}>
                {blank.isPending ? 'Đang dựng…' : 'Dựng từ khung mẫu'}
              </button>
              <button type="button" className="btn ghost" onClick={() => router.back()}>
                Huỷ
              </button>
            </div>
          </form>
        </Page>
      </>
    );
  }

  const formatErrors = lintFormat(proposal.format);
  const roadmapOk = proposal.roadmap.length > 0 && proposal.roadmap.every((r) => r.topic.trim().length >= 3);
  const blocker = !proposal.name.trim() ? 'Đặt tên series' : !roadmapOk ? 'Lộ trình cần ít nhất 1 tập, mỗi tập có chủ đề từ 3 ký tự' : (formatErrors[0] ?? null);

  return (
    <>
      <Topbar crumbs={crumbs} />
      <Page width={960}>
        <div className="head">
          <div>
            <h1>Xem lại đề xuất</h1>
            <p>Sửa bible, khung tập và lộ trình. Tạo xong vẫn sửa được; mỗi lần lưu tạo phiên bản mới.</p>
          </div>
        </div>
        <Section title="Tên series">
          <input className="input" maxLength={80} aria-label="Tên series" value={proposal.name} onChange={(e) => setProposal({ ...proposal, name: e.target.value })} />
        </Section>
        <Section title="Bible" hint="Phần không đổi giữa các tập: nhân vật, câu cửa miệng, điều cấm.">
          <BibleEditor value={proposal.bible} onChange={(bible) => setProposal({ ...proposal, bible })} />
        </Section>
        <Section title="Khung một tập" hint="Khe khoá lấy nguyên văn, khe AI điền trong giới hạn số cảnh và khối.">
          <FormatEditor value={proposal.format} onChange={(format) => setProposal({ ...proposal, format })} tools={tools} />
        </Section>
        <Section title={`Lộ trình ${proposal.roadmap.length} tập`} hint="Mỗi tập vào danh sách tập của dự án, chưa tốn công viết.">
          <RoadmapEditor value={proposal.roadmap} onChange={(roadmap) => setProposal({ ...proposal, roadmap })} />
        </Section>
        <Section title="Mẫu đăng bài">
          <PublishEditor value={proposal.publish} onChange={(publish) => setProposal({ ...proposal, publish })} />
        </Section>
        <div className="card row" style={{ position: 'sticky', bottom: 16, zIndex: 10 }}>
          <span className="cap" style={{ flex: 1 }}>
            {blocker ?? `Sẵn sàng: ${proposal.roadmap.length} tập trong lộ trình.`}
          </span>
          <button className="btn ghost" disabled={create.isPending} onClick={() => setProposal(null)}>
            Làm lại
          </button>
          <button className="btn pri" disabled={Boolean(blocker) || create.isPending} onClick={() => create.mutate(proposal)}>
            Tạo series
          </button>
        </div>
      </Page>
    </>
  );
}
