'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Play, Square } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { BrandPreview } from '@/features/channel/components/BrandPreview';
import type { ChannelInput, ChannelView } from '@/features/channel/services/channel.api';
import { useAppConfig } from '@/features/app/hooks/use-app';
import { settingsApi } from '@/features/settings/services/settings.service';
import { fmtUsd } from '@/features/usage/lib/format';
import { usageApi } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';

import { groupVoices, sampleLine, type VoiceOption } from '../../lib/voices';
import type { FormProps } from './sections';

/** Voices grouped by who speaks them, each playable on a sample line before it is chosen; plus the closing words. */
export function VoiceSection({ project, form, set }: FormProps & { project: ChannelView }) {
  const config = useAppConfig();
  const groups = groupVoices(config.data ? { tts: config.data.tts, ttsGoogle: config.data.ttsGoogle } : undefined);
  const [line, setLine] = useState(() => sampleLine(project.description));
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);

  // A Google voice costs a little per line (the same for every Google voice): the price is shown before anyone presses play.
  const estimate = useQuery({ queryKey: ['voice-estimate', line], queryFn: () => usageApi.estimate({ images: 0, texts: [line.trim()], voice: 'gemini-Kore' }), enabled: line.trim().length > 0 });
  const price = estimate.data?.usd == null ? 'có tính phí' : `ước tính ${fmtUsd(estimate.data.usd)}`;

  const play = useMutation({
    mutationFn: (v: VoiceOption) => settingsApi.previewVoice(line.trim(), v.id).then((r) => ({ v, url: r.url })),
    onSuccess: ({ v, url }) => {
      audio.current?.pause();
      const a = new Audio(url.startsWith('/') || url.startsWith('http') ? url : `/${url}`);
      a.onended = () => setPlaying(null);
      audio.current = a;
      setPlaying(v.id);
      a.play().catch((e) => {
        setPlaying(null);
        toast.error(errorMessage(e));
      });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = (v: VoiceOption) => {
    if (playing === v.id) {
      audio.current?.pause();
      return setPlaying(null);
    }
    play.mutate(v);
  };

  const input: ChannelInput = form;
  return (
    <div className="col" style={{ gap: 'var(--sp-5)' }}>
      <section className="card" aria-labelledby="s-voice">
        <h2 id="s-voice">Giọng đọc mặc định</h2>
        <p className="muted">Dùng cho tập mới. Mỗi tập vẫn đổi được riêng. Bấm "Nghe thử" để nghe câu mẫu bằng từng giọng.</p>
        <div className="field">
          <label htmlFor="vo-line">Câu nghe thử</label>
          <textarea id="vo-line" className="area" rows={2} maxLength={300} value={line} onChange={(e) => setLine(e.target.value)} />
        </div>
        {groups.map((g) => (
          <fieldset key={g.key} className="voices">
            <legend className="eyebrow">{g.label}</legend>
            {g.voices.map((v) => {
              const on = form.voice === v.id;
              return (
                <div key={v.id} className={`voice${on ? ' sel' : ''}${v.ready ? '' : ' off'}`}>
                  <label className="voice-pick">
                    <input type="radio" name="voice" checked={on} onChange={() => set('voice', v.id)} />
                    <span className="voice-name">
                      <b>{v.name}</b>
                      <span className="cap">{v.reason ?? v.traits}</span>
                    </span>
                  </label>
                  {v.ready ? (
                    <button type="button" className="btn sm" disabled={!line.trim() || (play.isPending && play.variables?.id !== v.id)} onClick={() => toggle(v)} aria-label={`Nghe thử giọng ${v.name}`}>
                      {play.isPending && play.variables?.id === v.id ? <Loader2 size={14} className="spin" aria-hidden /> : playing === v.id ? <Square size={14} aria-hidden /> : <Play size={14} aria-hidden />}
                      {playing === v.id ? 'Dừng' : v.free ? 'Nghe thử' : `Nghe thử · ${price}`}
                    </button>
                  ) : (
                    <Link className="cap" href="/settings">
                      Mở cài đặt
                    </Link>
                  )}
                </div>
              );
            })}
          </fieldset>
        ))}
      </section>

      <section className="card" aria-labelledby="s-end">
        <h2 id="s-end">Lời kết video</h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="ps-outro">Câu kết</label>
            <input id="ps-outro" className="input" maxLength={80} value={form.outroText} onChange={(e) => set('outroText', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ps-sub">Lời mời đăng ký</label>
            <input id="ps-sub" className="input" maxLength={40} value={form.subscribeText} onChange={(e) => set('subscribeText', e.target.value)} />
          </div>
        </div>
        <div className="legacy-ui">
        <BrandPreview only="outro" input={input} logoUrl={project.logoUrl} avatarUrl={project.avatarUrl} introArtUrl={project.introArtUrl} outroArtUrl={project.outroArtUrl} sampleTitle="Tiêu đề video mẫu" />
        </div>
      </section>
    </div>
  );
}
