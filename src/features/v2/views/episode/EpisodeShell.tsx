'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { isBusy, useEpisode } from '@/features/episode/hooks/use-episode';
import { useAssistantStore } from '@/stores/assistant-store';

import { currentStep, EPISODE_STEPS, episodeHref, projectHref, stepIndex, type EpisodeStep } from '../../model';
import { Loading, Page, Topbar } from '../../Shell';
import { SeriesUpdateBanner } from '../SeriesUpdateBanner';
import { NextStepBar } from './NextStepBar';

/** Which scene the one-by-one reviewer shows (null = closed); the next-step bar opens it, the scenes screen draws it. */
const ReviewerContext = createContext<{ at: number | null; setAt: (at: number | null) => void }>({ at: null, setAt: () => {} });
export const useReviewer = () => useContext(ReviewerContext);

/** One shell for every step of an episode: where it is, what is left, and the one thing to do next. */
export function EpisodeShell({ projectId, episodeId, children }: { projectId: string; episodeId: string; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const q = useEpisode(episodeId);
  const v = q.data;
  const [at, setAt] = useState<number | null>(null);
  const openAssistant = useAssistantStore((s) => s.setOpen);
  const active = (path.split('/').pop() ?? 'script') as EpisodeStep;
  const reached = v ? stepIndex(currentStep(v.episode.status)) : 0;
  // An earlier video stays watchable after the script is reopened.
  const locked: Record<EpisodeStep, string | null> = {
    script: null,
    review: v && (v.renders.length || v.episode.status === 'producing' || reached >= 1) ? null : 'Duyệt kịch bản thì mới có video',
    publish: v?.episode.status === 'published' ? null : 'Duyệt video thì mới xuất bản được',
  };

  return (
    <ReviewerContext.Provider value={{ at, setAt }}>
      <Topbar crumbs={[{ label: 'Các tập', href: projectHref(projectId) }, v ? v.episode.title || v.episode.topic : '…', EPISODE_STEPS.find((s) => s.key === active)?.label ?? '']} />
      <Page width={1240}>
        <div className="epbar">
          <div className="who">
            <span className="cap">
              Tập {v?.episode.number ?? '-'} · {v?.episode.scenes.length ?? 0} cảnh
            </span>
            <b>{v ? v.episode.title || v.episode.topic : 'Đang tải…'}</b>
          </div>
          <nav className="eptabs" aria-label="Các bước của tập">
            {EPISODE_STEPS.map((s, i) =>
              locked[s.key] ? (
                <a key={s.key} aria-disabled="true" title={locked[s.key]!} style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                  {s.label}
                </a>
              ) : (
                <Link key={s.key} className={s.key === active ? 'on' : i < reached ? 'done' : ''} href={episodeHref(projectId, episodeId, s.key)} aria-current={s.key === active ? 'step' : undefined}>
                  {s.label}
                </Link>
              ),
            )}
          </nav>
          <button className="btn sm" onClick={() => openAssistant(true)}>
            Hỏi trợ lý
          </button>
        </div>
        {v && (
          <NextStepBar
            view={v}
            projectId={projectId}
            active={active}
            onReview={(index) => {
              setAt(index);
              if (active !== 'script') router.push(episodeHref(projectId, episodeId, 'script'));
            }}
          />
        )}
        {v && !isBusy(v) && <SeriesUpdateBanner view={v} />}
        {q.isLoading ? <Loading /> : q.error ? <div className="alert bad">Không tải được tập này.</div> : children}
      </Page>
    </ReviewerContext.Provider>
  );
}
