'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/constants/routes';
import { FORMATS, type Format } from '@/core/domain/catalog';
import { useAppConfig, useCurrentChannel } from '@/features/app';
import { errorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { useEpisodes, useSkills } from '../hooks/use-episode';
import { useTopicIdeas } from '../hooks/use-topic-ideas';
import { episodeApi } from '../services/episode.api';

const FORMAT_CHIP: Record<Format, string> = { landscape: 'YouTube · Facebook 16:9', portrait: 'TikTok · Reels · Shorts 9:16' };

export function CreateVideoForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { current } = useCurrentChannel();
  const { data: config } = useAppConfig();
  const { data: skills } = useSkills(current?.id);
  const { data: episodes } = useEpisodes(current?.id);
  const { ideas, loading: ideasLoading, error: ideasError, generate, canAsk } = useTopicIdeas(current?.id, episodes?.length);
  // Free suggestions first: the videos already planned in the channel's series roadmaps.
  const planned = (episodes ?? []).filter((e) => e.episode.status === 'planned').slice(0, 3);
  const [topic, setTopic] = useState('');
  const [formats, setFormats] = useState<Format[]>(['landscape']);
  const [skillId, setSkillId] = useState<string>('');

  useEffect(() => {
    // The channel's own default is preselected (picking an arbitrary skill gave channels the wrong look); a channel that has
    // none yet gets the built-in all-round skill every channel is given.
    if (skillId) return;
    if (current?.defaultSkillId) setSkillId(current.defaultSkillId);
    else {
      const builtIn = skills?.find((s) => s.source === 'market:cinematic');
      if (builtIn) setSkillId(builtIn.id);
    }
  }, [current, skillId, skills]);

  const create = useMutation({
    mutationFn: () => episodeApi.create({ channelId: current!.id, topic: topic.trim(), formats, skillId }),
    onSuccess: (v) => {
      void qc.invalidateQueries({ queryKey: ['episodes'] });
      router.push(ROUTES.episode(v.episode.id));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const toggle = (f: Format) => setFormats((cur) => (cur.includes(f) ? (cur.length > 1 ? cur.filter((x) => x !== f) : cur) : [...cur, f]));
  const usable = (skills ?? []).filter((s) => !s.issues.some((i) => i.level === 'error'));
  const aiReady = config?.llm.ready ?? true;
  const submit = () => {
    if (topic.trim().length < 3) return toast.error('Gõ ý tưởng video trước nhé');
    if (!skillId) return toast.error('Chọn kiểu video (skill) trước nhé. Đặt skill mặc định cho kênh để khỏi chọn lại.');
    create.mutate();
  };

  return (
    <section aria-labelledby="create-h" className="flex flex-col gap-5 rounded-[20px] border bg-card p-6 md:p-9">
      <h1 id="create-h" className="text-[32px] font-extrabold leading-tight tracking-tight md:text-[40px]">
        Hôm nay làm video gì?
      </h1>
      <Label htmlFor="idea" className="sr-only">
        Ý tưởng video
      </Label>
      <Textarea
        id="idea"
        rows={3}
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder={ideas[0] ? `Gõ 1 câu là đủ. Ví dụ: ${ideas[0].topic}` : 'Gõ 1 câu là đủ: chủ đề hoặc câu hỏi video sẽ trả lời'}
        className="min-h-24 resize-y rounded-xl border-2 border-primary px-4 py-3.5 text-[18px] leading-relaxed focus-visible:ring-4 focus-visible:ring-accent"
      />
      <div className="flex flex-wrap items-center gap-2" aria-label="Gợi ý chủ đề">
        {planned.map((p) => (
          <button key={p.episode.id} type="button" onClick={() => setTopic(p.episode.topic)} title="Tập đã lên lộ trình trong series của kênh" className="min-h-9 rounded-full border border-primary/40 bg-accent px-3 text-small font-semibold text-accent-foreground hover:border-primary">
            Tiếp theo: {p.episode.topic}
          </button>
        ))}
        {ideas.map((idea) => (
          <button key={idea.topic} type="button" onClick={() => setTopic(idea.topic)} title={idea.why} className="min-h-9 rounded-full bg-muted px-3 text-small text-slate-700 hover:bg-accent hover:text-accent-foreground">
            {idea.topic}
          </button>
        ))}
        {ideasLoading && !ideas.length ? <span className="flex items-center gap-1.5 text-small text-muted-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden />AI đang nghĩ chủ đề cho kênh…</span> : null}
        {ideasError && !ideas.length ? <span className="text-small text-muted-foreground">Chưa gợi ý được chủ đề.</span> : null}
        {aiReady && canAsk ? (
          <button type="button" onClick={generate} disabled={ideasLoading} title="Tốn một lượt gọi AI, dựa trên kênh, tri thức và các video đã có" className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-small font-semibold text-primary hover:bg-accent disabled:opacity-50">
            {ideas.length ? <RefreshCw className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
            {ideas.length ? 'Gợi ý khác' : 'Gợi ý chủ đề'}
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="mr-1 text-small text-muted-foreground">Đăng lên</span>
        {(Object.keys(FORMATS) as Format[]).map((f) => {
          const on = formats.includes(f);
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(f)}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-small font-semibold transition',
                on ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card text-slate-700 hover:border-slate-400',
              )}
            >
              {on ? <Check className="size-4" aria-hidden /> : null}
              {FORMAT_CHIP[f]}
            </button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        <Label htmlFor="skill" className="sr-only">
          Kiểu video (skill)
        </Label>
        <Select value={skillId} onValueChange={setSkillId}>
          <SelectTrigger id="skill" className="min-h-10 rounded-full">
            <SelectValue placeholder="Kiểu video" />
          </SelectTrigger>
          <SelectContent>
            {usable.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Kiểu: {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {skills && !usable.length ? (
          <Link href={ROUTES.skills} className="text-small font-semibold text-primary hover:underline">
            Kênh chưa có skill: cài từ market
          </Link>
        ) : null}
        <Button size="lg" className="ml-auto h-12 gap-2.5 rounded-xl px-6 text-body font-bold" onClick={submit} disabled={create.isPending || !current}>
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {aiReady ? 'Tạo video' : 'Tạo & dán kịch bản'}
          <ArrowRight aria-hidden />
        </Button>
      </div>
      <p className="text-small text-muted-foreground">
        {aiReady ? (
          'AI viết kịch bản theo kiểu video và giọng văn của kênh. Bạn xem trước từng cảnh, nghe thử giọng, rồi mới bấm sản xuất.'
        ) : (
          <>
            Chưa cài AI: bạn sẽ copy prompt sang Claude rồi dán kịch bản lại.{' '}
            <Link href={ROUTES.settings} className="font-semibold text-primary hover:underline">
              Cài AI để tự động
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
