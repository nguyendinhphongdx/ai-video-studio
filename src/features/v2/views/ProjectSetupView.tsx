'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { VOICES } from '@/core/domain/catalog';
import { queryKeys } from '@/features/app';
import { setupApi, type ProjectSetup, type SetupSkill } from '@/features/setup/services/setup.api';
import { errorMessage } from '@/lib/api/client';

import { projectHref } from '../model';
import { Page, Topbar } from '../Shell';
import { NewProjectView } from './NewProjectView';

const KINDS = { hero: 'Nhân vật chính', character: 'Nhân vật phụ', item: 'Đạo cụ' } as const;

/** New project: one idea, the AI fills the six parts, the person edits and approves. Nothing is saved or drawn before that. */
export function ProjectSetupView() {
  const [manual, setManual] = useState(false);
  const [idea, setIdea] = useState('');
  const [draft, setDraft] = useState<{ proposal: ProjectSetup; skills: SetupSkill[] } | null>(null);
  const propose = useMutation({
    mutationFn: () => setupApi.propose(idea.trim()),
    onSuccess: setDraft,
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (manual) return <NewProjectView />;
  if (draft) return <Review skills={draft.skills} initial={draft.proposal} onBack={() => setDraft(null)} />;
  return (
    <>
      <Topbar crumbs={['Trang chủ', 'Dự án mới']} />
      <Page width={760}>
        <div className="head">
          <div>
            <h1>Dự án mới</h1>
            <p>Kể ý tưởng, AI đề xuất đủ thông tin chung, tri thức, phong cách, skill, thư viện nhân vật và thương hiệu. Bạn sửa rồi mới tạo.</p>
          </div>
        </div>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (idea.trim().length >= 10) propose.mutate();
          }}
        >
          <div className="field">
            <label htmlFor="su-idea">Ý tưởng dự án</label>
            <textarea id="su-idea" className="area" rows={4} maxLength={2000} autoFocus value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Ví dụ: truyện Na Tra cho trẻ em, hoạt hình 2D, mỗi tập 4 phút, giọng kể ấm áp" />
            <span className="hint">Tốn một lượt gọi AI. Chưa vẽ ảnh nào.</span>
          </div>
          <div className="row">
            <button className="btn pri" disabled={idea.trim().length < 10 || propose.isPending}>
              {propose.isPending ? 'AI đang soạn, chờ khoảng một phút…' : 'AI điền giúp'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setManual(true)}>
              Tự điền
            </button>
          </div>
        </form>
      </Page>
    </>
  );
}

