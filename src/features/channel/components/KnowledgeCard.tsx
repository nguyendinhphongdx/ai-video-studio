'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api/client';
import type { KnowledgeVersion, KnowledgeView } from '@/server/modules/knowledge/knowledge.service';

const keys = { one: (id: string) => ['knowledge', id] as const };

/**
 * The channel's own knowledge: facts, rules and sources every video of the channel relies on. Saving writes a new
 * version; videos remember which version they were written with and offer to be rewritten when it changes.
 * The assistant can draft and update it too (ask it in the chat).
 */
export function KnowledgeCard({ channelId }: { channelId: string }) {
  const qc = useQueryClient();
  const view = useQuery({ queryKey: keys.one(channelId), queryFn: () => api<KnowledgeView>(`/channels/${channelId}/knowledge`) });
  const saved = view.data?.current?.markdown ?? '';
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const value = text ?? saved;
  const dirty = text !== null && text.trim() !== saved;

  const save = useMutation({
    mutationFn: () => api<KnowledgeView>(`/channels/${channelId}/knowledge`, { method: 'PUT', body: { markdown: value, note } }),
    onSuccess: (v) => {
      qc.setQueryData(keys.one(channelId), v);
      void qc.invalidateQueries({ queryKey: ['episode'] });
      setText(null);
      setNote('');
      toast.success(`Đã lưu tri thức, phiên bản v${v.current?.version ?? 0}. Video đã viết trước đó sẽ được gợi ý viết lại.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const loadVersion = async (version: number) => {
    try {
      setText((await api<KnowledgeVersion>(`/channels/${channelId}/knowledge/${version}`)).markdown);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const versions = view.data?.versions ?? [];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6" aria-labelledby="kn-h">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen className="size-5 text-primary" aria-hidden />
        <h2 id="kn-h" className="text-title font-bold">
          Tri thức của kênh
        </h2>
        {view.data?.current ? <span className="rounded-full bg-accent px-2.5 py-0.5 text-caption font-bold text-accent-foreground">v{view.data.current.version}</span> : <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-semibold text-warning">Chưa có</span>}
      </div>
      <p className="text-small text-muted-foreground">Kho kiến thức riêng của kênh: sự kiện, số liệu, thuật ngữ, quy tắc nội dung, nguồn đáng tin. AI dựa vào đây khi viết mọi video của kênh (không bịa thêm). Nhờ trợ lý soạn hoặc bổ sung từ tư liệu bạn có, hoặc tự viết ở đây. Đổi tri thức thì các video chưa duyệt được gợi ý viết lại.</p>
      <Label htmlFor="kn-text" className="sr-only">
        Nội dung tri thức
      </Label>
      <Textarea id="kn-text" rows={14} value={value} onChange={(e) => setText(e.target.value)} spellCheck={false} maxLength={60000} className="min-h-56 font-mono text-small leading-relaxed" placeholder="## Về kênh và chủ đề&#10;## Kiến thức cốt lõi&#10;## Quy tắc nội dung" />
      <div className="flex flex-wrap items-center gap-3">
        {versions.length > 1 ? (
          <label className="flex items-center gap-2 text-small text-muted-foreground">
            Mở phiên bản cũ
            <select className="h-9 rounded-lg border bg-card px-2 text-foreground" value="" onChange={(e) => e.target.value && void loadVersion(Number(e.target.value))}>
              <option value="">Chọn…</option>
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} · {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                  {v.note ? ` · ${v.note.slice(0, 30)}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="text-caption text-muted-foreground">{value.length.toLocaleString('vi-VN')} ký tự</span>
        <Button className="ml-auto font-bold" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Lưu thành phiên bản mới
        </Button>
      </div>
    </section>
  );
}
