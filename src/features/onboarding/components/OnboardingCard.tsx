'use client';

import { Check, ChevronDown, ChevronUp, Circle, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useAppConfig, useCurrentChannel } from '@/features/app';
import { useEpisodes } from '@/features/episode/hooks/use-episode';
import { useAssistantStore } from '@/stores/assistant-store';

import { useOnboarding } from '../hooks/use-onboarding';
import { onboardingSteps, progress, type OnboardingStep } from '../lib/steps';

const DESIGN_REQUEST = 'Hãy thiết kế intro và outro riêng cho kênh này theo tên, mô tả và màu của kênh. Cho tôi xem rồi chỉnh theo ý tôi, và đề xuất luôn phong cách ảnh cho kênh.';

/** First-run checklist: three steps to a first video plus one optional. Collapses when done, goes away when dismissed. */
export function OnboardingCard() {
  const { data: config } = useAppConfig();
  const { current } = useCurrentChannel();
  const { data: episodes } = useEpisodes(current?.id);
  const ask = useAssistantStore((s) => s.ask);
  const { loaded, dismissed, setDismissed } = useOnboarding();
  const [open, setOpen] = useState(true);
  if (!loaded || dismissed || !config || !episodes) return null;

  const steps = onboardingSteps({
    llmReady: config.llm.ready,
    channelDesigned: Boolean(current?.introDesign),
    episodeCount: episodes.length,
    imageReady: config.image.ready,
    voiceReady: config.ttsGoogle,
  });
  const { done, total, finished } = progress(steps);

  const focusIdea = () => document.getElementById('idea')?.focus();
  const action = (s: OnboardingStep) => {
    switch (s.id) {
      case 'ai':
      case 'quality':
        return (
          <Button asChild size="sm" variant={s.optional ? 'outline' : 'default'}>
            <Link href={ROUTES.settings}>{s.id === 'ai' ? 'Mở Cài đặt' : 'Xem Cài đặt'}</Link>
          </Button>
        );
      case 'channel':
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => ask(DESIGN_REQUEST)}>
              Nhờ trợ lý thiết kế
            </Button>
            {current ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`${ROUTES.channels}/${current.id}`}>Mở trang kênh</Link>
              </Button>
            ) : null}
          </div>
        );
      case 'video':
        return (
          <Button size="sm" onClick={focusIdea}>
            Gõ ý tưởng
          </Button>
        );
    }
  };

  return (
    <section aria-labelledby="onboarding-h" className="rounded-2xl border bg-card p-4 md:p-5">
      <div className="flex items-center gap-3">
        <h2 id="onboarding-h" className="min-w-0 flex-1 text-title font-bold">
          Hướng dẫn lần đầu <span className="font-semibold text-muted-foreground">{done}/{total}</span>
        </h2>
        <Button type="button" variant="ghost" size="icon" aria-label={open ? 'Thu gọn hướng dẫn' : 'Mở hướng dẫn'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Đóng hướng dẫn, không hiện lại" onClick={() => setDismissed(true)}>
          <X aria-hidden />
        </Button>
      </div>
      {open ? (
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((s) => (
            <li key={s.id} className="flex items-start gap-3">
              {s.done ? <Check className="mt-0.5 size-5 shrink-0 text-success" aria-label="Đã xong" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Chưa làm" />}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="font-semibold">
                  {s.title}
                  {s.optional ? <span className="ml-2 text-small font-normal text-muted-foreground">tuỳ chọn</span> : null}
                </p>
                <p className="text-small text-muted-foreground">{s.why}</p>
                {s.done ? null : action(s)}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {finished ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-small text-muted-foreground">
          <span>Bạn đã xong các bước chính.</span>
          <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
            Ẩn hướng dẫn
          </Button>
        </div>
      ) : null}
    </section>
  );
}
