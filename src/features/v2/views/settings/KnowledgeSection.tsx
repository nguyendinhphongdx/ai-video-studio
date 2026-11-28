'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { AskAiButton } from '@/features/assistant/components/AskAiButton';
import type { ChannelView } from '@/features/channel/services/channel.api';
import { api, errorMessage } from '@/lib/api/client';
import type { KnowledgeVersion, KnowledgeView } from '@/server/modules/knowledge/knowledge.service';

import { lineDiff } from '../../lib/line-diff';
import { setupPrompt } from '../../lib/setup-prompts';

const MAX = 60000;
const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * What every video of the project must stay true to. Each save is a new version; older versions can be opened, compared
 * with the saved text, and brought back as the draft. The assistant can draft or extend it ("AI làm").
 */
export function KnowledgeSection({ project, onDirty }: { project: ChannelView; onDirty: (dirty: boolean) => void }) {
  const qc = useQueryClient();
  const key = ['knowledge', project.id];
  const view = useQuery({ queryKey: key, queryFn: () => api<KnowledgeView>(`/channels/${project.id}/knowledge`) });
  const saved = view.data?.current?.markdown ?? '';
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [from, setFrom] = useState<{ version: number; markdown: string } | null>(null);
  const value = text ?? saved;
  const dirty = text !== null && text.trim() !== saved;
  const edit = (t: string | null) => {
    setText(t);
    onDirty(t !== null && t.trim() !== saved);
  };

  const save = useMutation({
    mutationFn: () => api<KnowledgeView>(`/channels/${project.id}/knowledge`, { method: 'PUT', body: { markdown: value, note } }),
    onSuccess: (v) => {
      qc.setQueryData(key, v);
      void qc.invalidateQueries({ queryKey: ['episode'] });
      edit(null);
      setNote('');
      setFrom(null);
      toast.success(`Đã lưu tri thức, phiên bản v${v.current?.version ?? 0}. Video đã viết trước đó sẽ được gợi ý viết lại.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const open = useMutation({
    mutationFn: (version: number) => api<KnowledgeVersion>(`/channels/${project.id}/knowledge/${version}`),
    onSuccess: (v) => setFrom({ version: v.version, markdown: v.markdown }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const versions = view.data?.versions ?? [];
  const diff = from ? lineDiff(from.markdown, saved) : null;
  const facts = { name: project.name, description: project.description, audience: project.audience, imageStyle: project.imageStyle };
  const ai = setupPrompt('knowledge', facts);
  return (
    <div className="kn">
      <section className="card" aria-labelledby="s-kn">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <h2 id="s-kn">Tri thức của dự án</h2>
            {view.data?.current ? <span className="chip info">v{view.data.current.version}</span> : <span className="chip warn">Chưa có</span>}
          </div>
          <AskAiButton label={saved ? 'AI bổ sung' : 'AI làm'} {...ai} />
        </div>
        <p className="muted">Sự kiện, số liệu, thuật ngữ, quy tắc nội dung, nguồn đáng tin. AI chỉ dựa vào đây và không bịa thêm. Đổi tri thức thì các video chưa duyệt được gợi ý viết lại.</p>
        <label htmlFor="kn-text" className="sr-only">
          Nội dung tri thức
        </label>
        <textarea id="kn-text" className="area mono kn-text" rows={16} value={value} maxLength={MAX} spellCheck={false} onChange={(e) => edit(e.target.value)} placeholder={'## Về dự án và chủ đề\n## Kiến thức cốt lõi\n## Quy tắc nội dung'} />
        <div className="row">
          <div className="bar grow" role="progressbar" aria-label="Dung lượng tri thức" aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={value.length}>
            <i style={{ width: `${Math.min(100, (value.length / MAX) * 100)}%` }} />
          </div>
          <span className="cap">
            {value.length.toLocaleString('vi-VN')} / {MAX.toLocaleString('vi-VN')} ký tự
          </span>
        </div>
        <div className="row">
          <input className="input grow" aria-label="Ghi chú cho phiên bản này" placeholder="Ghi chú phiên bản (không bắt buộc)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
          {dirty && (
            <button type="button" className="btn" onClick={() => edit(null)}>
              Bỏ thay đổi
            </button>
          )}
          <button type="button" className="btn pri" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Đang lưu…' : 'Lưu phiên bản mới'}
          </button>
        </div>
      </section>

      <aside className="card" aria-labelledby="s-ver">
        <h3 id="s-ver">Các phiên bản</h3>
        {versions.length === 0 ? (
          <p className="cap">Chưa có phiên bản nào.</p>
        ) : (
          <ul className="vers">
            {versions.map((v) => (
              <li key={v.version} className={from?.version === v.version ? 'on' : undefined}>
                <button type="button" onClick={() => open.mutate(v.version)} disabled={open.isPending}>
                  <b>v{v.version}</b>
                  <span className="cap">
                    {day(v.createdAt)}
                    {v.note ? ` · ${v.note}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {from && diff && (
          <div className="diff" aria-label={`So v${from.version} với bản đang lưu`}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="cap">
                v{from.version} so với bản đang lưu: +{diff.added.length} −{diff.removed.length} dòng
              </span>
              <button type="button" className="btn sm" onClick={() => (edit(from.markdown), setFrom(null))}>
                Khôi phục thành bản nháp
              </button>
            </div>
            {diff.added.length + diff.removed.length === 0 ? <span className="cap">Giống hệt bản đang lưu.</span> : null}
            <ul>
              {diff.added.slice(0, 40).map((l, i) => (
                <li key={`a${i}`} className="add">
                  + {l}
                </li>
              ))}
              {diff.removed.slice(0, 40).map((l, i) => (
                <li key={`r${i}`} className="del">
                  − {l}
                </li>
              ))}
            </ul>
            <span className="cap">"+" là dòng bản đang lưu có thêm so với v{from.version}; "−" là dòng v{from.version} có mà bản đang lưu không còn.</span>
          </div>
        )}
      </aside>
    </div>
  );
}