function Section({ n, title, note, children }: { n: number; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="card">
      <div className="col" style={{ gap: 2 }}>
        <h2>
          {n}. {title}
        </h2>
        {note && <span className="cap">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Text({ id, label, value, onChange, rows, max }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; max: number }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {rows ? (
        <textarea id={id} className="area" rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Review({ initial, skills, onBack }: { initial: ProjectSetup; skills: SetupSkill[]; onBack: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [p, setP] = useState(initial);
  const set = <K extends keyof ProjectSetup>(k: K, v: ProjectSetup[K]) => setP((x) => ({ ...x, [k]: v }));
  const series = <K extends keyof ProjectSetup['series']>(k: K, v: ProjectSetup['series'][K]) => setP((x) => ({ ...x, series: { ...x.series, [k]: v } }));
  const create = useMutation({
    mutationFn: () =>
      setupApi.apply({
        ...p,
        series: {
          ...p.series,
          cast: p.series.cast.filter((c) => c.name.trim() && c.description.trim().length >= 3),
          roadmap: p.series.roadmap.filter((r) => r.topic.trim().length >= 3),
          avoid: p.series.avoid.map((a) => a.trim()).filter(Boolean),
        },
        hashtags: p.hashtags.filter((h) => /^#\S+$/.test(h)),
      }),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: queryKeys.channels });
      toast.success('Đã tạo dự án');
      router.push(projectHref(c.id));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const ok = p.name.trim() && p.audience.trim() && p.style.trim() && p.series.name.trim();

  return (
    <>
      <Topbar crumbs={['Trang chủ', 'Dự án mới', 'Xem lại']}>
        <button className="btn ghost" onClick={onBack} disabled={create.isPending}>
          Đổi ý tưởng
        </button>
        <button className="btn pri" disabled={!ok || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Đang tạo…' : 'Tạo dự án'}
        </button>
      </Topbar>
      <Page width={880}>
        <div className="head">
          <div>
            <h1>Xem lại đề xuất</h1>
            <p>Sửa chỗ chưa vừa ý, để trống phần muốn làm sau. Mọi thứ vẫn sửa được sau khi tạo.</p>
          </div>
        </div>

        <Section n={1} title="Thông tin chung">
          <Text id="su-name" label="Tên dự án" max={60} value={p.name} onChange={(v) => set('name', v)} />
          <Text id="su-desc" label="Mô tả" rows={2} max={500} value={p.description} onChange={(v) => set('description', v)} />
          <Text id="su-aud" label="Khán giả" max={300} value={p.audience} onChange={(v) => set('audience', v)} />
          <div className="field">
            <label htmlFor="su-voice">Giọng đọc</label>
            <select id="su-voice" className="select" value={p.voice} onChange={(e) => set('voice', e.target.value as ProjectSetup['voice'])}>
              {Object.entries(VOICES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Text id="su-style" label="Giọng văn" rows={2} max={500} value={p.style} onChange={(v) => set('style', v)} />
        </Section>

        <Section n={2} title="Tri thức" note="AI dựa vào đây khi viết mọi tập. Hãy đọc kỹ, AI có thể nhớ sai chi tiết.">
          <Text id="su-know" label="Tri thức nền" rows={12} max={20000} value={p.knowledge} onChange={(v) => set('knowledge', v)} />
        </Section>

        <Section n={3} title="Phong cách">
          <Text id="su-img" label="Phong cách hình vẽ (tiếng Anh)" rows={3} max={500} value={p.imageStyle} onChange={(v) => set('imageStyle', v)} />
          <div className="field">
            <label>Màu chủ đạo</label>
            <div className="row">
              {p.palette.map((color, i) => (
                <input key={i} type="color" className="input" aria-label={`Màu ${i + 1}`} style={{ width: 56, padding: 2 }} value={color} onChange={(e) => set('palette', p.palette.map((c, n) => (n === i ? e.target.value.toUpperCase() : c)))} />
              ))}
            </div>
          </div>
        </Section>

        <Section n={4} title="Skill và series đầu tiên">
          <div className="field">
            <label htmlFor="su-skill">Skill</label>
            <select id="su-skill" className="select" value={p.skillId} onChange={(e) => set('skillId', e.target.value)}>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="hint">{skills.find((s) => s.id === p.skillId)?.description}</span>
          </div>
          <Text id="su-sname" label="Tên series" max={80} value={p.series.name} onChange={(v) => series('name', v)} />
          <Text id="su-premise" label="Ý tưởng series" rows={2} max={1000} value={p.series.premise} onChange={(v) => series('premise', v)} />
          <Text id="su-instr" label="Cách kể" rows={5} max={4000} value={p.series.instructions} onChange={(v) => series('instructions', v)} />
          <Text id="su-avoid" label="Tránh (mỗi dòng một điều)" rows={3} max={3000} value={p.series.avoid.join('\n')} onChange={(v) => series('avoid', v.split('\n').slice(0, 30))} />
          <div className="field">
            <label>Lộ trình tập</label>
            <div className="col" style={{ gap: 8 }}>
              {p.series.roadmap.map((r, i) => (
                <div key={i} className="row">
                  <span className="mono cap">{i + 1}</span>
                  <input className="input grow" aria-label={`Chủ đề tập ${i + 1}`} maxLength={300} value={r.topic} onChange={(e) => series('roadmap', p.series.roadmap.map((x, n) => (n === i ? { ...x, topic: e.target.value } : x)))} />
                  <button type="button" className="btn sm ghost" onClick={() => series('roadmap', p.series.roadmap.filter((_, n) => n !== i))}>
                    Bỏ
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section n={5} title="Thư viện nhân vật và đạo cụ" note="Mô tả bằng tiếng Anh để vẽ. Ảnh chỉ vẽ khi bạn bấm ở trang dự án, có báo giá trước.">
          {p.series.cast.map((c, i) => {
            const patch = (next: Partial<typeof c>) => series('cast', p.series.cast.map((x, n) => (n === i ? { ...x, ...next } : x)));
            return (
              <div key={c.id} className="card flat">
                <div className="row">
                  <span className="chip acc">{KINDS[c.kind]}</span>
                  <input className="input grow" aria-label="Tên" maxLength={60} value={c.name} onChange={(e) => patch({ name: e.target.value })} />
                  <button type="button" className="btn sm ghost" onClick={() => series('cast', p.series.cast.filter((_, n) => n !== i))}>
                    Bỏ
                  </button>
                </div>
                <textarea className="area" aria-label={`Mô tả ${c.name}`} rows={2} maxLength={400} value={c.description} onChange={(e) => patch({ description: e.target.value })} />
              </div>
            );
          })}
        </Section>

        <Section n={6} title="Thương hiệu" note="Logo và nhạc nền tải lên sau khi tạo dự án (hoặc giữ nhạc mặc định). Tranh intro vẽ ở trang dự án.">
          <Text id="su-outro" label="Câu chào cuối video" max={80} value={p.outroText} onChange={(v) => set('outroText', v)} />
          <Text id="su-tags" label="Hashtag" max={200} value={p.hashtags.join(' ')} onChange={(v) => set('hashtags', v.split(' ').slice(0, 10))} />
          <Text id="su-intro" label="Tranh nền intro (tiếng Anh)" rows={2} max={400} value={p.introArtPrompt} onChange={(v) => set('introArtPrompt', v)} />
          <Text id="su-logo" label="Gợi ý logo (tiếng Anh)" rows={2} max={400} value={p.logoPrompt} onChange={(v) => set('logoPrompt', v)} />
        </Section>

        <div className="row">
          <button className="btn pri" disabled={!ok || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Đang tạo…' : 'Tạo dự án'}
          </button>
        </div>
      </Page>
    </>
  );
}
