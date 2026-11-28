'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useChannelAction } from '@/features/channel/hooks/use-channels';
import { channelApi } from '@/features/channel/services/channel.api';
import { usageApi } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

import { usd } from '../model';

const key = (id: string) => ['logo-draft', id] as const;

export function useLogoDraft(projectId: string) {
  return useQuery({ queryKey: key(projectId), queryFn: () => channelApi.logoDraft(projectId), refetchInterval: (q) => (q.state.data?.drawing ? 2000 : 15000) });
}

/** The AI logo draft waiting for a decision (or being drawn). Nothing changes until "Dùng logo này". */
export function LogoDraftCard({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const draft = useLogoDraft(projectId);
  const refresh = () => qc.invalidateQueries({ queryKey: key(projectId) });
  const take = useChannelAction(projectId, async () => {
    const c = await channelApi.useLogoDraft(projectId);
    await refresh();
    return c;
  }, 'Đã đổi logo');
  const discard = useMutation({ mutationFn: () => channelApi.discardLogoDraft(projectId), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const d = draft.data;
  if (!d) return null;
  if (d.drawing)
    return (
      <span className="cap row" role="status" style={{ gap: 6 }}>
        <Loader2 size={14} className="spin" aria-hidden /> Đang vẽ logo…
      </span>
    );
  if (d.error) return <span className="cap" role="alert">{d.error}</span>;
  if (!d.url) return null;
  return (
    <div className="logo-draft">
      <img src={d.url} alt="Bản nháp logo" />
      <div className="col" style={{ gap: 6 }}>
        <b>Bản nháp logo</b>
        <div className="row">
          <button type="button" className="btn sm pri" disabled={take.isPending} onClick={() => take.mutate(undefined)}>
            Dùng logo này
          </button>
          <button type="button" className="btn sm" disabled={discard.isPending} onClick={() => discard.mutate()}>
            Bỏ
          </button>
        </div>
      </div>
    </div>
  );
}

/** Describe the mark (optional), see the price, draw one draft. */
export function LogoDrawer({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const draft = useLogoDraft(projectId);
  const [prompt, setPrompt] = useState('');
  const estimate = useQuery({ queryKey: ['setup-estimate', 'logo'], queryFn: () => usageApi.estimate({ images: 1, texts: [], voice: '' }) });
  const draw = useMutation({
    mutationFn: () => channelApi.drawLogo(projectId, prompt),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="field">
        <label htmlFor="logo-idea">Vẽ logo bằng AI</label>
        <input id="logo-idea" className="input" maxLength={400} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Tả hình muốn có, ví dụ: hoa sen đỏ ôm vòng vàng. Để trống thì AI tự chọn." />
        <span className="hint">Chỉ vẽ hình, không có chữ. Bạn xem bản nháp rồi mới dùng.</span>
      </div>
      <div className="row">
        <button type="button" className="btn" disabled={draw.isPending || draft.data?.drawing} onClick={() => draw.mutate()}>
          <Sparkles size={16} aria-hidden />
          {draft.data?.url ? 'Vẽ lại' : 'Vẽ logo'} ({estimate.data?.usd == null ? 'chưa có đơn giá' : `ước tính ${usd(estimate.data.usd)}`})
        </button>
      </div>
      <LogoDraftCard projectId={projectId} />
    </div>
  );
}
