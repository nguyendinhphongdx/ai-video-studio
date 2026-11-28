import { describe, expect, it } from 'vitest';

import type { EpisodeView } from '@/features/episode/services/episode.api';
import { actionFor, relTime, summarize } from '@/features/v2/lib/home';

const ep = (status: string, updatedAt: string, job?: { state: string }) => ({ episode: { status, updatedAt }, job: job ?? null }) as unknown as EpisodeView;

describe('summarize', () => {
  it('counts each episode once: failed first, then by status', () => {
    const s = summarize([ep('published', '2026-01-01T00:00:00Z'), ep('script_review', '2026-01-03T00:00:00Z'), ep('video_review', '2026-01-02T00:00:00Z'), ep('producing', '2026-01-02T00:00:00Z'), ep('planned', '2026-01-01T00:00:00Z'), ep('script_review', '2026-01-01T00:00:00Z', { state: 'failed' })]);
    expect(s).toMatchObject({ total: 6, published: 1, waiting: 2, producing: 1, early: 1, failed: 1, lastAt: '2026-01-03T00:00:00Z' });
  });
  it('treats a running job as producing and an empty project as having no activity', () => {
    expect(summarize([ep('draft', '2026-01-01T00:00:00Z', { state: 'running' })]).producing).toBe(1);
    expect(summarize([])).toMatchObject({ total: 0, lastAt: null });
  });
});

describe('relTime and actionFor', () => {
  const now = new Date('2026-01-10T12:00:00Z').getTime();
  it('words recent times and dates old ones', () => {
    expect(relTime('2026-01-10T11:59:40Z', now)).toBe('Vừa xong');
    expect(relTime('2026-01-10T11:30:00Z', now)).toBe('30 phút trước');
    expect(relTime('2026-01-10T09:00:00Z', now)).toBe('3 giờ trước');
    expect(relTime('2026-01-09T09:00:00Z', now)).toBe('Hôm qua');
    expect(relTime(null, now)).toBe('Chưa có hoạt động');
  });
  it('names the action', () => {
    expect(actionFor(ep('video_review', ''))).toBe('Duyệt video');
    expect(actionFor(ep('script_review', ''))).toBe('Duyệt kịch bản');
    expect(actionFor(ep('script_review', '', { state: 'failed' }))).toBe('Xem lỗi');
  });
});
