'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { episodeApi } from '@/features/episode/services/episode.api';
import { errorMessage } from '@/lib/api/client';
import { useAssistantStore } from '@/stores/assistant-store';

import type { Draft } from './useDraft';

const QUICK = [
  { label: 'Hình khớp lời đọc', request: '' },
  { label: 'Đổi bố cục khác', request: 'Giữ nguyên lời đọc, đổi kiểu khung, góc nhìn và bố cục cho khác hẳn.' },
  { label: 'Lời ngắn gọn hơn', request: 'Viết lại lời đọc ngắn gọn, dễ nghe hơn, giữ đủ ý.' },
  { label: 'Lời sinh động hơn', request: 'Viết lại lời đọc sinh động, giàu cảm xúc hơn, giữ đúng sự việc.' },
];

/** "Fix this for me": the answer lands in the draft, so it is previewed (and undone) like a hand edit. */
export function AiBox({ episodeId, draft, disabled }: { episodeId: string; draft: Draft; disabled: boolean }) {
  const [text, setText] = useState('');
  const [note, setNote] = useState<{ id: string; text: string } | null>(null);
  const openAssistant = useAssistantStore((s) => s.setOpen);
  const fix = useMutation({
    mutationFn: (request: string) => episodeApi.suggestSceneFix(episodeId, draft.value!.id, { request, narration: draft.value!.narration, props: draft.value!.props }).then((r) => ({ ...r, id: draft.value!.id })),
    onSuccess: (r) => {
      // The person may have moved on while the AI was thinking.
      draft.change((s) => (s.id === r.id ? { ...s, block: r.block, narration: r.narration, props: r.props } : s));
      setNote({ id: r.id, text: r.note });
      setText('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const off = disabled || fix.isPending;
  return (
    <div className="col aibox">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b>✦ Nhờ AI sửa cảnh này</b>
        <button type="button" className="btn sm ghost" onClick={() => openAssistant(true)}>
          Trò chuyện
        </button>
      </div>
      <div className="chips">
        {QUICK.map((q) => (
          <button key={q.label} type="button" className="pick" disabled={off} onClick={() => fix.mutate(q.request)}>
            {q.label}
          </button>
        ))}
      </div>
      <form
        className="row"
        style={{ flexWrap: 'nowrap', gap: 6 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() && !off) fix.mutate(text.trim());
        }}
      >
        <input className="input" aria-label="Yêu cầu sửa cảnh" placeholder="Ví dụ: cho người cha đứng bên trái, nhỏ hơn" maxLength={600} value={text} disabled={off} onChange={(e) => setText(e.target.value)} />
        <button className="btn sm dark" disabled={off || !text.trim()}>
          Sửa
        </button>
      </form>
      {fix.isPending && <span className="cap">AI đang đọc cảnh và sửa…</span>}
      {!fix.isPending && note && note.id === draft.value?.id && <span className="cap">{note.text} Xem trước ở giữa; ưng thì Lưu, không thì Hoàn tác.</span>}
    </div>
  );
}
