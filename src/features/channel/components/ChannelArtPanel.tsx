'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api/client';

import { channelApi, type ChannelInput, type ChannelView } from '../services/channel.api';

type Kind = 'intro' | 'outro';

/**
 * Intro and outro are designed by the assistant (open it and describe what you want). Here the person can choose to
 * put an AI picture behind either scene, write what the picture shows, and make or remove it.
 */
export function ChannelArtPanel({ channel, form, setForm }: { channel: ChannelView; form: ChannelInput; setForm: (fn: (f: ChannelInput) => ChannelInput) => void }) {
  const qc = useQueryClient();
  const [wantArt, setWantArt] = useState({ intro: Boolean(channel.introArtUrl), outro: Boolean(channel.outroArtUrl) });
  const [artPrompt, setArtPrompt] = useState({ intro: form.introDesign?.artPrompt ?? '', outro: form.outroDesign?.artPrompt ?? '' });
  const [job, setJob] = useState<{ id: string; kind: Kind } | null>(null);

  // A design the assistant just saved may bring its own picture prompt.
  useEffect(() => {
    setArtPrompt((a) => ({ intro: form.introDesign?.artPrompt || a.intro, outro: form.outroDesign?.artPrompt || a.outro }));
    setWantArt((w) => ({ intro: w.intro || Boolean(form.introDesign?.layers.some((l) => l.kind === 'art')), outro: w.outro || Boolean(form.outroDesign?.layers.some((l) => l.kind === 'art')) }));
  }, [form.introDesign, form.outroDesign]);

  const status = useQuery({
    queryKey: ['channel-job', job?.id],
    queryFn: () => channelApi.job(job!.id),
    enabled: Boolean(job),
    refetchInterval: (q) => (q.state.data?.state === 'done' || q.state.data?.state === 'failed' ? false : 1200),
  });
  const state = status.data?.state;
  useEffect(() => {
    if (!job || !state) return;
    if (state === 'failed') toast.error(status.data?.error ?? 'Chưa tạo được ảnh. Thử lại nhé.');
    if (state === 'done') {
      void qc.invalidateQueries({ queryKey: ['channel', channel.id] });
      toast.success('Đã tạo ảnh nền');
    }
    if (state === 'done' || state === 'failed') setJob(null);
  }, [job, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const make = async (kind: Kind) => {
    try {
      setJob({ id: (await channelApi.generateArt(channel.id, kind, artPrompt[kind])).id, kind });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const drop = async (kind: Kind) => {
    try {
      await channelApi.removeArt(channel.id, kind);
      await qc.invalidateQueries({ queryKey: ['channel', channel.id] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const row = (kind: Kind, title: string) => {
    const design = kind === 'intro' ? form.introDesign : form.outroDesign;
    const artUrl = kind === 'intro' ? channel.introArtUrl : channel.outroArtUrl;
    const working = job?.kind === kind;
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body font-bold">{title}</h3>
          <span className={design ? 'rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-success' : 'rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-semibold text-warning'}>{design ? 'Đã thiết kế riêng' : 'Chưa thiết kế'}</span>
        </div>
        <label className="flex w-fit items-center gap-2 text-small font-semibold">
          <input type="checkbox" className="size-4 accent-primary" checked={wantArt[kind]} onChange={(e) => setWantArt((w) => ({ ...w, [kind]: e.target.checked }))} />
          Dùng ảnh AI làm nền
        </label>
        {wantArt[kind] ? (
          <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
            <div className="flex flex-wrap items-center gap-3">
              {artUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artUrl} alt={`Ảnh nền ${title.toLowerCase()}`} className="h-16 w-28 rounded-md border object-cover" />
              ) : (
                <span className="grid h-16 w-28 place-items-center rounded-md border border-dashed text-muted-foreground">
                  <ImageIcon className="size-5" aria-hidden />
                </span>
              )}
              <p className="min-w-0 flex-1 text-caption text-muted-foreground">Mô tả ảnh nền (tiếng Anh, không chữ trong ảnh). Ảnh theo “Phong cách ảnh AI” của kênh, lưu ngay khi tạo, tính phí một ảnh. Muốn thiết kế dùng ảnh này, nhờ trợ lý thêm lớp ảnh nền vào thiết kế.</p>
            </div>
            <Input
              aria-label={`Mô tả ảnh nền ${title.toLowerCase()}`}
              value={artPrompt[kind]}
              onChange={(e) => {
                const v = e.target.value;
                setArtPrompt((a) => ({ ...a, [kind]: v }));
                setForm((f) => {
                  const d = kind === 'intro' ? f.introDesign : f.outroDesign;
                  return d ? { ...f, [kind === 'intro' ? 'introDesign' : 'outroDesign']: { ...d, artPrompt: v } } : f;
                });
              }}
              maxLength={400}
              placeholder="VD: a moody night skyline with soft bokeh lights, dark blue"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={Boolean(job) || !artPrompt[kind].trim()} onClick={() => void make(kind)}>
                {working ? <Loader2 className="animate-spin" aria-hidden /> : <ImageIcon aria-hidden />}
                {artUrl ? 'Tạo lại ảnh nền' : 'Tạo ảnh nền'}
              </Button>
              {artUrl ? (
                <Button variant="ghost" size="sm" disabled={Boolean(job)} onClick={() => void drop(kind)}>
                  <Trash2 aria-hidden />
                  Bỏ ảnh nền
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl bg-accent/50 p-3.5 text-small text-muted-foreground">
        Mở đầu và kết của kênh do <b className="text-foreground">trợ lý</b> thiết kế và sửa. Bấm nút ✨ ở góc màn hình rồi nói điều bạn muốn, ví dụ: “thiết kế mở đầu và kết cho kênh”, “nền tối hơn, chữ tên video to hơn”. Xem trước bên phải thay đổi ngay.
      </p>
      {row('intro', 'Mở đầu')}
      {row('outro', 'Kết')}
    </div>
  );
}
