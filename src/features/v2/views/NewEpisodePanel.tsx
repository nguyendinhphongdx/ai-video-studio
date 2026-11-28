'use client';

import { useMutation } from '@tanstack/react-query';
import { Lightbulb, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { useTopicIdeas } from '@/features/episode/hooks/use-topic-ideas';
import { episodeApi, type TopicAnalysis } from '@/features/episode/services/episode.api';
import { errorMessage } from '@/lib/api/client';

import { episodeHref } from '../model';

const PROBLEM_LABEL: Record<TopicAnalysis['problems'][number]['kind'], string> = { duplicate: 'Trùng', gap: 'Nhảy cóc', 'off-story': 'Lệch cốt truyện', other: 'Lưu ý' };

/**
 * Where a new episode starts. Typing a topic and pressing "Tạo tập" always works. Two optional AI helpers sit beside it:
 * "Gợi ý chủ đề" proposes next episodes that continue the story, and "Phân tích" shows a title, synopsis and place in
 * the story (and problems) before anything is created. Each is one AI call, made only when the person presses it.
 */
export function NewEpisodePanel({ projectId, episodeCount }: { projectId: string; episodeCount: number | undefined }) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const text = topic.trim();
  const { ideas, loading: suggesting, error: suggestError, generate, canAsk } = useTopicIdeas(projectId, episodeCount);
  const [analysis, setAnalysis] = useState<{ topic: string; result: TopicAnalysis } | null>(null);
  // An analysis belongs to the exact words it was made for.
  const current = analysis && analysis.topic === text ? analysis.result : null;
  const stale = Boolean(analysis && !current && text);

  const analyze = useMutation({
    mutationFn: () => episodeApi.analyzeTopic(projectId, text),
    onSuccess: (result) => setAnalysis({ topic: text, result }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: () =>
      episodeApi.create({
        channelId: projectId,
        topic: text,
        formats: ['landscape'],
        // What the analysis found guides the script the AI writes next.
        ...(current ? { goal: current.goal, notes: `Tóm tắt: ${current.synopsis}\nVị trí trong phim: ${current.position}` } : {}),
      }),
    onSuccess: (v) => router.push(episodeHref(projectId, v.episode.id, 'script')),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const busy = create.isPending || analyze.isPending;

  return (
    <section className="card newep" aria-labelledby="new-ep-title">
      <div className="newep-head">
        <div>
          <h2 id="new-ep-title">Tập mới</h2>
          <p className="muted">Gõ ý tưởng, hoặc để AI gợi ý tập tiếp theo dựa trên cốt truyện và các tập đã có.</p>
        </div>
        <button type="button" className="btn" disabled={!canAsk || suggesting} onClick={generate}>
          <Lightbulb size={16} aria-hidden />
          {suggesting ? 'Đang nghĩ…' : ideas.length ? 'Gợi ý lại' : 'Gợi ý chủ đề'}
        </button>
      </div>

      {suggestError && (
        <div className="alert warn" role="alert">
          {errorMessage(suggestError)}
        </div>
      )}
      {ideas.length > 0 && (
        <div className="ideas" aria-label="Chủ đề gợi ý">
          {ideas.map((i) => (
            <button key={i.topic} type="button" className={`idea${i.topic === text ? ' on' : ''}`} onClick={() => setTopic(i.topic)}>
              {i.after != null && <span className="chip info">Nối tiếp tập {i.after}</span>}
              <b>{i.topic}</b>
              <span className="cap">{i.why}</span>
            </button>
          ))}
        </div>
      )}

      <form
        className="col"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.length >= 3 && !busy) create.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="new-topic">Tập này kể về chuyện gì?</label>
          <textarea id="new-topic" className="area" rows={2} maxLength={300} placeholder="Ví dụ: Na Tra gặp sư phụ Thái Ất Chân Nhân và học phép đầu tiên" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>

        {current && (
          <div className="analysis" role="region" aria-label="Kết quả phân tích">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>{current.title}</h3>
              {current.after != null && <span className="chip info">Nối tiếp tập {current.after}</span>}
            </div>
            <p>{current.synopsis}</p>
            <dl>
              <dt>Mục tiêu</dt>
              <dd>{current.goal}</dd>
              <dt>Vị trí trong phim</dt>
              <dd>{current.position}</dd>
            </dl>
            {current.problems.length > 0 ? (
              <ul className="problems">
                {current.problems.map((p) => (
                  <li key={p.text}>
                    <span className={`chip ${p.kind === 'duplicate' ? 'err' : 'warn'}`}>{PROBLEM_LABEL[p.kind]}</span> {p.text}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="chip ok">
                <i />
                Không thấy vấn đề
              </span>
            )}
          </div>
        )}
        {stale && <p className="cap">Ý tưởng đã đổi từ lần phân tích trước. Bấm Phân tích để xem lại, hoặc cứ tạo tập.</p>}

        <p className="cap">Gợi ý và phân tích mỗi lần dùng 1 lượt gọi AI; chi phí ghi ở trang Chi phí.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" disabled={text.length < 3 || busy} onClick={() => analyze.mutate()}>
            <Sparkles size={16} aria-hidden />
            {analyze.isPending ? 'Đang phân tích…' : current ? 'Phân tích lại' : 'Phân tích'}
          </button>
          <button type="submit" className="btn pri" disabled={text.length < 3 || busy}>
            {create.isPending ? 'Đang tạo…' : 'Tạo tập'}
          </button>
        </div>
      </form>
    </section>
  );
}
