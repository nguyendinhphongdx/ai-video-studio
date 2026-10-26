'use client';

import { CircleAlert, CircleCheck, Play, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppConfig } from '@/features/app';
import { errorMessage } from '@/lib/api/client';

import { settingsApi } from '../services/settings.service';

const SAMPLE = 'Xin chào các bé! Hôm nay chúng mình cùng học thật vui nhé!';

export function TtsSettingsCard() {
  const { data: config } = useAppConfig();
  const voices = Object.entries(config?.voices ?? {});
  const [voice, setVoice] = useState<string>('vi-VN-HoaiMyNeural');
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    try {
      const { url } = await settingsApi.previewVoice(SAMPLE, voice);
      audio.current = new Audio(url);
      audio.current.onended = () => setPlaying(false);
      await audio.current.play();
    } catch (e) {
      setPlaying(false);
      toast.error(errorMessage(e));
    }
  };

  return (
    <section aria-labelledby="tts-h" className="flex flex-col gap-5 rounded-2xl border bg-card p-6 md:p-7">
      <h2 id="tts-h" className="text-title font-bold">
        Lồng tiếng (TTS)
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tts-provider">Dịch vụ giọng đọc</Label>
          <Select value="edge" disabled>
            <SelectTrigger id="tts-provider" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edge">Edge TTS (miễn phí, tiếng Việt)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tts-voice">Nghe thử giọng</Label>
          <div className="flex gap-2.5">
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger id="tts-voice" className="h-11 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voices.map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="size-11" onClick={play} disabled={!config?.tts} aria-label={playing ? 'Dừng' : 'Nghe thử'}>
              {playing ? <Square aria-hidden /> : <Play aria-hidden />}
            </Button>
          </div>
        </div>
      </div>
      {config ? (
        config.tts ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-success-soft px-3.5 py-3 text-small font-semibold text-success">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            Edge TTS đã sẵn sàng trên máy này
          </div>
        ) : (
          <div role="alert" className="flex items-center gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-small font-semibold text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            Chưa tìm thấy edge-tts. Cài bằng: pip install edge-tts
          </div>
        )
      ) : null}
      <div className="flex items-center gap-2.5 rounded-lg bg-warning-soft px-3.5 py-3 text-small text-warning">
        <CircleAlert className="size-4 shrink-0" aria-hidden />
        Dịch vụ miễn phí đôi khi chậm khi tạo nhiều video liên tiếp; hệ thống tự thử lại.
      </div>
    </section>
  );
}
